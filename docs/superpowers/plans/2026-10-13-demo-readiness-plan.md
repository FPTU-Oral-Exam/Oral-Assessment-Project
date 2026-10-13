# Kế hoạch Hoàn thiện Hệ thống: Sẵn sàng Demo Luồng Khảo thí Toàn diện (E2E Demo-Ready Plan)

> **Mục tiêu:** Giải quyết triệt để 2 nút thắt còn tồn đọng trong báo cáo hiện trạng (Phân hệ ACADEMY lưu trữ DB thật & Trang tổng quan Kỳ thi `/exams` của EXAMINER), đồng thời xây dựng kịch bản Dữ liệu Mẫu 1-Click (`seed_e2e_demo.py`) để bảo đảm hệ thống vận hành trơn tru quy trình 4 bước chuẩn mực theo [docs/user-guide.md](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/user-guide.md) khi báo cáo với Thầy hướng dẫn & Hội đồng.
> 
> **Tiêu chuẩn Kiến trúc:** Tuân thủ 5 nguyên tắc bất biến (Server Source of Truth, Zero-STT-Local, 4 Actor RBAC, Snapshot Versioning, Strangler Fig Pattern). 100% không Co-Author AI.

---

## 1. PHÂN TÍCH KHOẢNG CÁCH (GAP ANALYSIS) ĐỂ ĐẠT CHUẨN DEMO

| STT | Phân hệ / Nghiệp vụ | Trạng thái Hiện tại | Yêu cầu để Demo Hoàn chỉnh | Mức độ Ưu tiên |
| :---: | :--- | :--- | :--- | :---: |
| **GAP-1** | **Ban Học thuật (`ACADEMY`)** | Đã có UI 4 tab (`/item-bank`, `/question-types`, `/exam-matrix`, `/rubrics`) nhưng đang chạy trên **Mock Context** (`AcademicContext.tsx`). | Xây dựng API Backend `routes_academy.py`, lưu trữ câu hỏi, dạng bài, rubric vào PostgreSQL; nạp kho câu hỏi thật từ `data/pte-speaking/`. | **P1 (Cốt lõi)** |
| **GAP-2** | **Cán bộ Khảo thí (`EXAMINER`)** | Trang top-level **`/exams`** hiện là trang tĩnh placeholder (*"Danh sách kỳ thi sẽ hiển thị ở đây..."*). Logic tạo đề nằm sâu trong `/courses/[id]/exams`. | Nâng cấp trang `/exams` thành Dashboard quản trị kỳ thi toàn trường: xem danh sách kỳ thi, trạng thái `PUBLISHED`, số ca thi, sinh đề hoán vị. | **P1 (Cốt lõi)** |
| **GAP-3** | **Dữ liệu Mẫu Khảo thí (Demo Fixtures)** | Dữ liệu rải rác, chưa có bài nộp mẫu có sẵn audio trên MinIO để demo luồng chấm thi ngay mà không cần chờ nộp bài thủ công. | Tạo script `seed_e2e_demo.py` khởi tạo trọn gói 1 kịch bản khép kín: Kỳ thi `PTE Academic Speaking Test 1` + 1 bài thi đã nộp sẵn để Giảng viên chấm ngay. | **P2 (Demo Prep)** |
| **GAP-4** | **Kịch bản Trình diễn (Rehearsal Guide)** | Chưa có kịch bản kẹp file từng bước cho Bình thuyết trình với Thầy. | Soạn thảo kịch bản thuyết minh 4 bước (Actor-by-Actor Demo Script) kèm thời gian biểu chuẩn bị. | **P2 (Báo cáo)** |

---

## 2. LỘ TRÌNH 4 GIAI ĐOẠN TRIỂN KHAI KHOA HỌC

```
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: BỀN VỮNG HÓA DỮ LIỆU HỌC THUẬT (ACADEMY DB PERSISTENCE)  │
│ ├─ Tạo API Router FastAPI: services/api/app/routes_academy.py          │
│ ├─ Bổ sung Model/Schema cho Question Type Specs & Blueprint Matrix     │
│ ├─ Nối Staff Portal academy.service.ts vào Backend thật                │
│ └─ Import kho dữ liệu 600+ câu hỏi PTE Speaking từ data/pte-speaking/   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: HOÀN THIỆN DASHBOARD KỲ THI EXAMINER (/exams)             │
│ ├─ Thay thế placeholder apps/staff-portal/app/(examiner)/exams/page.tsx│
│ ├─ Xây dựng ExamManagementClient.tsx: Thống kê, Lọc kỳ thi theo môn    │
│ ├─ Modal tạo kỳ thi nhanh liên kết Môn học & Blueprint Matrix          │
│ └─ Nút Thao tác nhanh: Sinh đề hoán vị (ATA) & Điều phối Ca thi/Phòng  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3: XÂY DỰNG ONE-CLICK SEEDER CHO BUỔI DEMO                   │
│ ├─ Viết script: scripts/seed_e2e_demo.py                               │
│ ├─ Khởi tạo 1 Học kỳ + 1 Môn thi + 1 Kho đề 6 dạng bài + 1 Khung Rubric│
│ ├─ Tạo 1 Kỳ thi PUBLISHED + 2 Ca thi tại phòng thi BE-301              │
│ ├─ Đẩy sẵn 1 bài thi hoàn chỉnh kèm file Audio vào MinIO Storage       │
│ └─ Cấu hình 4 tài khoản Demo tương ứng 4 Actor truy cập nhanh          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4: TỔ CHỨC KIỂM THỬ E2E & KỊCH BẢN THUYẾT MINH BẢO VỆ        │
│ ├─ Chạy kiểm thử luồng xuyên suốt (Smoke Test 4 bước)                  │
│ └─ Soạn thảo kịch bản Rehearsal (Thuyết trình & Demo 10 phút với Thầy) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT TỪNG NHIỆM VỤ THỰC THI (DETAILED TASKS)

### 📌 GIAI ĐOẠN 1: Bền vững hóa Dữ liệu Học thuật (ACADEMY DB Persistence)

* **Nhiệm vụ 1.1: Backend API Router `routes_academy.py`**
  - **Tệp tin:** `services/api/app/routes_academy.py`, đăng ký vào `services/api/app/main.py`.
  - **Endpoints:**
    + `GET /api/academy/questions` & `POST /api/academy/questions`: Quản lý kho câu hỏi chuẩn hóa.
    + `GET /api/academy/question-types` & `PUT /api/academy/question-types/{type}`: Lưu trữ cấu hình quy chuẩn 6 dạng bài.
    + `GET /api/academy/matrices` & `POST /api/academy/matrices`: Quản lý ma trận đề thi (Blueprint).
    + `GET /api/academy/stock-health/{matrix_id}`: Trả về chỉ số sức khỏe kho đề dựa trên số câu hỏi thực tế trong DB.
  - **Xác thực:** Role guard kiểm tra `user.role in ['ACADEMY', 'SYSTEM_ADMIN']`.

* **Nhiệm vụ 1.2: Cầu nối Frontend `academy.service.ts`**
  - **Tệp tin:** `apps/staff-portal/services/academy.service.ts`.
  - **Hành động:** Chuyển đổi các hàm gọi REST API thật thay vì rơi vào fallback mock; cập nhật `AcademicContext.tsx` để đồng bộ state với backend khi tải trang.

* **Nhiệm vụ 1.3: Nạp kho câu hỏi thật (Data Importer)**
  - **Tệp tin:** `scripts/import_pte_bank_to_db.py`.
  - **Hành động:** Đọc các file JSON tại `data/pte-speaking/*/questions.json` và chèn vào bảng cơ sở dữ liệu `items` với trạng thái `VERIFIED`.

---

### 📌 GIAI ĐOẠN 2: Hoàn thiện Dashboard Quản lý Kỳ thi EXAMINER (`/exams`)

> **⚠️ Lưu ý kiến trúc:** Tách riêng hoàn toàn API Examiner vào `/api/examiner/...` để tránh xung đột với các router khác và đảm bảo RBAC chặt chẽ.

* **Nhiệm vụ 2.0: Tái cấu trúc API Examiner (API Isolation)** ✅ ĐÃ HOÀN THÀNH
  - **Tệp tin:** `services/api/app/routes_examiner.py`
  - **Thay đổi:** Thêm prefix riêng cho TẤT CẢ endpoint trong router:
    + `/semesters` → `/examiner/semesters`
    + `/courses` → `/examiner/courses`
    + `/exams` → `/examiner/exams`
    + `/slots` → `/examiner/slots`
    + `/results` → `/examiner/results`
    + `/candidates` → `/examiner/candidates`
    + `/enrollments` → `/examiner/enrollments`
    + `/batches` → `/examiner/batches`
  - **Đã hoàn thành:** Cập nhật 40+ endpoints, bỏ prefix ở `app.include_router()`, cập nhật tests và tài liệu API.

* **Nhiệm vụ 2.1: Xây dựng `ExamManagementClient.tsx`**
  - **Tệp tin:** `apps/staff-portal/app/(examiner)/exams/ExamManagementClient.tsx` và `apps/staff-portal/app/(examiner)/exams/page.tsx`.
  - **Giao diện:**
    + Bảng điều khiển KPI: Tổng số kỳ thi, Kỳ thi đang diễn ra, Đã công bố (`PUBLISHED`), Đã kết thúc (`COMPLETED`).
    + Danh sách thẻ kỳ thi (Exam Cards) hiển thị: Mã môn, Tên kỳ thi, Thời lượng, Số câu hỏi, Số ca thi, Số thí sinh đăng ký.
    + Badge trạng thái rõ ràng, phân biệt bài thi Luyện tập (`Practice`) và Bài thi Chính thức (`Official`).
* **Nhiệm vụ 2.2: Tích hợp Thao tác Khảo thí Trực tiếp**
  - Modal tạo kỳ thi mới có chọn Môn học và chọn Khung Rubric chuẩn.
  - Nút **"Sinh đề song song (ATA)"**: Gọi API `POST /api/examiner/exams/{id}/generate-variants`.
  - Nút **"Điều phối Ca thi"**: Điều hướng nhanh sang `/courses/{course_id}/exams` hoặc `/schedule`.

---

### 📌 GIAI ĐOẠN 3: Xây dựng One-Click Seeder phục vụ Buổi Demo (`seed_e2e_demo.py`)

* **Nhiệm vụ 3.1: Kịch bản dữ liệu hoàn chỉnh**
  - **Tệp tin:** `scripts/seed_e2e_demo.py`.
  - **Dữ liệu được tạo tự động:**
    1. **Tài khoản chuẩn:**
       - `academy` / `Admin@123456` (Ban Học thuật)
       - `examiner` / `Examiner@123456` (Cán bộ Khảo thí)
       - `teacher1` / `Teacher@123456` (Giảng viên Coi & Chấm thi)
       - `student1` / `Student@123456` (Sinh viên dự thi)
    2. **Học thuật:** 1 Môn học `PTE-SPK` (PTE Academic Speaking Test 1) + 1 Khung Rubric chuẩn + 60 câu hỏi mẫu phân bổ đủ 6 dạng bài.
    3. **Tổ chức thi:** 1 Học kỳ `Fall 2026` + 1 Kỳ thi chính thức `PUBLISHED` + 2 Ca thi tại phòng `BE-301` + Gán giám thị `teacher1`.
    4. **Dữ liệu chấm bài sẵn:** Đẩy sẵn 1 file audio mẫu lên MinIO và tạo sẵn 1 bài thi `REVIEW_REQUIRED` để khi demo giảng viên chấm bài, ta có ngay dữ liệu radar chart, audio player, và transcript hiển thị đẹp mắt mà không cần chờ sinh viên thi thật.

---

### 📌 GIAI ĐOẠN 4: Kiểm thử E2E & Kịch bản Trình diễn (Rehearsal Script)

* **Nhiệm vụ 4.1: Kiểm thử khép kín (End-to-End Smoke Test)**
  - Kiểm tra 4 vai trò trên giao diện Web & Desktop.
  - Đảm bảo không có lỗi console 500 hay gãy layout.
* **Nhiệm vụ 4.2: Soạn thảo Kịch bản Thuyết trình 10 Phút**
  - Cung cấp tài liệu hướng dẫn Bình từng câu thoại, từng cú click chuột tương ứng 4 bước của [docs/user-guide.md](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/user-guide.md) để gây ấn tượng mạnh nhất với Hội đồng.
