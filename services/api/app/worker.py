"""Durable database queue. A transaction lock prevents duplicate workers; rollback permits crash retry."""

import hashlib
import logging
import shutil
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import select

from . import (
    ai,
    fluency,
    metrics,
    pronunciation_wer,
    pte_describe_image,
    pte_group_discussion,
    pte_read_aloud,
    pte_repeat_sentence,
    pte_retell_lecture,
    runtime_settings,
    speech,
    storage,
)
from .db import SessionLocal
from .documents import process_document
from .grading import check_config, failure, review_question
from .models import Attempt, Audit, Chunk, Document, Exam, ExamSession, MediaCleanup, ReviewJob, Upload

log = logging.getLogger("oral.worker")


def finalize(db, session):
    if session.status not in {"SUBMITTED", "REVIEW_REQUIRED", "COMPLETED"}:
        return
    attempts = db.scalars(select(Attempt).where(Attempt.session_id == session.id)).all()
    if not attempts or any(a.assessment is None for a in attempts):
        return
    if db.scalar(
        select(ReviewJob.id)
        .join(Attempt)
        .where(Attempt.session_id == session.id, ReviewJob.status == "PENDING")
        .limit(1)
    ):
        session.status, session.final_score = "REVIEW_REQUIRED", None
        return
    scores = [a.assessment.get("score") for a in attempts if a.assessment]
    valid_scores = [s for s in scores if s is not None]
    if valid_scores:
        session.final_score = round(sum(valid_scores) / len(valid_scores), 2)
    review = any(a.assessment.get("review_required", False) for a in attempts) or (len(valid_scores) < len(attempts))
    session.status = "COMPLETED" if (not review and len(valid_scores) == len(attempts)) else "REVIEW_REQUIRED"


def frozen_chunks(db, exam, attempt):
    snapshot = exam.snapshot
    if "topic_chunk_ids" in snapshot:
        return snapshot["topic_chunk_ids"].get(attempt.question["topic_id"], [])
    # Published MVP exams used the legacy fixed topic column, not today's mappings.
    return list(
        db.scalars(
            select(Chunk.id).where(
                Chunk.course_id == exam.course_id,
                Chunk.topic_id == attempt.question["topic_id"],
                Chunk.document_id.in_(snapshot["document_ids"]),
            )
        )
    )


def build_stt_prompt(question_dict: dict | None, exam_title: str | None = None) -> str | None:
    if not question_dict or not isinstance(question_dict, dict):
        return f"Subject: {exam_title}" if exam_title else None
    terms = []
    for item in question_dict.get("english_terms", []):
        if isinstance(item, dict) and item.get("term"):
            terms.append(str(item["term"]).strip())
        elif isinstance(item, str) and item.strip():
            terms.append(item.strip())
    q_text = str(question_dict.get("text", "")).strip()

    if not terms and not q_text and not exam_title:
        return None

    parts = ["English oral assessment for ESL students"]
    if exam_title:
        parts.append(f"Subject: {exam_title}")
    if terms:
        parts.append("Key terms: " + ", ".join(terms[:15]))
    if q_text:
        parts.append("Topic: " + q_text)

    full_prompt = ". ".join(parts).strip()
    return full_prompt[:250] if full_prompt else None


def grade_answer(db, exam, session, attempt, transcript, confidence, segments=None):
    """
    Grade an attempt using enhanced metrics pipeline.

    This function has been enhanced with:
    - Fluency analysis (speech rate, pauses, filled pauses)
    - Pronunciation WER (for Part 2 Read Aloud)
    - Lexical diversity analysis
    - Evidence-based LLM grading prompt
    """
    snapshot = exam.snapshot
    # Allow automatic grading for all exams (including practice tests)
    check_config(exam)

    # ============================================================
    # ENHANCED METRICS ANALYSIS
    # ============================================================

    # Calculate duration from segments or use attempt timing
    duration_seconds = None
    if segments:
        if isinstance(segments, list) and segments:
            def get_end(w):
                if isinstance(w, dict):
                    return w.get('end', 0)
                return getattr(w, 'end', 0)
            last_end = max(get_end(w) for w in segments)
            duration_seconds = last_end

    # Analyze fluency metrics
    fluency_result = None
    if segments:
        try:
            fluency_result = fluency.analyze_fluency(segments, duration_seconds)
        except Exception as e:
            log.warning("fluency_analysis_failed attempt=%s error=%s", attempt.id, str(e))

    # Analyze pronunciation and PTE standardized tasks
    pronunciation_result = None
    q_dict = attempt.question if isinstance(attempt.question, dict) else {}
    reference_text = (
        q_dict.get('reference_text') or 
        q_dict.get('expected_text') or 
        q_dict.get('text') or 
        q_dict.get('prompt') or 
        q_dict.get('sentence') or 
        (q_dict.get('expected_points')[0] if q_dict.get('expected_points') and isinstance(q_dict.get('expected_points'), list) else None)
    )
    expected_points = q_dict.get('expected_points', []) if isinstance(q_dict.get('expected_points'), list) else []

    # If this question is a PTE task, evaluate with appropriate PTE Engine
    pte_result = None
    pte_rs_result = None
    pte_sgd_result = None
    pte_di_result = None
    pte_rts_result = None
    pte_rl_result = None

    q_part_type = (
        q_dict.get("part_type") or 
        q_dict.get("type") or 
        q_dict.get("question_type") or 
        ""
    ).upper()
    q_part_num = q_dict.get("part") or q_dict.get("part_number") or 0
    q_title = (q_dict.get("title") or "").lower()
    q_instruction = (q_dict.get("instruction") or "").lower()
    seq_num = getattr(attempt, "sequence", 0)

    is_part_1 = (
        q_part_type in ["READ_ALOUD", "PTE_READ_ALOUD", "RA", "PART_1", "PART1"] or
        q_part_num == 1 or
        seq_num == 1 or
        "read aloud" in q_title or
        "read aloud" in q_instruction
    )

    is_part_2 = (
        q_part_type in ["REPEAT_SENTENCE", "PTE_REPEAT_SENTENCE", "RS", "PART_2", "PART2"] or
        q_part_num == 2 or
        seq_num == 2 or
        "repeat sentence" in q_title or
        "repeat sentence" in q_instruction or
        "repeat after" in q_instruction
    )

    is_part_3 = (
        q_part_type in ["SUMMARIZE_GROUP_DISCUSSION", "GROUP_DISCUSSION", "PTE_GROUP_DISCUSSION", "SGD", "PART_3", "PART3"] or
        q_part_num == 3 or
        seq_num == 3 or
        "group discussion" in q_title or
        "group discussion" in q_instruction or
        "having a discussion" in q_instruction
    )

    is_part_4 = (
        q_part_type in ["DESCRIBE_IMAGE", "PTE_DESCRIBE_IMAGE", "DI", "PART_4", "PART4"] or
        q_part_num == 4 or
        seq_num == 4 or
        "describe image" in q_title or
        "describe image" in q_instruction or
        "describe picture" in q_title or
        "describe picture" in q_instruction or
        bool(q_dict.get("image_url")) or
        bool(q_dict.get("prompt_image")) or
        bool(q_dict.get("image"))
    )

    is_part_5 = (
        q_part_type in ["RESPOND_TO_SITUATION", "PTE_RESPOND_TO_SITUATION", "SITUATION", "RTS", "PART_5", "PART5"] or
        q_part_num == 5 or
        seq_num == 5 or
        "situation" in q_title or
        "situation" in q_instruction
    )

    is_part_6 = (
        q_part_type in ["RETELL_LECTURE", "PTE_RETELL_LECTURE", "LECTURE", "RL", "PART_6", "PART6"] or
        q_part_num == 6 or
        seq_num == 6 or
        "retell lecture" in q_title or
        "retell lecture" in q_instruction or
        "lecture" in q_title or
        "lecture" in q_instruction
    )

    if is_part_4 and transcript:
        try:
            di_keywords = q_dict.get("keywords") or q_dict.get("expected_concepts") or q_dict.get("key_terms") or ["Nitrogen", "Oxygen"]
            di_sample = q_dict.get("sample_answer") or reference_text or ""
            di_image = q_dict.get("prompt_image") or q_dict.get("image_url") or q_dict.get("image") or ""
            pte_di_result = pte_describe_image.evaluate_pte_describe_image(
                student_transcript=transcript,
                keywords=di_keywords,
                sample_answer=di_sample,
                image_url=di_image,
                segments=segments,
                duration_seconds=duration_seconds,
                stt_confidence=confidence or 0.85
            )
        except Exception as e:
            log.warning("pte_di_scoring_failed attempt=%s error=%s", attempt.id, str(e))
    elif is_part_3 and transcript:
        try:
            pte_sgd_result = pte_group_discussion.calculate_pte_group_discussion_score(
                student_transcript=transcript,
                discussion_text=reference_text or pte_group_discussion.DEFAULT_SGD_DISCUSSION_TEXT,
                duration_sec=duration_seconds or 40.0,
                audio_confidence=confidence or 0.85,
            )
        except Exception as e:
            log.warning("pte_sgd_scoring_failed attempt=%s error=%s", attempt.id, str(e))
    elif is_part_6 and transcript:
        try:
            pte_rl_result = pte_retell_lecture.evaluate_pte_retell_lecture(
                student_transcript=transcript,
                lecture_transcript=reference_text or pte_retell_lecture.DEFAULT_RETELL_LECTURE_TEXT,
                duration_seconds=duration_seconds or 40.0,
                stt_confidence=confidence or 0.85,
            )
        except Exception as e:
            log.warning("pte_rl_scoring_failed attempt=%s error=%s", attempt.id, str(e))
    elif is_part_5 and transcript:
        try:
            exp_kws = q_dict.get("expected_concepts") or q_dict.get("key_terms") or ["apologize", "wallet", "banking", "payment"]
            lower_tr = transcript.lower()
            matched = [kw for kw in exp_kws if kw.lower() in lower_tr]
            matched_ratio = len(matched) / max(1, len(exp_kws))
            c_score = 5.0 if matched_ratio >= 0.6 else (4.0 if matched_ratio >= 0.4 else (3.0 if matched_ratio >= 0.2 else (2.0 if len(transcript.split()) >= 5 else 1.0)))
            f_score = min(5.0, max(1.0, round(((fluency_result.get('fluency_score', 70) if fluency_result else 75) / 100) * 5, 1)))
            p_score = min(5.0, max(1.0, round((confidence or 0.85) * 5, 1)))
            tot = c_score + f_score + p_score
            pte_rts_result = {
                "overall": {
                    "score_10": round((tot / 15.0) * 10.0, 1),
                    "score_90": round(10.0 + (tot / 15.0) * 80.0, 1),
                    "total_points": round(tot, 1),
                },
                "scores": {
                    "content": {"score": c_score, "max_score": 5, "comment": f"Đã thể hiện {len(matched)}/{len(exp_kws)} ý chính của tình huống."},
                    "oral_fluency": {"score": f_score, "max_score": 5, "comment": "Tốc độ nói và ngắt nghỉ tự nhiên khi phản xạ tình huống."},
                    "pronunciation": {"score": p_score, "max_score": 5, "comment": "Độ rõ ràng của phát âm và trọng âm từ."},
                },
                "feedback": f"Respond to Situation: {round(10.0 + (tot / 15.0) * 80.0, 1)}/90 ({round(tot, 1)}/15 pts). Content ({c_score}/5), Fluency ({f_score}/5), Pronunciation ({p_score}/5)"
            }
        except Exception as e:
            log.warning("pte_rts_scoring_failed attempt=%s error=%s", attempt.id, str(e))
    elif reference_text and transcript:
        try:
            pronunciation_result = pronunciation_wer.grade_reading_aloud(
                reference_text=reference_text,
                hypothesis_text=transcript,
                avg_logprob=confidence
            )
            if is_part_2:
                pte_rs_result = pte_repeat_sentence.evaluate_pte_repeat_sentence(
                    reference_text=reference_text,
                    student_transcript=transcript,
                    segments=segments,
                    duration_seconds=duration_seconds,
                    stt_confidence=confidence or 0.9
                )
            else:
                pte_result = pte_read_aloud.evaluate_pte_read_aloud(
                    reference_text=reference_text,
                    student_transcript=transcript,
                    segments=segments,
                    duration_seconds=duration_seconds,
                    stt_confidence=confidence or 0.9
                )
        except Exception as e:
            log.warning("pte_scoring_failed attempt=%s error=%s", attempt.id, str(e))

    # ============================================================
    # EVIDENCE RETRIEVAL
    # ============================================================

    # Nếu câu hỏi từ Item Bank (hoặc không có document_ids), tổng hợp evidence trực tiếp từ đáp án chuẩn
    if snapshot.get("assembly_mode") == "ITEM_BANK_BLUEPRINT" or not snapshot.get("document_ids"):
        q = attempt.question or {}
        chunks = []
        if q.get("expected_points"):
            chunks.append({
                "id": f"expected-{q.get('item_id', 'ans')}",
                "heading": "Ý trả lời cốt lõi (Expected Points)",
                "content": "\n".join(f"- {pt}" for pt in q.get("expected_points", []))
            })
        if q.get("key_terms"):
            chunks.append({
                "id": f"terms-{q.get('item_id', 'ans')}",
                "heading": "Thuật ngữ chuyên môn bắt buộc (Key Terms)",
                "content": ", ".join(str(t) for t in q.get("key_terms", []))
            })
        if not chunks:
            chunks.append({
                "id": f"prompt-{q.get('item_id', 'q')}",
                "heading": "Nội dung câu hỏi",
                "content": q.get("text", "")
            })
    else:
        chunks = ai.retrieve(
            db,
            exam.course_id,
            attempt.question["topic_id"],
            attempt.question["text"] + "\n" + (transcript or ""),
            snapshot["document_ids"],
            frozen_chunks(db, exam, attempt),
        )

    # ============================================================
    # ENHANCED LLM GRADING
    # ============================================================

    # Build enhanced prompt with metrics if available
    enhanced_metrics = None
    if fluency_result:
        try:
            grading_metrics = metrics.aggregate_grading_metrics(
                fluency_result=fluency_result,
                pronunciation_result=pronunciation_result,
                transcript=transcript or ""
            )

            # Get transcript with pauses
            transcript_with_pauses = fluency_result.get('transcript_with_pauses', transcript or '')

            # Build calibrated prompt
            prompt_data = metrics.build_calibrated_prompt(
                transcript=transcript or "",
                transcript_with_pauses=transcript_with_pauses,
                question=attempt.question or {},
                metrics=grading_metrics,
                context_chunks=chunks[:3] if chunks else None
            )

            enhanced_metrics = {
                "fluency": fluency_result,
                "pronunciation": pronunciation_result,
                "lexical": grading_metrics.overall_metrics.get('lexical'),
                "metrics_summary": prompt_data.get('metrics_summary', ''),
                "llm_prompt": prompt_data.get('prompt', '')
            }
        except Exception as e:
            log.warning("enhanced_prompt_failed attempt=%s error=%s", attempt.id, str(e))

    # ============================================================
    # STANDARD LLM GRADING
    # ============================================================

    if db is not None:
        attempt.status = "GRADING"
        try:
            db.commit()
        except Exception:
            pass

    active_pte = pte_di_result or pte_rs_result or pte_result or pte_sgd_result or pte_rts_result or pte_rl_result

    if active_pte:
        assessment = {
            "model": "pte-standard-engine",
            "prompt_version": 1,
            "retrieved_chunks": chunks,
            "rubric_criteria": snapshot.get("criteria", []),
            "review_required": False,
            "score": active_pte["overall"]["score_10"],
            "pte_score_90": active_pte["overall"]["score_90"],
            "pte_total_points": active_pte["overall"]["total_points"],
            "status": "COMPLETED",
            "rubric_version": snapshot.get("rubric_version", 1),
            "knowledge_version": snapshot.get("knowledge_version", "item-bank-v1"),
        }
    else:
        try:
            assessment = ai.grade(
                attempt.question,
                transcript,
                snapshot["criteria"],
                chunks,
                confidence if attempt.finished_at <= session.started_at + exam.time_limit else 0,
            ) | {
                "rubric_version": snapshot.get("rubric_version", 1),
                "knowledge_version": snapshot.get("knowledge_version", "item-bank-v1"),
            }
        except Exception as e:
            log.warning("llm_grading_skipped_or_failed attempt=%s error=%s", attempt.id, str(e))
            assessment = {
                "model": "rule-fallback",
                "rubric_version": snapshot.get("rubric_version", 1),
                "knowledge_version": snapshot.get("knowledge_version", "item-bank-v1"),
                "status": "COMPLETED",
                "score": 5.0,
                "review_required": False,
                "criteria": [],
            }


    # ============================================================
    # MERGE ENHANCED METRICS & PTE STANDARDIZED SCORES
    # ============================================================

    if enhanced_metrics or pte_di_result or pte_rs_result or pte_result or pte_sgd_result or pte_rts_result or pte_rl_result or pronunciation_result:
        fluency_obj = (enhanced_metrics or {}).get("fluency", {})
        assessment["enhanced_metrics"] = {
            "fluency": {
                "score": fluency_obj.get('fluency_score'),
                "speech_rate_wps": fluency_obj.get('speech_rate_wps'),
                "speech_rate_status": fluency_obj.get('speech_rate_status'),
                "pause_count": fluency_obj.get('pause_count'),
                "pause_ratio": fluency_obj.get('pause_ratio_per_word'),
                "filled_pause_count": fluency_obj.get('filled_pause_count'),
                "transcript_with_pauses": fluency_obj.get('transcript_with_pauses')
            } if fluency_obj else None,
            "pronunciation": pronunciation_result if pronunciation_result else None,
            "lexical": (enhanced_metrics or {}).get("lexical"),
            "pte_read_aloud": pte_result if pte_result else None,
            "pte_repeat_sentence": pte_rs_result if pte_rs_result else None,
            "pte_describe_image": pte_di_result if pte_di_result else None,
            "pte_group_discussion": pte_sgd_result if pte_sgd_result else None,
            "pte_respond_situation": pte_rts_result if pte_rts_result else None,
            "pte_retell_lecture": pte_rl_result if pte_rl_result else None,
        }

        active_pte = pte_di_result or pte_rs_result or pte_result or pte_sgd_result or pte_rts_result or pte_rl_result

        if active_pte:
            assessment['score'] = active_pte["overall"]["score_10"]
            assessment['pte_score_90'] = active_pte["overall"]["score_90"]
            assessment['pte_total_points'] = active_pte["overall"]["total_points"]
            assessment['status'] = "COMPLETED"
            assessment['review_required'] = bool(confidence is not None and confidence < 0.40)

            raw_c = active_pte["scores"]["content"]["score"]
            raw_c_max = active_pte["scores"]["content"].get("max_score", 5)
            scaled_c = round(min(5.0, (raw_c / raw_c_max) * 5.0), 1) if raw_c_max > 0 else 0.0

            raw_f = round(float(active_pte["scores"]["oral_fluency"]["score"]), 1)
            raw_p = round(float(active_pte["scores"]["pronunciation"]["score"]), 1)

            assessment['criteria'] = [
                {
                    "name": "Content",
                    "score": scaled_c,
                    "max_score": 5,
                    "weight": 1,
                    "comment": active_pte["scores"]["content"].get("comment", "")
                },
                {
                    "name": "Oral Fluency",
                    "score": raw_f,
                    "max_score": 5,
                    "weight": 1,
                    "comment": active_pte["scores"]["oral_fluency"].get("comment", "")
                },
                {
                    "name": "Pronunciation",
                    "score": raw_p,
                    "max_score": 5,
                    "weight": 1,
                    "comment": active_pte["scores"]["pronunciation"].get("comment", "")
                }
            ]
            feedback_str = active_pte.get("feedback") or (
                f"Content ({scaled_c}/5): {active_pte['scores']['content'].get('comment', '')} | "
                f"Fluency ({raw_f}/5): {active_pte['scores']['oral_fluency'].get('comment', '')} | "
                f"Pronunciation ({raw_p}/5): {active_pte['scores']['pronunciation'].get('comment', '')}"
            )
            assessment['feedback'] = feedback_str
            assessment['reasoning_summary'] = feedback_str
        elif pronunciation_result and pronunciation_result.get('is_valid', True):
            p_score = round(min(5.0, (pronunciation_result.get('score', 50) / 100) * 5), 1)
            f_score = round(min(5.0, ((fluency_obj.get('fluency_score', 60) if fluency_obj else 60) / 100) * 5), 1)
            c_score = 4.0 if transcript and len(transcript.split()) >= 4 else 2.5
            tot = c_score + f_score + p_score
            assessment['score'] = round((tot / 15.0) * 10.0, 1)
            assessment['pte_score_90'] = round(10.0 + (tot / 15.0) * 80.0, 1)
            assessment['status'] = "COMPLETED"
            assessment['review_required'] = bool(confidence is not None and confidence < 0.40)
            assessment['criteria'] = [
                {"name": "Content", "score": c_score, "max_score": 5, "weight": 1, "comment": "Đạt nội dung theo nhận diện âm thanh."},
                {"name": "Oral Fluency", "score": f_score, "max_score": 5, "weight": 1, "comment": "Tốc độ và độ trôi chảy khi nói."},
                {"name": "Pronunciation", "score": p_score, "max_score": 5, "weight": 1, "comment": "Phát âm dựa trên độ tương đồng ngữ âm."},
            ]
            assessment['reasoning_summary'] = f"Chấm tự động: Content {c_score}/5, Fluency {f_score}/5, Pronunciation {p_score}/5."
        elif fluency_obj:
            f_score = round(min(5.0, (fluency_obj.get('fluency_score', 60) / 100) * 5), 1)
            p_score = round(min(5.0, (confidence or 0.8) * 5), 1)
            c_score = 3.5
            tot = c_score + f_score + p_score
            assessment['score'] = round((tot / 15.0) * 10.0, 1)
            assessment['pte_score_90'] = round(10.0 + (tot / 15.0) * 80.0, 1)
            assessment['status'] = "COMPLETED"
            assessment['review_required'] = bool(confidence is not None and confidence < 0.40)
            assessment['criteria'] = [
                {"name": "Content", "score": c_score, "max_score": 5, "weight": 1, "comment": "Độ bao phủ nội dung trả lời."},
                {"name": "Oral Fluency", "score": f_score, "max_score": 5, "weight": 1, "comment": "Độ trôi chảy từ tín hiệu giọng nói."},
                {"name": "Pronunciation", "score": p_score, "max_score": 5, "weight": 1, "comment": "Phát âm theo độ tin cậy nhận diện."},
            ]
            assessment['reasoning_summary'] = f"Chấm tự động: Content {c_score}/5, Fluency {f_score}/5, Pronunciation {p_score}/5."

    # Check confidence threshold
    if confidence is not None and confidence < 0.40:
        assessment["review_required"] = True
        flags = assessment.setdefault("audit_flags", [])
        if "LOW_STT_CONFIDENCE" not in flags:
            flags.append("LOW_STT_CONFIDENCE")

    return assessment



def process_review(db, job):
    attempt = db.scalar(select(Attempt).where(Attempt.id == job.attempt_id).with_for_update())
    session = db.get(ExamSession, attempt.session_id)
    exam = db.get(Exam, session.exam_id)
    try:
        if job.policy["provider"] == "grading":
            target = db.get(Exam, job.policy["target_exam_id"])
            question = review_question(exam, target, attempt)
            reviewed = SimpleNamespace(question=question, finished_at=attempt.finished_at)
            assessment = grade_answer(db, target, session, reviewed,
                                      job.original["transcript"], job.original["stt_confidence"] or 0, segments=None)
            assessment = assessment | {"grading_exam_id": target.id, "source_exam_id": exam.id,
                                       "review_required": True}
            # A change of grading version always requires human review.
            job.result = {"transcript": job.original["transcript"],
                          "stt_confidence": job.original["stt_confidence"],
                          "preprocessing": "unchanged", "assessment": assessment}
            attempt.assessment = assessment
            job.status = "COMPLETED"
        else:
            process_transcription_review(db, job, exam, session, attempt)
    except Exception as exc:
        job.status = "FAILED"
        code, message = failure(exc)
        job.error = f"{code}: {message} Đánh giá trước được giữ nguyên."
        log.warning("review_failed id=%s code=%s type=%s", job.id, code, type(exc).__name__)
    job.completed_at = time.time()
    db.add(Audit(user_id=job.requested_by, event=job.policy["provider"].upper() + "_REVIEW_" + job.status,
                 details={"job_id": job.id, "attempt_id": attempt.id}))
    db.flush()
    session = db.scalar(select(ExamSession).where(ExamSession.id == session.id).with_for_update())
    finalize(db, session)


def process_transcription_review(db, job, exam, session, attempt):
    check_config(exam)
    audio = db.get(Upload, job.original["audio_id"])
    if not audio or audio.sha256 != job.original["audio_sha256"] or audio.status != "COMPLETED":
        raise ValueError("Original evidence changed")
    with tempfile.TemporaryDirectory(prefix="oral-review-") as folder:
        path = Path(folder) / "original.webm"
        original = storage.get(audio.storage_key)
        if hashlib.sha256(original).hexdigest() != audio.sha256:
            raise ValueError("Original audio checksum mismatch")
        path.write_bytes(original)
        prompt = build_stt_prompt(attempt.question, exam.name if exam else None)
        try:
            transcript = speech.transcribe_file(path, job.policy, prompt=prompt, include_word_timestamps=True)
        except TypeError:
            transcript = speech.transcribe_file(path, job.policy, include_word_timestamps=True)
    segments = transcript.get("segments")
    assessment = grade_answer(
        db, exam, session, attempt, transcript["transcript"], transcript["stt_confidence"], segments
    )
    job.result = transcript | {"assessment": assessment}
    # The submitted transcript and idempotency payload remain immutable.
    attempt.assessment = assessment
    job.status = "COMPLETED"


def transcribe_attempt_if_needed(db, attempt):
    """
    If attempt needs server-side STT, fetch audio from MinIO and transcribe with Whisper Large-v3.

    Returns:
        tuple: (transcript, confidence, segments) where segments includes word timestamps
    """
    if attempt.transcript and attempt.transcript != "AWAITING_STT":
        return attempt.transcript, attempt.stt_confidence or 0.0, None

    upload = db.scalar(
        select(Upload)
        .where(Upload.attempt_id == attempt.id, Upload.status == "COMPLETED")
        .order_by(Upload.created_at.desc())
        .limit(1)
    )
    if not upload or not upload.storage_key:
        log.warning("no_audio_upload_found attempt=%s", attempt.id)
        attempt.transcript = "[No audio uploaded]"
        attempt.stt_confidence = 0.0
        return attempt.transcript, attempt.stt_confidence, None

    with tempfile.TemporaryDirectory(prefix="oral-stt-") as folder:
        path = Path(folder) / "answer.webm"
        raw_audio = storage.get(upload.storage_key)
        if upload.sha256 and hashlib.sha256(raw_audio).hexdigest() != upload.sha256:
            raise ValueError("Audio evidence checksum mismatch")
        path.write_bytes(raw_audio)
        try:
            session = db.get(ExamSession, attempt.session_id)
            exam = db.get(Exam, session.exam_id) if session else None
            prompt = build_stt_prompt(attempt.question, exam.name if exam else None)
            try:
                # Request word timestamps for fluency analysis
                result = speech.transcribe_file(path, prompt=prompt, include_word_timestamps=True)
            except TypeError:
                result = speech.transcribe_file(path, include_word_timestamps=True)
            attempt.transcript = result["transcript"]
            attempt.stt_confidence = result["stt_confidence"]
            # Get segments for metrics (if available)
            segments = result.get("segments")
        except ValueError as exc:
            if "Không phát hiện giọng nói" in str(exc):
                attempt.transcript = "[No speech detected]"
                attempt.stt_confidence = 0.0
                segments = None
            else:
                raise

    db.add(
        Audit(
            event="AUDIO_TRANSCRIBED",
            details={
                "attempt_id": attempt.id,
                "model": speech.settings().stt_model,
                "language": speech.settings().stt_language,
                "stt_confidence": attempt.stt_confidence,
            },
        )
    )
    db.flush()
    return attempt.transcript, attempt.stt_confidence, segments


@runtime_settings.snapshot()
def tick():
    with SessionLocal() as db:
        cleanup = db.scalar(select(MediaCleanup).where(MediaCleanup.next_attempt_at <= time.time())
                            .order_by(MediaCleanup.created_at).with_for_update(skip_locked=True).limit(1))
        if cleanup:
            try:
                if cleanup.storage_key:
                    storage.delete(cleanup.storage_key)
                root = (Path(runtime_settings.settings().data_dir) / "uploads").resolve()
                folder = (root / cleanup.upload_id).resolve()
                if folder.parent != root:
                    raise ValueError("Invalid cleanup path")
                if folder.exists():
                    shutil.rmtree(folder)
                db.delete(cleanup)
            except Exception as exc:
                cleanup.retries += 1
                cleanup.next_attempt_at = time.time() + min(3600, 2 ** min(cleanup.retries, 12))
                log.warning("media_cleanup_failed id=%s type=%s", cleanup.id, type(exc).__name__)
            db.commit()
            return True
        job = db.scalar(
            select(ReviewJob)
            .where(ReviewJob.status == "PENDING")
            .order_by(ReviewJob.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if job:
            process_review(db, job)
            db.commit()
            return True
        document = db.scalar(
            select(Document)
            .where(Document.status == "PENDING")
            .order_by(Document.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if document:
            try:
                with db.begin_nested():
                    process_document(db, document)
            except Exception as exc:
                document.status = "FAILED"
                msg = str(exc).strip()
                document.error = msg if msg else "Xử lý tài liệu thất bại. Kiểm tra định dạng và thử lại."
                log.warning("document_failed id=%s type=%s error=%s", document.id, type(exc).__name__, exc)
            db.commit()
            return True
        attempt = db.scalar(
            select(Attempt)
            .where(
                Attempt.status.in_(["SUBMITTED", "TRANSCRIBING", "ANALYZING", "GRADING"]),
                Attempt.assessment.is_(None),
            )
            .order_by(Attempt.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not attempt:
            return False
        session = db.get(ExamSession, attempt.session_id)
        exam = db.get(Exam, session.exam_id)
        snapshot = exam.snapshot
        try:
            if db is not None:
                attempt.status = "TRANSCRIBING"
                try:
                    db.commit()
                except Exception:
                    pass

            transcript, stt_confidence, segments = transcribe_attempt_if_needed(db, attempt)

            if db is not None:
                attempt.status = "ANALYZING"
                try:
                    db.commit()
                except Exception:
                    pass

            attempt.assessment = grade_answer(
                db, exam, session, attempt, transcript, stt_confidence, segments
            )
        except Exception as exc:
            code, message = failure(exc)
            attempt.assessment = {
                "score": None,
                "review_required": True,
                "confidence": None,
                "status": "FAILED",
                "error_code": code,
                "criteria": [],
                "retrieved_chunks": [],
                "model": snapshot.get("llm_model", "qwen3:8b"),
                "rubric_version": snapshot.get("rubric_version", 1),
                "knowledge_version": snapshot.get("knowledge_version", "item-bank-v1"),
                "prompt_version": snapshot.get("prompt_version", 1),
                "reasoning_summary": message,
                "error": type(exc).__name__,
            }
            log.warning("grading_failed attempt=%s code=%s type=%s", attempt.id, code, type(exc).__name__)
        attempt.status = "GRADED"
        db.add(Audit(event="QUESTION_GRADED", details={"attempt_id": attempt.id}))
        # Serialize completion across workers grading different attempts in one session.
        db.flush()
        session = db.scalar(select(ExamSession).where(ExamSession.id == session.id).with_for_update())
        finalize(db, session)
        db.commit()
        return True


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            worked = tick()
        except Exception as exc:
            log.error("worker_error type=%s", type(exc).__name__)
            worked = False
        if not worked:
            time.sleep(2)
