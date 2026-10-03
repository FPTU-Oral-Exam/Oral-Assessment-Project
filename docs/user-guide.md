# Hướng dẫn sử dụng Hệ thống AI Oral Assessment Platform

[README / Danh mục tài liệu](../README.md#hướng-dẫn-theo-nhu-cầu) · [Master Architecture Spec](superpowers/specs/2026-09-30-dual-frontend-architecture.md) · [Thiết kế CSDL 3NF](architecture/database-schema.md)

Hệ thống thi vấn đáp tự động bằng AI áp dụng mô hình **Dual-Frontend**:
- **Staff Portal (Web Cán bộ & Giảng viên):** Next.js 15 App Router hỗ trợ phân quyền RBAC nghiêm ngặt cho 3 vai trò cán bộ (`SYSTEM_ADMIN`, `EXAMINER`, `TEACHER`).
- **Student App (Ứng dụng Sinh viên):** Electron 33 + Vite + React 18 Thin-Client, áp dụng nguyên tắc **Anti-Tampering & Zero-STT-Local** (không chạy PhoWhisper trên client, không cho xem/sửa transcript, chỉ ghi âm và tải chunk 4MB lên MinIO).

---

## 1. Chuẩn bị và Đăng nhập

### 1.1 Địa chỉ truy cập hệ thống
- **Staff Portal (Web Cán bộ):** `http://localhost:3000`
- **Student App (Desktop Sinh viên):** Chạy từ bộ cài hoặc môi trường dev `npm run dev -w apps/student-app`
- **API Swagger Documentation:** `http://localhost:8000/docs`
- **MinIO Storage Console:** `http://localhost:9001` (User: `oralstorage`)

### 1.2 Phân quyền 4 Vai trò (RBAC)
1. **Admin Hệ thống (`SYSTEM_ADMIN`):** Quản trị tài khoản toàn trường, cấu hình dịch vụ AI (Gemini/Ollama), quản lý storage MinIO và giám sát audit log.
2. **Khảo thí (`EXAMINER`):** Quản lý danh mục môn học, lập lịch thi/ca thi, phân công sinh viên dự thi, giám sát tiến độ thi, phê duyệt điểm chính thức, khóa sổ điểm và xuất bảng điểm FAP.
3. **Giảng viên (`TEACHER`):** Phụ trách môn học được giao, upload giáo trình PDF và xây dựng cơ sở kiến thức RAG, tạo chuẩn đầu ra (LO), chủ đề, cấu hình Rubric chấm điểm, thiết kế Blueprint, sinh câu hỏi và công bố đề thi, thẩm định các bài thi cần xem lại (`REVIEW_REQUIRED`).
4. **Sinh viên (`STUDENT`):** Đăng nhập ứng dụng Desktop, kiểm tra thiết bị/độ ồn, trả lời câu hỏi bằng giọng nói và xem kết quả sau khi server hoàn tất chấm điểm.

---

## 2. Quy trình Cán bộ & Giảng viên trên Staff Portal

### Bước 1: Quản lý Môn học (Khảo thí & Giảng viên)
1. Khảo thí vào mục **Môn học** (`/courses`), bấm **Tạo môn học**, nhập mã môn (ví dụ: `SWT301`), tên môn và mô tả.
2. Khảo thí phân công Giảng viên phụ trách môn học.
3. Giảng viên phụ trách sẽ nhìn thấy môn học này trong danh sách quản lý của mình.

### Bước 2: Chuẩn bị Giáo trình RAG & Cấu trúc Kiến thức (Giảng viên)
1. Mở môn học, vào tab **Giáo trình**: Tải file PDF giáo trình chuẩn (dung lượng tối đa 100MB). Hệ thống tự động phân tích mục lục, cắt chunks tối đa 2400 ký tự và sinh vector embedding 768 chiều vào PostgreSQL `pgvector`.
2. Vào tab **Chuẩn đầu ra (LO)**: Tạo các LO mô tả kiến thức và kỹ năng cần đánh giá.
3. Vào tab **Chủ đề (Topics)**: Tạo chủ đề thi, liên kết chủ đề với ít nhất một LO và một chương/mục giáo trình tương ứng.
4. Có thể tải thêm tài liệu bổ sung (PDF, DOCX) và dùng tính năng **Tra cứu kiến thức** để kiểm tra độ chính xác của vector search trước khi ra đề.

### Bước 3: Thiết kế Rubric & Công bố Đề thi (Giảng viên)
1. Vào tab **Rubric**: Tạo bộ tiêu chí chấm điểm gồm: tên tiêu chí, mô tả chi tiết, điểm trần (`max_score`) và trọng số (`weight`). Bấm **Lưu Rubric**.
2. Vào tab **Bài thi & Blueprint**: Bấm **Tạo bài thi**, đặt tên đề thi, thời lượng làm bài và thiết lập Blueprint (phân bổ số lượng câu hỏi theo từng chủ đề và độ khó: Dễ, Trung bình, Khó).
3. Thiết lập **Chính sách lượt làm bài**: 1 lượt (không làm lại), cho phép thêm N lượt hoặc không giới hạn.
4. Bấm **Sinh câu hỏi & công bố**: AI (Gemini/Ollama) dựa vào RAG chunks và Blueprint để sinh nội dung câu hỏi. Khi công bố (`PUBLISHED`), toàn bộ đề thi, rubric, snapshot tài liệu và prompt version được **đóng băng vĩnh viễn (Freeze Snapshot)** để bảo đảm tính truy vết tuyệt đối khi chấm bài.

### Bước 4: Lập ca thi và Phân bổ Sinh viên (Khảo thí)
1. Khảo thí vào mục **Lịch thi** (`/schedule`) thiết lập ngày giờ bắt đầu và kết thúc của ca thi.
2. Vào mục **Sinh viên** (`/students`) gán danh sách sinh viên đủ điều kiện dự thi vào ca thi hoặc đề thi tương ứng.

---

## 3. Quy trình Sinh viên Làm bài trên Student App (Thin-Client)

Hệ thống áp dụng cơ chế **Zero-Trust Client** nhằm bảo vệ tối đa tính liêm chính của kỳ thi:

### Bước 1: Khởi động & Đăng nhập
1. Mở ứng dụng **OralAI Student App**.
2. Đăng nhập bằng tài khoản sinh viên được cấp hoặc qua Google OIDC.
3. Mã định danh và JWT Bearer Token được lưu an toàn trong bộ nhớ RAM (`memory-only`), không lưu xuống `localStorage` để chống tấn công can thiệp dữ liệu.

### Bước 2: Kiểm tra Thiết bị & Độ ồn Môi trường (10 Giây)
1. Chọn bài thi đã được giao trong danh sách, bấm **Mở bài thi**.
2. Cấp quyền truy cập Camera và Microphone.
3. Chỉnh thanh **Gain microphone** (từ $-12\text{ dB}$ đến $+18\text{ dB}$, mặc định 0).
4. Bấm **Kiểm tra độ ồn 10 giây**:
   - **3 giây đầu:** Giữ im lặng tuyệt đối để hệ thống đo tạp âm nền môi trường (tín hiệu đo trước Gain). Cảnh báo nếu độ ồn $\ge -40\text{ dBFS}$.
   - **7 giây sau:** Nói thử bằng giọng nói thực tế để kiểm tra tín hiệu mic. Cảnh báo mic hỏng nếu tín hiệu $< -90\text{ dBFS}$.
5. Sinh viên có thể nghe lại bản thu thử và bật/tắt bộ lọc nhiễu **RNNoise WASM (48 kHz)** để so sánh.
6. Khi âm thanh đạt chuẩn, bấm **Bắt đầu làm bài** (thiết bị và thanh Gain sẽ bị khóa cứng trong suốt ca thi).

### Bước 3: Trả lời Câu hỏi & Nộp Audio Tự động
1. Màn hình hiển thị nội dung câu hỏi và thời gian đếm ngược của server.
2. Sinh viên bấm **Bắt đầu trả lời**: MediaRecorder bắt đầu ghi nhận luồng âm thanh raw.
3. Sinh viên trả lời câu hỏi bằng giọng nói.
4. Khi nói xong, bấm **Kết thúc trả lời**:
   - `ChunkedUploader` từ package `@oralai/shared` tự động cắt file ghi âm raw thành các chunk 4MB kèm mã băm SHA-256.
   - Các chunk được tải trực tiếp lên MinIO storage. Cơ chế tự động thử lại (retry) 3 lần đảm bảo không bị gián đoạn khi mạng chập chờn.
   - Ứng dụng gửi `upload_id` lên endpoint `POST /api/question-attempts/{key}/submit-audio`.
   - Backend xác nhận upload hoàn tất, đánh dấu câu hỏi là `AWAITING_STT` và ghi audit log `AUDIO_SUBMITTED`.
5. Ứng dụng tự động chuyển sang câu hỏi tiếp theo. Sinh viên **tuyệt đối không nhìn thấy văn bản transcript và không thể gõ phím chỉnh sửa nội dung** (Anti-Tampering).
6. Sau khi hoàn thành tất cả câu hỏi, sinh viên bấm **Nộp bài thi**.

---

## 4. Xử lý Chấm điểm Tự động & Thẩm định Kết quả

### 4.1 Server-Side Pipeline (PhoWhisper & AI Grading Engine)
Sau khi sinh viên nộp bài, Background Worker (Celery/Redis) tự động thực hiện quy trình khép kín:
1. **STT Pipeline:** Tải file âm thanh bằng chứng từ MinIO và chạy mô hình **PhoWhisper** trên server để phiên âm ra văn bản transcript chính thức.
2. **RAG Retrieval:** Truy vấn đúng tập chunk tài liệu đã được đóng băng trong Exam Snapshot.
3. **Grading Engine:** Gửi câu hỏi, transcript server, Rubric và dẫn chứng RAG tới LLM Judge (Gemini/Ollama) để tính điểm từng tiêu chí và tính toán **Độ tin cậy AI (Confidence Score)**.

### 4.2 Thẩm định & Phê duyệt Điểm (Giảng viên & Khảo thí)
1. Giảng viên vào mục **Đánh giá & Chấm bài** (`/grading`):
   - **Tự động công nhận:** Các bài thi có điểm rõ ràng và Confidence $\ge 0.85$.
   - **Cần xem xét (`REVIEW_REQUIRED`):** Các bài thi có Confidence $< 0.85$ hoặc điểm câu thi ngấp nghé ranh giới Đậu/Rớt ($|Score - 5.0| \le 0.25$).
2. Trong màn hình thẩm định, Giảng viên có thể:
   - Nghe lại file âm thanh gốc phát trực tiếp từ MinIO.
   - Đối chiếu transcript do PhoWhisper sinh ra với tiêu chí Rubric và trích dẫn RAG.
   - Yêu cầu chấm lại (re-grade) nếu cần.
   - Điều chỉnh điểm thủ công kèm **lý do giải trình bắt buộc** (được lưu lại toàn bộ vào Audit Log).
3. Khảo thí vào mục **Kết quả thi** (`/results`), kiểm tra tổng thể điểm số của toàn bộ ca thi, bấm **Duyệt & Khóa sổ điểm**, sau đó xuất file bảng điểm định dạng chuẩn FAP (Excel/CSV) để nộp về Phòng Đào tạo.

---

## 5. Xử lý Sự cố Thường gặp

| Hiện tượng | Nguyên nhân | Hướng khắc phục |
| :--- | :--- | :--- |
| **Báo lỗi 401 khi đăng nhập** | Sai tên đăng nhập hoặc mật khẩu | Kiểm tra lại thông tin đăng nhập. Tài khoản mặc định: `admin` / `Admin@123456`. |
| **Báo lỗi "Không thể kết nối đến server" trên Desktop** | Sai địa chỉ máy chủ API hoặc API chưa khởi động | Kiểm tra Docker API đã `Up (healthy)` tại cổng 8000. Địa chỉ chuẩn: `http://localhost:8000`. |
| **Mic không phát ra tiếng khi thu thử** | Chưa cấp quyền hoặc chọn nhầm thiết bị | Vào Cài đặt quyền riêng tư của OS cho phép ứng dụng truy cập Microphone; chọn đúng tên mic trong danh sách. |
| **Âm thanh bị rè hoặc méo tiếng** | Gain microphone quá cao | Giảm thanh Gain xuống $0\text{ dB}$ hoặc $-3\text{ dB}$ và bấm thu thử lại. |
| **Bài thi ở trạng thái `REVIEW_REQUIRED`** | Điểm tự tin của AI thấp hoặc điểm ngấp nghé 5.0 | Đây là tính năng bảo vệ công bằng của hệ thống; Giảng viên sẽ nghe lại file âm thanh MinIO để thẩm định điểm chính thức. |
