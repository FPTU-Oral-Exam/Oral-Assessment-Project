# System Overview

## 1. Giới thiệu

**AI Oral Assessment Platform** (mã nguồn: `AI-Oral-Assessment-Platform`) là nền tảng thi vấn đáp tự động trên máy tính dành cho các trường đại học, được xây dựng theo chuẩn khung đo lường giáo dục **12 bước của Steven M. Downing** (Educational Measurement).

Hệ thống số hóa toàn diện quy trình khảo thí vấn đáp, giải quyết triệt để các hạn chế của hình thức thi vấn đáp truyền thống (thiếu tính đồng nhất, tốn nhân lực giám khảo, dễ lộ đề giữa các ca thi và thiếu bằng chứng pháp lý để phúc khảo):

- **Phân định 4 vai trò đại học chuẩn mực:**
  1. **Ban Học thuật (`ACADEMY`):** Đỉnh tháp chuyên môn — quản lý chuẩn môn học, xây dựng Chuẩn đầu ra (LO), Cây chủ đề (Topics), Khung Rubric chuẩn dùng chung, Ma trận đề thi chuẩn (Master Blueprint) cố định, và Ngân hàng câu hỏi đã thẩm định (Item Bank).
  2. **Phòng Khảo thí (`EXAMINER`):** Vận hành & giám sát kỳ thi — quản lý Học kỳ (Semester), Kì thi (Final Exam), mở môn thi trong kỳ (Course Offering), nạp danh sách sinh viên & lớp học, xếp lịch & phân bổ Ca thi (Schedule Slots), sinh các mã đề thi song song (Exam Variants) từ Item Bank của Academy, phân công giảng viên coi thi & chấm thi, giám sát thi trực tiếp và khóa sổ điểm FAP.
  3. **Giảng viên Coi thi & Chấm thi (`TEACHER`):** Giám sát ca thi và rà soát/chấm điểm bài thi. Giảng viên **không** can thiệp vào LO, Rubric hay Ma trận đề thi; chỉ đối soát bằng chứng (Audio ghi âm câu trả lời + Transcript server bóc băng), xem điểm và nhận xét chi tiết do AI chấm theo Rubric chuẩn của Academy, sau đó xác nhận hoặc điều chỉnh điểm (override kèm giải trình).
  4. **Sinh viên (`STUDENT`):** Thí sinh dự thi trên ứng dụng Desktop Thin-Client (Electron). Kiểm tra thiết bị & kiểm tra ồn môi trường 10 giây qua RNNoise WASM. Nhận mã đề thi ngẫu nhiên gán riêng cho ca thi, trả lời bằng giọng nói trực tiếp theo thời gian đếm ngược từng câu.
  5. **Quản trị hệ thống (`SYSTEM_ADMIN`):** Quản lý tài khoản, phân quyền, cấu hình hạ tầng AI Provider (Ollama / Gemini), Faster-Whisper STT Server, Object Storage MinIO và sao lưu dữ liệu.

- **Nguyên tắc "Zero AI Question Generation":** Tuyệt đối không để AI tự ý sinh câu hỏi tự do trong phòng thi. 100% câu hỏi thi được trích xuất từ Ngân hàng câu hỏi đã qua thẩm định chuyên môn (Item Bank) và được lắp ráp tự động (Automated Test Assembly - ATA) theo Ma trận đề thi chuẩn (Master Blueprint) do Ban Học thuật ban hành.
- **Bảo mật & Chống gian lận (Anti-Tampering):** Sinh viên làm bài bằng giọng nói thuần túy (Audio-only, không gõ phím). Âm thanh được chia chunk 4MB kèm SHA-256 integrity checksum tải trực tiếp lên MinIO. Tuyệt đối không chạy STT trên máy sinh viên và không cho sinh viên sửa transcript.
- **Server-Side STT & AI Grading có ranh giới (Rubric-Bounded):** Worker Server sử dụng mô hình **Faster-Whisper** bóc băng trực tiếp từ file âm thanh MinIO. Công cụ AI Grader (Ollama / Gemini) chấm điểm và viết nhận xét chi tiết strictly bounded theo tiêu chí Rubric và điểm chuẩn (expected points/key terms) của câu hỏi.
- **Bằng chứng pháp lý bất biến (Immutable Evidence):** Bản ghi âm và video của sinh viên là bằng chứng pháp lý để Giảng viên rà soát và Khảo thí xử lý các ca phúc khảo hoặc chấm chéo độc lập.

---

## 2. Mục tiêu nghiệp vụ

| # | Mục tiêu | Mô tả chi tiết |
| - | -------- | -------------- |
| 1 | **Chuẩn hóa đo lường khảo thí (Downing Framework)** | Bám sát khung 12 bước của Steven M. Downing: từ xây dựng ma trận đề (Test Blueprint), ngân hàng câu hỏi (Item Bank), lắp ráp đề song song (ATA) đến chấm điểm bằng Rubric chuẩn. |
| 2 | **Tách bạch vai trò học thuật và khảo thí** | Ban Học thuật (Academy) kiểm soát chất lượng đề và chuẩn đầu ra; Phòng Khảo thí (Examiner) độc lập vận hành kỳ thi; Giảng viên (Teacher) thuần túy coi thi và chấm thi. |
| 3 | **Công bằng và chống lộ đề giữa các ca thi** | Hệ thống tự động sinh các mã đề thi song song (Parallel Exam Variants) có cấu trúc ma trận tương đương nhau cho từng ca thi (Shift), không trùng câu hỏi giữa các ca. |
| 4 | **Đánh giá tự động minh bạch & Khách quan** | AI chấm điểm sơ bộ chi tiết đến từng tiêu chí Rubric, trích dẫn bằng chứng từ transcript, triệt tiêu độ lệch cảm tính giữa các giám khảo. |
| 5 | **Tiết kiệm thời gian và nhân lực tổ chức thi** | Giảm thiểu thời gian chấm thi vấn đáp thủ công từ hàng tuần xuống còn vài giờ; giảng viên chỉ cần rà soát bài thi với đầy đủ audio và phân tích AI. |
| 6 | **Bảo vệ quyền lợi sinh viên qua Bằng chứng bất biến** | Lưu trữ audio/video gốc có mã băm SHA-256 trên MinIO làm căn cứ xử lý khiếu nại, phúc khảo hoặc chấm chéo công khai. |

---

## 3. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      STUDENT APP (Thin-Client Desktop)                       │
│    (Electron 33 + Vite + React 18 + RNNoise WASM + ChunkedUploader MinIO)    │
│  • Đăng nhập (Memory-only JWT / Google OIDC)                                 │
│  • Xem lịch ca thi và bài thi được Khảo thí xếp lịch                         │
│  • Kiểm tra micro/camera & đo độ ồn môi trường 10 giây (RNNoise Filter)      │
│  • Nhận mã đề thi ngẫu nhiên của ca (sinh từ Item Bank theo Master Blueprint)│
│  • Ghi âm raw câu trả lời (Audio-only, không gõ phím)                        │
│  • Tải chunk 4MB có mã băm SHA-256 trực tiếp lên MinIO                       │
│  • Nộp bài thi (chuyển trạng thái AWAITING_STT)                              │
│  • Xem kết quả & nhận xét chi tiết sau khi Khảo thí công bố                  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTPS REST / WebSocket
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      STAFF PORTAL (Web Cán bộ & Giảng viên)                  │
│       (Next.js 15 App Router + TypeScript + Tailwind CSS + RBAC)             │
│                                                                              │
│  ├── [ACADEMY] Ban Học thuật & Bộ môn:                                       │
│  │   • Quản lý môn học gốc (Master Course Catalog)                           │
│  │   • Chuẩn đầu ra (LOs) & Cây chủ đề (Topics)                              │
│  │   • Khung Rubric chuẩn dùng chung theo môn                                │
│  │   • Ma trận đề thi chuẩn (Master Blueprint) cố định                       │
│  │   • Ngân hàng câu hỏi (Item Bank) + Import Excel câu hỏi thẩm định        │
│  │                                                                           │
│  ├── [EXAMINER] Phòng Khảo thí:                                              │
│  │   • Quản lý Học kỳ (Semester: Fall_2026, Spring_2026...)                  │
│  │   • Quản lý Kỳ thi (Final Exam Batch) & Mở môn trong kỳ (Course Offering) │
│  │   • Import danh sách sinh viên, quản lý lớp học (SE1801, SE1802...)       │
│  │   • Thiết lập lịch thi & Ca thi (Shifts: Ca 1, Ca 2, Ca 3, phòng thi...)   │
│  │   • Sinh mã đề song song (ATA) từ Item Bank & Gán mã đề cho từng ca       │
│  │   • Phân công Giảng viên coi thi & chấm thi cho ca/lớp                    │
│  │   • Giám sát phòng thi trực tiếp & Điều phối chấm chéo/phúc khảo          │
│  │   • Phê duyệt điểm thi & Xuất báo cáo điểm chuẩn FAP                      │
│  │                                                                           │
│  ├── [TEACHER] Giảng viên Coi thi & Chấm thi:                                │
│  │   • Xem ca thi được phân công coi thi                                     │
│  │   • Danh sách bài thi cần chấm/rà soát theo ca hoặc lớp                   │
│  │   • Nghe Audio bằng chứng + Đọc Transcript Server bóc băng                │
│  │   • Đối soát điểm & nhận xét AI chấm theo Rubric chuẩn của Academy        │
│  │   • Xác nhận điểm hoặc Điều chỉnh điểm (Override score kèm giải trình)    │
│  │                                                                           │
│  └── [SYSTEM_ADMIN] Quản trị kỹ thuật:                                       │
│      • Quản lý tài khoản người dùng & Phân quyền (ACADEMY, EXAMINER...)      │
│      • Cấu hình STT Faster-Whisper, LLM Provider (Ollama/Gemini), MinIO S3   │
│      • Monitoring hệ thống, audit log và database backups                    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND API (FastAPI Python 3.12+)                     │
│                                                                              │
│  Auth │ Users │ Courses │ Blueprints │ ItemBank │ Semesters │ Slots │ Exams  │
│  Grading Engine │ Evidence Vault │ FAP Export │ Audit Logs                   │
│                                                                              │
│  ┌─────────────┐         ┌─────────────┐                                     │
│  │ PostgreSQL  │         │ Object S3   │                                     │
│  │ 16 Relational│        │ (MinIO)     │                                     │
│  └─────────────┘         └─────────────┘                                     │
│           │                                                                  │
│           ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐      │
│  │                 BACKGROUND WORKER (Celery / Redis)                 │      │
│  │  • Server STT Pipeline: Faster-Whisper (Anh/Việt) từ audio MinIO   │      │
│  │  • Automated Test Assembly (ATA): Sinh mã đề song song ngẫu nhiên │      │
│  │  • Grading Engine: LLM Grader (Ollama / Gemini) theo Rubric Academy│      │
│  │  • Synthesize Evidence: Đối soát transcript với Expected Points    │      │
│  └────────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Ma trận phân quyền 5 Vai trò (RBAC Matrix)

| Chức năng hệ thống | ACADEMY | EXAMINER | TEACHER | STUDENT | SYSTEM_ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Quản lý Môn học gốc (Master Course)** | **Toàn quyền** | Chỉ xem | Chỉ xem | Không | Toàn quyền |
| **Tạo Chuẩn đầu ra (LO) & Chủ đề (Topics)** | **Toàn quyền** | Chỉ xem | Chỉ xem | Không | Toàn quyền |
| **Thiết lập Khung Rubric chuẩn môn** | **Toàn quyền** | Chỉ xem | Chỉ xem | Không | Toàn quyền |
| **Thiết lập Ma trận đề thi chuẩn (Blueprint)** | **Toàn quyền** | Chỉ xem | Chỉ xem | Không | Toàn quyền |
| **Quản lý Ngân hàng câu hỏi (Item Bank)** | **Toàn quyền** | Chỉ xem | Không | Không | Toàn quyền |
| **Import câu hỏi từ Excel vào Item Bank** | **Toàn quyền** | Không | Không | Không | Toàn quyền |
| **Tạo Học kỳ (Semester) & Kỳ thi (Final Exam)** | Không | **Toàn quyền** | Không | Không | Toàn quyền |
| **Mở môn thi trong kỳ (Course Offering)** | Không | **Toàn quyền** | Không | Không | Toàn quyền |
| **Import Sinh viên & Quản lý Lớp học** | Không | **Toàn quyền** | Chỉ xem | Không | Toàn quyền |
| **Lập lịch Ca thi (Schedule Slots)** | Không | **Toàn quyền** | Chỉ xem | Không | Toàn quyền |
| **Sinh mã đề song song (ATA) & Gán cho ca** | Không | **Toàn quyền** | Không | Không | Toàn quyền |
| **Phân công Giảng viên coi & chấm ca thi** | Không | **Toàn quyền** | Không | Không | Toàn quyền |
| **Giám sát phòng thi trực tiếp** | Không | **Toàn quyền** | **Phòng phụ trách** | Không | Toàn quyền |
| **Tham gia làm bài thi vấn đáp (Desktop)** | Không | Không | Không | **Thực hiện** | Không |
| **Xem điểm sơ bộ & Nhận xét do AI chấm** | Chỉ xem thống kê | Toàn quyền | **Lớp phụ trách** | Khi công bố | Toàn quyền |
| **Rà soát & Override điểm bài thi** | Không | Duyệt cuối | **Thực hiện** | Không | Toàn quyền |
| **Điều phối Chấm chéo / Phúc khảo** | Không | **Toàn quyền** | Khi được giao | Xem đơn | Toàn quyền |
| **Khóa sổ điểm & Xuất báo cáo điểm FAP** | Không | **Toàn quyền** | Không | Không | Toàn quyền |
| **Cấp tài khoản & Cấu hình AI/Whisper/MinIO**| Không | Không | Không | Không | **Toàn quyền** |

---

## 5. Danh mục tài liệu đặc tả kiến trúc

| Tài liệu | Đường dẫn | Mô tả nội dung |
| :--- | :--- | :--- |
| **Actor: Ban Học thuật** | [`02-actor-academy.md`](02-actor-academy.md) | Đặc tả vai trò quản lý môn học, LO, Rubric, Ma trận chuẩn, Item Bank và Import Excel. |
| **Actor: Khảo thí** | [`03-actor-examiner.md`](03-actor-examiner.md) | Đặc tả vai trò tổ chức kỳ thi, học kỳ, ca thi, sinh mã đề song song, phân công chấm và duyệt FAP. |
| **Actor: Giảng viên** | [`04-actor-teacher.md`](04-actor-teacher.md) | Đặc tả vai trò coi thi và chấm/rà soát bài thi theo Rubric Academy (không sửa đề/rubric). |
| **Actor: Sinh viên** | [`05-actor-student.md`](05-actor-student.md) | Đặc tả quy trình làm bài trên máy tính cá nhân qua Student App Thin-Client. |
| **Actor: Admin hệ thống** | [`06-actor-system-admin.md`](06-actor-system-admin.md) | Đặc tả quản trị tài khoản, phân quyền, cấu hình hạ tầng và sao lưu. |
| **Quy tắc nghiệp vụ** | [`07-business-rules.md`](07-business-rules.md) | Toàn bộ quy tắc bất biến về học thuật, khảo thí, chấm điểm và bảo mật. |
| **Ràng buộc kỹ thuật** | [`08-technical-constraints.md`](08-technical-constraints.md) | Ràng buộc kiến trúc: Server STT Faster-Whisper, RNNoise, MinIO Chunked Upload. |
| **Cơ sở dữ liệu** | [`database-schema.md`](../architecture/database-schema.md) | Thiết kế bảng CSDL, ERD Mermaid, Data Dictionary bảng `question_items`. |
