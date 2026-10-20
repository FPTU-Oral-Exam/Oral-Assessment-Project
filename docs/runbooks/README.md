# CẨM NANG VẬN HÀNH & QUY TRÌNH THỰC HÀNH CHUẨN (RUNBOOKS & SOPS)

> **Dự án:** AI Oral Assessment Platform  
> **Mục tiêu:** Cung cấp hướng dẫn chi tiết, từng bước (Step-by-step) để bất kỳ kỹ sư hoặc thành viên nào cũng có thể khởi chạy, kiểm thử và vận hành hệ thống một cách trơn tru, không gặp lỗi môi trường.

---

## 1. Danh mục các Runbooks (Runbook Index)

| Mã Tài liệu | Tên Runbook | Mục đích sử dụng | Môi trường áp dụng |
| :--- | :--- | :--- | :--- |
| [RUNBOOK-01](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/runbooks/01-local-dev-and-docker-setup.md) | **Thiết lập Môi trường Phát triển & Docker Cluster** | Khởi chạy cụm 6 container, cấu hình `.env`, chạy dev servers. | Windows 11, PowerShell, Docker Desktop |
| [RUNBOOK-02](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/runbooks/02-testing-and-verification-suite.md) | **Quy trình Kiểm thử Toàn diện (Testing & Verification)** | Chạy Typecheck 3 workspaces, Pytest Backend, Vitest Shared/Frontend. | Toàn bộ Monorepo |
| [RUNBOOK-03](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/runbooks/03-demo-seeding-and-defense-showcase.md) | **Nạp Dữ liệu Mẫu & Kịch bản Trình diễn Bảo vệ Đồ án** | Khởi tạo tài khoản chuẩn, môn học ENTs, đề thi và kịch bản Demo mượt mà trước Hội đồng. | Demo Showroom / Hội đồng Khoa |

---

## 2. Nguyên tắc "Vàng" khi Vận hành Hệ thống

1. **Thứ tự Khởi động Hạ tầng:** Luôn khởi động cụm Docker Containers (`postgres`, `redis`, `minio`) trước khi khởi chạy Backend API hoặc Background Worker.
2. **Quy tắc Lệnh Node trên Windows:** Luôn ưu tiên dùng `npm.cmd` trong PowerShell để tránh lỗi Policy execution script của Windows.
3. **Phòng ngừa Xung đột Cache Next.js:** Khi chạy `next build` để kiểm tra bản production, nếu dev server đang chạy ngầm, bắt buộc xóa cache `.next/` trước khi khởi động lại `npm.cmd run dev` để tránh lỗi mất CSS chunk.
