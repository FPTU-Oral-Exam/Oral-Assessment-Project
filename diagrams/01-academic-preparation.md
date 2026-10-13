# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 1 — CHUẨN BỊ HỌC VỤ & MA TRẬN ĐỀ
## Academic Preparation & Blueprint Publishing

### 1. Mục tiêu
Cán bộ Học thuật (`ACADEMY`) thiết lập toàn bộ nền tảng học vụ cho kỳ thi, bao gồm: Tạo học kỳ, môn học mở trong kỳ (`course_offering`), định nghĩa khung rubric chuẩn, quản lý ngân hàng câu hỏi (`item_bank`) phân loại theo dạng bài và độ khó, và đóng gói ma trận đề thi (`exam_blueprint`) bất biến.

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([Bắt đầu chuẩn bị học vụ]) --> A1[Cán bộ Học thuật đăng nhập Staff Portal]
    
    A1 --> A2[Tạo Học kỳ mới\nví dụ: Fall 2026]
    A2 --> A3[Tạo/Chọn Môn học chuẩn\nví dụ: ENG_SPK_1]
    A3 --> A4[Tạo Course Offering\ngắn Môn học vào Học kỳ Fall 2026]
    
    A4 --> A5[Thiết lập Khung Tiêu chí Rubric Template]
    A5 --> A5_SUB[Định nghĩa tiêu chí: Fluency, Pronunciation, Content, Vocabulary]
    A5_SUB --> A5_ATTACH[Gắn Rubric Template vào Course Offering]
    
    A5_ATTACH --> A6[Import / Cập nhật Ngân hàng câu hỏi Item Bank]
    A6 --> A6_TAG[Gán nhãn câu hỏi: Type RA/RS/DI/RL/ASQ/SGD & Level EASY/MEDIUM/HARD]
    
    A6_TAG --> A7[Tạo Ma trận Đề thi Exam Blueprint]
    A7 --> A7_SEC[Định nghĩa Blueprint Sections:\n- Phần 1: Số câu, Dạng bài Type, Độ khó Level\n- Phần 2: Số câu, Dạng bài Type, Độ khó Level...]
    
    A7_SEC --> A8{Kiểm tra tính đầy đủ\ncủa Ngân hàng câu hỏi?}
    A8 -- "Không đủ số câu theo ma trận" --> A8_WARN[Cảnh báo thiếu câu hỏi\nCần bổ sung thêm câu hỏi vào Item Bank]
    A8_WARN --> A6
    
    A8 -- "Đầy đủ câu hỏi" --> A9[Bấm Công bố Ma trận đề\nPublish Blueprint]
    A9 --> A10[Hệ thống đóng băng Snapshot bất biến\nBlueprint chuyển trạng thái PUBLISHED]
    A10 --> END_NODE([Hoàn thành Giai đoạn 1\nSẵn sàng cho Khảo thí lập Ca thi])
```

---

### 3. Đầu vào, Đầu ra & Thực thể dữ liệu liên quan

* **Tác tử thực hiện:** Cán bộ Học thuật (`ACADEMY`).
* **Đầu vào (Input):** Đề cương môn học, bộ tiêu chí đánh giá, danh mục câu hỏi (audio, hình ảnh, văn bản).
* **Đầu ra (Output):** `exam_blueprint` ở trạng thái `PUBLISHED` (đã đóng băng snapshot).
* **Thực thể dữ liệu (Database Tables):**
  - `semesters` (Terms)
  - `courses` & `course_offerings`
  - `rubrics` & `rubric_criteria`
  - `academic_questions` / `question_items`
  - `academic_matrices` / `exam_blueprints` & `blueprint_sections`
