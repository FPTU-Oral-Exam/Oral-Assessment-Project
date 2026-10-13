# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 2 — KHẢO THÍ TỔ CHỨC CA THI & IMPORT FAP / NHẬP TAY
## Examiner Session Setup & FAP Ingestion / Manual Entry

### 1. Mục tiêu
Cán bộ Khảo thí (`EXAMINER`) thiết lập các ca thi cho môn học (môn học có thể có nhiều lớp học phần như SE1701, SE1702...). Hệ thống FAP của Trường FPT đã xếp lịch, gom sinh viên các lớp vào các ca thi, phân phòng thi và chỉ định Giảng viên coi thi kiêm chấm thi. Khảo thí có 2 phương thức nạp dữ liệu: **Import file Excel FAP** hoặc **Nhập tay thủ công (Manual Form)**.

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([Bắt đầu tổ chức ca thi]) --> E1[Cán bộ Khảo thí đăng nhập Staff Portal]
    
    E1 --> E2[Chọn Kỳ thi Semester & Môn thi Course\nMôn gồm nhiều lớp học phần: SE1701, SE1702...]
    E2 --> E3[FAP tổng hợp SV từ các lớp -> Xếp Ca thi, Phòng thi\n& Phân bổ Giảng viên: Coi thi kiêm Chấm điểm]
    
    E3 --> MODE{Chọn phương thức\nnạp ca thi?}
    
    %% Nhánh A: Import FAP
    MODE -- "Cách 1: Import Excel FAP" --> FAP1[Tải lên File Excel/CSV xuất từ FAP\nCác cột: Ca, Ngày, Giờ, Phòng, Email GV, MSSV, Họ tên, Lớp]
    FAP1 --> FAP2{Kiểm tra tính hợp lệ\ncủa File FAP?}
    FAP2 -- "File sai format" --> FAP_ERR[Báo lỗi chi tiết dòng sai\nYêu cầu chuẩn hóa lại file]
    FAP_ERR --> FAP1
    FAP2 -- "Hợp lệ" --> FAP3[Hệ thống tự động bóc tách:\n- Tạo Ca thi ScheduleSlot kèm Phòng thi\n- Gán Giảng viên: Coi thi & Chấm điểm\n- Nạp Thí sinh vào SlotAssignment]
    
    %% Nhánh B: Nhập tay
    MODE -- "Cách 2: Nhập tay thủ công" --> MAN1[Mở form Tạo Ca thi thủ công:\n- Nhập Ca thi, Ngày thi, Giờ bắt đầu - Giờ kết thúc\n- Nhập Phòng thi Room\n- Chọn Giảng viên: Giám thị kiêm Chấm điểm\n- Chọn/Thêm danh sách Thí sinh dự thi]
    MAN1 --> MAN2[Lưu bản ghi Ca thi & Danh sách SV]
    
    %% Merge
    FAP3 --> READY[Kiểm tra chống trùng lịch & Chốt Ca thi READY\nSẵn sàng kích hoạt sinh đề ATA]
    MAN2 --> READY
    
    READY --> END_NODE([Hoàn thành Giai đoạn 2\nSẵn sàng chuyển sang ATA Engine sinh đề])
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
