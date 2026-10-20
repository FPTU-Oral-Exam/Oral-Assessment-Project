# ORALAI - EXECUTIVE BRIEFING

> **Dự án:** Nền tảng Thi Vấn đáp Tự động bằng AI  
> **Sinh viên:** Nguyễn Văn Gia Bình — Khoa CNTT, ĐH FPT  
> **Cập nhật:** Tháng 10/2026

---

## 🚀 TÓM TẮT

Hệ thống thi vấn đáp tự động bằng AI, thay thế chấm tay truyền thống. Sinh viên nói → Server tự động phiên âm (PhoWhisper) + chấm điểm theo Rubric (LLM). Bằng chứng audio lưu trữ bất biến trên MinIO.

---

## 📊 TRẠNG THÁI TRIỂN KHAI

| Thành phần | Trạng thái | Chi tiết |
|:---|:---:|:---|
| **Code hoàn thành** | ✅ | Student App, Staff Portal, Backend API |
| **Kiểm thử** | ✅ | 6/6 containers, 132 tests pass |
| **Kho câu hỏi PTE** | ✅ | 1,254 câu đã import vào database |
| **Demo Seeder** | 🔄 | 85% — đang hoàn thiện |

---

## 🏆 ĐIỂM NỔI BẬT

| # | Tính năng | Lợi ích |
|:---:|:---|:---|
| 1 | **Server-Side STT** | PhoWhisper chạy trên server — thí sinh không thể can thiệp transcript |
| 2 | **Bằng chứng bất biến** | Audio chunk 4MB + SHA-256 → MinIO → căn cứ pháp lý cho phúc khảo |
| 3 | **Rubric chuẩn hóa** | 4 tiêu chí: Content (40%), Fluency (20%), Lexicon (20%), Pronunciation (20%) |
| 4 | **1-Click Demo** | Tài khoản sẵn có: academy / examiner / teacher1 / student1 |

---

## 🖼️ DEMO VISUALS

### Student App — Luồng thi

| | |
|:---|:---|
| ![Device Setup](docs/assets/screenshots/01-student-device-setup.png) | ![Exam Room](docs/assets/screenshots/02-student-exam-room.png) |
| *1. Kiểm tra thiết bị (Mic + Cam)* | *2. Màn hình phòng thi với timer* |

> **Video:** [Luồng thi hoàn chỉnh 30s](docs/assets/videos/student-app-flow.mp4)

---

### Staff Portal — ACADEMY Dashboard

| | |
|:---|:---|
| ![Item Bank](docs/assets/screenshots/03-item-bank-pte.png) | ![Exam Matrix](docs/assets/screenshots/04-exam-matrix.png) |
| *3. Kho câu hỏi PTE — 1,254 câu* | *4. Ma trận đề thi (Blueprint)* |

| | |
|:---|:---|
| ![Rubrics Studio](docs/assets/screenshots/05-rubrics-studio.png) | ![Stock Health](docs/assets/screenshots/06-stock-health.png) |
| *5. Cấu hình Rubric 4 tiêu chí* | *6. Chỉ số coverage 5x/2x* |

---

### Giảng viên — Chấm thi

| | |
|:---|:---|
| ![Grading List](docs/assets/screenshots/07-grading-list.png) | ![Grading Focus](docs/assets/screenshots/08-grading-focus.png) |
| *7. Danh sách bài cần chấm* | *8. Màn hình chấm: Audio + Transcript + Rubric* |

> **Video:** [Giảng viên chấm thi 30s](docs/assets/videos/teacher-grading.mp4)

---

### AI Processing Pipeline

| | |
|:---|:---|
| ![STT Pipeline](docs/assets/screenshots/09-ai-stt-pipeline.png) | ![Radar Chart](docs/assets/screenshots/10-radar-chart.png) |
| *9. Celery Worker: STT → RAG → Grading* | *10. Radar chart kết quả AI* |

> **Video:** [AI Grading pipeline 20s](docs/assets/videos/ai-grading.mp4)

---

## ❓ CẦN Ý KIẾN THẦY CÔ

| # | Câu hỏi | Đề xuất | OK? |
|:---:|:---|:---|:---:|
| 1 | **NO-PLAYBACK** — Không cho thí sinh nghe lại bài thi? | Bảo vệ tính phản xạ tự nhiên (chuẩn IELTS/PTE) | ☐ |
| 2 | **Trọng số Rubric** — Content 40%, Fluency 20%, Lexicon 20%, Pronunciation 20%? | Phù hợp đánh giá Speaking | ☐ |
| 3 | **Đăng nhập** — Email FPT + Mã Code Ca thi (Exam PIN)? | Giám thị cấp tại phòng thi | ☐ |
| 4 | **Số lần thi** — Chính quy: 1 lần; Luyện tập: không giới hạn? | Đảm bảo công bằng kỳ thi | ☐ |

---

## 📞 LIÊN HỆ

- **GitHub:** `github.com/your-repo/AI-Oral-Assessment-Platform`
- **Tài liệu chi tiết:** [docs/bao-cao-tong-quan-he-thong-oralai.md](docs/bao-cao-tong-quan-he-thong-oralai.md)
- **Hướng dẫn sử dụng:** [docs/user-guide.md](docs/user-guide.md)
