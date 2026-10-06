# Đặc tả API: Cán bộ Khảo thí (Examiner API)

> **Mô-đun:** Quản lý Học kỳ, Danh mục Môn học Khung, Candidate Pool Cấp Môn (Không chia lớp), Đợt thi & Thuật toán Phân bổ Tự động, Duyệt điểm, Khóa sổ điểm & Xuất bảng điểm FAP  
> **Vai trò truy cập:** `EXAMINER`, `SYSTEM_ADMIN`  
> **Tài liệu tham chiếu:** [docs/api/README.md](./README.md), [docs/superpowers/specs/2026-10-06-examiner-exam-management-design.md](../superpowers/specs/2026-10-06-examiner-exam-management-design.md)  
> **Tệp mã nguồn Backend:** `services/api/app/routes_examiner.py`, `services/api/app/routes_admin.py`

---

## 1. Bảng Tổng hợp Endpoint Khảo thí

| Nhóm chức năng | Phương thức | Đường dẫn API | Mô tả chức năng | Ghi chú & Trạng thái |
|---|---|---|---|---|
| **Học kỳ (Semester)** | `GET` | `/api/examiner/semesters` | Danh sách học kỳ (tên, năm, term, số môn học, status) | Chuẩn hóa List View |
| | `POST` | `/api/examiner/semesters` | Tạo học kỳ mới (Validate `end_date > start_date`, unique `year+term`) | Trả về `id` để redirect |
| | `GET` | `/api/examiner/semesters/{id}` | Lấy chi tiết học kỳ, thống kê và danh sách môn học trong kỳ | Mới cập nhật |
| | `POST` | `/api/examiner/semesters/{id}/activate` | Kích hoạt học kỳ hiện tại (`ACTIVE`) | Giữ nguyên |
| | `POST` | `/api/examiner/semesters/{id}/complete` | Kết thúc và đóng học kỳ (`COMPLETED`) | Giữ nguyên |
| **Môn học (Courses)** | `GET` | `/api/examiner/master-courses` | Danh mục môn học khung toàn trường (Master Course Catalog) | **Mới bổ sung** |
| | `POST` | `/api/examiner/semesters/{id}/courses` | Thêm môn vào học kỳ (Chọn từ Master Catalog hoặc Tạo mới có Mã ngành) | Bỏ GV phụ trách cấp môn |
| | `GET` | `/api/examiner/courses/{id}` | Lấy chi tiết thông tin môn học và thống kê Candidate Pool | Cập nhật |
| | `PUT` | `/api/examiner/courses/{id}` | Cập nhật thông tin môn học (Tên, Mã ngành, Tín chỉ, Mô tả) | Cập nhật |
| | `POST` | `/api/admin/courses/{id}/archive` | Lưu trữ môn học (`ARCHIVED`) | Giữ nguyên |
| | `DELETE`| `/api/admin/courses/{id}` | Xóa an toàn cascade bằng mã xác nhận | Giữ nguyên |
| **Thí sinh (Candidate Pool)** | `POST` | `/api/examiner/courses/{id}/candidates/import` | **Import Excel 3 cột (MSSV, Họ tên, Trạng thái đủ ĐK)**. Tự động tạo user `STUDENT`. | **Tuyệt đối không chia lớp** |
| | `GET` | `/api/examiner/courses/{id}/candidates` | Danh sách thí sinh của môn (filter theo trạng thái Đủ ĐK và trạng thái Phân bổ) | **Mới bổ sung** |
| | `POST` | `/api/examiner/enrollments/import` | *(Legacy)* Import theo lớp học phần cũ | Giữ hỗ trợ tương thích |
| **Kỳ thi & Đợt thi (Batches)**| `GET` | `/api/examiner/courses/{id}/exams` | Danh sách các kỳ thi của môn học | Cập nhật |
| | `POST` | `/api/examiner/courses/{id}/exams` | Khởi tạo kỳ thi (`name`, `exam_type`, `time_limit`, `question_count`) | Cập nhật |
| | `POST` | `/api/examiner/exams/{id}/batches` | **Tạo Đợt thi & Kích hoạt Thuật toán Phân bổ Thí sinh tự động** | **Trọng tâm Khảo thí** |
| | `GET` | `/api/examiner/exams/{id}/batches` | Danh sách các đợt thi, các phòng thi và số lượng thí sinh | **Mới bổ sung** |
| | `GET` | `/api/examiner/batches/{batch_id}/students`| Danh sách thí sinh trong đợt thi (chia theo từng phòng thi) | **Mới bổ sung** |
| | `POST` | `/api/examiner/exams/{id}/slots` | *(Legacy)* Tạo danh sách ca thi lẻ | Giữ hỗ trợ tương thích |
| **Duyệt điểm & FAP** | `GET` | `/api/examiner/slots/{id}/results` | Bảng điểm toàn bộ ca thi (điểm AI, GV, cờ lệch) | Giữ nguyên |
| | `POST` | `/api/examiner/attempts/{id}/request-re-eval`| Chỉ định Giảng viên 2 chấm mù độc lập (Phúc khảo)| Giữ nguyên |
| | `POST` | `/api/examiner/slots/{id}/lock` | Khóa sổ điểm ca thi (`GRADE_LOCKED`) | Giữ nguyên |
| | `POST` | `/api/examiner/slots/{id}/unlock` | Mở khóa sổ điểm khẩn cấp kèm lý do | Giữ nguyên |
| | `GET` | `/api/examiner/slots/{id}/export` | Xuất bảng điểm định dạng chuẩn FAP FPT (Excel/CSV)| Giữ nguyên |

---

## 2. Chi tiết Từng Endpoint

### 2.1. Quản lý Học kỳ (Semester Lifecycle)

#### Lấy danh sách học kỳ:
- **URL:** `GET /api/examiner/semesters`
- **Success Response (`200 OK`):**
```json
[
  {
    "id": "sem_fa2026",
    "name": "Học kỳ Thu 2026",
    "year": 2026,
    "term": "FALL",
    "status": "ACTIVE",
    "course_count": 8,
    "start_date": 1788220800.0,
    "end_date": 1798761600.0
  }
]
```

#### Tạo học kỳ mới:
- **URL:** `POST /api/examiner/semesters`
- **Request Body Schema (`schemas.SemesterCreateIn`):**
```json
{
  "name": "Học kỳ Thu 2026",
  "year": 2026,
  "term": "FALL",
  "start_date": 1788220800.0,
  "end_date": 1798761600.0
}
```
- **Quy tắc Validate:**
  - `end_date > start_date` (Nếu không thỏa mãn trả về `400 Bad Request`).
  - Cặp `(year, term)` không được trùng trong DB (Nếu trùng trả về `409 Conflict`).
- **Success Response (`201 Created`):**
```json
{
  "id": "sem_fa2026",
  "name": "Học kỳ Thu 2026",
  "year": 2026,
  "term": "FALL",
  "status": "DRAFT",
  "start_date": 1788220800.0,
  "end_date": 1798761600.0
}
```
*(Client tự động điều hướng sang `/semester/{id}` sau khi nhận phản hồi 201).*

#### Chi tiết học kỳ & danh sách môn:
- **URL:** `GET /api/examiner/semesters/{id}`
- **Success Response (`200 OK`):**
```json
{
  "id": "sem_fa2026",
  "name": "Học kỳ Thu 2026",
  "year": 2026,
  "term": "FALL",
  "status": "ACTIVE",
  "start_date": 1788220800.0,
  "end_date": 1798761600.0,
  "metrics": {
    "course_count": 8,
    "total_candidates": 450,
    "total_batches": 12
  },
  "courses": [
    {
      "id": "crs_mas291",
      "code": "MAS291",
      "name": "Statistics & Probability",
      "department_code": "SE",
      "credits": 3,
      "candidate_count": 90,
      "batch_count": 3
    }
  ]
}
```

---

### 2.2. Danh mục Môn học Khung & Thêm Môn vào Học kỳ

#### Lấy danh mục môn học khung toàn trường (Master Catalog):
- **URL:** `GET /api/examiner/master-courses`
- **Success Response (`200 OK`):**
```json
[
  {
    "id": "mc_mas291",
    "code": "MAS291",
    "name": "Statistics & Probability",
    "department_code": "SE",
    "credits": 3,
    "description": "Môn Xác suất thống kê ứng dụng AI"
  },
  {
    "id": "mc_prn211",
    "code": "PRN211",
    "name": "Basic Cross-Platform Application Programming",
    "department_code": "SE",
    "credits": 3,
    "description": "Lập trình đa nền tảng C# .NET"
  }
]
```

#### Thêm môn học vào học kỳ:
- **URL:** `POST /api/examiner/semesters/{semester_id}/courses`
- **Request Body Schema (`schemas.CourseAddIn`):**
  - **Cách 1: Chọn từ Master Catalog:**
  ```json
  {
    "master_course_id": "mc_mas291"
  }
  ```
  - **Cách 2: Khởi tạo môn học mới thủ công:**
  ```json
  {
    "department_code": "SE",
    "code": "MAS291",
    "name": "Statistics & Probability",
    "credits": 3,
    "description": "Môn Xác suất thống kê ứng dụng AI"
  }
  ```
  *(Lưu ý: Không còn trường `teacher_id` / `owner_id` cấp môn học).*
- **Success Response (`201 Created`):**
```json
{
  "id": "crs_mas291",
  "code": "MAS291",
  "name": "Statistics & Probability",
  "department_code": "SE",
  "credits": 3,
  "semester_id": "sem_fa2026",
  "status": "ACTIVE"
}
```

---

### 2.3. Candidate Pool & Import Thí sinh (Tuyệt đối không chia lớp)

#### Import Danh sách Thí sinh dự thi môn học từ Excel:
- **URL:** `POST /api/examiner/courses/{course_id}/candidates/import`
- **Request Body Schema (`schemas.CandidateImportIn`):**
```json
{
  "file_data": "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQAAAA..."
}
```
- **Cấu trúc File Excel chuẩn (3 cột bắt buộc):**
  1. `MSSV`: Mã số sinh viên (VD: `SE203555`).
  2. `Họ và tên`: Tên đầy đủ (VD: `Nguyễn Văn A`).
  3. `Trạng thái đủ điều kiện`: `ĐỦ ĐIỀU KIỆN` hoặc `CẤM THI` (hoặc `ELIGIBLE` / `DISQUALIFIED`).
- **Cơ chế xử lý tài khoản tự động:**
  - Nếu sinh viên chưa có tài khoản trong hệ thống $\rightarrow$ Tự động tạo user với:
    - `username`: `SE203555` (Mã số sinh viên)
    - `email`: `SE203555@student.edu.vn` (`{roll_number}@student.edu.vn`)
    - `password`: Mật khẩu mặc định bằng chính Mã số sinh viên (được băm bằng thuật toán Argon2)
    - `role`: `STUDENT`
    - `status`: `ACTIVE`
  - Sinh viên được lưu vào bảng `course_candidates` với trạng thái ban đầu: `allocation_status = 'UNASSIGNED'`.
  - Sinh viên `CẤM THI` được lưu vào hệ thống nhưng không được đưa vào hàng đợi xếp ca thi.
- **Success Response (`200 OK`):**
```json
{
  "total_rows": 50,
  "imported": 48,
  "skipped": 2,
  "created_users": 15,
  "errors": []
}
```

#### Lấy danh sách Thí sinh môn học (Candidate Pool):
- **URL:** `GET /api/examiner/courses/{course_id}/candidates`
- **Query Parameters:**
  - `eligibility_status` (optional): `ELIGIBLE` | `DISQUALIFIED`
  - `allocation_status` (optional): `UNASSIGNED` | `ASSIGNED`
  - `search` (optional): Tìm kiếm theo MSSV hoặc Họ tên
- **Success Response (`200 OK`):**
```json
{
  "total": 90,
  "eligible_count": 85,
  "disqualified_count": 5,
  "assigned_count": 60,
  "unassigned_count": 25,
  "candidates": [
    {
      "id": "cand_01",
      "roll_number": "SE203555",
      "full_name": "Nguyễn Văn Sinh Viên",
      "eligibility_status": "ELIGIBLE",
      "allocation_status": "ASSIGNED",
      "batch_id": "btc_01",
      "batch_name": "Đợt 1 - Ca sáng",
      "room": "AL-L401"
    },
    {
      "id": "cand_02",
      "roll_number": "SE203556",
      "full_name": "Trần Thị B",
      "eligibility_status": "ELIGIBLE",
      "allocation_status": "UNASSIGNED",
      "batch_id": null,
      "batch_name": null,
      "room": null
    }
  ]
}
```

---

### 2.4. Kỳ thi & Đợt thi (Exams & Exam Batches với Auto-Allocation)

#### Khởi tạo kỳ thi cho môn học:
- **URL:** `POST /api/examiner/courses/{course_id}/exams`
- **Request Body Schema (`schemas.ExamCreateIn`):**
```json
{
  "name": "Kỳ thi Cuối kỳ Fall 2026 - Final Oral Exam",
  "exam_type": "FINAL",
  "time_limit": 20,
  "question_count": 3
}
```
- **Success Response (`201 Created`):**
```json
{
  "id": "exm_01",
  "course_id": "crs_mas291",
  "name": "Kỳ thi Cuối kỳ Fall 2026 - Final Oral Exam",
  "exam_type": "FINAL",
  "time_limit": 20,
  "question_count": 3,
  "status": "DRAFT",
  "batch_count": 0
}
```

#### Tạo Đợt thi & Kích hoạt Thuật toán Phân bổ Tự động:
- **URL:** `POST /api/examiner/exams/{exam_id}/batches`
- **Request Body Schema (`schemas.CreateBatchIn`):**
```json
{
  "name": "Đợt 1 - Ca sáng",
  "date": 1792022400.0,
  "start_time": "08:00",
  "end_time": "10:00",
  "rooms": ["AL-L401", "AL-L402", "AL-L403"],
  "max_students_per_room": 15,
  "assigned_teacher_id": "usr_teacher01"
}
```
- **Mô tả Xử lý & Thuật toán Phân bổ:**
  1. Kiểm tra Giảng viên `assigned_teacher_id` có role `TEACHER` (phụ trách ra đề & chấm điểm cho đợt thi này).
  2. Khóa dòng dữ liệu (`SELECT ... FOR UPDATE`) lấy danh sách thí sinh `ELIGIBLE` + `UNASSIGNED` sắp xếp theo `roll_number ASC`.
  3. Tính tổng dung lượng đợt thi = `Số phòng x Sĩ số tối đa/phòng`.
  4. Lấy tối đa số lượng thí sinh theo dung lượng, chia đều thí sinh vào các phòng theo thuật toán Balanced Round-Robin Distribution.
  5. Tạo bản ghi `exam_batches` và các `schedule_slots` tương ứng từng phòng.
  6. Bulk update trạng thái thí sinh thành `ASSIGNED` và gán `assigned_slot_id`.
  7. **Không hỗ trợ đổi phòng/đổi ca thi thủ công.**
- **Success Response (`201 Created`):**
```json
{
  "batch_id": "btc_01",
  "name": "Đợt 1 - Ca sáng",
  "date": 1792022400.0,
  "start_time": "08:00",
  "end_time": "10:00",
  "assigned_teacher_id": "usr_teacher01",
  "total_assigned": 35,
  "remaining_unassigned": 25,
  "rooms": [
    { "slot_id": "slt_01", "room": "AL-L401", "assigned_count": 12 },
    { "slot_id": "slt_02", "room": "AL-L402", "assigned_count": 12 },
    { "slot_id": "slt_03", "room": "AL-L403", "assigned_count": 11 }
  ]
}
```

#### Lấy danh sách các Đợt thi của Kỳ thi:
- **URL:** `GET /api/examiner/exams/{exam_id}/batches`
- **Success Response (`200 OK`):**
```json
[
  {
    "id": "btc_01",
    "name": "Đợt 1 - Ca sáng",
    "date": 1792022400.0,
    "start_time": "08:00",
    "end_time": "10:00",
    "total_assigned": 35,
    "assigned_teacher": {
      "id": "usr_teacher01",
      "name": "TS. Lê Hoàng Minh",
      "username": "minhlh"
    },
    "rooms": [
      { "slot_id": "slt_01", "room": "AL-L401", "assigned_count": 12, "grade_locked": false },
      { "slot_id": "slt_02", "room": "AL-L402", "assigned_count": 12, "grade_locked": false },
      { "slot_id": "slt_03", "room": "AL-L403", "assigned_count": 11, "grade_locked": false }
    ]
  }
]
```

#### Lấy danh sách Thí sinh trong Đợt thi (chia theo từng phòng):
- **URL:** `GET /api/examiner/batches/{batch_id}/students`
- **Success Response (`200 OK`):**
```json
{
  "batch_id": "btc_01",
  "name": "Đợt 1 - Ca sáng",
  "rooms": [
    {
      "room": "AL-L401",
      "slot_id": "slt_01",
      "students": [
        { "student_id": "usr_stu01", "roll_number": "SE203555", "full_name": "Nguyễn Văn A" },
        { "student_id": "usr_stu02", "roll_number": "SE203557", "full_name": "Trần Văn C" }
      ]
    }
  ]
}
```

---

### 2.5. Duyệt điểm, Phúc khảo & Khóa sổ FAP

#### Lấy bảng điểm ca thi:
- **URL:** `GET /api/examiner/slots/{slot_id}/results`
- **Success Response (`200 OK`):**
```json
{
  "slot_id": "slt_01",
  "room": "AL-L401",
  "is_locked": false,
  "students": [
    {
      "student_id": "usr_stu01",
      "roll_number": "SE203555",
      "name": "Nguyễn Văn Sinh Viên",
      "ai_score": 8.2,
      "teacher_score": 8.5,
      "final_score": 8.5,
      "confidence": 0.88,
      "discrepancy": 0.3,
      "flag_discrepancy": false,
      "status": "APPROVED",
      "audio_url": "http://localhost:9000/evidence/att_01_audio.webm"
    }
  ]
}
```

#### Yêu cầu Phúc khảo Chấm mù (Blind Marking):
- **URL:** `POST /api/examiner/attempts/{attempt_id}/request-re-eval`
- **Request Body Schema (`schemas.ReEvaluationIn`):**
```json
{
  "teacher_id_2": "usr_teacher_evaluator",
  "reason": "GRADE_DISPUTE",
  "reason_detail": "Sinh viên nộp đơn phúc khảo ngày 15/10/2026",
  "blind_marking": true
}
```

#### Khóa sổ điểm ca thi (Lock Grade):
- **URL:** `POST /api/examiner/slots/{slot_id}/lock`
- **Mô tả:** Đóng băng bảng điểm ca thi thành trạng thái `GRADE_LOCKED`. Chặn toàn bộ hành vi sửa điểm từ Giảng viên.

#### Xuất Bảng điểm Chuẩn FAP (Excel/CSV):
- **URL:** `GET /api/examiner/slots/{slot_id}/export?format=excel`
- **Headers Response:**
```http
Content-Disposition: attachment; filename="BangDiem_MAS291_AL-L401_FAP.xlsx"
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```
- **Nội dung file chuẩn FAP:** Cột RollNumber, FullName, SpeakingScore, Note.
