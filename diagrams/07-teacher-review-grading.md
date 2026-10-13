# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 7 — GIẢNG VIÊN HẬU KIỂM & CHẤM ĐIỂM
## Teacher Review, Audio Evidence & Human-in-the-Loop Grading

### 1. Mục tiêu
Giảng viên chấm thi (`TEACHER`) thực hiện vai trò **Human-in-the-loop** (Giám sát con người): Mở bài thi được phân công trên Staff Portal (`/grading`), nghe âm thanh minh chứng, đối soát bản gỡ băng với từ khóa được highlight, xem điểm gợi ý của AI, và quyết định **Đồng thuận (Agree)** hoặc **Can thiệp điểm (Override)** kèm lý do minh chứng và nhận xét sư phạm.

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([Giảng viên bắt đầu chấm bài]) --> T1[Đăng nhập Staff Portal & Mở trang Đánh giá & Chấm bài /grading]
    
    T1 --> T2[Chọn bài thi từ danh sách được phân công]
    T2 --> T3[Hệ thống mở Modal Chi tiết Bài thi PTEScoreAnalysisModal]
    
    T3 --> T4[Giảng viên thực hiện các thao tác đối soát đa chiều:\n1. Bật trình phát Audio nghe bản ghi âm minh chứng của thí sinh\n2. Xem ảnh đề thi Prompt Image & Câu trả lời mẫu Sample Answer\n3. Đọc bản Transcript gỡ băng với từ khóa Relevant Keywords được highlight xanh\n4. Xem bảng điểm AI Score Analysis chi tiết: Content, Fluency, Pronunciation]
    
    T4 --> T5{Giảng viên phát hiện lỗi\nnhận dạng từ vựng của STT?}
    
    T5 -- "Có lỗi nhận dạng STT" --> T5_EDIT[Bấm Chỉnh sửa Transcript EditTranscriptModal\nSửa lại các từ chuyên ngành bị gỡ sai]
    T5_EDIT --> T5_REGRADE[Bấm Chấm lại Regrade để AI cập nhật lại điểm theo văn bản đúng]
    T5_REGRADE --> T4
    
    T5 -- "Transcript chính xác" --> T6{Quyết định chuyên môn\nvề Điểm số của AI?}
    
    T6 -- "Đồng ý với điểm AI" --> T7_AGREE["Bấm Xác nhận Đồng thuận (Agree)\nHệ thống lưu: agreement = 'AGREE'\nGiữ nguyên điểm số AI gợi ý"]
    
    T6 -- "Điểm AI chưa chuẩn xác" --> T7_OVERRIDE[Bấm Can thiệp điểm ScoreOverrideModal]
    T7_OVERRIDE --> T7_INPUT[Giảng viên nhập mức điểm mới cho từng tiêu chí]
    T7_INPUT --> T7_REASON[Bắt buộc nhập Lý do can thiệp Override Reason\nLưu vết: agreement = 'OVERRIDE', override_by = teacher_id]
    
    T7_AGREE & T7_REASON --> T8[Giảng viên nhập Nhận xét sư phạm chi tiết Feedbacks cho sinh viên]
    T8 --> T9[Bấm Lưu & Phê duyệt Kết quả Chấm thi]
    
    T9 --> T10[Lưu bản ghi teacher_scores vào CSDL]
    T10 --> T11[Cập nhật trạng thái bài thi sang APPROVED]
    
    T11 --> END_NODE([Hoàn thành Giai đoạn 7\nBài thi đã có điểm chính thức có xác nhận của Giảng viên])
```

---

### 3. Đầu vào, Đầu ra & Thực thể dữ liệu liên quan

* **Tác tử thực hiện:** Giảng viên chấm thi (`TEACHER`).
* **Đầu vào (Input):**
  - Audio minh chứng lưu trên MinIO.
  - Điểm số và nhận xét từ `ai_scores`.
  - Transcript kèm từ khóa highlight.
* **Đầu ra (Output):**
  - Bản ghi điểm của Giảng viên `teacher_scores` (gồm cờ `AGREE` hoặc `OVERRIDE`).
  - Lý do can thiệp `override_reason` (nếu có).
  - Nhận xét phản hồi `feedback`.
  - Trạng thái bài thi chuyển thành `APPROVED`.
* **Thực thể dữ liệu (Database Tables):**
  - `question_attempts`
  - `assessments` / `teacher_scores`
  - `audit_logs`
