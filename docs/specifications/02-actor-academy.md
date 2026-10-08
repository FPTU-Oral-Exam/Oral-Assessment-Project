# Actor: Ban Học thuật & Bộ môn (Academy)

## 1. Actor Profile

| Thuộc tính | Mô tả |
| :--- | :--- |
| **Vai trò (Role)** | `ACADEMY` (hoặc Trưởng bộ môn / Cán bộ Ban Học thuật & Đào tạo) |
| **Mô tả** | Đỉnh tháp chuyên môn học thuật — chịu trách nhiệm thiết lập chuẩn mực môn học, chuẩn đầu ra (LO), cây chủ đề (Topics), tiêu chí chấm (Rubric chuẩn), ma trận đề thi chuẩn (Master Blueprint) cố định, và xây dựng/thẩm định Ngân hàng câu hỏi (Item Bank) cho từng môn. |
| **Phạm vi quyền hạn** | Quản lý toàn bộ cấu hình học thuật và ngân hàng câu hỏi cấp cao của các môn học trong trường. Không trực tiếp xếp ca thi hay chấm điểm sinh viên. |
| **Nguyên tắc cốt lõi** | **"Chuẩn hóa tập trung - Bất biến khi thi"**: Chỉ Ban Học thuật mới có quyền định nghĩa chuẩn đánh giá cho môn học. Mọi giảng viên và ca thi đều phải tuân theo khung chuẩn này để đảm bảo tính công bằng và nhất quán tuyệt đối. |

---

## 2. User Stories

### US-ACADEMY-001: Quản lý danh mục Môn học gốc (Master Course Catalog)
> **As a** Cán bộ Học thuật  
> **I want to** tạo, chỉnh sửa, lưu trữ danh mục các môn học gốc trong trường (mã môn: CSD201, PRN211, MAS291...)  
> **So that** định hình danh mục môn học chuẩn làm nền tảng cho việc mở lớp và tổ chức thi trong các học kỳ.

### US-ACADEMY-002: Thiết lập Chuẩn đầu ra môn học (Learning Outcomes - LOs)
> **As a** Cán bộ Học thuật  
> **I want to** định nghĩa danh sách các chuẩn đầu ra (LO1, LO2, LO3...) với mã, tên, mô tả chi tiết và mức độ nhận thức Bloom  
> **So that** mọi câu hỏi và tiêu chí đánh giá đều được ánh xạ chính xác vào mục tiêu đào tạo.

### US-ACADEMY-003: Xây dựng Cây Chủ đề môn học (Topics Tree)
> **As a** Cán bộ Học thuật  
> **I want to** thiết lập danh mục các chủ đề kiến thức chính của môn học (ví dụ CSD201: Cây nhị phân, Đồ thị, Bảng băm...) và gắn liên kết với các LO  
> **So that** đề thi có thể bao phủ cân đối các mảng kiến thức trọng tâm.

### US-ACADEMY-004: Thiết lập Khung Rubric chuẩn dùng chung cho môn học
> **As a** Cán bộ Học thuật  
> **I want to** thiết lập khung tiêu chí chấm điểm chuẩn (Rubric) cho môn học (bao gồm tiêu chí, mô tả các mức điểm, trọng số và thang điểm 10)  
> **So that** AI Grader và Giảng viên chấm thi có cùng một thước đo khách quan, không bị chấm lệch điểm theo cảm tính cá nhân.

### US-ACADEMY-005: Thiết lập Ma trận đề thi chuẩn (Master Blueprint)
> **As a** Cán bộ Học thuật  
> **I want to** thiết lập 1 Ma trận đề thi chuẩn duy nhất và cố định cho môn học (quy định số lượng câu hỏi, thời gian trả lời, phân bổ LO, Topic, Bloom Level và tỷ lệ điểm)  
> **So that** Phòng Khảo thí có thể tự động lắp ráp các mã đề thi song song (Parallel Exam Variants) đồng nhất về độ khó và cấu trúc cho các ca thi.

### US-ACADEMY-006: Soạn và thẩm định câu hỏi trong Ngân hàng câu hỏi (Item Bank)
> **As a** Cán bộ Học thuật  
> **I want to** trực tiếp thêm mới, chỉnh sửa, xem trước và gắn trạng thái thẩm định (`DRAFT` → `VERIFIED` → `ACTIVE`) cho từng câu hỏi  
> **So that** bảo đảm 100% câu hỏi trong ngân hàng đều đạt chuẩn sư phạm, có hướng dẫn chấm (expected points) và từ khóa chuyên môn (key terms) rõ ràng.

### US-ACADEMY-007: Import hàng loạt câu hỏi từ file Excel (.xlsx)
> **As a** Cán bộ Học thuật  
> **I want to** tải lên file Excel chứa danh sách câu hỏi kèm đầy đủ metadata (Topic, LO, Cognitive Level, Prompt, Time Limit, Expected Points, Rubric Criterion, Key Terms)  
> **So that** nhanh chóng nạp hàng trăm câu hỏi đã được hội đồng chuyên môn biên soạn vào Ngân hàng câu hỏi của môn học mà không phải nhập tay từng câu.

### US-ACADEMY-008: Đóng băng phiên bản học thuật (Freeze Academic Baseline)
> **As a** Cán bộ Học thuật  
> **I want to** khóa sổ phiên bản học thuật (freeze snapshot) của môn học trước kỳ thi  
> **So that** Phòng Khảo thí lấy làm căn cứ sinh mã đề mà không sợ dữ liệu câu hỏi bị thay đổi đột ngột giữa kỳ thi.

---

## 3. Use Cases Chi Tiết

### UC-ACADEMY-001: Import câu hỏi từ file Excel vào Ngân hàng câu hỏi

| Thuộc tính | Mô tả |
| :--- | :--- |
| **UC-ID** | `UC-ACADEMY-001` |
| **Tên** | Import câu hỏi từ Excel vào Item Bank |
| **Actor** | Ban Học thuật (`ACADEMY`) |
| **Điều kiện tiên quyết** | Môn học đã tồn tại; Chuẩn đầu ra (LO) và Chủ đề (Topics) đã được thiết lập trong hệ thống. |
| **Luồng sự kiện chính** | 1. Actor vào trang chi tiết môn học, chuyển đến tab **03 · Ngân hàng câu hỏi**.<br>2. Nhấn nút **"Tải file mẫu Excel"** để lấy template chuẩn.<br>3. Điền câu hỏi, LO, Topic, thời lượng, expected points, key terms vào file Excel.<br>4. Nhấn **"Import Excel"** và chọn file `.xlsx`.<br>5. Hệ thống thực hiện validate cấu trúc và đối chiếu mã LO/Topic trong CSDL.<br>6. Hệ thống hiển thị bảng Preview kết quả kiểm tra (số câu hợp lệ, số câu lỗi nếu có).<br>7. Actor xác nhận import.<br>8. Hệ thống lưu các bản ghi vào bảng `question_items` với trạng thái `VERIFIED`. |
| **Ngoại lệ** | - File sai định dạng hoặc thiếu cột bắt buộc: Hệ thống từ chối và báo lỗi dòng/cột cụ thể.<br>- Mã LO hoặc Topic không tồn tại trong môn học: Báo lỗi để Actor sửa lại file Excel trước khi nạp. |

### UC-ACADEMY-002: Thiết lập Ma trận đề thi chuẩn (Master Blueprint)

| Thuộc tính | Mô tả |
| :--- | :--- |
| **UC-ID** | `UC-ACADEMY-002` |
| **Tên** | Thiết lập Ma trận đề thi chuẩn cho môn học |
| **Actor** | Ban Học thuật (`ACADEMY`) |
| **Điều kiện tiên quyết** | Đã có danh mục LO và Topic của môn học. |
| **Luồng sự kiện chính** | 1. Actor chọn tab **04 · Ma trận & Đề thi**.<br>2. Chọn **"Cấu hình Ma trận chuẩn (Master Blueprint)"**.<br>3. Định nghĩa tổng số câu hỏi cho 1 đề thi (ví dụ: 3 câu, tổng thời lượng 10 phút, thang điểm 10).<br>4. Định nghĩa cấu trúc từng câu thành phần:<br>&nbsp;&nbsp;&nbsp;&nbsp;• Câu 1: Topic Cây nhị phân, LO1, Cognitive: UNDERSTAND, Điểm: 3.0, Giới hạn: 180s.<br>&nbsp;&nbsp;&nbsp;&nbsp;• Câu 2: Topic Đồ thị, LO2, Cognitive: APPLY, Điểm: 4.0, Giới hạn: 240s.<br>&nbsp;&nbsp;&nbsp;&nbsp;• Câu 3: Topic Bảng băm & Nâng cao, LO3, Cognitive: ANALYZE, Điểm: 3.0, Giới hạn: 180s.<br>5. Hệ thống kiểm tra tổng điểm = 10.0 và kiểm tra số lượng câu hỏi trong Item Bank có đủ để rút trích không.<br>6. Actor nhấn **"Lưu và Ban hành Ma trận chuẩn"**. |
| **Hậu điều kiện** | Ma trận chuẩn được lưu trữ. Phòng Khảo thí sử dụng ma trận này để tự động sinh các mã đề song song cho các ca thi. |

---

## 4. Giao diện & Thao tác của Actor Academy trên Staff Portal

Cán bộ Học thuật truy cập phân hệ `(academy)` trên Staff Portal với các màn hình chính:
1. **Quản lý Môn học (`/academy/courses`):** Danh sách các môn học, mã môn, số tín chỉ, bộ môn quản lý.
2. **Không gian Môn học (`/academy/courses/[id]`):** 5 tab nghiệp vụ chuyên sâu:
   - `Tab 01 · Chuẩn đầu ra & Chủ đề`: Quản lý danh sách LO và cây Topics.
   - `Tab 02 · Tiêu chí Rubric`: Quản lý khung Rubric chuẩn (tiêu chí chấm, trọng số, thang điểm).
   - `Tab 03 · Ngân hàng câu hỏi`: Danh sách câu hỏi, lọc theo LO/Topic/Độ khó, thêm mới thủ công, Import Excel `.xlsx`, xem trạng thái thẩm định.
   - `Tab 04 · Ma trận & Đề thi`: Thiết lập Ma trận đề thi chuẩn (Master Blueprint) và xem các mã đề mẫu được sinh thử nghiệm.
   - `Tab 05 · Thống kê độ phủ`: Biểu đồ phân bổ câu hỏi theo LO và mức độ nhận thức Bloom để đánh giá độ dày của ngân hàng câu hỏi.
