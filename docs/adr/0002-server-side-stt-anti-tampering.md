# ADR-0002: Chuyển toàn bộ STT lên Server & Biến Desktop App thành Thin-Client Chống Gian Lận

> **Trạng thái:** ACCEPTED  
> **Ngày phê duyệt:** 2026-09-28  
> **Người quyết định:** Bình (Lead Engineer) & AI Pair-Programming Mentor  
> **Phạm vi:** `apps/student-app`, `services/api` (FastAPI & Celery Worker), MinIO S3

---

## 1. Bối cảnh (Context)

Trong các phiên bản thử nghiệm ban đầu (MVP), ứng dụng Desktop của sinh viên được tích hợp mô hình nhận dạng giọng nói (Speech-to-Text - STT) cục bộ hoặc cho phép sinh transcript trực tiếp tại máy trạm và gửi chuỗi văn bản lên máy chủ để chấm điểm.

Kiến trúc này bộc lộ 2 lỗ hổng nghiêm trọng:
1. **Lỗ hổng gian lận thi cử (Vulnerability to Tampering):** Vì client nằm trong tầm kiểm soát của người dùng, sinh viên am hiểu kỹ thuật có thể mở DevTools, tráo đổi dữ liệu payload mạng hoặc inject văn bản soạn sẵn từ AI bên ngoài (như ChatGPT) vào trường `transcript` trước khi gửi lên server.
2. **Áp lực phần cứng và độ ổn định tại phòng thi:** Mô hình STT (PhoWhisper) đòi hỏi dung lượng RAM và tài nguyên GPU/CPU đáng kể. Khi chạy trên các máy tính phòng thi cấu hình phổ thông, ứng dụng dễ bị giật lag, quá nhiệt hoặc đột tử (crash) giữa chừng khi thí sinh đang nói.

## 2. Quyết định (Decision)

Chúng tôi quyết định **loại bỏ hoàn toàn tính năng STT cục bộ trên Client** và tái cấu trúc hệ thống theo các nguyên tắc:

1. **Student App là Thin-Client tuyệt đối:**
   - Client chỉ làm 3 nhiệm vụ: (1) Kiểm tra phần cứng (Webcam, Mic, đo SNR nhiễu nền qua RNNoise WASM), (2) Trình chiếu câu hỏi nhận từ Server, và (3) Ghi nhận luồng âm thanh/video nguyên bản.
   - Client **tuyệt đối không sinh transcript, không hiển thị transcript và không cho phép nhập văn bản câu trả lời bằng bàn phím**.
2. **Tải lên phân mảnh bảo mật (Secure Chunked Upload):**
   - Luồng âm thanh/video được đóng gói thành các tệp media nguyên bản, băm nhỏ thành các chunk 4MB và tính mã kiểm tra toàn vẹn SHA-256 cho từng phần.
   - Các chunk được tải trực tiếp lên MinIO S3 thông qua Presigned URLs.
3. **Server-Side STT & Pipeline Chấm điểm độc lập:**
   - Toàn bộ quá trình phiên âm (PhoWhisper cho Tiếng Việt / Whisper Large-v3 cho Tiếng Anh) được thực thi bởi Celery Background Worker trên máy chủ.
   - Điểm số được chấm 100% dựa trên transcript do Server tự sinh từ tệp âm thanh bằng chứng lưu trữ trên MinIO.

## 3. Hệ quả & Đánh đổi (Consequences & Trade-offs)

### Tích cực:
* **Bảo mật tuyệt đối chống gian lận:** Triệt tiêu hoàn toàn khả năng can thiệp transcript từ phía Client. Mọi kết quả chấm điểm đều gắn liền với file ghi âm bằng chứng gốc.
* **Tối ưu hóa hiệu năng Client:** Ứng dụng Desktop chạy mượt mà, khởi động tức thì, tiêu tốn dưới 150MB RAM và tương thích hoàn toàn với các dòng máy tính sinh viên/phòng thi phổ thông.
* **Hỗ trợ phúc khảo minh bạch:** Cán bộ khảo thí và giảng viên có thể nghe lại đoạn ghi âm gốc khớp từng giây với transcript và điểm số chi tiết.

### Đánh đổi (Trade-offs):
* Hạ tầng máy chủ backend cần có tài nguyên tính toán (CPU/GPU) và dung lượng lưu trữ MinIO lớn hơn để xử lý hàng đợi âm thanh.
* Cần cơ chế hàng đợi bất đồng bộ (Celery + Redis) để điều phối tải khi hàng trăm sinh viên nộp bài cùng lúc.
