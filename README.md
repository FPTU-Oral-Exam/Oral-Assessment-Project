# OralAI — Nền Tảng Thi Vấn Đáp Tự Động Bằng AI

Hệ thống kiến trúc **Dual-Frontend** chuẩn hóa:
- **Student App (Thin-Client):** Ghi audio/video raw, tích hợp bộ lọc nhiễu real-time RNNoise (WASM AudioWorklet), tải bản ghi minh chứng theo chunk 4MB lên MinIO (Server là Source of Truth).
- **Backend & AI Worker:** Celery Worker tự động phiên âm audio từ MinIO bằng **PhoWhisper**, chấm bài theo Rubric & RAG bằng **Ollama local hoặc Gemini**, lưu vết kiểm toán và trả kết quả cho **Staff Portal** (Web Next.js) và Student App.

## Hướng dẫn theo nhu cầu

| Bạn muốn làm gì? | Tài liệu |
| --- | --- |
| Tạo môn, sinh câu hỏi/thuật ngữ, giao bài, làm bài và xóa môn | [Hướng dẫn sử dụng cho 4 vai trò (Admin, Khảo thí, Giảng viên, Sinh viên)](docs/user-guide.md) |
| Cài desktop, chọn server, kiểm tra mic và làm bài | [Hướng dẫn OralAI Desktop](readme-desktop.md) |
| Chọn đúng lệnh mở desktop từ source hoặc server | [Bắt đầu nhanh](readme-desktop.md#bắt-đầu-nhanh) |
| Kiến trúc tổng quan hệ thống & phân định 4 Actor | [Tổng quan kiến trúc](docs/specifications/01-system-overview.md) |
| Quy tắc phòng thi, chống gian lận & Server-Side STT | [Quy tắc phòng thi & Chống gian lận (Anti-Tampering)](docs/specifications/06-business-rules.md) |
| Thu thử/nghe lại, chỉnh gain hoặc thoát app | [Mic và thoát desktop](docs/microphone-desktop.md) |
| Hiểu luồng nhận dạng giọng nói PhoWhisper và LLM chấm bài | [Kiến trúc STT/LLM Server-Side](docs/architecture/knowledge-speech.md) |
| Quản lý tài khoản, môn học và đăng nhập Google | [Tài khoản, OAuth và desktop](docs/architecture/accounts-courses-desktop.md) |
| Quản lý dữ liệu, kiểm tra mic và lọc nhiễu RNNoise | [CRUD và kiểm tra tiếng ồn](docs/architecture/crud-noise-check.md) |
| Cấu hình số lần thi, cấp thêm lượt và xem lịch sử | [Làm lại bài thi](docs/architecture/exam-retakes.md) |
| Hiểu độ tin cậy AI và thao tác chấm lại | [Độ tin cậy và chấm lại](docs/architecture/grading-confidence.md) |
| Xem thiết kế CSDL, sơ đồ ERD và từ điển dữ liệu | [Thiết kế CSDL & ERD](docs/architecture/database-schema.md) |
| Nạp bộ câu hỏi mẫu môn Kiểm thử phần mềm | [Bộ dữ liệu Software Testing](data/software-testing-istqb/README.md) |
| Kiến trúc chi tiết Dual-Frontend & Master Specs | [Kiến trúc Dual-Frontend](docs/superpowers/specs/2026-09-30-dual-frontend-architecture.md) |
| Tra cứu tài liệu và quy trình cũ đã lưu trữ | [Thư mục lưu trữ tài liệu cũ (Legacy MVP Archive)](docs/archive/legacy-mvp/README.md) |

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

## Desktop và kiểm tra mic

Đang sửa source trên Linux/macOS: chạy **`./run-desktop.sh`**. Script chỉ mở UI dev cổng 3001 và Electron, dùng server bạn đã chạy tại localhost:3000; không gọi Docker. Sửa giao diện tự cập nhật. Cần bundle STT đã build; xem [hướng dẫn](readme-desktop.md).

Cài bộ OralAI từ workflow **Desktop installers**. Bộ cài chứa **PhoWhisper-small INT8, runtime STT và FFmpeg**; máy học viên không cần Python hoặc tải thêm model để nhận dạng. App vẫn cần kết nối server để đăng nhập, lấy đề, nộp bài và nhận điểm.

1. Chọn server tại **OralAI → Cấu hình máy chủ…**.
2. Mở bài, cấp quyền và chọn microphone/camera trong danh sách **Chọn thiết bị**.
3. Để **Gain microphone** ở 0 dB rồi bấm **Kiểm tra độ ồn**: giữ im lặng 3 giây đầu, nói thử 7 giây sau.
4. Phát lại bản thử, bật/tắt **Nghe bản đã lọc nhiễu RNNoise** để so sánh. Bản thử không upload.
5. Chọn bật/tắt **Lọc nhiễu RNNoise khi nhận dạng câu trả lời**, bắt đầu thi và hoàn thành các câu hỏi. Audio minh chứng được chia chunk và tải trực tiếp lên MinIO storage.

Giọng nhỏ có thể tăng gain từng ít một; âm rè/gần −1 dBFS thì giảm gain và thu lại. Gain áp dụng cho bản thu thử, audio/video và STT của lần ghi mới. Bấm **Thoát ứng dụng** hoặc X để đóng; nếu còn bản chưa nộp, chọn **Ở lại** hoặc xác nhận **Rời trang / thoát**. Xem [hướng dẫn mic và thoát app](docs/microphone-desktop.md).

> **Bảo mật phòng thi & Anti-Tampering:** Theo nguyên tắc bảo mật, học viên tuyệt đối không tạo, sửa đổi transcript trên máy cá nhân. Sau khi nộp bài, Celery Worker trên server sẽ tự động phiên âm bằng PhoWhisper trực tiếp từ file audio minh chứng lưu trên MinIO và chấm điểm khách quan. (Tài liệu cơ chế sửa tay cũ đã được lưu trữ tại [legacy-mvp archive](docs/archive/legacy-mvp/transcript-correction.md)).

## Thuật ngữ tiếng Anh và xóa môn học

Khi bấm **Sinh câu hỏi & công bố**, AI gợi ý thuật ngữ tiếng Anh kèm nghĩa tiếng Việt cho từng câu hỏi. Admin xem ngay trong **Môn học & đề thi → Bài thi & giao bài → Câu hỏi & thuật ngữ tiếng Anh gợi ý**. Gợi ý được lưu cùng phiên bản đề; đề cũ không tự sinh lại, chế độ demo không tạo thuật ngữ. Đây là gợi ý để giảng viên kiểm tra, chưa tự truyền làm hotwords cho STT.

Thao tác từng bước từ chuẩn bị giáo trình đến giao đề: [hướng dẫn admin/giảng viên](docs/user-guide.md#admin-và-giảng-viên-chuẩn-bị-bài-thi). Hiện chưa sửa trực tiếp thuật ngữ; sao chép đề thành bản nháp rồi công bố để sinh bộ câu hỏi/gợi ý mới.

Admin vào **Môn học → Cài đặt → Xóa môn học**, nhập đúng mã môn để xóa vĩnh viễn toàn bộ tài liệu, chủ đề, rubric, đề thi, lượt thi, kết quả và bản ghi, kể cả bài đang làm. Tài khoản người dùng và môn khác được giữ lại. Worker dọn tệp sau khi giao dịch xóa thành công, tự thử lại nếu storage lỗi. Nếu môn đang được worker xử lý, chờ rồi thử xóa lại. Giảng viên chỉ xóa được môn trống do mình quản lý.

## Số lần làm bài và kết quả

**Độ tin cậy AI:** lỗi chấm, demo và bài không tính điểm hiện “Chưa có độ tin cậy AI”, không hiển thị 0% giả. Số phần trăm khi chấm thành công do LLM tự báo, chưa được hiệu chuẩn. Nếu gặp `AI_CONFIG_MISMATCH`, cần tài liệu và phiên bản đề khớp cấu hình AI hiện tại. Admin có thể chọn **Chấm lại transcript đã nộp** với phiên bản giữ nguyên câu hỏi/rubric; lưu lịch sử và luôn yêu cầu xem lại. Xem [độ tin cậy và chấm lại](docs/architecture/grading-confidence.md).

Admin mở **Môn học & đề thi → chọn môn → Bài thi & giao bài → Cấu hình số lần làm lại**: không cho làm lại, cho làm lại N lần hoặc không giới hạn. Ví dụ cho làm lại 1 lần là tổng cộng 2 lượt.

**Kết quả & xem lại** hiển thị từng lần thi. Mở **Quản lý lượt thi** để cấp thêm lượt riêng cho sinh viên hoặc xóa lần thi được chọn. Sinh viên xem lịch sử và bấm **Làm lại bài thi** khi còn lượt. [Chi tiết và nâng cấp database](docs/architecture/exam-retakes.md).

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
