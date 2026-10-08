# Actor: Giảng viên Coi thi & Chấm thi (Teacher)

## 1. Actor Profile

| Thuộc tính | Mô tả |
| :--- | :--- |
| **Vai trò (Role)** | `TEACHER` |
| **Mô tả** | Người được Phòng Khảo thí phân công coi thi tại phòng thi và/hoặc rà soát, thẩm định, chấm điểm bài thi vấn đáp của sinh viên dựa trên minh chứng âm thanh và kết quả chấm sơ bộ của AI Grader. |
| **Phạm vi quyền hạn** | Giám sát các ca thi được phân công coi thi; xem, nghe lại audio, đọc transcript và chấm/điều chỉnh điểm các bài thi trong ca thi hoặc lớp học được chỉ định chấm thi. |
| **Ranh giới nghiệp vụ (Strict Boundary)** | **TUYỆT ĐỐI KHÔNG LÀM:** Giảng viên **không** tạo môn học, **không** định nghĩa Chuẩn đầu ra (LO), **không** tạo hay sửa Khung Rubric, **không** can thiệp vào Ma trận đề thi chuẩn (Blueprint), và **không** tự ý thêm bớt câu hỏi thi chính thức (tất cả các cấu hình này thuộc độc quyền của Ban Học thuật `ACADEMY`). |

---

## 2. User Stories

### US-TEACHER-001: Xem lịch coi thi và ca thi được phân công
> **As a** Giảng viên  
> **I want to** xem danh sách các ca thi mà Khảo thí đã phân công tôi làm giám thị (ngày thi, khung giờ, phòng thi, môn thi, số lượng sinh viên)  
> **So that** tôi có mặt đúng giờ và nắm rõ thông tin phòng thi phụ trách.

### US-TEACHER-002: Coi thi trực tiếp tại phòng thi
> **As a** Giảng viên  
> **I want to** theo dõi danh sách sinh viên check-in vào phòng thi, phát hiện sinh viên vắng mặt hoặc hỗ trợ sinh viên gặp sự cố kỹ thuật về tai nghe/micro  
> **So that** ca thi được diễn ra nghiêm túc, đúng quy chế phòng thi của nhà trường.

### US-TEACHER-003: Xem danh sách bài thi cần chấm / rà soát
> **As a** Giảng viên  
> **I want to** truy cập danh sách các bài thi thuộc ca thi hoặc lớp học mà Khảo thí đã phân công cho tôi chấm  
> **So that** tôi biết số lượng bài thi đã nộp, bài đã được AI chấm sơ bộ xong và bài đang chờ tôi rà soát.

### US-TEACHER-004: Nghe lại Audio bằng chứng (Evidence Audio) của sinh viên
> **As a** Giảng viên  
> **I want to** nghe trực tiếp file ghi âm raw câu trả lời của sinh viên cho từng câu hỏi (phát từ hệ thống MinIO với trình phát có tua, chỉnh tốc độ phát 1.0x, 1.25x, 1.5x)  
> **So that** tôi thẩm định trực tiếp giọng nói và câu trả lời thực tế của sinh viên.

### US-TEACHER-005: Đọc và đối soát Transcript Server bóc băng
> **As a** Giảng viên  
> **I want to** xem bản bóc băng văn bản (transcript) do Server-side Faster-Whisper tạo ra, hiển thị song song với thời gian trả lời của sinh viên  
> **So that** tôi đối chiếu nhanh câu chữ của thí sinh với hướng dẫn trả lời chuẩn của câu hỏi (Expected Points & Key Terms).

### US-TEACHER-006: Đối soát điểm sơ bộ và nhận xét chi tiết của AI Grader
> **As a** Giảng viên  
> **I want to** xem điểm và lời phê chi tiết mà AI đã chấm cho từng tiêu chí trong Rubric chuẩn của Academy (bao gồm: trích dẫn câu sinh viên nói làm bằng chứng, điểm số đạt được, điểm bị trừ và lý do)  
> **So that** tôi đánh giá xem AI đã chấm chính xác, công bằng và bám sát rubric chuẩn hay chưa.

### US-TEACHER-007: Xác nhận hoặc Điều chỉnh điểm (Override Score) kèm giải trình
> **As a** Giảng viên  
> **I want to** xác nhận giữ nguyên điểm AI (nếu AI chấm chính xác) hoặc nhập điểm điều chỉnh thủ công cho từng tiêu chí nếu phát hiện AI chấm quá chặt/quá lỏng hoặc nhận diện nhầm thuật ngữ  
> **So that** điểm số phản ánh chính xác 100% năng lực của sinh viên, kèm văn bản ghi chú giải trình lý do điều chỉnh để Khảo thí thẩm tra.

### US-TEACHER-008: Ký nộp kết quả chấm bài về cho Khảo thí
> **As a** Giảng viên  
> **I want to** ký xác nhận hoàn tất chấm bài (Submit Final Grades) cho toàn bộ ca thi/lớp học  
> **So that** chuyển kết quả chấm về cho Phòng Khảo thí tiến hành phê duyệt và khóa sổ điểm.

### US-TEACHER-009: Thực hiện Chấm chéo / Phúc khảo khi được Khảo thí điều phối
> **As a** Giảng viên  
> **I want to** nhận nhiệm vụ chấm lại một bài thi cụ thể (chấm độc lập không xem trước điểm của giám khảo trước)  
> **So that** cung cấp thêm một đánh giá chuyên môn khách quan cho Khảo thí giải quyết đơn phúc khảo của sinh viên.

---

## 3. Use Cases Chi Tiết

### UC-TEACHER-001: Rà soát và thẩm định điểm bài thi (Grading & Review)

| Thuộc tính | Mô tả |
| :--- | :--- |
| **UC-ID** | `UC-TEACHER-001` |
| **Tên** | Rà soát và chốt điểm bài thi vấn đáp |
| **Actor** | Giảng viên chấm thi (`TEACHER`) |
| **Điều kiện tiên quyết** | Sinh viên đã nộp bài; Server Worker đã hoàn tất bóc băng STT Faster-Whisper và AI Grader đã sinh điểm sơ bộ theo Rubric Academy. |
| **Luồng sự kiện chính** | 1. Giảng viên vào **Danh sách bài chấm (`/teacher/grading`)**.<br>2. Chọn bài thi của sinh viên Nguyễn Văn A (Lớp SE1801, Môn CSD201).<br>3. Màn hình chi tiết mở ra giao diện thẩm định bài thi:<br>&nbsp;&nbsp;&nbsp;&nbsp;• Bên trái: Trình phát Audio câu trả lời từng câu (Câu 1, Câu 2, Câu 3) kèm transcript Faster-Whisper.<br>&nbsp;&nbsp;&nbsp;&nbsp;• Bên phải: Chi tiết các tiêu chí Rubric chuẩn của Academy, điểm số AI gợi ý, bằng chứng trích dẫn và lời phê của AI.<br>4. Giảng viên nghe audio câu 1, kiểm tra các điểm mấu chốt (expected points) và từ khóa (key terms).<br>5. Giảng viên nhận thấy AI chấm câu 1 đúng $\rightarrow$ Giữ nguyên điểm AI.<br>6. Giảng viên nghe câu 2, nhận thấy AI trừ điểm oan do sinh viên phát âm tiếng Anh có âm điệu địa phương nhưng thực chất nắm rất chắc thuật ngữ $\rightarrow$ Giảng viên điều chỉnh điểm tiêu chí 2 từ 2.0 lên 3.0 điểm, nhập lý do: *"Sinh viên trình bày đúng cơ chế quay cây AVL, phát âm hơi lệch nhưng giải thích bản chất chính xác"**.<br>7. Giảng viên kiểm tra tổng điểm và nhận xét chung.<br>8. Giảng viên nhấn **"Lưu và Xác nhận điểm bài thi"**. |
| **Hậu điều kiện** | Bài thi chuyển trạng thái `TEACHER_REVIEWED`. Điểm số chính thức của Giảng viên được ghi nhận kèm lịch sử giải trình (override logs) để Khảo thí theo dõi. |

---

## 4. Giao diện & Thao tác của Actor Teacher trên Staff Portal

Giảng viên truy cập phân hệ `(teacher)` trên Staff Portal được tối ưu hóa tập trung vào Coi thi và Chấm thi:
1. **Lịch Coi thi (`/teacher/schedule`):** Danh sách các ca thi được phân công giám thị, mã phòng thi, thời gian bắt đầu.
2. **Không gian Chấm thi (`/teacher/grading`):**
   - Danh sách các lớp/ca thi được phân công chấm.
   - Bộ lọc: Chưa chấm / Đang chấm / Đã hoàn thành / Bài có cảnh báo độ lệch điểm cao ($\ge 1.5$ điểm).
   - Thống kê tiến độ chấm điểm (ví dụ: *Đã chấm 28/30 sinh viên*).
3. **Màn hình Thẩm định bài thi chi tiết (`/teacher/grading/[session_id]`):**
   - Bộ điều khiển âm thanh trực quan (Play, Pause, Speed 1.0x - 2.0x, thanh tiến trình đồng bộ theo dòng transcript).
   - Hiển thị song song Transcript và Hướng dẫn chấm (Expected Points / Rubric chuẩn của Academy).
   - Bảng điểm chi tiết từng tiêu chí Rubric: cho phép bấm chọn điểm hoặc chỉnh sửa điểm nhanh, kèm ô nhập phản hồi giải trình.
   - Nút **"Xác nhận toàn bộ điểm AI"** (One-click Confirm nếu bài làm rõ ràng và điểm AI hoàn toàn chuẩn xác).
   - Nút **"Hoàn tất & Ký nộp bài chấm"**.
