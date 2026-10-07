# Actor: Khảo thí (Examiner)

## 1. Actor Profile

| Thuộc tính | Mô tả |
| :--- | :--- |
| **Vai trò (Role)** | `EXAMINER` |
| **Mô tả** | Người tổ chức, vận hành và giám sát toàn bộ quy trình kỳ thi — quản lý học kỳ, mở môn thi trong kỳ, nạp danh sách sinh viên theo lớp, lập lịch ca thi, kích hoạt sinh các mã đề thi song song từ Item Bank của Academy, phân công giảng viên coi thi/chấm thi, giám sát tiến độ thi trực tiếp và phê duyệt kết quả xuất FAP. |
| **Phạm vi quyền hạn** | Vận hành toàn bộ các kỳ thi, ca thi, danh sách sinh viên và kết quả điểm số trên hệ thống. |
| **Nguyên tắc cốt lõi** | **"Bảo mật - Khách quan - Chống lộ đề"**: Khảo thí không can thiệp sửa nội dung câu hỏi hay Rubric của Academy, mà tập trung tổ chức thi nghiêm túc: đảm bảo mỗi ca thi có một mã đề riêng biệt (Parallel Form), phân công chấm chéo khách quan và khóa sổ điểm an toàn. |

---

## 2. User Stories

### US-EXAMINER-001: Khởi tạo và quản lý Học kỳ (Semester)
> **As a** Cán bộ Khảo thí  
> **I want to** tạo mới và quản lý các học kỳ (ví dụ: `Fall_2026`, `Spring_2027`...)  
> **So that** phân định rõ niên khóa và các đợt thi theo đúng tiến độ đào tạo của trường.

### US-EXAMINER-002: Khởi tạo Kỳ thi và Mở môn thi trong kỳ (Course Offering)
> **As a** Cán bộ Khảo thí  
> **I want to** tạo kỳ thi (ví dụ: *Final Exam Fall 2026*) và mở các môn thi (ví dụ: *CSD201 - Fall 2026*) gắn liền với Môn học gốc của Academy  
> **So that** kế thừa toàn bộ Chuẩn đầu ra, Rubric chuẩn và Ngân hàng câu hỏi đã thẩm định để tổ chức thi.

### US-EXAMINER-003: Quản lý Lớp học & Import danh sách sinh viên dự thi từ Excel
> **As a** Cán bộ Khảo thí  
> **I want to** tải lên file Excel danh sách sinh viên theo từng lớp (ví dụ: `SE1801`, `SE1802`...) bao gồm MSSV, họ tên, email, lớp học  
> **So that** hệ thống ghi danh đúng sinh viên đủ điều kiện dự thi và tự động phân vào các lớp tương ứng.

### US-EXAMINER-004: Thiết lập Ca thi (Schedule Slots / Shifts)
> **As a** Cán bộ Khảo thí  
> **I want to** chia môn thi thành các ca thi cụ thể (Ca 1: 07:30 - 09:00, Ca 2: 09:15 - 10:45...) kèm ngày thi, phòng thi và gán các lớp sinh viên vào ca  
> **So that** sinh viên biết chính xác ca thi và phòng thi của mình.

### US-EXAMINER-005: Lắp ráp đề tự động & Phân bổ mã đề song song cho các ca thi
> **As a** Cán bộ Khảo thí  
> **I want to** kích hoạt hệ thống Lắp ráp đề tự động (Automated Test Assembly - ATA) để sinh các mã đề song song (Mã đề 101, 102, 103...) từ Ngân hàng câu hỏi theo đúng Master Blueprint của môn  
> **So that** mỗi ca thi nhận một mã đề riêng biệt, tương đương về độ khó nhưng không trùng câu hỏi, triệt tiêu nguy cơ lộ đề giữa các ca thi liên tiếp.

### US-EXAMINER-006: Phân công Giảng viên Coi thi & Chấm thi cho Ca thi
> **As a** Cán bộ Khảo thí  
> **I want to** chỉ định Giảng viên (`TEACHER`) phụ trách coi thi hoặc chấm bài cho từng ca thi/lớp học  
> **So that** công tác coi thi và chấm điểm được phân bổ minh bạch, hỗ trợ cơ chế chấm chéo (giảng viên không chấm lớp mình dạy nếu quy chế yêu cầu).

### US-EXAMINER-007: Giám sát phòng thi trực tiếp (Real-time Proctor Monitoring)
> **As a** Cán bộ Khảo thí  
> **I want to** theo dõi màn hình giám sát trực tiếp các ca thi đang diễn ra (số thí sinh đã vào phòng, đang trả lời, đã nộp bài, trạng thái kết nối mạng)  
> **So that** kịp thời phát hiện sự cố kỹ thuật hoặc cảnh báo bất thường trong phòng thi.

### US-EXAMINER-008: Điều phối Phúc khảo & Chấm chéo độc lập
> **As a** Cán bộ Khảo thí  
> **I want to** rà soát các bài thi có cảnh báo chênh lệch điểm (độ lệch điểm giữa AI Grader và Giảng viên $\ge 1.5$ điểm) hoặc khi sinh viên nộp đơn phúc khảo, để giao cho một Giảng viên thứ hai chấm chéo  
> **So that** bảo đảm tính công bằng tuyệt đối cho thí sinh.

### US-EXAMINER-009: Phê duyệt điểm chính thức, Khóa sổ điểm và Xuất file FAP
> **As a** Cán bộ Khảo thí  
> **I want to** kiểm tra tổng hợp điểm của toàn bộ ca thi/lớp học, phê duyệt chốt điểm, khóa sổ để không ai sửa được nữa, và xuất file bảng điểm định dạng chuẩn FAP (Excel/CSV)  
> **So that** nhập điểm chính thức vào hệ thống quản lý đào tạo chung của nhà trường.

---

## 3. Use Cases Chi Tiết

### UC-EXAMINER-001: Lập lịch ca thi và sinh mã đề song song

| Thuộc tính | Mô tả |
| :--- | :--- |
| **UC-ID** | `UC-EXAMINER-001` |
| **Tên** | Lập ca thi và cấp phát mã đề tự động |
| **Actor** | Khảo thí (`EXAMINER`) |
| **Điều kiện tiên quyết** | Môn học đã có Master Blueprint và Ngân hàng câu hỏi ở trạng thái `ACTIVE` do Academy ban hành. Danh sách sinh viên đã được import. |
| **Luồng sự kiện chính** | 1. Khảo thí vào mục **Quản lý Ca thi (`/examiner/schedule`)**.<br>2. Chọn Môn thi trong kỳ (ví dụ: CSD201 - Fall 2026).<br>3. Nhấn **"Thêm ca thi mới"**.<br>4. Nhập thông tin: Tên ca (Ca 1), Ngày thi, Khung giờ (07:30 - 09:00), Phòng thi (BE-301), chọn các lớp tham gia (SE1801).<br>5. Nhấn nút **"Sinh mã đề tự động (ATA)"**.<br>6. Hệ thống đối soát Master Blueprint, rút trích ngẫu nhiên các câu hỏi từ Item Bank thỏa mãn các tiêu chí (LO, Bloom level, độ khó, thời lượng) và đóng gói thành `ExamVariant` (Mã đề: CSD201-F26-101).<br>7. Hệ thống gắn Mã đề này riêng cho Ca 1.<br>8. Khảo thí chọn Giảng viên coi thi và Giảng viên chấm thi.<br>9. Nhấn **"Công bố ca thi"**. |
| **Hậu điều kiện** | Ca thi được kích hoạt. Sinh viên trong lớp SE1801 khi đăng nhập vào Student App đúng giờ thi sẽ nhận đúng Mã đề 101. |

### UC-EXAMINER-002: Xuất bảng điểm FAP và khóa sổ điểm

| Thuộc tính | Mô tả |
| :--- | :--- |
| **UC-ID** | `UC-EXAMINER-002` |
| **Tên** | Duyệt điểm, khóa sổ và xuất file FAP |
| **Actor** | Khảo thí (`EXAMINER`) |
| **Điều kiện tiên quyết** | Giảng viên chấm thi đã hoàn tất việc rà soát/chấm điểm toàn bộ bài thi trong ca/lớp. |
| **Luồng sự kiện chính** | 1. Khảo thí vào màn hình **Kết quả ca thi (`/examiner/results/[slot_id]`)**.<br>2. Xem danh sách sinh viên, điểm AI sơ bộ, điểm Giảng viên chấm chốt, độ lệch điểm.<br>3. Kiểm tra các bài có cờ cảnh báo (Flagged) hoặc phúc khảo.<br>4. Nhấn **"Phê duyệt kết quả ca thi"**.<br>5. Hệ thống chuyển trạng thái ca thi sang `LOCKED_FINAL` (Không thể sửa điểm nữa).<br>6. Khảo thí nhấn **"Xuất bảng điểm FAP"** để tải file `.xlsx` chuẩn cột (MSSV, Họ tên, Lớp, Điểm tổng kết, Điểm thành phần theo LO).<br>7. Bảng điểm được lưu vào hồ sơ khảo thí. |

---

## 4. Giao diện & Thao tác của Actor Examiner trên Staff Portal

Cán bộ Khảo thí sử dụng phân hệ `(examiner)` trên Staff Portal:
1. **Quản lý Học kỳ (`/examiner/semester`):** Tạo học kỳ, quản lý trạng thái kỳ học.
2. **Quản lý Môn thi trong kỳ (`/examiner/courses`):** Mở môn thi, gắn môn gốc Academy, nạp danh sách lớp và sinh viên.
3. **Quản lý Ca thi & Lịch thi (`/examiner/schedule`):** Tạo ca thi, chia phòng, phân lớp, sinh mã đề song song ATA, phân công giám thị/chấm thi.
4. **Giám sát Phòng thi (`/examiner/monitor`):** Dashboard thời gian thực theo dõi tiến độ thi của từng phòng.
5. **Duyệt kết quả & Báo cáo FAP (`/examiner/results/[slot_id]`):** Bảng điểm tổng hợp, đối soát audio/transcript, xử lý phúc khảo, khóa điểm và xuất file FAP.
