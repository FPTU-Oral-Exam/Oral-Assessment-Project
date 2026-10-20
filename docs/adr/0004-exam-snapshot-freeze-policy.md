# ADR-0004: Đóng Băng Toàn Bộ Dữ Liệu Đề Thi (Snapshot Freeze Policy) Khi Công Bố Kỳ Thi

> **Trạng thái:** ACCEPTED  
> **Ngày phê duyệt:** 2026-10-02  
> **Người quyết định:** Bình (Lead Engineer) & AI Pair-Programming Mentor  
> **Phạm vi:** `services/api` (Models, Routers, Grading Engine), PostgreSQL 16

---

## 1. Bối cảnh (Context)

Trong môi trường đào tạo đại học, ngân hàng câu hỏi, tiêu chuẩn Rubrics, cấu hình dạng bài và tài liệu giáo trình RAG luôn biến động theo từng kỳ học hoặc khi giảng viên cập nhật học liệu.

Nếu hệ thống chấm thi truy vấn trực tiếp theo cơ chế quan hệ thời gian thực (Live Foreign Keys) tới bảng câu hỏi hoặc rubric hiện tại của môn học, một lỗi nghiệp vụ nghiêm trọng sẽ phát sinh:
* Sinh viên A thi vào Thứ Hai, đạt 8.0 điểm theo Rubric cũ.
* Thứ Tư, Giảng viên cập nhật lại tiêu chuẩn Rubric hoặc sửa nội dung câu hỏi trong Ngân hàng đề.
* Thứ Sáu, khi Sinh viên B làm bài hoặc khi Giảng viên bấm "Chấm lại" (Regrade/Phúc khảo) bài của Sinh viên A, AI sẽ chấm theo Rubric mới $\rightarrow$ Gây ra sự sai lệch tiêu chuẩn, vi phạm tính công bằng và quy chế khảo thí đại học.

## 2. Quyết định (Decision)

Chúng tôi quyết định áp dụng chính sách **Exam Snapshot Versioning & Freeze**:

1. **Cơ chế Đóng băng Snapshot (Snapshot Freeze):**
   - Khi một Kỳ thi hoặc Đề thi được Cán bộ Khảo thí chuyển trạng thái sang `PUBLISHED`, hệ thống tự động bóc tách và đóng gói toàn bộ:
     * Danh sách câu hỏi, thứ tự, dạng bài, thời lượng chuẩn bị và thời lượng nói.
     * Toàn bộ tiêu chuẩn Rubric (tên tiêu chí, trọng số, định nghĩa 4 band điểm).
     * Dữ liệu vector và tài liệu RAG liên kết tại thời điểm công bố.
     * AI System Prompt và cấu hình nhiệt độ (temperature).
   - Bản chụp này được lưu thành một thực thể độc lập (`ExamSnapshot`) trong CSDL và **khóa quyền chỉnh sửa (Immutable / Read-only)**.
2. **Phiên thi chỉ gắn kết với Snapshot:**
   - Mỗi phiên thi của thí sinh (`ExamSession`) bắt buộc phải tham chiếu trực tiếp đến `snapshot_id`.
   - Toàn bộ quá trình trình chiếu câu hỏi cho thí sinh trên Student App, quá trình tính điểm của Celery Worker, và quá trình xem xét của Giảng viên đều lấy dữ liệu từ Snapshot này.

## 3. Hệ quả & Đánh đổi (Consequences & Trade-offs)

### Tích cực:
* **Tính công bằng & Tính pháp lý tuyệt đối:** Mọi sinh viên trong cùng một đợt thi đều được đánh giá dựa trên cùng một bộ tiêu chuẩn duy nhất, không phụ thuộc vào các sửa đổi phát sinh sau này.
* **Khả năng tái lập kết quả (Reproducibility):** Bất kể thời điểm nào trong tương lai (kể cả sau 1 hoặc 2 năm), khi cần phúc khảo bài thi, hệ thống luôn có thể tái lập lại chính xác môi trường và tiêu chí chấm điểm tại thời điểm kỳ thi diễn ra.

### Đánh đổi (Trade-offs):
* Tăng nhẹ dung lượng lưu trữ CSDL trong PostgreSQL do dữ liệu được snapshot hóa (denormalization). Tuy nhiên, dung lượng metadata dạng JSONB là không đáng kể so với dung lượng lưu trữ file âm thanh trên MinIO.
