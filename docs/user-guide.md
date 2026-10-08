# Hướng dẫn sử dụng Hệ thống AI Oral Assessment Platform

[System Overview](specifications/01-system-overview.md) · [Actor Academy](specifications/02-actor-academy.md) · [Actor Examiner](specifications/03-actor-examiner.md) · [Actor Teacher](specifications/04-actor-teacher.md) · [Actor Student](specifications/05-actor-student.md) · [Thiết kế CSDL](architecture/database-schema.md)

Hệ thống thi vấn đáp tự động bằng AI áp dụng mô hình **Dual-Frontend** chuẩn hóa theo khung đo lường giáo dục 12 bước của Steven M. Downing:
- **Staff Portal (Web Cán bộ & Giảng viên):** Next.js 15 App Router hỗ trợ phân quyền RBAC nghiêm ngặt cho 4 vai trò:
  * **Ban Học thuật (`ACADEMY`):** Quản lý môn học gốc, LO, Chủ đề, Rubric chuẩn, Master Blueprint, và Ngân hàng câu hỏi (Item Bank).
  * **Khảo thí (`EXAMINER`):** Quản lý học kỳ, mở môn thi trong kỳ, nạp danh sách sinh viên theo lớp, lập ca thi, sinh mã đề song song ATA, phân công chấm và duyệt FAP.
  * **Giảng viên (`TEACHER`):** Coi thi và rà soát/chấm điểm bài thi dựa trên audio bằng chứng và phân tích AI (không can thiệp LO/Rubric/Đề).
  * **Admin (`SYSTEM_ADMIN`):** Quản trị tài khoản, cấu hình hệ thống, AI Provider, Faster-Whisper và MinIO.
- **Student App (Ứng dụng Desktop Sinh viên):** Electron 33 + Vite + React 18 Thin-Client, áp dụng nguyên tắc **Anti-Tampering & Zero-STT-Local** (không chạy STT trên máy trạm, không sửa transcript, chỉ trả lời bằng giọng nói và tải chunk 4MB lên MinIO).

---

## 1. Chuẩn bị và Đăng nhập

### 1.1 Địa chỉ truy cập hệ thống
- **Staff Portal (Web Cán bộ & Giảng viên):** `http://localhost:3000`
- **Student App (Desktop Sinh viên):** Khởi chạy từ ứng dụng cài đặt hoặc `npm run dev -w apps/student-app`
- **API Swagger Documentation:** `http://localhost:8000/docs`
- **MinIO Storage Console:** `http://localhost:9001` (User: `oralstorage`)

### 1.2 Phân định vai trò truy cập (RBAC)
1. **Ban Học thuật (`ACADEMY`):** Đăng nhập vào phân hệ `/academy` — phụ trách toàn bộ chuẩn mực học thuật và ngân hàng câu hỏi.
2. **Khảo thí (`EXAMINER`):** Đăng nhập vào phân hệ `/examiner` — phụ trách toàn bộ việc tổ chức kỳ thi, ca thi, danh sách sinh viên và xuất điểm.
3. **Giảng viên (`TEACHER`):** Đăng nhập vào phân hệ `/teacher` — phụ trách lịch coi thi và màn hình chấm bài / rà soát bài thi.
4. **Sinh viên (`STUDENT`):** Đăng nhập vào ứng dụng desktop OralAI Thin-Client — làm bài thi vấn đáp theo ca.

---

## 2. Quy trình Vận hành 4 Bước Chuẩn mực

### Bước 1: Thiết lập Học thuật & Ngân hàng câu hỏi (Ban Học thuật `ACADEMY`)
1. **Quản lý Môn học (`/academy/courses`):** Tạo môn học chuẩn (ví dụ: `CSD201`), nhập số tín chỉ và mô tả.
2. **Chuẩn đầu ra & Chủ đề:** 
   - Tab `01 · Chuẩn đầu ra & Chủ đề`: Định nghĩa các chuẩn đầu ra (`LO1`, `LO2`, `LO3`) và danh mục các chủ đề kiến thức chính.
3. **Thiết lập Khung Rubric chuẩn:**
   - Tab `02 · Tiêu chí Rubric`: Xây dựng tiêu chí chấm điểm chuẩn (tên tiêu chí, mô tả, điểm tối đa, trọng số) áp dụng chung cho toàn bộ kỳ thi.
4. **Xây dựng Ngân hàng câu hỏi (Item Bank):**
   - Tab `03 · Ngân hàng câu hỏi`: Bấm **"Import Excel"** để nạp hàng loạt câu hỏi từ file `.xlsx` (kèm mã câu, LO, Topic, Bloom level, thời lượng, expected points, key terms) hoặc thêm câu hỏi thủ công. Thẩm định trạng thái sang `VERIFIED`.
5. **Ban hành Ma trận đề thi chuẩn (Master Blueprint):**
   - Tab `04 · Ma trận & Đề thi`: Thiết lập Ma trận đề thi cố định cho môn học (quy định số câu hỏi, thời gian trả lời, phân bổ LO/Topic và thang điểm 10.0).

### Bước 2: Tổ chức Kỳ thi & Phân bổ Ca thi (Phòng Khảo thí `EXAMINER`)
1. **Quản lý Học kỳ (`/examiner/semester`):** Khởi tạo học kỳ mới (ví dụ: `Fall_2026`).
2. **Mở Môn thi trong kỳ & Import Sinh viên:**
   - Mở môn thi `CSD201 - Fall 2026` liên kết với môn gốc của Academy.
   - Nạp danh sách lớp học và sinh viên từ file Excel (ví dụ: lớp `SE1801`, `SE1802`...).
3. **Lập Ca thi (Shifts) & Sinh mã đề song song (ATA):**
   - Vào `/examiner/schedule`, tạo các ca thi cụ thể: Ca 1 (07:30 - 09:00), Ca 2 (09:15 - 10:45) tại phòng thi `BE-301`.
   - Bấm **"Sinh mã đề tự động"**: Hệ thống rút trích ngẫu nhiên các câu hỏi từ Item Bank theo Master Blueprint của Academy, tạo ra các mã đề song song độc lập cho từng ca thi (Mã đề 101 cho Ca 1, Mã đề 102 cho Ca 2) để chống lộ đề.
4. **Phân công Giám thị & Chấm thi:** Chỉ định Giảng viên coi thi và Giảng viên chấm thi cho từng ca/lớp.

### Bước 3: Thí sinh làm bài thi vấn đáp (Sinh viên `STUDENT`)
1. Sinh viên mở ứng dụng Desktop, đăng nhập tài khoản.
2. Thực hiện bài kiểm tra thiết bị: kiểm tra mic/cam và **đo độ ồn môi trường 10 giây** qua bộ lọc RNNoise WASM.
3. Đúng giờ ca thi, bấm **"Vào phòng thi"** $\rightarrow$ nhận mã đề thi ngẫu nhiên của ca.
4. Đọc câu hỏi trên màn hình, bấm **"Bắt đầu trả lời"** và nói vào micro (bàn phím bị khóa, không thể copy/paste).
5. File âm thanh được chia chunk 4MB kèm mã băm SHA-256 tải trực tiếp lên MinIO.
6. Hết giờ hoặc bấm nộp bài $\rightarrow$ nhận biên lai xác nhận nộp bài (`AWAITING_STT`).

### Bước 4: Chấm thi, Rà soát & Khóa sổ điểm (Giảng viên & Khảo thí)
1. **Server Worker xử lý tự động:**
   - Faster-Whisper bóc băng trực tiếp file ghi âm từ MinIO sang văn bản.
   - AI Grader (Ollama/Gemini) chấm điểm từng tiêu chí theo Rubric của Academy, trích dẫn bằng chứng từ transcript và expected points của câu hỏi.
2. **Giảng viên rà soát & chấm bài (`/teacher/grading`):**
   - Giảng viên nghe lại audio câu trả lời của sinh viên, xem transcript và điểm AI gợi ý.
   - Bấm **"Xác nhận điểm"** hoặc điều chỉnh điểm (override score kèm lý do giải trình).
   - Ký xác nhận nộp kết quả chấm bài.
3. **Khảo thí duyệt & Khóa sổ FAP (`/examiner/results`):**
   - Rà soát các bài thi có cảnh báo chênh lệch điểm ($\ge 1.5$ điểm) hoặc điều phối chấm chéo.
   - Bấm **"Khóa sổ điểm"** (`LOCKED_FINAL`) và bấm **"Xuất bảng điểm FAP"** để tải file Excel chuẩn nộp về Phòng Đào tạo.
