import hashlib
import time
from copy import deepcopy
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from . import ai, storage
from . import schemas as s
from .course_deletion import delete_course_tree
from .db import get_db
from .grading import GradingError, assessment_view, check_config, review_question
from .knowledge import chunk_scope, set_mappings, topic_data
from .models import (
    Assignment,
    Attempt,
    Audit,
    BookSection,
    Course,
    CourseEnrollment,
    Document,
    Exam,
    ExamEnrollment,
    ExamSession,
    LearningOutcome,
    MediaCleanup,
    ReEvaluation,
    ReviewJob,
    Rubric,
    Section,
    Topic,
    TopicDocument,
    Upload,
    User,
    uid,
)
from .retakes import allowance, history_row, sessions_for
from .runtime_settings import settings
from .security import admin, by_id, course_access, editor, examiner, fail, hasher, public_user, staff
from .speech import google_ready, policy
from .worker import finalize, grade_answer

router = APIRouter()


def data(row, *fields):
    return {k: getattr(row, k) for k in ("id", *fields)}


def course_list(db, user):
    query = select(Course).order_by(Course.created_at.desc())
    return db.scalars(query).all()


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user=Depends(staff)):
    ids = [c.id for c in course_list(db, user)]
    return {
        "courses": len(ids),
        "exams": db.scalar(select(func.count()).select_from(Exam).where(Exam.course_id.in_(ids))),
        "documents": db.scalar(select(func.count()).select_from(Document).where(Document.course_id.in_(ids))),
        "sessions": db.scalar(
            select(func.count()).select_from(ExamSession).join(Exam).where(Exam.course_id.in_(ids), ExamSession.deleted_at.is_(None))
        ),
        "ai_provider": settings().ai_provider,
    }


@router.get("/users")
def users(db: Session = Depends(get_db), user=Depends(staff)):
    query = select(User).order_by(User.created_at.desc())
    if user.role not in {"SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER"}:
        query = query.where(User.role == "STUDENT")
    return [public_user(u) for u in db.scalars(query)]


@router.post("/users", status_code=201)
def create_user(body: s.UserIn, db: Session = Depends(get_db), user=Depends(admin)):
    row = User(**body.model_dump(exclude={"password"}), password_hash=hasher.hash(body.password))
    db.add(row)
    db.add(Audit(user_id=user.id, event="USER_CREATED", details={"username": row.username}))
    db.commit()
    return public_user(row)


@router.get("/courses")
def courses(db: Session = Depends(get_db), user=Depends(staff)):
    return [data(c, "code", "name", "description", "status", "owner_id") for c in course_list(db, user)]


@router.post("/courses", status_code=201)
def create_course(body: s.CourseIn, db: Session = Depends(get_db), user=Depends(editor)):
    row = Course(**body.model_dump(), owner_id=user.id)
    db.add(row)
    db.commit()
    return data(row, "code", "name", "description", "status")


@router.put("/courses/{course_id}")
def update_course(course_id: str, body: s.CourseIn, db: Session = Depends(get_db), user=Depends(editor)):
    row = course_access(db, course_id, user)
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.commit()
    return data(row, "code", "name", "description", "status")


@router.delete("/courses/{course_id}")
def delete_course(
    course_id: str, body: s.CourseDeleteIn | None = None,
    db: Session = Depends(get_db), user=Depends(editor),
):
    if body is not None:
        if user.role not in {"SYSTEM_ADMIN", "ADMIN"}:
            fail(403, "FORBIDDEN", "Chỉ admin được xóa toàn bộ môn học và dữ liệu liên quan")
        return delete_course_tree(db, course_id, body.confirm_code, user)
    row = course_access(db, course_id, user)
    for model in (LearningOutcome, Topic, Document, Rubric, Exam, CourseEnrollment):
        if db.scalar(select(model.id).where(model.course_id == course_id).limit(1)):
            fail(
                409,
                "COURSE_IN_USE",
                "Môn học còn dữ liệu. Xóa dữ liệu liên quan trước hoặc lưu trữ môn học để giữ lịch sử.",
            )
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/courses/{course_id}/archive")
def archive_course(course_id: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = course_access(db, course_id, user)
    row.status = "ARCHIVED"
    db.commit()
    return {"status": "ARCHIVED"}


@router.post("/courses/{course_id}/restore")
def restore_course(course_id: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = course_access(db, course_id, user)
    row.status = "ACTIVE"
    db.commit()
    return {"status": "ACTIVE"}


@router.get("/courses/{course_id}/workspace")
def workspace(course_id: str, db: Session = Depends(get_db), user=Depends(staff)):
    course_access(db, course_id, user)

    def rows(model, *fields):
        return [
            data(r, *fields)
            for r in db.scalars(select(model).where(model.course_id == course_id).order_by(model.created_at))
        ]

    return {
        "outcomes": rows(LearningOutcome, "code", "description", "weight"),
        "topics": [
            topic_data(db, t)
            for t in db.scalars(select(Topic).where(Topic.course_id == course_id).order_by(Topic.created_at))
        ],
        "documents": rows(
            Document,
            "filename",
            "status",
            "error",
            "topic_id",
            "version",
            "embedding_model",
            "kind",
            "page_count",
        ),
        "chapters": rows(BookSection, "document_id", "title", "level", "start_page", "end_page", "source"),
        "rubrics": rows(Rubric, "name", "version", "criteria"),
        "exams": [
            data(exam, "name", "status", "blueprint", "time_limit", "rubric_id", "max_attempts")
            | {"questions": [
                {"text": q["text"], "english_terms": q.get("english_terms", [])}
                for q in (exam.snapshot or {}).get("questions", [])
            ]}
            for exam in db.scalars(select(Exam).where(Exam.course_id == course_id).order_by(Exam.created_at))
        ],
    }


@router.post("/courses/{course_id}/outcomes", status_code=201)
def create_outcome(course_id: str, body: s.LOIn, db: Session = Depends(get_db), user=Depends(editor)):
    course_access(db, course_id, user)
    row = LearningOutcome(course_id=course_id, **body.model_dump())
    db.add(row)
    db.commit()
    return data(row, "code", "description", "weight")


@router.put("/outcomes/{key}")
def update_outcome(key: str, body: s.LOIn, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, LearningOutcome, key)
    course_access(db, row.course_id, user)
    for field, value in body.model_dump().items():
        setattr(row, field, value)
    db.commit()
    return data(row, "code", "description", "weight")


@router.delete("/outcomes/{key}")
def delete_outcome(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, LearningOutcome, key)
    course_access(db, row.course_id, user)
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/courses/{course_id}/topics", status_code=201)
def create_topic(course_id: str, body: s.TopicIn, db: Session = Depends(get_db), user=Depends(editor)):
    course_access(db, course_id, user)
    row = Topic(course_id=course_id, learning_outcome_id=body.learning_outcome_ids[0], name=body.name)
    db.add(row)
    set_mappings(db, row, body)
    db.commit()
    return topic_data(db, row)


@router.put("/topics/{key}")
def update_topic(key: str, body: s.TopicIn, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, Topic, key, lock=True)
    course_access(db, row.course_id, user)
    set_mappings(db, row, body)
    db.commit()
    return topic_data(db, row)


@router.delete("/topics/{key}")
def delete_topic(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, Topic, key)
    course_access(db, row.course_id, user)
    if any(
        any(b["topic_id"] == key for b in e.blueprint)
        for e in db.scalars(select(Exam).where(Exam.course_id == row.course_id))
    ):
        fail(409, "IN_USE", "Chủ đề đang được sử dụng trong bài thi")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/courses/{course_id}/documents", status_code=201)
async def upload_document(
    course_id: str,
    topic_id: str | None = Form(default=None),
    kind: str = Form(default="SUPPLEMENT"),
    file: UploadFile = File(),
    db: Session = Depends(get_db),
    user=Depends(editor),
):
    course_access(db, course_id, user)
    if kind not in {"TEXTBOOK", "SUPPLEMENT"}:
        fail(422, "INVALID_KIND", "Loại tài liệu không hợp lệ")
    if topic_id and by_id(db, Topic, topic_id).course_id != course_id:
        fail(422, "CROSS_COURSE", "Chủ đề không thuộc môn học")
    filename = Path(file.filename or "").name[:250]
    ext = filename.rsplit(".", 1)[-1].lower()
    if kind == "TEXTBOOK":
        if ext != "pdf" or topic_id:
            fail(422, "TEXTBOOK_PDF", "Giáo trình là PDF dùng chung cho môn, không chọn chủ đề")
        if db.scalar(select(Document.id).where(Document.course_id == course_id, Document.kind == "TEXTBOOK")):
            fail(409, "TEXTBOOK_EXISTS", "Môn học đã có giáo trình PDF")
    if ext not in {"pdf", "pptx", "docx", "txt"}:
        fail(422, "INVALID_FORMAT", "Chỉ nhận PDF, PPTX, DOCX, TXT")
    limit = (settings().max_textbook_mb if kind == "TEXTBOOK" else settings().max_document_mb) * 1024 * 1024
    content = await file.read(limit + 1)
    if not content or len(content) > limit:
        fail(413, "DOCUMENT_SIZE", "Tài liệu rỗng hoặc quá lớn")
    key = f"documents/{uid()}/{filename}"
    storage.put(key, content)
    row = Document(
        course_id=course_id,
        topic_id=topic_id,
        kind=kind,
        filename=filename,
        storage_key=key,
        embedding_model=ai.embedding_name(),
    )
    db.add(row)
    db.flush()
    if topic_id:
        db.add(TopicDocument(topic_id=topic_id, document_id=row.id))
    db.add(Audit(user_id=user.id, event="DOCUMENT_UPLOADED", details={"course_id": course_id}))
    db.commit()
    return data(row, "filename", "status")


@router.get("/documents/{key}/content")
def document_content(key: str, db: Session = Depends(get_db), user=Depends(staff)):
    document = by_id(db, Document, key)
    course_access(db, document.course_id, user)
    return Response(
        storage.get(document.storage_key),
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename*=UTF-8''" + quote(document.filename, safe="")},
    )


@router.put("/documents/{key}/file")
async def replace_failed_textbook(
    key: str, file: UploadFile = File(), db: Session = Depends(get_db), user=Depends(editor)
):
    row = by_id(db, Document, key, lock=True)
    course_access(db, row.course_id, user)
    if row.kind != "TEXTBOOK" or row.status != "FAILED":
        fail(
            409,
            "INVALID_STATE",
            "Chỉ thay PDF giáo trình xử lý lỗi; giáo trình đã dùng phải được giữ để đối chiếu",
        )
    name = Path(file.filename or "").name[:250]
    limit = settings().max_textbook_mb * 1024 * 1024
    content = await file.read(limit + 1)
    if not name.lower().endswith(".pdf") or not content.startswith(b"%PDF-") or len(content) > limit:
        fail(422, "INVALID_PDF", "Cần file PDF hợp lệ trong giới hạn dung lượng giáo trình")
    storage_key = f"documents/{uid()}/{name}"
    storage.put(storage_key, content)
    row.storage_key, row.filename = storage_key, name
    row.status, row.error, row.version = "PENDING", None, row.version + 1
    db.add(
        Audit(
            user_id=user.id,
            event="FAILED_TEXTBOOK_REPLACED",
            details={"document_id": key, "version": row.version},
        )
    )
    db.commit()
    return data(row, "filename", "status", "version")


@router.post("/documents/{key}/chapters", status_code=201)
def add_section(key: str, body: s.BookSectionIn, db: Session = Depends(get_db), user=Depends(editor)):
    doc = by_id(db, Document, key)
    course_access(db, doc.course_id, user)
    if doc.kind != "TEXTBOOK" or doc.status != "READY" or body.end_page > (doc.page_count or 0):
        fail(422, "INVALID_PAGES", "Chọn số trang PDF hợp lệ của giáo trình đã xử lý")
    row = BookSection(course_id=doc.course_id, document_id=doc.id, **body.model_dump(), source="MANUAL")
    db.add(row)
    db.commit()
    return data(row, "title", "level", "start_page", "end_page", "source")


@router.put("/chapters/{key}")
def update_section(key: str, body: s.BookSectionIn, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, BookSection, key, lock=True)
    course_access(db, row.course_id, user)
    if body.end_page > (by_id(db, Document, row.document_id).page_count or 0):
        fail(422, "INVALID_PAGES", "Trang vượt số trang PDF")
    for field, value in body.model_dump().items():
        setattr(row, field, value)
    row.source = "MANUAL"
    db.commit()
    return data(row, "title", "level", "start_page", "end_page", "source")


@router.delete("/chapters/{key}")
def delete_section(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, BookSection, key)
    course_access(db, row.course_id, user)
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/documents/{key}/retry")
def retry_document(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, Document, key, lock=True)
    course_access(db, row.course_id, user)
    if row.status != "FAILED":
        fail(409, "INVALID_STATE", "Chỉ xử lý lại tài liệu lỗi")
    row.status, row.error, row.embedding_model = "PENDING", None, ai.embedding_name()
    db.commit()
    return {"status": row.status}


@router.get("/courses/{course_id}/rag")
def rag_debug(course_id: str, topic_id: str, q: str, db: Session = Depends(get_db), user=Depends(staff)):
    course_access(db, course_id, user)
    if not q.strip() or len(q) > 3000:
        fail(422, "INVALID_QUERY", "Truy vấn phải từ 1–3000 ký tự")
    return ai.retrieve(db, course_id, topic_id, q)


@router.post("/courses/{course_id}/rubrics", status_code=201)
def create_rubric(course_id: str, body: s.RubricIn, db: Session = Depends(get_db), user=Depends(editor)):
    course_access(db, course_id, user)
    row = Rubric(course_id=course_id, **body.model_dump())
    db.add(row)
    db.commit()
    return data(row, "name", "criteria", "version")


@router.put("/rubrics/{key}")
def update_rubric(key: str, body: s.RubricIn, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, Rubric, key, lock=True)
    course_access(db, row.course_id, user)
    row.name, row.criteria, row.version = body.name, body.model_dump()["criteria"], row.version + 1
    db.commit()
    return data(row, "name", "criteria", "version")


@router.delete("/rubrics/{key}")
def delete_rubric(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, Rubric, key, lock=True)
    course_access(db, row.course_id, user)
    if db.scalar(select(Exam.id).where(Exam.rubric_id == key).limit(1)):
        fail(
            409,
            "RUBRIC_IN_USE",
            "Rubric đang được đề thi sử dụng. Đổi rubric hoặc xóa đề nháp liên quan trước; đề đã công bố giữ nguyên lịch sử.",
        )
    db.delete(row)
    db.commit()
    return {"ok": True}


def validate_exam(db, body, user):
    course = course_access(db, body.course_id, user)
    if course.status != "ACTIVE":
        fail(409, "ARCHIVED", "Môn học đã lưu trữ")
    if by_id(db, Rubric, body.rubric_id).course_id != body.course_id:
        fail(422, "CROSS_COURSE", "Rubric không thuộc môn học")
    for row in body.blueprint:
        if by_id(db, Topic, row.topic_id).course_id != body.course_id:
            fail(422, "CROSS_COURSE", "Blueprint chứa chủ đề không thuộc môn học")


@router.post("/exams", status_code=201)
def create_exam(body: s.ExamIn, db: Session = Depends(get_db), user=Depends(editor)):
    validate_exam(db, body, user)
    if user.role not in {"SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER"} and body.max_attempts != 1:
        fail(403, "FORBIDDEN", "Chỉ admin được cấu hình số lượt làm bài")
    row = Exam(**body.model_dump())
    db.add(row)
    db.commit()
    return data(row, "name", "status")


@router.put("/exams/{key}")
def update_exam(key: str, body: s.ExamIn, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, Exam, key, lock=True)
    course_access(db, row.course_id, user)
    if row.status != "DRAFT":
        fail(409, "PUBLISHED", "Không sửa đề đã công bố")
    if body.course_id != row.course_id:
        fail(422, "CROSS_COURSE", "Không chuyển đề thi sang môn học khác")
    validate_exam(db, body, user)
    if user.role not in {"SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER"} and body.max_attempts != row.max_attempts:
        fail(403, "FORBIDDEN", "Chỉ admin được cấu hình số lượt làm bài")
    for field, value in body.model_dump().items():
        setattr(row, field, value)
    db.commit()
    return data(row, "name", "status", "max_attempts")


@router.delete("/exams/{key}")
def delete_exam(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    row = by_id(db, Exam, key, lock=True)
    course_access(db, row.course_id, user)
    if row.status != "DRAFT":
        fail(409, "PUBLISHED", "Không xóa đề đã công bố")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/exams/{key}/copy", status_code=201)
def copy_exam(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    source = by_id(db, Exam, key)
    body = s.ExamIn(
        course_id=source.course_id,
        rubric_id=source.rubric_id,
        name=f"{source.name[:189]} (bản sao)",
        time_limit=source.time_limit,
        blueprint=deepcopy(source.blueprint),
        max_attempts=source.max_attempts,
    )
    validate_exam(db, body, user)
    row = Exam(**body.model_dump())
    db.add(row)
    db.commit()
    return data(row, "name", "status", "blueprint", "time_limit", "rubric_id", "max_attempts")


@router.post("/exams/{key}/publish")
def publish(key: str, db: Session = Depends(get_db), user=Depends(editor)):
    exam = by_id(db, Exam, key, lock=True)
    course_access(db, exam.course_id, user)
    if exam.status == "PUBLISHED":
        return {"status": exam.status}
    rubric = by_id(db, Rubric, exam.rubric_id)
    docs = db.scalars(
        select(Document).where(
            Document.course_id == exam.course_id,
            Document.status == "READY",
            Document.embedding_model == ai.embedding_name(),
        )
    ).all()
    if not docs:
        fail(409, "KNOWLEDGE_NOT_READY", "Cần tài liệu READY với cấu hình embedding hiện tại")
    questions = []
    topic_scopes = {}
    mappings = {}
    for row in exam.blueprint:
        topic = by_id(db, Topic, row["topic_id"])
        topic_scopes[topic.id] = chunk_scope(db, exam.course_id, topic.id, ai.embedding_name())
        mappings[topic.id] = topic_data(db, topic)
        mappings[topic.id]["outcomes"] = [
            data(by_id(db, LearningOutcome, lo), "code", "description", "weight")
            for lo in mappings[topic.id]["learning_outcome_ids"]
        ]
        mappings[topic.id]["chapters"] = [
            data(by_id(db, BookSection, chapter), "title", "level", "start_page", "end_page")
            for chapter in mappings[topic.id]["chapter_ids"]
        ]
        chunks = ai.retrieve(
            db, exam.course_id, topic.id, topic.name, [d.id for d in docs], topic_scopes[topic.id]
        )
        if not chunks:
            fail(409, "NO_EVIDENCE", f"Chủ đề {topic.name} chưa có tài liệu READY")
        for _ in range(row["count"]):
            question = ai.generate_question(
                topic,
                row["difficulty"],
                chunks,
                [q["text"] for q in questions],
                outcomes=mappings[topic.id]["outcomes"],
            )
            questions.append(
                question
                | {
                    "topic_id": topic.id,
                    "learning_outcome_id": topic.learning_outcome_id,
                    "learning_outcome_ids": mappings[topic.id]["learning_outcome_ids"],
                    "chapter_ids": mappings[topic.id]["chapter_ids"],
                    "difficulty": row["difficulty"],
                }
            )
    doc_ids = sorted(d.id for d in docs)
    exam.snapshot = {
        "exam_version": 2,
        "generation_prompt_version": "topic-los-english-terms-v3",
        "topic_chunk_ids": topic_scopes,
        "topic_mappings": mappings,
        "rubric_id": rubric.id,
        "rubric_version": rubric.version,
        "criteria": rubric.criteria,
        "document_ids": doc_ids,
        "questions": questions,
        "knowledge_version": hashlib.sha256(
            ",".join(sorted({c for ids in topic_scopes.values() for c in ids})).encode()
        ).hexdigest(),
        "ai_provider": settings().ai_provider,
        "llm_model": settings().llm_model,
        "embedding_model": ai.embedding_name(),
        "prompt_version": ai.PROMPT_VERSION,
        "published_at": time.time(),
    }
    exam.status = "PUBLISHED"
    db.add(Audit(user_id=user.id, event="EXAM_PUBLISHED", details={"exam_id": exam.id}))
    db.commit()
    return {"status": exam.status, "question_count": len(questions)}


@router.post("/exams/{key}/assign")
def assign(key: str, body: s.AssignIn, db: Session = Depends(get_db), user=Depends(editor)):
    exam = by_id(db, Exam, key, lock=True)
    course_access(db, exam.course_id, user)
    if exam.status != "PUBLISHED":
        fail(409, "NOT_PUBLISHED", "Công bố đề trước khi giao bài")
    for student_id in set(body.student_ids):
        target = by_id(db, User, student_id)
        if target.role != "STUDENT" or target.status != "ACTIVE":
            fail(422, "NOT_STUDENT", "Chỉ giao bài cho sinh viên đang hoạt động")
        if not db.scalar(
            select(Assignment).where(Assignment.exam_id == key, Assignment.student_id == student_id)
        ):
            db.add(Assignment(exam_id=key, student_id=student_id))
    db.commit()
    return {"ok": True}


@router.get("/results")
def results(db: Session = Depends(get_db), user=Depends(staff)):
    query = (
        select(ExamSession, Exam, User)
        .join(Exam, Exam.id == ExamSession.exam_id)
        .join(User, User.id == ExamSession.student_id)
        .where(ExamSession.deleted_at.is_(None))
    )
    if user.role == "TEACHER":
        query = query.join(Course, Course.id == Exam.course_id).where(
            or_(Course.owner_id == user.id, Course.code == "ORAL-PRACTICE")
        )
    return [
        history_row(session)
        | {"exam_name": exam.name, "student_name": student.name,
           "student_id": student.id, "exam_id": exam.id, **allowance(db, exam, student.id)}
        for session, exam, student in db.execute(query.order_by(ExamSession.created_at.desc()))
    ]


@router.get("/results/{key}")
def review(key: str, db: Session = Depends(get_db), user=Depends(staff)):
    session = by_id(db, ExamSession, key)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    exam = by_id(db, Exam, session.exam_id)
    course_access(db, exam.course_id, user)
    attempts = db.scalars(select(Attempt).where(Attempt.session_id == key).order_by(Attempt.sequence)).all()
    return history_row(session) | {
        "exam_id": exam.id, "student_id": session.student_id,
        **allowance(db, exam, session.student_id),
        "history": [history_row(row) for row in sessions_for(db, exam.id, session.student_id)],
        "exam_name": exam.name,
        "snapshot": exam.snapshot,
        "student_name": by_id(db, User, session.student_id).name,
        "attempts": [
            data(a, "sequence", "question", "transcript", "stt_confidence", "assessment", "status")
            | {
                "assessment": assessment_view(a.assessment, exam),
                "grading_targets": grading_targets(db, exam, a),
                "evidence": [
                    data(e, "id", "kind", "status", "sha256", "size")
                    for e in db.scalars(
                        select(Upload).where(Upload.attempt_id == a.id, Upload.status == "COMPLETED")
                    )
                ],
                "reviews": [
                    data(
                        j,
                        "status",
                        "reason",
                        "policy",
                        "original",
                        "result",
                        "error",
                        "created_at",
                        "completed_at",
                        "requested_by",
                    )
                    for j in db.scalars(
                        select(ReviewJob)
                        .where(ReviewJob.attempt_id == a.id)
                        .order_by(ReviewJob.created_at.desc())
                    )
                ],
            }
            for a in attempts
        ],
    }


def grading_targets(db, exam, attempt):
    targets = []
    for candidate in db.scalars(select(Exam).where(Exam.course_id == exam.course_id, Exam.status == "PUBLISHED")):
        try:
            review_question(exam, candidate, attempt)
        except GradingError:
            continue
        targets.append({"id": candidate.id, "name": candidate.name,
                        "model": candidate.snapshot["llm_model"]})
    return targets


@router.post("/attempts/{key}/grade-review", status_code=202)
def grade_review(key: str, body: s.GradeReviewIn, db: Session = Depends(get_db), user=Depends(admin)):
    attempt = by_id(db, Attempt, key, lock=True)
    session = by_id(db, ExamSession, attempt.session_id, lock=True)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    exam = by_id(db, Exam, session.exam_id)
    course_access(db, exam.course_id, user)
    if session.status not in {"SUBMITTED", "REVIEW_REQUIRED", "COMPLETED"} or attempt.status != "GRADED":
        fail(409, "NOT_FINISHED", "Chờ nộp bài và hoàn tất xử lý lần đầu")
    if not attempt.transcript or not attempt.finished_at:
        fail(409, "NO_TRANSCRIPT", "Chưa có transcript đã nộp để chấm lại")
    target = by_id(db, Exam, body.target_exam_id)
    try:
        review_question(exam, target, attempt)
    except GradingError as exc:
        fail(409, exc.code, str(exc))
    pending = db.scalar(select(ReviewJob).where(ReviewJob.attempt_id == key, ReviewJob.status == "PENDING"))
    if pending:
        if pending.policy == {"provider": "grading", "target_exam_id": target.id}:
            return data(pending, "status")
        fail(409, "REVIEW_PENDING", "Đang có yêu cầu xử lý khác; hãy chờ hoàn tất")
    job = ReviewJob(attempt_id=key, requested_by=user.id, reason=body.reason,
                    policy={"provider": "grading", "target_exam_id": target.id},
                    original={"transcript": attempt.transcript, "stt_confidence": attempt.stt_confidence,
                              "assessment": attempt.assessment, "source_exam_id": exam.id})
    db.add(job)
    session.status, session.final_score = "REVIEW_REQUIRED", None
    db.flush()
    db.add(Audit(user_id=user.id, event="GRADING_REVIEW_REQUESTED",
                 details={"job_id": job.id, "attempt_id": key, "target_exam_id": target.id, "reason": body.reason}))
    db.commit()
    return data(job, "status")


@router.post("/attempts/{key}/google-review", status_code=202)
def google_review(key: str, body: s.ReviewIn, db: Session = Depends(get_db), user=Depends(admin)):
    return request_transcription_review(key, body, db, user, "google")


@router.post("/attempts/{key}/gemini-review", status_code=202)
def gemini_review(key: str, body: s.ReviewIn, db: Session = Depends(get_db), user=Depends(admin)):
    return request_transcription_review(key, body, db, user, "gemini")


def request_transcription_review(key, body, db, user, provider):
    attempt = by_id(db, Attempt, key, lock=True)
    session = by_id(db, ExamSession, attempt.session_id, lock=True)
    exam = by_id(db, Exam, session.exam_id)
    course_access(db, exam.course_id, user)
    try:
        check_config(exam)
    except GradingError as exc:
        fail(409, exc.code, str(exc))
    if session.status not in {"SUBMITTED", "REVIEW_REQUIRED", "COMPLETED"} or attempt.status != "GRADED":
        fail(409, "NOT_FINISHED", "Chờ sinh viên nộp bài và hoàn tất chấm lần đầu")
    if provider == "gemini" and not settings().gemini_api_key:
        fail(422, "GEMINI_NOT_CONFIGURED", "Cấu hình GEMINI_API_KEY trên server để nhận dạng lại bằng Gemini")
    if provider == "google" and not google_ready():
        fail(
            422,
            "GOOGLE_NOT_CONFIGURED",
            "Upload JSON Google hợp lệ trong Cấu hình giọng nói trước khi nhận dạng lại",
        )
    existing = db.scalar(select(ReviewJob).where(ReviewJob.attempt_id == key, ReviewJob.status == "PENDING"))
    if existing:
        if existing.policy["provider"] != provider:
            fail(409, "REVIEW_PENDING", "Đang có yêu cầu nhận dạng lại bằng nhà cung cấp khác. Chờ hoàn tất trước khi đổi.")
        return data(existing, "status")
    audio = db.scalar(
        select(Upload).where(Upload.attempt_id == key, Upload.kind == "AUDIO", Upload.status == "COMPLETED")
    )
    if not audio:
        fail(409, "AUDIO_NOT_READY", "Chưa có audio gốc đã tải lên hoàn tất")
    previous = db.scalar(
        select(ReviewJob)
        .where(ReviewJob.attempt_id == key, ReviewJob.status == "COMPLETED")
        .order_by(ReviewJob.created_at.desc())
        .limit(1)
    )
    job = ReviewJob(
        attempt_id=key,
        requested_by=user.id,
        reason=body.reason,
        policy=policy(db)
        | {"provider": provider}
        | ({"model": settings().gemini_stt_model, "preprocessing": "off"} if provider == "gemini" else {}),
        original={
            "transcript": previous.result["transcript"] if previous else attempt.transcript,
            "stt_confidence": previous.result["stt_confidence"] if previous else attempt.stt_confidence,
            "submitted_transcript": attempt.transcript,
            "assessment": attempt.assessment,
            "audio_id": audio.id,
            "audio_sha256": audio.sha256,
        },
    )
    db.add(job)
    session.status, session.final_score = "REVIEW_REQUIRED", None
    db.flush()
    db.add(
        Audit(
            user_id=user.id,
            event=provider.upper() + "_REVIEW_REQUESTED",
            details={"job_id": job.id, "attempt_id": key, "reason": body.reason},
        )
    )
    db.commit()
    return data(job, "status")


@router.put("/users/{key}/role")
def change_role(key: str, body: s.RoleIn, db: Session = Depends(get_db), user=Depends(admin)):
    admins = db.scalars(
        select(User).where(User.role.in_(("SYSTEM_ADMIN", "ADMIN")), User.status == "ACTIVE").order_by(User.id).with_for_update()
    ).all()
    row = by_id(db, User, key, lock=True)
    if row.role in {"SYSTEM_ADMIN", "ADMIN"} and body.role not in {"SYSTEM_ADMIN", "ADMIN"} and row.status == "ACTIVE" and len(admins) <= 1:
        fail(409, "LAST_ADMIN", "Cần giữ ít nhất một quản trị viên đang hoạt động")
    before = row.role
    row.role = body.role
    db.add(
        Audit(
            user_id=user.id,
            event="USER_ROLE_CHANGED",
            details={"user_id": row.id, "before": before, "after": body.role},
        )
    )
    db.commit()
    return public_user(row)


@router.get("/courses/{course_id}/students")
def course_students(course_id: str, detail: bool = False, db: Session = Depends(get_db), user=Depends(staff)):
    course_access(db, course_id, user)
    direct_ids = set(
        db.scalars(select(CourseEnrollment.student_id).where(CourseEnrollment.course_id == course_id))
    )
    sections = db.scalars(select(Section).where(Section.course_id == course_id)).all()
    section_map = {s.id: s.code for s in sections}
    section_enrollments = (
        db.scalars(select(ExamEnrollment).where(ExamEnrollment.section_id.in_(list(section_map.keys())))).all()
        if section_map
        else []
    )
    student_section = {se.student_id: section_map.get(se.section_id, "") for se in section_enrollments}
    all_student_ids = direct_ids | set(student_section.keys())

    if not detail:
        return list(all_student_ids if section_map else direct_ids)

    users = db.scalars(select(User).where(User.id.in_(list(all_student_ids)))).all() if all_student_ids else []
    return [
        {
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "status": u.status,
            "section_code": student_section.get(u.id, "Mặc định"),
        }
        for u in sorted(users, key=lambda x: x.username or "")
    ]


@router.post("/courses/{course_id}/students")
def enroll_students(course_id: str, body: s.AssignIn, db: Session = Depends(get_db), user=Depends(admin)):
    course_access(db, course_id, user)
    by_id(db, Course, course_id, lock=True)
    for key in set(body.student_ids):
        learner = by_id(db, User, key)
        if learner.status != "ACTIVE":
            fail(422, "INACTIVE_USER", "Tài khoản không hoạt động")
        if not db.scalar(
            select(CourseEnrollment.id).where(
                CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == key
            )
        ):
            db.add(CourseEnrollment(course_id=course_id, student_id=key))
    db.add(
        Audit(
            user_id=user.id,
            event="COURSE_ENROLLED",
            details={"course_id": course_id, "user_ids": body.student_ids},
        )
    )
    db.commit()
    return {"ok": True}


@router.delete("/courses/{course_id}/students/{student_id}")
def unenroll_student(course_id: str, student_id: str, db: Session = Depends(get_db), user=Depends(admin)):
    course_access(db, course_id, user)
    row = db.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == student_id
        )
    )
    if row:
        db.delete(row)
    db.add(
        Audit(
            user_id=user.id,
            event="COURSE_UNENROLLED",
            details={"course_id": course_id, "user_id": student_id},
        )
    )
    db.commit()
    return {"ok": True}


@router.put("/exams/{key}/attempt-policy")
def update_attempt_policy(key: str, body: s.AttemptPolicyIn, db: Session = Depends(get_db), user=Depends(admin)):
    exam = by_id(db, Exam, key, lock=True)
    previous = exam.max_attempts
    exam.max_attempts = body.max_attempts
    db.add(Audit(user_id=user.id, event="EXAM_ATTEMPT_POLICY", details={
        "exam_id": key, "previous": previous, "max_attempts": body.max_attempts,
    }))
    db.commit()
    return data(exam, "max_attempts")


@router.post("/results/{key}/retake")
def grant_retake(key: str, body: s.RetakeIn, db: Session = Depends(get_db), user=Depends(admin)):
    session = by_id(db, ExamSession, key)
    exam = by_id(db, Exam, session.exam_id, lock=True)
    db.refresh(session)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    if exam.max_attempts is None:
        fail(409, "UNLIMITED", "Bài thi đã cho làm lại không giới hạn")
    state = allowance(db, exam, session.student_id)
    assignment = db.scalar(select(Assignment).where(
        Assignment.exam_id == exam.id, Assignment.student_id == session.student_id,
    ))
    if not assignment:
        assignment = Assignment(exam_id=exam.id, student_id=session.student_id, extra_attempts=0)
        db.add(assignment)
    assignment.extra_attempts = max(
        assignment.extra_attempts + body.additional_attempts,
        state["attempt_count"] + body.additional_attempts - exam.max_attempts,
    )
    db.add(Audit(user_id=user.id, event="RETAKE_GRANTED", details={
        "exam_id": exam.id, "student_id": session.student_id,
        "additional_attempts": body.additional_attempts, "extra_attempts": assignment.extra_attempts,
    }))
    db.commit()
    return allowance(db, exam, session.student_id)


@router.delete("/results/{key}")
def delete_result(key: str, db: Session = Depends(get_db), user=Depends(admin)):
    session = by_id(db, ExamSession, key)
    # Share the exam lock with session creation and allowance changes.
    by_id(db, Exam, session.exam_id, lock=True)
    ids = list(db.scalars(select(Attempt.id).where(Attempt.session_id == key)))
    try:
        # Worker lock order is review job -> attempt -> session. NOWAIT also avoids
        # conflicting with upload/finish transactions and returns a retryable UI error.
        db.scalars(select(ReviewJob).where(ReviewJob.attempt_id.in_(ids)).with_for_update(nowait=True)).all()
        db.scalars(select(Attempt).where(Attempt.id.in_(ids)).with_for_update(nowait=True)).all()
        session = db.scalar(select(ExamSession).where(ExamSession.id == key)
                            .execution_options(populate_existing=True).with_for_update(nowait=True))
        uploads = db.scalars(select(Upload).where(Upload.attempt_id.in_(ids)).with_for_update(nowait=True)).all()
    except OperationalError as exc:
        if getattr(exc.orig, "sqlstate", None) != "55P03":
            raise
        db.rollback()
        fail(409, "SESSION_BUSY", "Lần thi đang được xử lý. Đợi hoàn tất rồi xóa lại.")
    if session.deleted_at is not None:
        return {"ok": True}
    for upload in uploads:
        db.add(MediaCleanup(upload_id=upload.id, storage_key=upload.storage_key))
    db.execute(delete(ReviewJob).where(ReviewJob.attempt_id.in_(ids)))
    db.execute(delete(Upload).where(Upload.attempt_id.in_(ids)))
    db.execute(delete(Attempt).where(Attempt.id.in_(ids)))
    session.deleted_at, session.status, session.final_score = time.time(), "DELETED", None
    db.add(Audit(user_id=user.id, event="EXAM_SESSION_DELETED", details={
        "session_id": key, "exam_id": session.exam_id, "student_id": session.student_id,
        "attempt_number": session.attempt_number, "media_count": len(uploads),
    }))
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────
# Phase 3: Grading Review, Transcript Correction, Score Override & Re-evaluation
# ─────────────────────────────────────────────────────────────────

@router.post("/attempts/{key}/regrade-transcript")
def regrade_transcript(
    key: str,
    body: s.RegradeTranscriptIn,
    db: Session = Depends(get_db),
    user=Depends(staff),
):
    attempt = by_id(db, Attempt, key, lock=True)
    session = by_id(db, ExamSession, attempt.session_id, lock=True)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    exam = by_id(db, Exam, session.exam_id)
    course_access(db, exam.course_id, user)

    prev_transcript = attempt.transcript
    attempt.transcript = body.corrected_transcript

    if not attempt.finished_at:
        attempt.finished_at = time.time()

    try:
        assessment = grade_answer(
            db,
            exam,
            session,
            attempt,
            body.corrected_transcript,
            attempt.stt_confidence or 1.0,
        )
    except Exception as exc:
        fail(500, "REGRADE_FAILED", f"Lỗi chấm lại: {exc}")

    assessment["transcript_edited"] = True
    assessment["original_transcript"] = prev_transcript
    assessment["edit_reason"] = body.reason
    assessment["edited_by"] = user.name
    assessment["edited_at"] = time.time()

    attempt.assessment = assessment
    attempt.status = "GRADED"
    db.flush()

    finalize(db, session)

    db.add(
        Audit(
            user_id=user.id,
            event="TRANSCRIPT_REGRADED",
            details={
                "attempt_id": key,
                "session_id": session.id,
                "reason": body.reason,
                "score": assessment.get("score"),
            },
        )
    )
    db.commit()

    return data(attempt, "sequence", "question", "transcript", "stt_confidence", "assessment", "status") | {
        "assessment": assessment_view(attempt.assessment, exam)
    }


@router.post("/attempts/{key}/override")
def override_attempt_score(
    key: str,
    body: s.ScoreOverrideIn,
    db: Session = Depends(get_db),
    user=Depends(staff),
):
    attempt = by_id(db, Attempt, key, lock=True)
    session = by_id(db, ExamSession, attempt.session_id, lock=True)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    exam = by_id(db, Exam, session.exam_id)
    course_access(db, exam.course_id, user)

    assessment = dict(attempt.assessment or {})
    prev_score = assessment.get("score")
    assessment["score"] = round(body.score, 2)
    assessment["manual_override"] = True
    assessment["override_reason"] = body.reason
    assessment["override_by"] = user.name
    assessment["overridden_at"] = time.time()

    if body.criteria and "criteria" in assessment:
        override_map = {c.name: c for c in body.criteria}
        updated_criteria = []
        for crit in assessment.get("criteria", []):
            crit_copy = dict(crit)
            if crit_copy.get("name") in override_map:
                item = override_map[crit_copy["name"]]
                crit_copy["score"] = item.score
                if item.feedback:
                    crit_copy["feedback"] = item.feedback
            updated_criteria.append(crit_copy)
        assessment["criteria"] = updated_criteria

    attempt.assessment = assessment
    attempt.status = "GRADED"
    db.flush()

    # Recalculate session final score
    attempts = db.scalars(select(Attempt).where(Attempt.session_id == session.id)).all()
    scores = [a.assessment.get("score") for a in attempts if a.assessment]
    if scores and all(s is not None for s in scores):
        session.final_score = round(sum(scores) / len(scores), 2)

    db.add(
        Audit(
            user_id=user.id,
            event="ATTEMPT_SCORE_OVERRIDDEN",
            details={
                "attempt_id": key,
                "session_id": session.id,
                "prev_score": prev_score,
                "score": body.score,
                "reason": body.reason,
            },
        )
    )
    db.commit()
    return data(attempt, "sequence", "question", "transcript", "stt_confidence", "assessment", "status") | {
        "assessment": assessment_view(attempt.assessment, exam)
    }


@router.post("/results/{key}/approve")
def approve_result(
    key: str,
    db: Session = Depends(get_db),
    user=Depends(staff),
):
    session = by_id(db, ExamSession, key, lock=True)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    exam = by_id(db, Exam, session.exam_id)
    course_access(db, exam.course_id, user)

    attempts = db.scalars(select(Attempt).where(Attempt.session_id == key)).all()
    if not attempts:
        fail(409, "NO_ATTEMPTS", "Chưa có câu trả lời nào để duyệt")

    for a in attempts:
        if not a.assessment or a.assessment.get("score") is None:
            fail(409, "INCOMPLETE_GRADING", f"Câu {a.sequence} chưa hoàn tất chấm điểm")

    scores = [a.assessment.get("score") for a in attempts]
    session.final_score = round(sum(scores) / len(scores), 2)
    session.status = "COMPLETED"

    db.add(
        Audit(
            user_id=user.id,
            event="EXAM_SESSION_APPROVED",
            details={"session_id": key, "student_id": session.student_id, "final_score": session.final_score},
        )
    )
    db.commit()
    return {
        "id": session.id,
        "status": session.status,
        "final_score": session.final_score,
    }


@router.post("/attempts/{key}/request-re-eval")
def request_re_evaluation_admin(
    key: str,
    body: s.ReEvaluationIn,
    db: Session = Depends(get_db),
    user=Depends(staff),
):
    attempt = by_id(db, Attempt, key)
    session = by_id(db, ExamSession, attempt.session_id)
    exam = by_id(db, Exam, session.exam_id)
    course_access(db, exam.course_id, user)

    by_id(db, User, body.teacher_id_2)

    original_score = attempt.assessment.get("score") if attempt.assessment else None

    row = ReEvaluation(
        attempt_id=key,
        teacher_id_1=user.id,
        teacher_id_2=body.teacher_id_2,
        reason=body.reason,
        reason_detail=body.reason_detail,
        blind_marking=body.blind_marking,
        score_1=original_score,
        status="PENDING",
    )
    db.add(row)
    db.add(
        Audit(
            user_id=user.id,
            event="REEVALUATION_REQUESTED",
            details={
                "attempt_id": key,
                "teacher_id_1": user.id,
                "teacher_id_2": body.teacher_id_2,
                "reason": body.reason,
            },
        )
    )
    db.commit()
    return {"id": row.id, "status": row.status}


@router.get("/re-evaluations")
def list_re_evaluations(
    db: Session = Depends(get_db),
    user=Depends(staff),
):
    query = select(ReEvaluation).order_by(ReEvaluation.created_at.desc())
    if user.role == "TEACHER":
        query = query.where((ReEvaluation.teacher_id_1 == user.id) | (ReEvaluation.teacher_id_2 == user.id))
    rows = db.scalars(query).all()
    results = []
    for r in rows:
        att = db.get(Attempt, r.attempt_id)
        sess = db.get(ExamSession, att.session_id) if att else None
        student = db.get(User, sess.student_id) if sess else None
        t1 = db.get(User, r.teacher_id_1)
        t2 = db.get(User, r.teacher_id_2)
        is_blind = r.blind_marking and user.id == r.teacher_id_2 and r.status != "COMPLETED"
        results.append({
            "id": r.id,
            "attempt_id": r.attempt_id,
            "session_id": sess.id if sess else None,
            "student_name": student.name if student else "N/A",
            "teacher_1_name": t1.name if t1 else "Giảng viên 1",
            "teacher_2_name": t2.name if t2 else "Giảng viên 2",
            "reason": r.reason,
            "reason_detail": r.reason_detail,
            "status": r.status,
            "score_1": None if is_blind else r.score_1,
            "score_2": r.score_2,
            "final_score": r.final_score,
            "blind_marking": r.blind_marking,
            "created_at": r.created_at,
            "completed_at": r.completed_at,
        })
    return results


@router.post("/re-evaluations/{key}/submit")
def submit_re_evaluation(
    key: str,
    body: s.ReEvaluationSubmitIn,
    db: Session = Depends(get_db),
    user=Depends(staff),
):
    row = by_id(db, ReEvaluation, key, lock=True)
    if user.role == "TEACHER" and row.teacher_id_2 != user.id:
        fail(403, "FORBIDDEN", "Bạn không phải giảng viên được phân công chấm thẩm định này")

    row.score_2 = round(body.score_2, 2)
    if row.score_1 is not None:
        row.final_score = round((row.score_1 + row.score_2) / 2, 2)
    else:
        row.final_score = row.score_2
    row.status = "COMPLETED"
    row.completed_at = time.time()

    att = db.get(Attempt, row.attempt_id)
    if att:
        assessment = dict(att.assessment or {})
        assessment["score"] = row.final_score
        assessment["re_evaluated"] = True
        assessment["re_eval_id"] = row.id
        att.assessment = assessment
        sess = db.get(ExamSession, att.session_id)
        if sess:
            attempts = db.scalars(select(Attempt).where(Attempt.session_id == sess.id)).all()
            scores = [a.assessment.get("score") for a in attempts if a.assessment]
            if scores and all(s is not None for s in scores):
                sess.final_score = round(sum(scores) / len(scores), 2)

    db.add(
        Audit(
            user_id=user.id,
            event="REEVALUATION_COMPLETED",
            details={"re_eval_id": row.id, "score_2": row.score_2, "final_score": row.final_score},
        )
    )
    db.commit()
    return {
        "id": row.id,
        "status": row.status,
        "score_2": row.score_2,
        "final_score": row.final_score,
    }
