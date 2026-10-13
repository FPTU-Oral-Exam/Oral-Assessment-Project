# 📂 DANH MỤC CÁC SƠ ĐỒ HOẠT ĐỘNG (.DRAWIO) — HƯỚNG 2
## Hệ thống Thi Vấn đáp Tự động Bằng AI (OralAI)

Toàn bộ 10 giai đoạn trong quy trình vận hành thi cử đã được tách thành **10 file `.drawio` riêng biệt**. Bạn có thể nhấp đúp trực tiếp vào từng file trong VS Code (nếu đã cài extension Draw.io Integration) hoặc mở trên trang [app.diagrams.net](https://app.diagrams.net).

---

### 📑 Danh sách 10 File Sơ đồ Hoạt động:

| STT | Tên File `.drawio` | Giai đoạn & Tác tử | Nội dung chính của Luồng |
| :---: | :--- | :--- | :--- |
| **01** | [`flow-01-academic-preparation.drawio`](./flow-01-academic-preparation.drawio) | **GĐ 1:** Ban Học thuật (`ACADEMY`) | Tạo Term, Course, Course Offering, Rubric template, Item Bank & Publish Blueprint |
| **02** | [`flow-02-examiner-session-fap-import.drawio`](./flow-02-examiner-session-fap-import.drawio) | **GĐ 2:** Cán bộ Khảo thí (`EXAMINER`) | Chọn Blueprint, tạo Ca thi, gán phòng/giám thị & **Import file Excel FAP** |
| **03** | [`flow-03-automated-test-assembly.drawio`](./flow-03-automated-test-assembly.drawio) | **GĐ 3:** OralAI Core (`ATA ENGINE`) | Sinh đề tự động theo `seed = hash(student_id + session_code)` độc lập chống gian lận |
| **04** | [`flow-04-student-exam-taking.drawio`](./flow-04-student-exam-taking.drawio) | **GĐ 4:** Thí sinh (`STUDENT APP`) | Đăng nhập Desktop, kiểm tra mic RNNoise, tải đề riêng, ghi âm câu trả lời & nộp MinIO |
| **05** | [`flow-05-ai-worker-assessment.drawio`](./flow-05-ai-worker-assessment.drawio) | **GĐ 5:** Celery AI Worker | Whisper STT, đo trôi chảy âm học, đối soát phát âm & chấm rubric chuẩn 6 Part PTE |
| **06** | [`flow-06-examiner-grading-assignment.drawio`](./flow-06-examiner-grading-assignment.drawio) | **GĐ 6:** Cán bộ Khảo thí (`EXAMINER`) | Phân công chấm: Round-Robin, cân bằng tải, kiểm tra chống xung đột lợi ích (dạy lớp) |
| **07** | [`flow-07-teacher-review-grading.drawio`](./flow-07-teacher-review-grading.drawio) | **GĐ 7:** Giảng viên (`TEACHER`) | Nghe audio, xem điểm AI, bấm **AGREE** hoặc **OVERRIDE** (kèm lý do) & viết feedback |
| **08** | [`flow-08-regrade-blind-marking.drawio`](./flow-08-regrade-blind-marking.drawio) | **GĐ 8:** Thí sinh & Giảng viên 2 | Nhận đơn phúc khảo $\rightarrow$ Hủy xóa audio $\rightarrow$ Giảng viên 2 chấm mù (Blind Marking) |
| **09** | [`flow-09-final-results-fap-export.drawio`](./flow-09-final-results-fap-export.drawio) | **GĐ 9:** Khảo thí & Hệ thống | Khóa điểm, công bố SV, **xuất file Excel chuẩn format FAP** nộp trường, Audit log |
| **10** | [`flow-10-storage-retention-cleanup.drawio`](./flow-10-storage-retention-cleanup.drawio) | **GĐ 10:** Cron Job tự động | Dọn dẹp MinIO: Xóa audio dung lượng lớn sau kỳ thi; lưu trữ vĩnh viễn transcript & điểm |

---

*Thư mục lưu trữ: `diagrams/` và `docs/diagrams/` trong dự án.*
