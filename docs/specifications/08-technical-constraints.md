# Technical Constraints & Architectural Invariants

## 1. Giới thiệu

Tài liệu này quy định các ràng buộc kỹ thuật (Technical Constraints) và bất biến kiến trúc (Architectural Invariants) của hệ thống **AI Oral Assessment Platform**, bảo đảm tính bảo mật, hiệu năng, độ tin cậy và sự nhất quán dữ liệu giữa Dual-Frontend và Backend API.

---

## 2. Các Ràng buộc Kiến trúc Cốt lõi

### 2.1 Server là Source of Truth (TC-SRV)

| TC-ID | Ràng buộc kỹ thuật | Lý do kỹ thuật |
| :--- | :--- | :--- |
| **TC-SRV-001** | **Điểm số & Trạng thái thi do Server quyết định:** Điểm số chính thức, trạng thái nộp bài (`AWAITING_STT`, `AI_SCORED`, `TEACHER_REVIEWED`, `LOCKED_FINAL`) 100% do Backend API tính toán, kiểm soát và lưu trữ. Client không bao giờ tự đưa ra quyết định điểm số. | Ngăn chặn việc thao túng logic từ ứng dụng client. |
| **TC-SRV-002** | **Zero-STT Client (Không chạy nhận diện giọng nói ở client):** Ứng dụng Electron của sinh viên tuyệt đối không chạy PhoWhisper/Whisper cục bộ và không hiển thị ô nhập/sửa transcript. Client chỉ ghi âm raw và tải audio lên MinIO. | Client là môi trường không đáng tin cậy (Untrusted Environment). Không để sinh viên sửa nội dung trả lời sau khi nói. |
| **TC-SRV-003** | **Đóng băng Snapshot Đề thi (Exam Snapshot Versioning):** Khi ca thi hoặc mã đề được kích hoạt, toàn bộ thông tin câu hỏi, tiêu chí Rubric, trọng số điểm và hướng dẫn chấm được đóng băng vào trường `Exam.snapshot` (JSON). Mọi thay đổi dữ liệu sau đó trong CSDL không làm ảnh hưởng phiên thi đang diễn ra. | Đảm bảo tính tái lập (Reproducibility) và bằng chứng pháp lý khi chấm lại. |

### 2.2 Ràng buộc về Bằng chứng & Lưu trữ (TC-EVD)

| TC-ID | Ràng buộc kỹ thuật | Lý do kỹ thuật |
| :--- | :--- | :--- |
| **TC-EVD-001** | **Bằng chứng Bất biến (Immutable Evidence Vault):** File âm thanh và video của sinh viên được lưu trữ trên Object Storage (MinIO S3). Mỗi file gắn mã băm toàn vẹn SHA-256 được tính toán tại client trước khi upload và xác thực lại trên server. | Bảo đảm file ghi âm không bị cắt ghép, thay thế hay sửa đổi trái phép. |
| **TC-EVD-002** | **Chunked Resumable Upload:** Quá trình tải âm thanh lên MinIO được thực hiện theo từng mảnh (chunk) kích thước 4MB. Nếu mạng chập chờn, client tự động thử lại (retry) với exponential backoff mà không làm gián đoạn bài thi. | Chống rớt mạng trong phòng thi đông thí sinh. |
| **TC-EVD-003** | **Bảo vệ Quyền riêng tư (Privacy-by-Design):** Microphone và Camera chỉ kích hoạt ghi dữ liệu khi sinh viên nhấn "Bắt đầu trả lời" cho từng câu hỏi cụ thể, và tự động dừng khi hết thời gian câu hỏi đó. Không ghi âm liên tục ngoài giờ làm bài. | Giảm tải dung lượng lưu trữ và tuân thủ các quy định bảo vệ dữ liệu cá nhân. |

### 2.3 Ràng buộc về AI Grader & STT Engine (TC-ENG)

| TC-ID | Ràng buộc kỹ thuật | Lý do kỹ thuật |
| :--- | :--- | :--- |
| **TC-ENG-001** | **Faster-Whisper Server-Side Pipeline:** Dịch vụ bóc băng âm thanh chạy tại Celery Worker trên server, sử dụng thư viện `faster-whisper` (hỗ trợ CTranslate2 tăng tốc GPU/CPU). Model xử lý song ngữ Anh - Việt với độ trễ thấp và độ chính xác cao đối với thuật ngữ công nghệ. | Đảm bảo tốc độ bóc băng nhanh, không nghẽn hàng đợi khi nhiều sinh viên nộp bài cùng lúc. |
| **TC-ENG-002** | **Rubric-Bounded Prompting:** Prompt gửi tới LLM Grader (Ollama cục bộ hoặc Gemini API) được bao bọc nghiêm ngặt bởi danh sách tiêu chí Rubric, Expected Points và Key Terms của câu hỏi trong Item Bank. Nghiêm cấm đưa prompt mở không có căn cứ đánh giá. | Triệt tiêu hiện tượng hallucination và bảo đảm điểm số của AI hoàn toàn có thể giải trình được. |
| **TC-ENG-003** | **Structured JSON Enforcement:** Phản hồi từ LLM bắt buộc phải parse thành công vào Pydantic schema `GradingResultOut`. Nếu LLM trả về định dạng sai, hệ thống tự động retry với prompt sửa lỗi tối đa 3 lần trước khi ghi nhận lỗi kỹ thuật. | Đảm bảo dữ liệu điểm số luôn hợp lệ để lưu vào PostgreSQL. |

### 2.4 Ràng buộc về Ứng dụng Client (TC-CLI)

| TC-ID | Ràng buộc kỹ thuật | Lý do kỹ thuật |
| :--- | :--- | :--- |
| **TC-CLI-001** | **Thin-Client Architecture:** Ứng dụng Student App (Electron 33 + Vite + React 18) chỉ đảm nhận: hiển thị giao diện, điều khiển MediaDevices (Mic/Cam), lọc nhiễu thời gian thực bằng bộ lọc RNNoise WASM, và tải file âm thanh lên MinIO. Toàn bộ logic nghiệp vụ nằm ở Backend. | Tối ưu dung lượng cài đặt ứng dụng nhẹ nhàng, chạy mượt mà trên các máy tính cấu hình trung bình của sinh viên. |
| **TC-CLI-002** | **RNNoise Pre-Processing:** Bộ lọc RNNoise chạy trên WebAssembly (WASM) tại client để khử tiếng ồn môi trường (tiếng quạt, tiếng bàn phím, tiếng ồn xung quanh) ngay trong lúc thu âm, giúp chất lượng âm thanh nạp vào Faster-Whisper đạt độ rõ nét cao nhất. | Nâng cao chất lượng nhận diện giọng nói mà không tiêu tốn tài nguyên server. |
| **TC-CLI-003** | **Memory-Only Token:** Token xác thực (JWT) tại Student App chỉ được lưu trong bộ nhớ RAM tạm thời của tiến trình Electron, không ghi vào `localStorage` hay file cấu hình đĩa cứng. | Phòng chống đánh cắp token khi sinh viên thi trên máy tính phòng lab công cộng. |
