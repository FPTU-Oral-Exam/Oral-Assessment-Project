# RUNBOOK-03: Nạp Dữ Liệu Mẫu & Kịch Bản Trình Diễn Bảo Vệ Đồ Án (Demo Showcase)

> **Mục tiêu:** Cung cấp danh sách tài khoản chuẩn, hướng dẫn chạy nạp dữ liệu mẫu (Seeder), và kịch bản trình diễn 5 bước (5-Act Showcase) mượt mà, chuyên nghiệp trước Thầy hướng dẫn và Hội đồng bảo vệ đồ án tốt nghiệp / NCKH.

---

## 1. Danh sách Tài khoản Chuẩn (Standard System Accounts)

Hệ thống đã chuẩn hóa 5 tài khoản tương ứng với 5 vai trò (Roles) trong CSDL:

| Tài khoản (Username) | Mật khẩu mặc định | Vai trò (Role) | Chức năng chính trong kịch bản |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | `SYSTEM_ADMIN` | Quản trị tài khoản, cấu hình AI Models và API Keys |
| **`academy`** | `academy123` | `ACADEMY` | Soạn Ngân hàng câu hỏi, Ma trận đề, Dạng bài, Rubrics Studio |
| **`examiner`** | `examiner123` | `EXAMINER` | Quản lý Học kỳ, Lập Ca thi, Phân công Giảng viên, Khóa điểm |
| **`teacher`** | `teacher123` | `TEACHER` | Coi thi trực tiếp, Đánh giá bài thi, Chấm phúc khảo (Override) |
| **`student`** | `student123` | `STUDENT` | Kiểm tra mic/webcam, Thi vấn đáp trên Desktop App |

---

## 2. Quy trình Nạp Dữ liệu Mẫu (Database Seeding)

Trước buổi thuyết trình hoặc demo, thực hiện các bước sau để đảm bảo CSDL có đầy đủ dữ liệu thực tế:

```powershell
cd services/api
.venv\Scripts\Activate.ps1

# 1. Nạp Ngân hàng câu hỏi Speaking và cấu hình Dạng bài
python import_pte_bank_to_db.py

# 2. Khởi tạo dữ liệu E2E (Học kỳ, Môn ENT104/ENT403, Ca thi, Đề thi PUBLISHED)
python seed_e2e_demo.py
```

*Kết quả sau khi nạp:* CSDL sẽ có sẵn 1 Học kỳ hoạt động, 6 môn ENTs, 1 đề thi môn `ENT104` ở trạng thái `PUBLISHED` (đã đóng băng Snapshot), 1 ca thi đang mở và tài khoản thí sinh `student` sẵn sàng làm bài.

---

## 3. Kịch bản Trình diễn 5 Hồi trước Hội đồng (The 5-Act Defense Showcase)

### Hồi 1: Phân hệ Học vụ (Actor: `academy` trên Web Portal)
1. Đăng nhập tài khoản `academy` tại `http://localhost:3000`.
2. Mở **Ngân hàng câu hỏi (`/item-bank`)**: Chỉ cho Hội đồng thấy kho hàng trăm câu hỏi phân theo 4 dạng bài Speaking ENTs (`GENERAL_INTERVIEW`, `PICTURE_DESCRIPTION`, `TOPIC_MONOLOGUE`, `DEEP_DISCUSSION`).
3. Mở **Rubrics Studio (`/rubrics`)**: Trình bày bộ chuẩn 5 tiêu chí thang điểm 10 của ENTs (*Ideas, Pronunciation, Grammar, Vocabulary, Fluency* với 4 band điểm chi tiết).
4. Mở **Ma trận đề thi (`/exam-matrix`)**: Thể hiện thuật toán kiểm định kho đề (Stock Health Validator) và cơ chế sinh đề thi ngẫu nhiên theo ma trận.

### Hồi 2: Phân hệ Khảo thí (Actor: `examiner` trên Web Portal)
1. Đăng nhập tài khoản `examiner`.
2. Mở **Lịch thi & Ca thi (`/schedule`)**: Cho thấy ca thi đang diễn ra, danh sách thí sinh và Giảng viên được phân công coi thi (`teacher`).
3. Giải thích với Hội đồng về **Cơ chế Đóng băng Đề thi (ADR-0004)**: Khi đề thi công bố (`PUBLISHED`), toàn bộ RAG docs và Rubrics bị khóa vĩnh viễn để bảo đảm công bằng.

### Hồi 3: Phân hệ Sinh viên Thi Chống Gian Lận (Actor: `student` trên Desktop App)
1. Mở **Student App (Desktop Electron)**.
2. Đăng nhập tài khoản `student`.
3. Trình diễn **Màn hình Kiểm tra Thiết bị (Device Check)**:
   - Thử nói vào micro: Biểu đồ đo mức âm thanh và thuật toán RNNoise WASM đo tỷ số tín hiệu trên nhiễu (SNR) lọc tạp âm môi trường.
   - Webcam nhận diện khuôn mặt thí sinh.
4. Bấm **Bắt đầu làm bài thi**:
   - Trình bày cơ chế bảo mật (ADR-0002): Không có ô gõ bàn phím, không chạy STT local.
   - Thí sinh nói câu trả lời trong thời gian đếm ngược.
   - Hệ thống tự động chia chunk 4MB và tải trực tiếp lên MinIO S3 kèm SHA-256 checksum.
5. Bấm **Nộp bài thi** $\rightarrow$ Hệ thống gửi Task vào Celery Queue.

### Hồi 4: Hậu trường AI Worker (Server-Side AI Pipeline)
1. Mở cửa sổ terminal Celery Worker hoặc Logs để Hội đồng thấy:
   - Worker nhận task `process_exam_submission`.
   - Tải file audio từ MinIO.
   - PhoWhisper / Whisper chạy phiên âm sinh transcript.
   - Thuật toán bóc tách tín hiệu âm thanh (tính Words-per-second, số lần ngập ngừng pauses, pause ratio).
   - LLM đánh giá Ideas, Grammar, Vocabulary theo 4 band chuẩn ENTs.
   - Lưu kết quả chi tiết vào PostgreSQL.

### Hồi 5: Phân hệ Giảng viên Chấm thi & Phúc khảo (Actor: `teacher` trên Web Portal)
1. Đăng nhập tài khoản `teacher`.
2. Mở **Trang Chấm thi (`/grading`)**:
   - Tìm bài thi vừa nộp của sinh viên.
   - Bấm vào chi tiết bài thi: Hội đồng sẽ thấy trình phát audio đồng bộ, transcript tự động, điểm tổng quan thang điểm 10 và bảng phân rã chi tiết 5 tiêu chí kèm nhận xét của AI.
3. Trình diễn tính năng **Ghi đè điểm (Score Override)**:
   - Giảng viên có thể điều chỉnh điểm của một tiêu chí và nhập bắt buộc lý do điều chỉnh để lưu vết kiểm toán (Audit Trail).
4. Cuối cùng, đăng nhập lại `examiner` vào trang **Kết quả (`/results`)** để Khóa sổ điểm (Lock Results).

---

## 4. Các Câu hỏi Thường gặp của Hội đồng & Cách trả lời (Defense Q&A)

* **Q1: "Nếu sinh viên dùng ChatGPT đọc bài vào micro thì hệ thống xử lý thế nào?"**
  - *Trả lời:* Hệ thống đo lường độ trôi chảy thực nghiệm (Fluency) và ngập ngừng tự nhiên. Đồng thời phòng thi Desktop chặn hoàn toàn chuyển cửa sổ (App Window Blur Detection), chặn đa màn hình và ghi hình webcam liên tục.
* **Q2: "Tại sao không để máy sinh viên tự nhận diện giọng nói mà phải gửi audio lên server?"**
  - *Trả lời:* Đây là nguyên tắc cốt lõi trong **ADR-0002**. Nếu chạy STT trên máy sinh viên, thí sinh có thể mở DevTools để sửa transcript trước khi gửi lên máy chủ. Việc gửi audio gốc lên MinIO giúp Server nắm quyền kiểm soát tuyệt đối và lưu trữ bằng chứng để giảng viên phúc khảo.
