# ADR-0006: Cơ Chế Xác Thực Kép (Dual-Auth Protocol) Cho Web Portal Và Desktop App

> **Trạng thái:** ACCEPTED  
> **Ngày phê duyệt:** 2026-10-03  
> **Người quyết định:** Bình (Lead Engineer) & AI Pair-Programming Mentor  
> **Phạm vi:** `services/api` (Auth Middleware, Routes), `apps/staff-portal`, `apps/student-app`

---

## 1. Bối cảnh (Context)

Hệ thống có hai môi trường máy trạm (Clients) với các đặc tính bảo mật và mô hình đe dọa (Threat Models) hoàn toàn khác nhau:

1. **Staff Portal (Trình duyệt Web - Next.js):**
   - Môi trường trình duyệt web luôn đối mặt với nguy cơ tấn công **Cross-Site Scripting (XSS)**. Nếu lưu trữ JWT Token trong `localStorage` hoặc `sessionStorage`, bất kỳ một mã độc script nào (từ thư viện bên thứ ba hoặc injection) đều có thể trích xuất token và chiếm đoạt phiên làm việc của Cán bộ / Giảng viên.
2. **Student App (Ứng dụng Desktop Electron):**
   - Ứng dụng Desktop chạy trong môi trường Node.js / Chromium cục bộ. Cơ chế Cookie trên Desktop đôi khi gặp vấn đề về đồng bộ Origin giữa giao thức file/local server và backend. Mặt khác, sinh viên có thể lục tìm các tệp tin lưu trên ổ cứng (`AppData`, `Local Storage`) để trích xuất token nếu lưu trữ dưới dạng file.

## 2. Quyết định (Decision)

Chúng tôi quyết định thiết kế và áp dụng **Giao thức Xác thực Kép (Dual-Auth Protocol)**:

1. **Staff Portal (Web) — Xác thực bằng HttpOnly Cookie:**
   - Sau khi đăng nhập thành công qua `/api/v1/auth/login` hoặc Google OAuth, Backend trả về `access_token` được bọc trong **HttpOnly, Secure, SameSite=Lax Cookie**.
   - Phía Frontend Next.js không cần (và không thể) truy cập token bằng JavaScript. Trình duyệt tự động đính kèm cookie này trong mọi request gửi tới Backend.
   - Ngăn chặn 100% việc đánh cắp token thông qua XSS.
2. **Student App (Desktop) — Xác thực bằng Bearer JWT Trong Bộ Nhớ RAM:**
   - Sau khi Sinh viên đăng nhập, Token được lưu giữ **duy nhất trong biến bộ nhớ (In-Memory RAM)** của tiến trình ứng dụng.
   - Desktop App gửi token qua HTTP Header: `Authorization: Bearer <token>`.
   - Tuyệt đối **không ghi token vào `localStorage`, không ghi ra file cấu hình trên ổ đĩa** để ngăn chặn việc trích xuất token sau giờ thi.
3. **Backend FastAPI — Bộ Trích xuất Xác thực Hợp nhất (Dual-Auth Extractor):**
   - Middleware xác thực tại `services/api` tự động kiểm tra theo thứ tự ưu tiên:
     1. Nếu có header `Authorization: Bearer ...` $\rightarrow$ giải mã token cho Desktop Client.
     2. Nếu không có header, kiểm tra cookie `access_token` $\rightarrow$ giải mã token cho Web Client.
     3. Nếu cả hai đều không hợp lệ $\rightarrow$ trả về HTTP 401 Unauthorized.

## 3. Hệ quả & Đánh đổi (Consequences & Trade-offs)

### Tích cực:
* **Bảo mật tối đa theo chuẩn OWASP:** Mỗi loại client được áp dụng cơ chế bảo mật tối ưu nhất cho nền tảng của nó.
* **Trải nghiệm người dùng mượt mà:** Người dùng Web không bị mất phiên khi tải lại trang; Sinh viên thi trên Desktop được bảo vệ an toàn khỏi việc bị đánh cắp thông tin đăng nhập.

### Đánh đổi (Trade-offs):
* Cần cấu hình CORS chặt chẽ tại Backend (`allow_credentials=True`, chỉ định đích danh domain nguồn, không dùng `*`).
