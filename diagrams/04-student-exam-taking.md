# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 4 — THÍ SINH THAM GIA THI & NỘP BÀI
## Student Exam Experience & Real-Time Evidence Capture

### 1. Mục tiêu
Thí sinh (`STUDENT`) sử dụng ứng dụng chuyên dụng **OralAI Student Desktop App** (Electron Client) để đăng nhập, xác thực ca thi, kiểm tra mic, tải đề thi cá nhân hóa, làm bài ghi âm từng phần và nộp bài an toàn lên MinIO Storage.

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([Thí sinh ngồi vào phòng thi]) --> ST1[Mở OralAI Student Desktop App]
    
    ST1 --> ST2[Đăng nhập: Nhập MSSV + Mật khẩu thi]
    ST2 --> ST3[Nhập Mã Ca thi Session Code do Giám thị công bố]
    
    ST3 --> ST4{Xác thực Thí sinh\ntrong Ca thi session_candidates?}
    ST4 -- "Không hợp lệ / Sai ca thi" --> ST4_ERR[Báo lỗi: Thí sinh không thuộc ca thi này\nYêu cầu liên hệ Giám thị]
    ST4_ERR --> ST3
    
    ST4 -- "Hợp lệ" --> ST5[Vào màn hình Check-in & Kiểm tra thiết bị]
    ST5 --> ST6[Kiểm tra Microphone & Đo độ ồn phòng thi với RNNoise]
    ST6 --> ST7{Microphone hoạt động\nđạt tiêu chuẩn?}
    ST7 -- "Mic lỗi / Âm quá nhỏ" --> ST7_FIX[Yêu cầu thí sinh chỉnh Gain hoặc đổi cổng mic]
    ST7_FIX --> ST6
    
    ST7 -- "Mic đạt chuẩn" --> ST8[Sẵn sàng thi & Chờ Giám thị mở ca]
    ST8 --> ST9[Bấm Bắt đầu làm bài thi\nỨng dụng tải Exam Paper cá nhân hóa đã sinh ở GĐ 3]
    
    ST9 --> ST10[Lần lượt làm từng câu hỏi theo thứ tự Part 1 -> Part 6]
    ST10 --> ST11[Đếm ngược thời gian chuẩn bị Preparation Countdown]
    ST11 --> ST12[Tự động bật Microphone & Đếm ngược thời gian nói Speaking Countdown]
    ST12 --> ST13[Ghi âm âm thanh chất lượng cao\nChia chunk 4MB tải ngầm trực tiếp lên MinIO Storage]
    
    ST13 --> ST14{Còn câu hỏi tiếp theo\ntrong đề thi?}
    ST14 -- "Còn câu hỏi" --> ST10
    ST14 -- "Hoàn thành toàn bộ câu hỏi" --> ST15[Hiển thị màn hình Xác nhận Nộp bài]
    
    ST15 --> ST16[Thí sinh bấm Nộp bài Submit]
    ST16 --> ST17[Hệ thống đóng phiên thi, chốt toàn bộ Audio chunks]
    ST17 --> ST18[Tạo bản ghi submissions ở trạng thái UPLOADED\nĐẩy sự kiện vào hàng đợi Celery]
    
    ST18 --> ST19[Hiển thị thông báo: Nộp bài thành công\nThí sinh rời khỏi ứng dụng]
    ST19 --> END_NODE([Hoàn thành Giai đoạn 4\nChuyển sang AI Worker chấm tự động])
```

---

### 3. Đầu vào, Đầu ra & Thực thể dữ liệu liên quan

* **Tác tử thực hiện:** Thí sinh (`STUDENT`).
* **Đầu vào (Input):**
  - MSSV, Password, Session Code.
  - Đề thi `exam_papers` đã được sinh ở Giai đoạn 3.
  - Tín hiệu âm thanh Micro phòng thi.
* **Đầu ra (Output):**
  - File Audio raw minh chứng trên MinIO Object Storage.
  - Bản ghi `submissions` có trạng thái `UPLOADED`.
  - Các bản ghi `question_attempts` cho từng câu hỏi.
* **Thực thể dữ liệu (Database Tables):**
  - `exam_sessions`
  - `question_attempts` / `submissions`
  - `uploads` / MinIO Storage metadata
