# ADR-0003: Phân tách Dual-Frontend và Tái Cấu trúc theo Strangler Fig Pattern

> **Trạng thái:** ACCEPTED  
> **Ngày phê duyệt:** 2026-09-30  
> **Người quyết định:** Bình (Lead Engineer) & AI Pair-Programming Mentor  
> **Phạm vi:** `packages/shared`, `apps/student-app`, `apps/staff-portal`, `apps/desktop` (Legacy), `apps/admin-web` (Legacy)

---

## 1. Bối cảnh (Context)

Kiến trúc ban đầu của dự án kế thừa cấu trúc ứng dụng cồng kềnh với:
* `apps/desktop`: Một ứng dụng Electron đa mục đích, chứa lẫn lộn cả màn hình thi cử của Sinh viên lẫn các chức năng quản lý môn học, giáo trình của Giảng viên.
* `apps/admin-web`: Ứng dụng Web cũ thiếu phân quyền RBAC đa vai trò, mã nguồn trùng lặp với desktop và giao diện chưa được tối ưu.

Khi bổ sung các yêu cầu nghiệp vụ chuyên sâu (Học vụ soạn đề, Khảo thí xếp ca thi, Giảng viên coi thi, Chống gian lận thi cử), việc tiếp tục chắp vá trên codebase cũ gây ra rủi ro lỗi dây chuyền rất lớn. Tuy nhiên, nếu đập bỏ toàn bộ hệ thống cũ ngay lập tức (Big Bang rewrite), dự án sẽ bị gián đoạn và không thể demo hoặc kiểm thử trong suốt quá trình làm mới.

## 2. Quyết định (Decision)

Chúng tôi quyết định áp dụng mô hình **Dual-Frontend chuyên biệt** kết hợp chiến lược chuyển đổi **Strangler Fig Refactoring Pattern**:

1. **Phân tách rạch ròi 2 Ứng dụng Client:**
   - **`apps/student-app` (Desktop Electron + Vite + React 18):** Dành riêng cho Sinh viên (`STUDENT`). Khóa bảo mật phòng thi, chặn phím tắt DevTools, chặn quay màn hình và chỉ phục vụ luồng làm bài thi.
   - **`apps/staff-portal` (Web Next.js 15 App Router + React 19):** Cổng thông tin tập trung dành cho Cán bộ & Giảng viên (`SYSTEM_ADMIN`, `ACADEMY`, `EXAMINER`, `TEACHER`), phân quyền chặt chẽ theo Route Guards và Middleware.
2. **Xây dựng Gói Dùng chung (`packages/shared`):**
   - Đóng gói toàn bộ Domain Types, Zod runtime validation schemas và bộ tải file đa luồng `ChunkedUploader` vào `@oralai/shared`.
   - Cả Student App và Staff Portal đều tham chiếu chung gói này để đảm bảo tính nhất quán (Single Source of Truth) với Backend.
3. **Chiến lược Strangler Fig Pattern:**
   - Phát triển song song `packages/shared`, `apps/student-app`, và `apps/staff-portal` bên cạnh hệ thống cũ.
   - Chỉ khi phân hệ mới hoàn thành 100% kiểm thử tích hợp (Typecheck, Vitest, E2E) và vượt qua thử nghiệm thực tế mới tiến hành gỡ bỏ hoàn toàn các thư mục cũ `apps/desktop` và `apps/admin-web`.

## 3. Hệ quả & Đánh đổi (Consequences & Trade-offs)

### Tích cực:
* **Tính độc lập & Bảo mật:** Sinh viên chỉ tiếp xúc với ứng dụng làm bài, không có bất kỳ dòng code quản trị nào nằm trong gói cài đặt máy trạm.
* **Chuyển đổi an toàn (Zero Disruption):** Quá trình tái cấu trúc diễn ra mượt mà, hệ thống luôn ở trạng thái có thể chạy được (Buildable & Testable) tại mọi thời điểm.
* **Tận dụng tối đa thế mạnh nền tảng:** Web Next.js mang lại tốc độ tải trang và SEO/SSR tốt cho cán bộ; Electron mang lại khả năng tương tác sâu với phần cứng âm thanh/hình ảnh cho sinh viên.

### Đánh đổi (Trade-offs):
* Phải quản trị Monorepo bằng `npm workspaces`, cần cấu hình TypeScript path mapping chuẩn xác để các workspace nhận diện được nhau.
