# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 3 — HỆ THỐNG SINH ĐỀ TỰ ĐỘNG ĐỘC LẬP (ATA)
## Automated Test Assembly (ATA Engine) & Seed-Based Randomization

### 1. Mục tiêu
Hệ thống tự động sinh đề thi riêng biệt cho từng thí sinh trong ca thi dựa trên công thức băm ngẫu nhiên có kiểm soát `seed = hash(student_id + session_code)`. Đảm bảo hai sinh viên ngồi cạnh nhau sẽ nhận được hai bộ đề khác nhau (chống nhìn bài/quay cóp) nhưng tuân thủ đúng 100% độ khó của ma trận, đồng thời đảm bảo tính bất biến nếu sinh viên gặp sự cố mạng phải đăng nhập lại.

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([Kích hoạt quy trình sinh đề ATA]) --> S1[Đọc thông tin Ca thi & Blueprint tương ứng]
    
    S1 --> S2[Lấy danh sách Thí sinh trong ca: session_candidates]
    S2 --> S3[Lặp qua từng Thí sinh candidate trong danh sách]
    
    S3 --> S4["Tạo mã Seed băm bất biến:\nseed = SHA256(student_id + session_code)"]
    S4 --> S5[Khởi tạo bộ sinh số ngẫu nhiên PRNG với Seed]
    
    S5 --> S6[Duyệt qua từng Blueprint Section:\nVí dụ: Section 1 (1 câu RA - Medium), Section 2 (1 câu DI - Hard)...]
    
    S6 --> S7[Lọc ngân hàng câu hỏi Item Bank theo đúng Type & Level của Section]
    S7 --> S8[Dùng PRNG bốc ngẫu nhiên câu hỏi hợp lệ]
    
    S8 --> S9{Kiểm tra trùng lặp\ncâu hỏi trong bài thi?}
    S9 -- "Trùng câu hỏi đã bốc" --> S8
    S9 -- "Không trùng" --> S10[Thêm câu hỏi vào danh sách Exam Paper Questions]
    
    S10 --> S11{Đã đủ số câu hỏi\ntheo tất cả Sections?}
    S11 -- "Chưa đủ" --> S6
    S11 -- "Đã đủ" --> S12[Đóng gói Đề thi riêng biệt Exam Paper]
    
    S12 --> S13[Lưu Exam Paper & Paper Questions vào CSDL gắn với Thí sinh]
    S13 --> S14{Còn Thí sinh tiếp theo\ntrong Ca thi không?}
    S14 -- "Còn thí sinh" --> S3
    S14 -- "Đã sinh đề cho 100% thí sinh" --> S15[Chốt trạng thái Đề thi: ASSIGNED\nSẵn sàng phục vụ giờ thi]
    
    S15 --> END_NODE([Hoàn thành Giai đoạn 3\nThí sinh vào phòng thi sẽ tải đúng đề của mình])
```

---

### 3. Đầu vào, Đầu ra & Thực thể dữ liệu liên quan

* **Tác tử thực hiện:** OralAI Core ATA Engine (Hệ thống tự động thực hiện, không có tác nhân con người can thiệp).
* **Đầu vào (Input):**
  - Danh sách `session_candidates` từ Giai đoạn 2.
  - Ma trận `blueprint_sections` từ Giai đoạn 1.
  - Ngân hàng câu hỏi `academic_questions` / `question_items`.
* **Đầu ra (Output):**
  - Bản ghi `exam_papers` cho mỗi thí sinh.
  - Danh sách `exam_paper_questions` gắn câu hỏi cụ thể theo thứ tự làm bài.
* **Thực thể dữ liệu (Database Tables):**
  - `exam_variants` / `exam_papers`
  - `question_attempts` / `exam_paper_questions`
  - `academic_questions`
