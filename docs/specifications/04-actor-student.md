# Actor: Sinh viên (Student)

## 1. Actor Profile

| Thuộc tính | Mô tả |
|------------|--------|
| **Vai trò** | `STUDENT` |
| **Mô tả** | Người thi trên máy tính cá nhân, chỉ những sinh viên nằm trong danh sách thi mới được thi |
| **Phạm vi quyền hạn** | Chỉ xem và làm bài thi được giao, xem điểm cá nhân |
| **Thiết bị sử dụng** | Máy tính cá nhân với ứng dụng desktop (Electron) |

---

## 2. User Stories

### US-STUDENT-001: Đăng nhập hệ thống
> **As a** Sinh viên  
> **I want to** đăng nhập vào ứng dụng desktop  
> **So that** tôi có thể truy cập bài thi của mình

### US-STUDENT-002: Xem danh sách bài thi
> **As a** Sinh viên  
> **I want to** xem danh sách bài thi được giao  
> **So that** tôi biết mình cần thi những môn nào

### US-STUDENT-003: Kiểm tra thiết bị trước khi thi
> **As a** Sinh viên  
> **I want to** kiểm tra camera và microphone  
> **So that** đảm bảo thiết bị hoạt động đúng trước khi bắt đầu

### US-STUDENT-004: Làm bài thi vấn đáp
> **As a** Sinh viên  
> **I want to** trả lời câu hỏi bằng giọng nói  
> **So that** tôi hoàn thành bài thi của mình

### US-STUDENT-005: Thu âm và Tải audio minh chứng (Chunked Upload)
> **As a** Sinh viên  
> **I want to** ghi âm câu trả lời và tự động tải các phân đoạn âm thanh lên hệ thống  
> **So that** bài thi của tôi được lưu trữ an toàn, toàn vẹn và không bị gián đoạn đường truyền

### US-STUDENT-006: Xem điểm kết quả
> **As a** Sinh viên  
> **I want to** xem điểm và kết quả thi của mình  
> **So that** tôi biết mình được bao nhiêu điểm

### US-STUDENT-007: Làm lại bài thi (nếu được phép)
> **As a** Sinh viên  
> **I want to** làm lại bài thi khi còn lượt  
> **So that** tôi có cơ hội cải thiện điểm

---

## 3. Use Cases

### UC-STUDENT-001: Đăng nhập hệ thống

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-001 |
| **Tên** | Đăng nhập hệ thống |
| **Actor** | Sinh viên |
| **Mô tả** | Sinh viên đăng nhập vào ứng dụng desktop |
| **Pre-condition** | Sinh viên có tài khoản |
| **Post-condition** | Sinh viên đăng nhập thành công |

#### Main Flow
1. Sinh viên mở ứng dụng OralAI Desktop
2. Sinh viên chọn máy chủ (server URL)
3. Sinh viên nhập username/password hoặc đăng nhập Google
4. Hệ thống xác thực và đăng nhập
5. Hệ thống hiển thị danh sách bài thi

#### Alternative Flows
- **AF-001.1:** Sai password → Hệ thống báo lỗi "Sai tài khoản hoặc mật khẩu"
- **AF-001.2:** Tài khoản bị khóa → Hệ thống báo lỗi "Tài khoản bị khóa"
- **AF-001.3:** Server không phản hồi → Hệ thống báo lỗi kết nối

---

### UC-STUDENT-002: Xem danh sách bài thi

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-002 |
| **Tên** | Xem danh sách bài thi |
| **Actor** | Sinh viên |
| **Mô tả** | Sinh viên xem các bài thi được giao cho mình |
| **Pre-condition** | Sinh viên đã đăng nhập |
| **Post-condition** | Danh sách bài thi được hiển thị |

#### Main Flow
1. Sau khi đăng nhập, hệ thống hiển thị danh sách bài thi
2. Sinh viên xem: tên bài thi, môn học, thời gian, trạng thái
3. Sinh viên chọn bài thi để làm

#### Trạng thái hiển thị
| Trạng thái | Ý nghĩa |
|------------|----------|
| **Sẵn sàng** | Bài thi đã được giao, có thể làm |
| **Đã nộp** | Đã nộp bài, chờ kết quả |
| **Hoàn thành** | Đã có kết quả |
| **Hết hạn** | Đã quá thời gian thi |

#### Alternative Flows
- **AF-002.1:** Không có bài thi nào → Hiển thị "Không có bài thi nào được giao"

---

### UC-STUDENT-003: Kiểm tra thiết bị

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-003 |
| **Tên** | Kiểm tra thiết bị |
| **Actor** | Sinh viên |
| **Mô tả** | Sinh viên kiểm tra camera và microphone trước khi thi |
| **Pre-condition** | Sinh viên đã chọn bài thi |
| **Post-condition** | Thiết bị được kiểm tra và sẵn sàng |

#### Main Flow
1. Sinh viên chọn bài thi → "Mở bài thi"
2. Hệ thống yêu cầu quyền camera và microphone
3. Sinh viên cấp quyền
4. Hệ thống hiển thị camera preview, microphone test và thanh điều chỉnh Gain ($-12\text{ dB}$ đến $+18\text{ dB}$, mặc định 0)
5. Sinh viên bấm kiểm tra âm thanh 10 giây:
   - 3 giây đầu: Giữ im lặng để đo tạp âm nền (lấy tín hiệu trước Gain)
   - 7 giây sau: Nói thử để kiểm tra tín hiệu microphone
6. Sinh viên nghe lại bản thu thử (có thể bật/tắt thử lọc nhiễu RNNoise để so sánh)
7. Nếu âm lượng quá nhỏ/lớn, sinh viên chỉnh thanh Gain (hệ thống cảnh báo hạ Gain nếu âm lượng sau gain vượt $-1\text{ dBFS}$)
8. Khi âm thanh đạt chuẩn, sinh viên bấm "Bắt đầu thi" (thanh Gain và thiết bị sẽ bị khóa trong suốt lúc thi)

#### Alternative Flows
- **AF-003.1:** Camera không tìm thấy → Hệ thống yêu cầu cắm camera
- **AF-003.2:** Microphone không có tín hiệu (toàn bộ 10s không đạt $\ge -90\text{ dBFS}$) → Hệ thống cảnh báo mic hỏng
- **AF-003.3:** Độ ồn quá cao ($\ge 20\%$ cửa sổ đo trong 3s đầu $\ge -40\text{ dBFS}$) → Hệ thống cảnh báo tìm nơi yên tĩnh
- **AF-003.4:** Sinh viên bấm bỏ qua kiểm tra → Hệ thống cho phép bắt đầu (không ghi nhận quyết định bỏ qua lên server)

---

### UC-STUDENT-004: Làm bài thi vấn đáp

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-004 |
| **Tên** | Làm bài thi vấn đáp |
| **Actor** | Sinh viên |
| **Mô tả** | Sinh viên trả lời từng câu hỏi bằng giọng nói |
| **Pre-condition** | Thiết bị đã kiểm tra, bài thi sẵn sàng |
| **Post-condition** | Tất cả câu trả lời được nộp |

#### Main Flow
1. Hệ thống hiển thị câu hỏi hiện tại
2. Sinh viên bấm "Bắt đầu trả lời"
3. Hệ thống bắt đầu ghi âm qua MediaRecorder (kết hợp RNNoise lọc nhiễu 48kHz)
4. Sinh viên trả lời câu hỏi bằng giọng nói
5. Sinh viên bấm "Kết thúc trả lời"
6. Hệ thống dừng ghi âm, kích hoạt `ChunkedUploader` từ `@oralai/shared`
7. File audio raw được cắt thành các chunk 4MB kèm SHA-256 integrity checksum tải trực tiếp lên MinIO
8. Hệ thống gọi `POST /api/question-attempts/{key}/submit-audio` gửi `upload_id` lên backend
9. Backend xác nhận upload hoàn tất, đánh dấu câu hỏi `AWAITING_STT` và ghi audit log `AUDIO_SUBMITTED`
10. Hệ thống tự động chuyển sang câu hỏi tiếp theo
11. Lặp lại các bước cho đến khi hoàn thành toàn bộ câu hỏi
12. Sinh viên bấm "Nộp bài thi" (Submit Session)
13. Server Worker tiếp nhận hàng đợi, chạy PhoWhisper phiên âm từ file MinIO và AI Grading

#### Alternative Flows
- **AF-004.1 (Bảo vệ phòng thi - Unload Guard):** Sinh viên vô tình bấm đóng cửa sổ hoặc reload khi ca thi đang `IN_PROGRESS` $\rightarrow$ Hệ thống hiển thị hộp thoại cảnh báo: *"Bạn còn bài thi chưa hoàn tất. Thoát sẽ mất dữ liệu phiên làm bài."* và chặn thoát đột ngột.
- **AF-004.2 (Mất kết nối mạng khi tải chunk):** `ChunkedUploader` tự động thử lại (retry) tối đa 3 lần với exponential backoff.
- **AF-004.3 (Hết thời gian quy định):** Khi đồng hồ đếm ngược server về 0, hệ thống tự động khóa ghi âm và submit phiên thi hiện tại.

#### Ghi chú quan trọng
- Camera và microphone được mở sẵn để kiểm tra tín hiệu.
- **MediaRecorder chỉ bắt đầu ghi khi sinh viên bấm "Bắt đầu trả lời".**
- **Nguyên tắc Chống Gian lận (Anti-tampering):** Sinh viên tuyệt đối không chạy PhoWhisper local, không thấy transcript và không được phép gõ phím chỉnh sửa văn bản câu trả lời. File audio trên MinIO là nguồn chân lý duy nhất (Source of Truth).

---

### UC-STUDENT-005: Thu âm và Tải audio minh chứng (Chunked Upload)

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-005 |
| **Tên** | Thu âm và Tải audio minh chứng |
| **Actor** | Sinh viên |
| **Mô tả** | Student App tự động phân mảnh file ghi âm và tải an toàn lên MinIO |
| **Pre-condition** | Sinh viên đã hoàn thành câu trả lời của câu hỏi |
| **Post-condition** | Toàn bộ chunk được upload và xác nhận tính toàn vẹn (SHA-256) |

#### Main Flow
1. Sau khi bấm "Kết thúc trả lời", MediaRecorder tạo Blob âm thanh raw (định dạng WebM)
2. `useChunkedUpload` khởi tạo tiến trình upload với backend: `POST /api/uploads/start`
3. File âm thanh được chia thành các phân đoạn 4MB
4. Mỗi chunk được băm SHA-256 và tải lên MinIO qua `POST /api/uploads/chunk`
5. Sau khi đủ các chunk, client gọi `POST /api/uploads/{id}/complete` kèm tổng SHA-256 của toàn bộ file
6. Backend verify checksum; nếu khớp, đánh dấu upload `COMPLETED`
7. Client gửi `upload_id` đến endpoint câu trả lời `submit-audio`

#### Alternative Flows & Bảo vệ Toàn vẹn
- **AF-005.1 (Sai lệch Checksum):** Nếu SHA-256 của chunk tải lên không khớp với client tính toán $\rightarrow$ Backend từ chối chunk, client tự động upload lại chunk bị hỏng.
- **AF-005.2 (Gián đoạn kết nối):** Client tiếp tục tải từ chunk chưa hoàn tất thay vì phải upload lại từ đầu (Resumable Chunked Upload).

---


### UC-STUDENT-006: Xem điểm kết quả

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-006 |
| **Tên** | Xem điểm kết quả |
| **Actor** | Sinh viên |
| **Mô tả** | Sinh viên xem điểm và kết quả thi |
| **Pre-condition** | Bài thi đã được chấm xong |
| **Post-condition** | Sinh viên xem được điểm chi tiết |

#### Main Flow
1. Sinh viên đăng nhập desktop
2. Hệ thống hiển thị bài thi đã hoàn thành
3. Sinh viên chọn bài thi
4. Hệ thống hiển thị:
   - Điểm tổng
   - Điểm từng câu
   - Trạng thái: đã duyệt / chờ duyệt

#### Alternative Flows
- **AF-006.1:** Chưa có điểm → Hiển thị "Đang chấm điểm"
- **AF-006.2:** Điểm bị review → Hiển thị "Chờ giảng viên duyệt"

---

### UC-STUDENT-007: Làm lại bài thi

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-007 |
| **Tên** | Làm lại bài thi |
| **Actor** | Sinh viên |
| **Mô tả** | Sinh viên làm lại bài thi khi còn lượt |
| **Pre-condition** | Bài thi cho phép làm lại và còn lượt |
| **Post-condition** | Lượt thi mới được tạo |

#### Main Flow
1. Sinh viên xem bài thi đã nộp
2. Sinh viên bấm "Làm lại bài thi"
3. Hệ thống kiểm tra số lượt còn lại
4. Hệ thống tạo lượt thi mới
5. Sinh viên làm bài như bình thường (UC-STUDENT-004)

#### Alternative Flows
- **AF-007.1:** Không còn lượt → Hệ thống báo "Đã hết lượt thi"
- **AF-007.2:** Không cho phép làm lại → Nút "Làm lại" không hiển thị

#### Cấu hình số lần làm lại
| Cấu hình | Ý nghĩa |
|----------|----------|
| Không cho làm lại | 1 lượt duy nhất |
| Cho thêm N lần | Tổng cộng N+1 lượt |
| Không giới hạn | Thi thoải mái |

---

### UC-STUDENT-008: Xem lịch sử các lần thi

| Thuộc tính | Mô tả |
|------------|--------|
| **UC-ID** | UC-STUDENT-008 |
| **Tên** | Xem lịch sử các lần thi |
| **Actor** | Sinh viên |
| **Mô tả** | Sinh viên xem kết quả của các lần thi trước |
| **Pre-condition** | Sinh viên đã thi nhiều lần |
| **Post-condition** | Lịch sử thi được hiển thị |

#### Main Flow
1. Sinh viên chọn bài thi đã hoàn thành
2. Sinh viên chọn "Xem lần N" (N = 1, 2, 3...)
3. Hệ thống hiển thị kết quả của lần thi đó

---

## 4. Bảng tổng hợp Use Cases

| UC-ID | Tên Use Case | Pre-condition | Post-condition |
|-------|--------------|--------------|----------------|
| UC-STUDENT-001 | Đăng nhập hệ thống | Có tài khoản | Đăng nhập thành công |
| UC-STUDENT-002 | Xem danh sách bài thi | Đã đăng nhập | Danh sách được hiển thị |
| UC-STUDENT-003 | Kiểm tra thiết bị | Đã chọn bài thi | Thiết bị sẵn sàng |
| UC-STUDENT-004 | Làm bài thi vấn đáp | Thiết bị OK | Bài được nộp |
| UC-STUDENT-005 | Nghe lại và sửa transcript | Có transcript từ STT | Transcript được xác nhận |
| UC-STUDENT-006 | Xem điểm kết quả | Đã chấm xong | Điểm được hiển thị |
| UC-STUDENT-007 | Làm lại bài thi | Còn lượt | Lượt mới được tạo |
| UC-STUDENT-008 | Xem lịch sử các lần thi | Có nhiều lần thi | Lịch sử được hiển thị |

---

## 5. Luồng thi hoàn chỉnh

```
Sinh viên đăng nhập
        ↓
Xem danh sách bài thi
        ↓
Chọn bài thi → "Mở bài thi"
        ↓
Cấp quyền camera & microphone
        ↓
Kiểm tra thiết bị (camera preview, mic test)
        ↓
Bấm "Bắt đầu thi"
        ↓
┌───────────────────────────────────────────────────────────────┐
│  LẶP CHO MỖI CÂU HỎI:                                        │
│                                                               │
│  Hiển thị nội dung câu hỏi                                    │
│         ↓                                                     │
│  Bấm "Bắt đầu trả lời" → MediaRecorder ghi âm raw             │
│         ↓                                                     │
│  Bấm "Kết thúc trả lời" → Dừng ghi âm                         │
│         ↓                                                     │
│  Tự động chia chunk 4MB, SHA-256 upload lên MinIO             │
│         ↓                                                     │
│  Submit Audio (upload_id) → Server đánh dấu AWAITING_STT      │
│         ↓                                                     │
│  Chuyển câu hỏi tiếp theo                                     │
└───────────────────────────────────────────────────────────────┘
        ↓
Bấm "Nộp bài thi" (Submit Session)
        ↓
Server Worker tự động phiên âm PhoWhisper & chấm điểm AI
        ↓
Xem kết quả trên màn hình Results
        ↓
[Làm lại bài thi nếu còn lượt]
```

---

## 6. Ghi chú kỹ thuật

### 6.1 Camera và Microphone
- Camera và microphone được mở sẵn trước khi thi để kiểm tra tín hiệu và đo độ ồn 10s (RNNoise).
- **MediaRecorder chỉ bắt đầu ghi khi sinh viên bấm "Bắt đầu trả lời".**

### 6.2 Bảo mật Chống Gian lận (Anti-Tampering)
- Student App là **Thin-Client**: Tuyệt đối không chạy PhoWhisper local, không hiển thị và không cho phép can thiệp transcript.
- File audio lưu tại MinIO là căn cứ pháp lý duy nhất (Source of Truth).
- Tránh nguy cơ gian lận "nói một đằng gõ một nẻo" hoặc sửa đổi mã nguồn client.

### 6.3 Tải tệp phân đoạn (Chunked Upload)
- Sử dụng `ChunkedUploader` từ `@oralai/shared`.
- Phân đoạn 4MB, tính SHA-256 checksum cho từng chunk và toàn file.
- Tự động thử lại (retry) khi mạng chập chờn, đảm bảo an toàn tuyệt đối cho bài thi.

