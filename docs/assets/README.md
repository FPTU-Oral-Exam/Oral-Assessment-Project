# 📦 Hướng dẫn chuẩn bị Demo Visuals

## 📸 Chụp Ảnh Screenshot

### Công cụ khuyến nghị:
- **Windows:** `Win + Shift + S` → Chọn vùng → Copy vào Paint/GIMP
- **Snipping Tool** (có sẵn Windows 10/11)
- **Lightshot** (https://app.prntscr.com/) — nhanh, có annotation

### Danh sách ảnh cần chụp:

| File | Màn hình | Kích thước đề xuất |
|:---|:---|:---|
| `01-student-device-setup.png` | Setup mic/cam trong Student App | 1280x720 |
| `02-student-exam-room.png` | Màn hình phòng thi đang thi | 1280x720 |
| `03-item-bank-pte.png` | Kho câu hỏi PTE - 1,254 câu | 1280x720 |
| `04-exam-matrix.png` | Ma trận đề thi (Blueprint Editor) | 1280x720 |
| `05-rubrics-studio.png` | Cấu hình Rubric 4 tiêu chí | 1280x720 |
| `06-stock-health.png` | Stock Health Validator - coverage | 1280x720 |
| `07-grading-list.png` | Danh sách bài cần chấm | 1280x720 |
| `08-grading-focus.png` | Màn hình chấm: Audio + Transcript | 1280x720 |
| `09-ai-stt-pipeline.png` | Celery Worker logs - STT/RAG/Grading | 1280x720 |
| `10-radar-chart.png` | Radar chart kết quả AI grading | 1280x720 |

### Mẹo chụp đẹp:
1. **Đăng nhập trước** với tài khoản phù hợp (academy, examiner, teacher1)
2. **Zoom trình duyệt 100%** để text không bị mờ
3. **Chụp full window**, không crop quá hẹp
4. **Save as PNG** (không JPG để giữ chất lượng)

---

## 🎬 Ghi Video

### Công cụ khuyến nghị:
- **OBS Studio** (miễn phí, https://obsproject.com/) — ghi toàn màn hình
- **ShareX** (miễn phí, Windows) — ghi nhanh
- **Loom** (https://loom.com/) — ghi + share dễ dàng

### Danh sách video cần ghi:

| File | Nội dung | Thời lượng |
|:---|:---|:---|
| `student-app-flow.mp4` | Luồng thi: Login → Setup → Thi → Nộp bài | 30-45s |
| `teacher-grading.mp4` | Giảng viên: Mở bài → Audio → Transcript → Duyệt điểm | 30-45s |
| `ai-grading.mp4` | AI pipeline: Celery logs → Transcript → Radar chart | 20-30s |

### Mẹo ghi video mượt:
1. **Chuẩn bị trước:** Đăng nhập sẵn, mở đúng màn hình
2. **Thao tác chậm rãi:** Nói những gì đang làm
3. **Format:** MP4, 1280x720, 30fps
4. **Nén video:** Dùng HandBrake (miễn phí) nếu file >50MB

---

## ✅ Checklist trước khi báo cáo

- [ ] Tất cả 10 ảnh đã chụp và lưu vào `screenshots/`
- [ ] Tất cả 3 video đã ghi và lưu vào `videos/`
- [ ] Chạy thử xem ảnh/video có hiển thị đúng trong EXECUTIVE_BRIEFING.md
- [ ] Kích thước ảnh tối ưu (nén nếu >2MB/ảnh)
