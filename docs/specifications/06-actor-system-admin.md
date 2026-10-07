# Actor: Quản trị Hệ thống (System Admin)

## 1. Actor Profile

| Thuộc tính | Mô tả |
| :--- | :--- |
| **Vai trò (Role)** | `SYSTEM_ADMIN` |
| **Mô tả** | Người chịu trách nhiệm kỹ thuật toàn diện — quản lý tài khoản người dùng, phân quyền các vai trò đại học (`ACADEMY`, `EXAMINER`, `TEACHER`, `STUDENT`), cấu hình hạ tầng AI Provider, STT Server, lưu trữ MinIO S3, theo dõi giám sát hệ thống (Monitoring) và sao lưu cơ sở dữ liệu. |
| **Phạm vi quyền hạn** | Toàn quyền trên các cấu hình hạ tầng kỹ thuật và quản trị tài khoản hệ thống. |

---

## 2. User Stories

### US-SYSADMIN-001: Quản trị Tài khoản & Phân quyền Người dùng (RBAC)
> **As a** System Admin  
> **I want to** tạo mới, chỉnh sửa, khóa tài khoản và gán một hoặc nhiều vai trò (`ACADEMY`, `EXAMINER`, `TEACHER`, `STUDENT`, `SYSTEM_ADMIN`) cho người dùng  
> **So that** mỗi cán bộ, giảng viên và sinh viên chỉ truy cập đúng phân hệ và chức năng được phân công.

### US-SYSADMIN-002: Cấu hình AI Grader Provider
> **As a** System Admin  
> **I want to** cấu hình kết nối mô hình ngôn ngữ lớn LLM (chọn Ollama cục bộ bảo mật hoặc Gemini API đám mây, model version, temperature, max tokens)  
> **So that** hệ thống chấm điểm hoạt động ổn định, chính xác và tiết kiệm tài nguyên.

### US-SYSADMIN-003: Cấu hình Server-Side STT Pipeline (Faster-Whisper)
> **As a** System Admin  
> **I want to** cấu hình dịch vụ nhận dạng giọng nói Faster-Whisper trên Background Worker (model size: small/medium/large-v3, device: CUDA/CPU, beam size, ngôn ngữ: song ngữ Anh - Việt)  
> **So that** quá trình bóc băng âm thanh từ MinIO diễn ra với tốc độ cao và độ trễ tối thiểu.

### US-SYSADMIN-004: Quản lý Hạ tầng Lưu trữ (MinIO S3 Storage)
> **As a** System Admin  
> **I want to** cấu hình bucket lưu trữ, hạn mức dung lượng (quota), chính sách lưu trữ (retention policy) và CORS cho hệ thống MinIO  
> **So that** các file âm thanh chunked upload của sinh viên được tiếp nhận và lưu trữ toàn vẹn.

### US-SYSADMIN-005: Giám sát Hệ thống & Xem Nhật ký Thao tác (Audit Logs)
> **As a** System Admin  
> **I want to** xem biểu đồ tài nguyên CPU/RAM, hàng đợi Celery/Redis, và nhật ký các thao tác quan trọng (thao tác import đề, sửa điểm override, xuất file FAP)  
> **So that** bảo đảm tính an toàn thông tin và dễ dàng truy vết sự cố khi cần kiểm toán.

### US-SYSADMIN-006: Quản lý Sao lưu và Di trú Cơ sở Dữ liệu (Migrations & Backup)
> **As a** System Admin  
> **I want to** thực thi các bản nâng cấp cấu trúc CSDL qua Alembic và thiết lập lịch sao lưu PostgreSQL định kỳ  
> **So that** dữ liệu khảo thí luôn được toàn vẹn và có khả năng phục hồi thảm họa (Disaster Recovery).
