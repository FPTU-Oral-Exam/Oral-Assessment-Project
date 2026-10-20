# ADR-0005: Chuyển Đổi Khung Chấm Điểm Speaking Sang Chuẩn ENTs 5 Tiêu Chí Thang Điểm 10

> **Trạng thái:** ACCEPTED *(SUPERSEDES Cơ chế Chấm điểm PTE Speaking 3 Tiêu chí cũ)*  
> **Ngày phê duyệt:** 2026-10-20  
> **Người quyết định:** Bình (Lead Engineer) & AI Pair-Programming Mentor  
> **Phạm vi:** `services/api` (AI Engine, Worker, Rubric Models, Schemas), `apps/staff-portal` (Rubrics Studio, Teacher Grading)

---

## 1. Bối cảnh (Context)

Ban đầu, hệ thống kế thừa mô hình đánh giá của bài thi PTE Speaking quốc tế với 3 tiêu chí chính: *Content, Oral Fluency, Pronunciation* với thang điểm 5 cho mỗi tiêu chí (tổng điểm 15).

Tuy nhiên, khi đối chiếu với chương trình đào tạo thực tế tại Trường Đại học FPT cho chuỗi 6 môn Tiếng Anh học thuật (`ENT001`, `ENT104`, `ENT203`, `ENT303`, `ENT403`, `ENT503`), Hội đồng Khảo thí và Bộ môn áp dụng khung đánh giá riêng biệt gồm **5 tiêu chí độc lập** thang điểm 10:
1. *Ideas* (Ý tưởng & Khả năng phát triển nội dung)
2. *Pronunciation* (Phát âm, trọng âm, ngữ điệu)
3. *Grammar Range and Accuracy* (Độ phong phú và Độ chính xác Ngữ pháp)
4. *Vocabulary Range and Accuracy* (Vốn từ vựng và Độ chuẩn xác từ ngữ)
5. *Fluency and Coherence* (Độ trôi chảy và Tính liên kết ý)

Việc duy trì chuẩn cũ (PTE) không phản ánh đúng cấu trúc điểm số của Nhà trường và gây khó khăn cho Giảng viên khi nhập điểm vào hệ thống FAP.

## 2. Quyết định (Decision)

Chúng tôi quyết định chuẩn hóa toàn diện hệ sinh thái chấm thi sang **Chuẩn ENTs Speaking 5 Tiêu chí**:

1. **Chuẩn hóa Thang điểm & Công thức:**
   - Mỗi tiêu chí có điểm tối đa là **2.0 điểm**.
   - Tổng điểm bài thi là tổng điểm của 5 tiêu chí: $\text{Total Score} \in [0.0, 10.0]$.
2. **Quy chuẩn 4 Band Đánh giá Chi tiết:**
   - Mỗi tiêu chí được định nghĩa chặt chẽ theo 4 band chuẩn:
     * `[0.0 - <0.6)`: *Insufficient evidence* (Không đủ dữ liệu / Nói không hiểu gì / Không nói)
     * `[0.6 - <1.0)`: *Attempt made* (Có nỗ lực nhưng nhiều lỗi)
     * `[1.0 - <1.6)`: *Meets standard* (Đạt chuẩn cơ bản của môn học)
     * `[1.6 - 2.0]`: *Exceeds standard* (Vượt chuẩn, diễn đạt xuất sắc)
3. **Kiến trúc Chấm điểm Lai (Hybrid AI Grading Engine):**
   - **Tín hiệu âm thanh thực nghiệm (Acoustic Signal Processing):** Trích xuất từ Whisper/PhoWhisper các chỉ số Words-per-second (WPS), thời lượng ngập ngừng (Pause duration), tỷ lệ khoảng lặng (Pause ratio) và Token logprobs để chấm 2 tiêu chí *Pronunciation* và *Fluency*.
   - **Mô hình Ngôn ngữ Lớn (LLM Analysis):** Áp dụng Few-Shot Prompting chứa trực tiếp văn bản mô tả 4 Band điểm để đánh giá 3 tiêu chí ngữ nghĩa: *Ideas*, *Grammar*, và *Vocabulary*.
4. **Đồng bộ hóa Toàn diện:**
   - Cập nhật SQLAlchemy Model (`RubricCriterionModel`, `AcademicRubric`), Pydantic v2 schemas (`schemas_academy.py`).
   - Cập nhật giao diện Rubrics Studio (`/rubrics`), màn hình Giảng viên chấm thi (`/grading`) và Modal ghi đè điểm (`ScoreOverrideModal`).

## 3. Hệ quả & Đánh đổi (Consequences & Trade-offs)

### Tích cực:
* **Khớp 100% với Chương trình Thực tế:** Bảng điểm sinh ra có thể nhập trực tiếp vào hệ thống quản lý đào tạo FAP mà không cần qua bước quy đổi điểm trung gian.
* **Độ giải thích cao (High Explainability):** Điểm số luôn đi kèm tên Band cụ thể và nhận xét chi tiết từng lỗi ngữ pháp, từ vựng, giúp sinh viên và giảng viên dễ dàng tra cứu, phúc khảo.

### Đánh đổi (Trade-offs):
* Cần cập nhật lại dữ liệu mẫu (Seeder) và kịch bản kiểm thử (Pytest) cho toàn bộ 5 tiêu chí.
* Prompt của LLM dài hơn do phải nhúng toàn bộ mô tả của 4 band điểm, làm tăng nhẹ token usage nhưng đổi lại độ chính xác chấm điểm cao hơn rõ rệt.
