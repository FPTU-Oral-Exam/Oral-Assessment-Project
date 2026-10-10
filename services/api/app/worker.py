"""Durable database queue. A transaction lock prevents duplicate workers; rollback permits crash retry."""

import hashlib
import logging
import shutil
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import select

from . import ai, runtime_settings, speech, storage, fluency, pronunciation_wer, metrics
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
    scores = [a.assessment.get("score") for a in attempts]
    review = any(a.assessment.get("review_required", True) for a in attempts) or any(
        score is None for score in scores
    )
    session.final_score = (
        round(sum(scores) / len(scores), 2) if not review and all(s is not None for s in scores) else None
    )
    session.status = "REVIEW_REQUIRED" if review else "COMPLETED"


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
    if snapshot.get("practice"):
        return {
            "score": None,
            "review_required": True,
            "confidence": None,
            "status": "NOT_GRADED",
            "criteria": [],
            "retrieved_chunks": [],
            "model": "practice",
            "rubric_version": snapshot["rubric_version"],
            "knowledge_version": snapshot.get("knowledge_version", "v1"),
            "reasoning_summary": "Đã hoàn thành câu luyện tập. Bài này không tính điểm chính thức.",
        }
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

    # Analyze pronunciation (Part 2 - Read Aloud)
    pronunciation_result = None
    reference_text = attempt.question.get('text') if isinstance(attempt.question, dict) else None
    expected_points = attempt.question.get('expected_points', []) if isinstance(attempt.question, dict) else []

    # If this is Part 2 (has reference text), calculate WER
    if reference_text and transcript:
        try:
            pronunciation_result = pronunciation_wer.grade_reading_aloud(
                reference_text=reference_text,
                hypothesis_text=transcript,
                avg_logprob=confidence
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

    # ============================================================
    # MERGE ENHANCED METRICS
    # ============================================================

    if enhanced_metrics:
        # Add enhanced metrics to assessment
        assessment["enhanced_metrics"] = {
            "fluency": {
                "score": enhanced_metrics["fluency"].get('fluency_score'),
                "speech_rate_wps": enhanced_metrics["fluency"].get('speech_rate_wps'),
                "speech_rate_status": enhanced_metrics["fluency"].get('speech_rate_status'),
                "pause_count": enhanced_metrics["fluency"].get('pause_count'),
                "pause_ratio": enhanced_metrics["fluency"].get('pause_ratio_per_word'),
                "filled_pause_count": enhanced_metrics["fluency"].get('filled_pause_count'),
                "transcript_with_pauses": enhanced_metrics["fluency"].get('transcript_with_pauses')
            },
            "pronunciation": pronunciation_result if pronunciation_result else None,
            "lexical": enhanced_metrics["lexical"]
        }

        # Override score calculation if we have enhanced metrics
        # This gives us a more accurate score based on actual speech metrics
        if pronunciation_result and pronunciation_result.get('is_valid', True):
            # For Part 2: Weight pronunciation heavily
            pronunciation_score = pronunciation_result.get('score', 0) / 10  # Convert to 0-10
            fluency_score = enhanced_metrics["fluency"].get('fluency_score', 0) / 10  # Convert to 0-10

            # Weighted average: 50% pronunciation (WER), 30% fluency, 20% content
            auto_score = (pronunciation_score * 0.50 + fluency_score * 0.30 + (assessment.get('score', 5)) * 0.20)

            # Only use auto score if it's reasonable
            if 0 <= auto_score <= 10:
                # Blend with LLM score (50/50)
                llm_score = assessment.get('score', 5)
                assessment['score'] = round((auto_score + llm_score) / 2, 2)

        elif fluency_result:
            # For non-Part 2: Weight fluency heavily
            fluency_score = enhanced_metrics["fluency"].get('fluency_score', 0) / 10

            # Blend: 30% auto (fluency), 70% LLM
            llm_score = assessment.get('score', 5)
            assessment['score'] = round((fluency_score * 0.30 + llm_score * 0.70), 2)

    # Check confidence threshold
    if confidence is not None and confidence < 0.50:
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
