# KHO LƯU TRỮ TÀI LIỆU LỊCH SỬ (LEGACY MVP ARCHIVE)

> **Ngày lưu trữ:** 03/10/2026  
> **Trạng thái:** Không còn sử dụng (Archived / Read-only)  
> **Tài liệu thay thế chính thức:** [Dual-Frontend Architecture Specification](../../superpowers/specs/2026-09-30-dual-frontend-architecture.md) & [Database Schema 3NF](../../architecture/database-schema.md)

---

## 1. MỤC ĐÍCH LƯU TRỮ

Các tài liệu trong thư mục này thuộc giai đoạn phát triển ban đầu (**Phase 1 MVP**, trước ngày 30/09/2026). Chúng được tách khỏi cây tài liệu chính thức nhằm:
1. **Bảo toàn lịch sử nghiên cứu:** Phục vụ tra cứu tiến trình tiến hóa kiến trúc (Architecture Evolution) khi báo cáo với Thầy hướng dẫn hoặc Hội đồng Khoa.
2. **Loại bỏ xung đột kiến trúc:** Tránh gây nhầm lẫn giữa cơ chế cũ (Local STT, sửa transcript trên máy học viên, Fat Electron) và kiến trúc chuẩn hóa hiện tại (Thin-Client Student App, Server-Side STT PhoWhisper, Dual-Frontend).

---

## 2. DANH MỤC TÀI LIỆU LƯU TRỮ & LÝ DO THAY THẾ

| STT | Tên tài liệu lưu trữ | Nội dung & Lý do lưu trữ | Tài liệu hiện hành thay thế |
| :---: | :--- | :--- | :--- |
| 1 | [`transcript-correction.md`](transcript-correction.md) | **Cơ chế sửa transcript thủ công trên Desktop:** Sinh viên tự gõ phím sửa văn bản transcript sau khi nhận dạng. Đã bãi bỏ hoàn toàn vì vi phạm nguyên tắc bảo mật phòng thi (**Anti-Tampering & Zero-Manual-Input**). | [`04-actor-student.md`](../../specifications/04-actor-student.md) & [`2026-09-30-dual-frontend-architecture.md`](../../superpowers/specs/2026-09-30-dual-frontend-architecture.md) |
| 2 | [`desktop-build.md`](desktop-build.md) | **Quy trình đóng gói Desktop cũ (`apps/desktop`):** Đóng gói Python venv, CTranslate2 và model PhoWhisper-small INT8 vào installer. Đã thay thế bởi Thin-Client không model AI. | [`apps/student-app/`](../../../apps/student-app/) & [`2026-10-02-phase2-student-app.md`](../../superpowers/plans/2026-10-02-phase2-student-app.md) |
| 3 | [`jenkins.md`](jenkins.md) | **Pipeline Jenkins cũ:** Cấu hình deploy Jenkins lên domain test cũ. Dự án hiện đã chuẩn hóa trên Docker Compose, GitHub Actions và Playwright E2E. | [`docker-compose.yml`](../../../docker-compose.yml) & [`docker-compose.test.yml`](../../../docker-compose.test.yml) |
| 4 | [`STT-MODEL-PLAN.md`](STT-MODEL-PLAN.md) | **Bản nháp chuyển đổi mô hình STT:** Ghi chép ban đầu khi chuyển dịch sang phương pháp Zero-STT local. Toàn bộ nội dung đã được hoàn thiện trong Master Spec. | [`2026-09-30-dual-frontend-architecture.md`](../../superpowers/specs/2026-09-30-dual-frontend-architecture.md) |
| 5 | [`validation.md`](validation.md) | **Nhật ký kiểm thử MVP cũ (17/09 - 23/09/2026):** Biên bản test các tính năng cũ đã gỡ bỏ (Qwen3 LLM local, mic gain cũ). | [`docs/superpowers/plans/`](../../superpowers/plans/) & [`FINAL_VERIFICATION_AND_DEFENSE_PLAN.md`](../../../docs-local/FINAL_VERIFICATION_AND_DEFENSE_PLAN.md) |
| 6 | [`phase-1.md`](phase-1.md) | **Kiến trúc MVP giai đoạn 1:** Sơ đồ kiến trúc gộp Web/Desktop dùng chung giao diện Next.js, vai trò cũ. | [`2026-09-30-dual-frontend-architecture.md`](../../superpowers/specs/2026-09-30-dual-frontend-architecture.md) |
| 7 | [`examples/`](examples/) | **Tài liệu văn bản mẫu thử nghiệm ban đầu (`se101.txt`):** File văn bản tĩnh cũ dùng thử nghiệm RAG thời kỳ đầu. Đã chuyển sang dữ liệu mẫu thực tế trong [`data/software-testing-istqb/`](../../../data/software-testing-istqb/) và file upload PDF/MinIO. | [`data/software-testing-istqb/`](../../../data/software-testing-istqb/) |
| 8 | [`screenshots/`](screenshots/) | **Ảnh chụp màn hình giao diện MVP cũ:** Ảnh chụp giao diện đơn phiên bản web cũ (`admin-web`) từ đợt kiểm thử 17/09/2026, phục vụ minh họa cho biên bản kiểm thử lưu trữ [`validation.md`](validation.md). | [`apps/staff-portal/`](../../../apps/staff-portal/) & [`apps/student-app/`](../../../apps/student-app/) |
