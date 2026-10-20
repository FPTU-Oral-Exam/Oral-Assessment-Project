# ĐẶC TẢ THIẾT KẾ TÍNH NĂNG & KỸ THUẬT (TECHNICAL SPECS & RFCS)

> **Dự án:** AI Oral Assessment Platform  
> **Mục đích:** Lưu trữ các bản đặc tả kỹ thuật chi tiết (Technical Design Specifications) cho từng tính năng lớn (Epics / Features) được soạn thảo trước khi triển khai code.

---

## 1. Vai trò của Technical Spec trong Vòng đời Phần mềm

Khác với **ADR** (lưu trữ các quyết định kiến trúc bất biến có tính bao quát), **Technical Spec (RFC)** là tài liệu phân tích sâu vào một tính năng cụ thể tại thời điểm phát triển:
* Bối cảnh và mục tiêu nghiệp vụ của tính năng.
* Cấu trúc cơ sở dữ liệu chi tiết (DDL, Entity Models, Migrations).
* Thiết kế REST API / WebSocket endpoints (Payload, Responses, Status codes).
* Thiết kế luồng giao diện (UI/UX Flows, Component states).
* Phân tích rủi ro kỹ thuật và kế hoạch kiểm thử (Test Matrix).

Sau khi tính năng đã được hiện thực hóa và merge vào codebase, bản spec này trở thành **tài liệu tham chiếu lịch sử thiết kế** (Historical Design Baseline).

---

## 2. Danh mục Đặc tả Thiết kế Kỹ thuật (Specifications Index)

| Ngày ban hành | Bản đặc tả tính năng | Phân hệ liên quan | Trạng thái |
| :--- | :--- | :--- | :--- |
| **2026-10-20** | [Đặc tả Hệ thống Chấm điểm Vấn đáp ENTs Speaking 5 Tiêu chí](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/superpowers/specs/2026-10-20-ents-speaking-5criteria-grading-design.md) | `services/api` (AI Engine), Rubrics Studio | `IMPLEMENTED` |
| **2026-10-20** | [Kế hoạch Triển khai Hệ thống Chấm điểm ENTs Speaking 5 Tiêu chí](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/superpowers/plans/2026-10-20-ents-speaking-5criteria-grading.md) | Toàn hệ thống (API, Worker, Staff Portal, Student App) | `ACTIVE` |
| **2026-10-12** | [Đặc tả Ngân hàng Đề thi & Ma trận Kiểm định Đề (Academic Matrix)](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/superpowers/plans/2026-10-12-academic-exam-bank-and-matrix.md) | `apps/staff-portal` (Academy), PostgreSQL | `IMPLEMENTED` |
| **2026-10-06** | [Thiết kế Quản lý Kỳ thi & Ca thi Khảo thí (Examiner Portal)](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/superpowers/specs/2026-10-06-examiner-exam-management-design.md) | `apps/staff-portal` (Examiner) | `IMPLEMENTED` |
| **2026-09-30** | [Kiến trúc Dual-Frontend & Gói Shared Package](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/superpowers/specs/2026-09-30-dual-frontend-architecture.md) | `@oralai/shared`, Student App, Staff Portal | `IMPLEMENTED` |
| **2026-09-28** | [Kế hoạch & Đặc tả Luồng Thi Nói Tiếng Anh (English Speaking Flow)](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/specs/demo-flow-english-speaking.md) | Student App, MinIO Chunked Upload | `ACTIVE` |
| **2026-09-25** | [Kế hoạch Triển khai Hệ thống Đánh giá Nói (Speaking Assessment Plan)](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/specs/speaking-assessment-implementation-plan.md) | AI Grading, PhoWhisper, LLM Prompts | `ACTIVE` |
