# OralAI — Nền Tảng Thi Vấn Đáp Tự Động Bằng AI

Hệ thống kiến trúc **Dual-Frontend** chuẩn hóa:

- **Student App (Thin-Client):** Ghi audio/video raw, tích hợp bộ lọc nhiễu real-time RNNoise (WASM AudioWorklet), tải bản ghi minh chứng theo chunk 4MB lên MinIO (Server là Source of Truth).
- **Backend & AI Worker:** Celery Worker tự động phiên âm audio từ MinIO bằng **PhoWhisper**, chấm bài theo Rubric & RAG bằng **Ollama local hoặc Gemini**, lưu vết kiểm toán và trả kết quả cho **Staff Portal** (Web Next.js) và Student App.

## Hướng dẫn theo nhu cầu

| Bạn muốn làm gì?                                                      | Tài liệu                                                                                               |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tạo môn, sinh câu hỏi/thuật ngữ, giao bài, làm bài và xóa môn | [Hướng dẫn sử dụng cho 4 vai trò (Admin, Khảo thí, Giảng viên, Sinh viên)](docs/user-guide.md) |
| Ứng dụng thi Thin-Client dành cho sinh viên                           | [Student App](apps/student-app/) (`npm run student`)                                                    |
| Giao diện Web Portal dành cho Cán bộ & Giảng viên                   | [Staff Portal](apps/staff-portal/) (`npm run dev:staff`)                                                |
| Kiến trúc tổng quan hệ thống & phân định 4 Actor                  | [Tổng quan kiến trúc](docs/specifications/01-system-overview.md)                                       |
| Quy tắc phòng thi, chống gian lận & Server-Side STT                   | [Quy tắc phòng thi &amp; Chống gian lận (Anti-Tampering)](docs/specifications/06-business-rules.md)   |
| Thu thử/nghe lại, chỉnh gain hoặc thoát app                          | [Mic và thoát desktop](docs/microphone-desktop.md)                                                      |
| Hiểu luồng nhận dạng giọng nói PhoWhisper và LLM chấm bài        | [Kiến trúc STT/LLM Server-Side](docs/architecture/knowledge-speech.md)                                  |
| Quản lý tài khoản, môn học và đăng nhập Google                  | [Tài khoản, OAuth và desktop](docs/architecture/accounts-courses-desktop.md)                           |
| Quản lý dữ liệu, kiểm tra mic và lọc nhiễu RNNoise                | [CRUD và kiểm tra tiếng ồn](docs/architecture/crud-noise-check.md)                                    |
| Cấu hình số lần thi, cấp thêm lượt và xem lịch sử              | [Làm lại bài thi](docs/architecture/exam-retakes.md)                                                   |
| Hiểu độ tin cậy AI và thao tác chấm lại                           | [Độ tin cậy và chấm lại](docs/architecture/grading-confidence.md)                                   |
| Xem thiết kế CSDL, sơ đồ ERD và từ điển dữ liệu                | [Thiết kế CSDL &amp; ERD](docs/architecture/database-schema.md)                                         |
| Nạp bộ câu hỏi mẫu môn Kiểm thử phần mềm                        | [Bộ dữ liệu Software Testing](data/software-testing-istqb/README.md)                                   |
| Kiến trúc chi tiết Dual-Frontend & Master Specs                        | [Kiến trúc Dual-Frontend](docs/superpowers/specs/2026-09-30-dual-frontend-architecture.md)              |
| Tra cứu tài liệu và quy trình cũ đã lưu trữ                     | [Thư mục lưu trữ tài liệu cũ (Legacy MVP Archive)](docs/archive/legacy-mvp/README.md)              |

Để bắt đầu: chạy server theo mục bên dưới, sau đó làm theo hướng dẫn desktop. Project Guide và biên bản kiểm thử có các phần lịch sử; đọc ghi chú cập nhật trước khi áp dụng.

## Chạy server

Cần Docker Compose và Python 3. Tại thư mục gốc:

```bash
python3 scripts/setup_env.py
# Sửa cấu hình LLM trong .env trước khi dùng chấm thật.
docker compose up -d --build --wait
```

Mở **http://localhost:3000**, đăng nhập bằng `BOOTSTRAP_ADMIN` / `BOOTSTRAP_PASSWORD` trong `.env`. Mặc định `AI_PROVIDER=demo` chỉ thử quy trình, không chấm điểm.

## Chọn LLM qua .env

**Gemini:**

```dotenv
AI_CONFIG_SOURCE=env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
LLM_MODEL=gemini-2.5-flash
EMBEDDING_MODEL=gemini-embedding-001
```

**Ollama chạy local trên server:** tải sẵn một model chat hỗ trợ JSON schema và model embedding **768 chiều**, ví dụ `qwen3:8b` và `nomic-embed-text`:

```bash
ollama pull qwen3:8b
ollama pull nomic-embed-text
```

```dotenv
AI_CONFIG_SOURCE=env
AI_PROVIDER=local
LOCAL_LLM_URL=http://host.docker.internal:11434
LOCAL_LLM_TIMEOUT=180
LLM_MODEL=qwen3:8b
EMBEDDING_MODEL=nomic-embed-text
```

Ollama phải lắng nghe tại địa chỉ API/worker truy cập được. Docker dùng `host.docker.internal` để tới host; chạy API native thì dùng `http://127.0.0.1:11434`. Đặt Ollama trong mạng nội bộ. Không dùng `localhost` trong container để trỏ tới host.

Sau khi đổi `.env`:

```bash
docker compose up -d --no-deps --force-recreate api worker
```

`AI_CONFIG_SOURCE=env` ưu tiên cấu hình AI trong `.env`, bỏ qua AI cũ lưu trên web. `admin` chỉ dành cho triển khai cũ muốn tiếp tục chỉnh AI trên web. OAuth và cấu hình ngôn ngữ STT vẫn chỉnh trên web. Đề đã công bố giữ snapshot AI/rubric; đổi provider/model thì xử lý lại tài liệu và công bố đề mới.

## Student App (Thin-Client Desktop) & Kiểm tra Mic

Ứng dụng làm bài thi dành cho sinh viên được xây dựng theo mô hình **Thin-Client** chuẩn hóa (`apps/student-app/` — Electron + React + TypeScript):

- **Khởi chạy ứng dụng:**
  ```powershell
  npm run student          # Khởi chạy Electron Desktop App
  npm run dev:student      # Hoặc chạy Web Dev Server tại http://localhost:5173
  ```
- **Quy trình làm bài & Kiểm tra thiết bị:**
  1. Đăng nhập tài khoản sinh viên (hoặc đăng nhập Google OIDC).
  2. Cấp quyền microphone/camera và thực hiện kiểm tra độ ồn (Noise Check).
  3. Lọc nhiễu thời gian thực bằng bộ xử lý **RNNoise WASM AudioWorklet**.
  4. Trả lời 4 dạng bài Speaking ENTs FPTU (`GENERAL_INTERVIEW`, `PICTURE_DESCRIPTION`, `TOPIC_MONOLOGUE`, `DEEP_DISCUSSION`).
  5. Audio/Video bằng chứng được phân mảnh thành các chunk 4MB và đẩy thẳng lên **MinIO Storage** (có mã băm SHA-256 đối soát).

> **Bảo mật phòng thi & Anti-Tampering:** Theo nguyên tắc bất biến số 2, Student App tuyệt đối **KHÔNG chạy PhoWhisper local**, **KHÔNG sinh transcript** và **KHÔNG cho phép chỉnh sửa transcript** trên máy cá nhân. Sau khi nộp bài, Celery Worker trên server sẽ tự động phiên âm bằng PhoWhisper trực tiếp từ file audio minh chứng lưu trên MinIO và chấm điểm khách quan theo Rubric 5 tiêu chí FPTU.

## Admin chọn STT trên server

Trong **Cấu hình hệ thống → STT & giọng nói**, admin có thể chọn Gemini hoặc Google Cloud STT cho trình duyệt web. Desktop vẫn nhận dạng local.

Khi xem kết quả, mở **Nhận dạng lại & chấm lại**, chọn nhà cung cấp và nhập lý do:

- **Gemini STT:** dùng API key và model trong `.env`:

```dotenv
GEMINI_API_KEY=your-key
GEMINI_STT_MODEL=gemini-2.5-flash
```

- **Google Cloud STT:** mở mục cấu hình JSON trong tab STT, upload service-account JSON hợp lệ (tối đa 64 KB). Cần bật Speech-to-Text API, billing và cấp quyền cho tài khoản. Upload không tự đổi nhà cung cấp.

Nhận dạng lại dùng audio gốc và hoạt động cả khi `AI_PROVIDER=local`. Nhà cung cấp đã chọn nhận dạng, còn LLM chấm vẫn theo snapshot đề. **Chỉ Google Cloud STT cần JSON; Gemini không cần.** Giữ transcript đã nộp và lịch sử trước/sau. Gemini không trả độ tin cậy âm học nên kết quả này cần giảng viên kiểm tra trước khi công nhận điểm.

## Build, cập nhật và phát triển

- **Staff Portal & Shared Packages:** Phát triển trên Next.js 15 và TypeScript (`apps/staff-portal`, `packages/shared`).
- **Student App Thin-Client:** Phát triển trên Electron + React + Vite (`apps/student-app`). Không đóng gói kèm model AI nặng; audio được truyền trực tiếp lên server.
- **Pipeline CI/CD & Deploy:** Triển khai qua Docker Compose (`docker-compose.yml`), GitHub Actions và Playwright E2E. Các quy trình deploy Jenkins và đóng gói desktop cũ đã được lưu trữ tại [docs/archive/legacy-mvp/](docs/archive/legacy-mvp/README.md).

Cập nhật server: `docker compose up -d --build --wait`. Compose tự chạy migrations để đồng bộ database; không cần thêm biến `.env`. Không xóa volume dữ liệu. Kiểm tra worker bằng `docker compose logs -f worker`.

```bash
.venv/bin/python -m pytest services/api/tests -q
npm run lint
npm run typecheck
npm run build
npm run test:audio
npm run test:desktop
```

Tra cứu thêm trong [Hướng dẫn theo nhu cầu](#hướng-dẫn-theo-nhu-cầu) ở đầu trang.
