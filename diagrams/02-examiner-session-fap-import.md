# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 2 — KHẢO THÍ TỔ CHỨC CA THI & IMPORT FAP
## Examiner Session Setup & FAP Ingestion

### 1. Mục tiêu
Cán bộ Khảo thí (`EXAMINER`) tiếp nhận Ma trận đề đã được Ban Học thuật công bố, lập các ca thi cho môn học và **Import trực tiếp danh sách sinh viên đã được hệ thống FAP của Trường FPT xếp lịch sẵn** (gồm MSSV, Mật khẩu thi, Phòng thi, Số ghế).

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([Bắt đầu tổ chức ca thi]) --> E1[Cán bộ Khảo thí đăng nhập Staff Portal]
    
    E1 --> E2[Chọn Học kỳ & Môn thi cần mở ca]
    E2 --> E3[Chọn Exam Blueprint đã Publish của môn]
    
    E3 --> E4[Tạo Ca thi mới Exam Session:\n- Tên ca thi, Ngày thi, Giờ bắt đầu - Giờ kết thúc\n- Hệ thống tự sinh mã Session Code]
    
    E4 --> E5[Phân công Giám thị coi thi Session Teachers]
    E5 --> E6[Khai báo Phòng thi Session Rooms]
    
    E6 --> E7[Tải lên File Excel / CSV xuất từ FAP của FPT]
    E7 --> E8{Kiểm tra tính hợp lệ\ncủa File FAP?}
    
    E8 -- "File sai định dạng / Thiếu cột" --> E8_ERR[Báo lỗi chi tiết từng dòng\nYêu cầu chuẩn hóa lại file FAP]
    E8_ERR --> E7
    
    E8 -- "Đúng định dạng" --> E9[Hệ thống phân giải dữ liệu từng thí sinh:\n- MSSV Roll Number\n- Họ và tên Full Name\n- Mật khẩu Password\n- Phòng thi Room\n- Số ghế Seat]
    
    E9 --> E10[Kiểm tra trùng lịch thi của thí sinh]
    E10 --> E11[Tạo danh sách Session Candidates chính thức]
    E11 --> E12[Chuyển trạng thái Ca thi thành READY\nSẵn sàng kích hoạt sinh đề]
    
    E12 --> END_NODE([Hoàn thành Giai đoạn 2\nSẵn sàng chuyển sang ATA Engine sinh đề])
```

---

### 3. Đầu vào, Đầu ra & Thực thể dữ liệu liên quan

* **Tác tử thực hiện:** Cán bộ Khảo thí (`EXAMINER`) + File dữ liệu từ Hệ thống FAP.
* **Đầu vào (Input):**
  - Blueprint đã Publish từ Giai đoạn 1.
  - File Excel/CSV FAP gồm các cột: `RollNumber`, `FullName`, `Password`, `Room`, `SeatNumber`.
* **Đầu ra (Output):** `exam_session` ở trạng thái `READY` + danh sách `session_candidates` đã liên kết.
* **Thực thể dữ liệu (Database Tables):**
  - `schedule_slots` / `exam_sessions`
  - `exam_batches`
  - `course_candidates` / `session_candidates`
  - `slot_assignments`
