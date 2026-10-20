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

    # Analyze pronunciation alignment if reference text is present
    if reference_text and transcript:
        try:
            pronunciation_result = pronunciation_wer.grade_reading_aloud(
                reference_text=reference_text,
                hypothesis_text=transcript,
                avg_logprob=confidence,
            )
        except Exception as e:
            log.warning("pronunciation_wer_failed attempt=%s error=%s", attempt.id, str(e))

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
        if q.get("key_points"):
            chunks.append({
                "id": f"guiding-{q.get('item_id', 'ans')}",
                "heading": "Câu hỏi / Gợi ý định hướng (Guiding Points)",
                "content": "\n".join(f"- {pt}" for pt in q.get("key_points", []))
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
                "content": q.get("text", "") or q.get("prompt", "")
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
    # ENHANCED LLM GRADING & METRICS
    # ============================================================

    enhanced_metrics = None
    if fluency_result:
        try:
            grading_metrics = metrics.aggregate_grading_metrics(
                fluency_result=fluency_result,
                pronunciation_result=pronunciation_result,
                transcript=transcript or ""
            )
            transcript_with_pauses = fluency_result.get('transcript_with_pauses', transcript or '')
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

    if db is not None:
        attempt.status = "GRADING"
        try:
            db.commit()
        except Exception:
            pass

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
        fallback_criteria = []
        for c in snapshot.get("criteria", []):
            max_s = float(c.get("max_score", 2.0))
            fallback_score = round(max_s * 0.5, 1)
            fallback_criteria.append({
                "name": c["name"],
                "score": fallback_score,
                "max_score": max_s,
                "weight": float(c.get("weight", 20.0)),
                "band": ai.resolve_criterion_band(fallback_score, max_s, c.get("descriptors")),
                "comment": "Chấm tự động mặc định khi LLM gián đoạn. Cần Giảng viên xem lại.",
            })
        tot_fallback = sum(c["score"] for c in fallback_criteria)
        assessment = {
            "model": "rule-fallback",
            "rubric_version": snapshot.get("rubric_version", 1),
            "knowledge_version": snapshot.get("knowledge_version", "item-bank-v1"),
            "status": "COMPLETED",
            "score": round(tot_fallback, 1),
            "review_required": True,
            "criteria": fallback_criteria,
            "feedback": "Bài thi đang chờ Giảng viên chấm duyệt lại do mô hình AI gián đoạn.",
            "reasoning_summary": "Rule fallback due to LLM error",
        }

    # ============================================================
    # HYBRID CALIBRATION: ACOUSTIC & SPEECH METRICS
    # ============================================================

    fluency_obj = (enhanced_metrics or {}).get("fluency") or fluency_result
    assessment["enhanced_metrics"] = {
        "fluency": {
            "score": fluency_obj.get('fluency_score') if fluency_obj else None,
            "speech_rate_wps": fluency_obj.get('speech_rate_wps') if fluency_obj else None,
            "speech_rate_status": fluency_obj.get('speech_rate_status') if fluency_obj else None,
            "pause_count": fluency_obj.get('pause_count') if fluency_obj else None,
            "pause_ratio": fluency_obj.get('pause_ratio_per_word') if fluency_obj else None,
            "filled_pause_count": fluency_obj.get('filled_pause_count') if fluency_obj else None,
            "transcript_with_pauses": fluency_obj.get('transcript_with_pauses') if fluency_obj else None,
        } if fluency_obj else None,
        "pronunciation": {
            "acoustic_confidence": confidence,
            "details": pronunciation_result,
        } if (confidence is not None or pronunciation_result) else None,
        "lexical": (enhanced_metrics or {}).get("lexical"),
    }

    if assessment.get("criteria"):
        for crit in assessment["criteria"]:
            c_name = crit.get("name", "")
            c_max = float(crit.get("max_score", 2.0))
            if c_name == "Fluency and coherence" and fluency_obj:
                wps = fluency_obj.get("speech_rate_wps") or 2.0
                pauses = fluency_obj.get("pause_count") or 0
                if (wps < 1.2 or pauses > 6) and crit.get("score", 0) > (c_max * 0.48):
                    crit["score"] = round(c_max * 0.45, 1)  # e.g. 0.9 / 2.0
                    crit["band"] = ai.resolve_criterion_band(crit["score"], c_max)
                    crit["comment"] = (crit.get("comment", "") + " (Tốc độ nói còn chậm hoặc nhiều khoảng dừng dài).").strip()
            elif c_name == "Pronunciation" and confidence is not None:
                blended_p = round(min(c_max, max(0.0, 0.6 * (confidence * c_max) + 0.4 * crit.get("score", c_max * 0.5))), 2)
                crit["score"] = blended_p
                crit["band"] = ai.resolve_criterion_band(crit["score"], c_max)

        tot = sum(c.get("score", 0.0) for c in assessment["criteria"])
        assessment["score"] = round(min(10.0, max(0.0, tot)), 1)
        assessment["status"] = "COMPLETED"
        has_insufficient = any(c.get("band") == "Insufficient evidence" for c in assessment["criteria"])
        assessment["review_required"] = bool(
            (confidence is not None and confidence < 0.40) or
            has_insufficient or
            assessment.get("review_required", False)
        )
        assessment["feedback"] = " | ".join(f"{c['name']} ({c['score']}/{int(c.get('max_score', 2))}): {c.get('band', '')}" for c in assessment["criteria"])
        assessment["reasoning_summary"] = assessment["feedback"]

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
