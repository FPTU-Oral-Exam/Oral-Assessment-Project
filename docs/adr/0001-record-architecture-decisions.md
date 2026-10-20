# ADR-0001: Ghi nhận các Quyết định Kiến trúc (Record Architecture Decisions)

> **Trạng thái:** ACCEPTED  
> **Ngày phê duyệt:** 2026-09-25  
> **Người quyết định:** Bình (Lead Engineer) & AI Pair-Programming Mentor  
> **Phạm vi:** Toàn bộ Repository và Quy trình Phát triển

---

## 1. Bối cảnh (Context)

Dự án *AI Oral Assessment Platform* là hệ thống có độ phức tạp cao, tích hợp đa công nghệ: Electron, Next.js, FastAPI, Celery, PhoWhisper/Whisper AI, PostgreSQL/pgvector và MinIO.

Trong các dự án nghiên cứu hoặc phát triển dài hạn, các quyết định kỹ thuật thường được thảo luận qua chat, meeting hoặc ghi chú phân tán. Sau một thời gian, các thành viên không còn nhớ lý do tại sao một kiến trúc lại được chọn, dẫn đến tình trạng tranh cãi lặp đi lặp lại hoặc đưa ra các thay đổi làm phá vỡ các giả định nền tảng (hidden assumptions).

## 2. Quyết định (Decision)

Chúng tôi quyết định áp dụng quy chuẩn **MADR (Markdown Architecture Decision Records)** để lưu trữ toàn bộ các quyết định kiến trúc quan trọng trong thư mục `docs/adr/` của repository Git.

Cụ thể:
1. Mọi quyết định có tính chất ảnh hưởng đến cấu trúc tổng thể, bảo mật, luồng dữ liệu hoặc mô hình phân quyền đều phải được lập thành 1 file ADR với mã số tăng dần (`000X-ten-quyet-dinh.md`).
2. Quy tắc **Append-Only**: Không xóa hoặc sửa đổi nội dung quyết định của các ADR cũ đã `ACCEPTED`. Nếu thay đổi chiến lược kỹ thuật, bắt buộc tạo một ADR mới và đánh dấu ADR cũ là `SUPERSEDED by ADR-xxxx`.
3. Tài liệu ADR được review và merge cùng với Pull Request chứa mã nguồn thực thi.

## 3. Hệ quả & Đánh đổi (Consequences & Trade-offs)

### Tích cực:
* Tạo ra lịch sử quyết định rõ ràng, có căn cứ khoa học và kỹ thuật để báo cáo với Thầy hướng dẫn và Hội đồng bảo vệ đồ án.
* Giúp quá trình bàn giao công việc giữa các phiên làm việc và giữa các thành viên diễn ra liền mạch mà không bị mất ngữ cảnh (Zero Context Loss).
* Giảm thiểu xung đột và tranh cãi không cần thiết về kiến trúc.

### Đánh đổi (Trade-offs):
* Đòi hỏi thêm chi phí viết và xem xét tài liệu trong mỗi sprint khi có thay đổi kiến trúc lớn.
