"""Durable database queue. A transaction lock prevents duplicate workers; rollback permits crash retry."""

import hashlib
import logging
import shutil
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import select

from . import ai, runtime_settings, speech, storage
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


def grade_answer(db, exam, session, attempt, transcript, confidence):
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
            "knowledge_version": snapshot["knowledge_version"],
            "reasoning_summary": "Đã hoàn thành câu luyện tập. Bài này không tính điểm chính thức.",
        }
    check_config(exam)
    chunks = ai.retrieve(
        db,
        exam.course_id,
        attempt.question["topic_id"],
        attempt.question["text"] + "\n" + (transcript or ""),
        snapshot["document_ids"],
        frozen_chunks(db, exam, attempt),
    )
    assessment = ai.grade(
        attempt.question,
        transcript,
        snapshot["criteria"],
        chunks,
        confidence if attempt.finished_at <= session.started_at + exam.time_limit else 0,
    ) | {"rubric_version": snapshot["rubric_version"], "knowledge_version": snapshot["knowledge_version"]}

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
                                      job.original["transcript"], job.original["stt_confidence"] or 0)
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
            transcript = speech.transcribe_file(path, job.policy, prompt=prompt)
        except TypeError:
            transcript = speech.transcribe_file(path, job.policy)
    assessment = grade_answer(
        db, exam, session, attempt, transcript["transcript"], transcript["stt_confidence"]
    )
    job.result = transcript | {"assessment": assessment}
    # The submitted transcript and idempotency payload remain immutable.
    attempt.assessment = assessment
    job.status = "COMPLETED"


def transcribe_attempt_if_needed(db, attempt):
    """If attempt needs server-side STT, fetch audio from MinIO and transcribe with Whisper Large-v3."""
    if attempt.transcript and attempt.transcript != "AWAITING_STT":
        return attempt.transcript, attempt.stt_confidence or 0.0

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
        return attempt.transcript, attempt.stt_confidence

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
                result = speech.transcribe_file(path, prompt=prompt)
            except TypeError:
                result = speech.transcribe_file(path)
            attempt.transcript = result["transcript"]
            attempt.stt_confidence = result["stt_confidence"]
        except ValueError as exc:
            if "Không phát hiện giọng nói" in str(exc):
                attempt.transcript = "[No speech detected]"
                attempt.stt_confidence = 0.0
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
    return attempt.transcript, attempt.stt_confidence


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
            .where(Attempt.status == "SUBMITTED", Attempt.assessment.is_(None))
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
            transcript, stt_confidence = transcribe_attempt_if_needed(db, attempt)
            attempt.assessment = grade_answer(
                db, exam, session, attempt, transcript, stt_confidence
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
                "model": snapshot["llm_model"],
                "rubric_version": snapshot["rubric_version"],
                "knowledge_version": snapshot["knowledge_version"],
                "prompt_version": snapshot["prompt_version"],
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
