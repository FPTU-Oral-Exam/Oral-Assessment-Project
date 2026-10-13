# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 5 — AI WORKER CHẤM ĐIỂM TỰ ĐỘNG (BATCH)
## Multimodal AI Scoring Pipeline (PhoWhisper + Fluency + PTE Scoring)

### 1. Mục tiêu
Hệ thống **AI Worker** (chạy nền với Celery) tự động nhận diện bài nộp mới, tải audio minh chứng từ MinIO, chạy mô hình nhận dạng giọng nói (ASR), trích xuất các đặc trưng âm học (Acoustic Fluency), đối soát ngữ âm và ngữ nghĩa theo chuẩn quốc tế Pearson PTE và Rubric bộ môn, sau đó tính toán điểm chi tiết cho từng tiêu chí.

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([AI Worker quét hàng đợi Celery]) --> W1[Quét bản ghi submissions có status = 'UPLOADED']
    
    W1 --> W2[Lấy thông tin attempt & Tải file Audio raw từ MinIO Storage]
    
    W2 --> W3[Chạy mô hình ASR Whisper / PhoWhisper]
    W3 --> W4[Trích xuất Transcript văn bản + Word Timestamps + Độ tin cậy STT Confidence]
    
    W4 --> W5[Trích xuất Chỉ số Âm học Acoustic & Fluency Engine:\n- Tốc độ phát âm Speech Rate wps\n- Khoảng lặng Unnatural Pauses & Số lần ngắt\n- Từ đệm ngập ngừng Filled Pauses: um, uh, er\n- Nhận diện nói lắp, ngắc ngứ False Starts]
    
    W5 --> W6[Phân loại Dạng câu hỏi Part Type để áp dụng Module chấm tương ứng]
    
    W6 --> D1{Part Type là gì?}
    
    D1 -- "Part 1: Read Aloud" --> P1[Chạy pte_read_aloud.py:\n- Căn chỉnh từ WER Alignment\n- Content 0-5, Fluency 0-5, Pronun 0-5]
    
    D1 -- "Part 2: Repeat Sentence" --> P2[Chạy pte_repeat_sentence.py:\n- So khớp chuỗi đúng thứ tự\n- Content 0-3, Fluency 0-5, Pronun 0-5]
    
    D1 -- "Part 3: Describe Image" --> P3[Chạy pte_describe_image.py:\n- Khớp Keyword Recall & Cấu trúc bài nói\n- Content 0-6, Fluency 0-5, Pronun 0-5]
    
    D1 -- "Part 4: Re-tell Lecture" --> P4[Chạy pte_retell_lecture.py:\n- Trích xuất ý chính & Diễn ngôn tổng hợp\n- Content 0-6, Fluency 0-5, Pronun 0-5]
    
    D1 -- "Part 5: Answer Short Question" --> P5[Chạy pte_answer_short_question.py:\n- So khớp từ khóa mục tiêu\n- Content 0-1, Fluency 0-5, Pronun 0-5]
    
    D1 -- "Part 6: Group Discussion" --> P6[Chạy pte_group_discussion.py:\n- Tổng hợp góc nhìn đa người nói\n- Content 0-6, Fluency 0-5, Pronun 0-5]
    
    P1 & P2 & P3 & P4 & P5 & P6 --> W7[Quy đổi Điểm tổng ra thang PTE 10-90 và thang điểm 10]
    
    W7 --> W8[Tạo nhận xét chi tiết Feedback tự động theo Rubric]
    W8 --> W9[Lưu bản ghi ai_scores & enhanced_metrics vào CSDL]
    W9 --> W10[Cập nhật trạng thái submission sang 'SCORED']
    
    W10 --> END_NODE([Hoàn thành Giai đoạn 5\nSẵn sàng cho Khảo thí phân công Giảng viên chấm])
```

---

### 3. Đầu vào, Đầu ra & Thực thể dữ liệu liên quan

* **Tác tử thực hiện:** Celery Worker chạy ngầm (Backend AI Service).
* **Đầu vào (Input):**
  - File Audio raw từ MinIO Storage.
  - Văn bản đề bài, câu mẫu (Sample Answer) và bộ từ khóa (Keywords).
* **Đầu ra (Output):**
  - `transcript` và dấu thời gian từng từ.
  - Chỉ số âm học `fluency_metrics`.
  - Điểm thành phần `scores` (Content, Fluency, Pronunciation).
  - Bản ghi `ai_scores` được gắn vào câu trả lời, trạng thái chuyển sang `SCORED`.
* **Thực thể dữ liệu (Database Tables):**
  - `question_attempts`
  - `ai_scores` / `enhanced_metrics`
  - `submissions`
