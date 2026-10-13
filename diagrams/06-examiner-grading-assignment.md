# SƠ ĐỒ HOẠT ĐỘNG: GIAI ĐOẠN 6 — KHẢO THÍ PHÂN CÔNG GIẢNG VIÊN CHẤM
## Examiner Grading Assignment & Workload Distribution

### 1. Mục tiêu
Cán bộ Khảo thí (`EXAMINER`) lựa chọn các bài thi đã được AI chấm xong (`SCORED`) và áp dụng chiến lược phân bổ tự động hoặc chỉ định thủ công để giao quyền hậu kiểm/chấm điểm cho các Giảng viên bộ môn (`TEACHER`), đảm bảo tính công bằng, cân bằng khối lượng công việc và tránh xung đột lợi ích.

---

### 2. Sơ đồ Hoạt động (Activity Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9'}}}%%
flowchart TD
    START([Bắt đầu quy trình phân công chấm]) --> E1[Cán bộ Khảo thí mở màn hình Phân công chấm thi]
    
    E1 --> E2[Hệ thống lọc danh sách bài thi có trạng thái SCORED]
    E2 --> E3[Khảo thí chọn các bài thi hoặc chọn toàn bộ Ca thi]
    
    E3 --> E4[Lấy danh sách Giảng viên bộ môn đủ điều kiện chấm]
    E4 --> E5{Lựa chọn Chiến lược Phân công?}
    
    E5 -- "Chiến lược 1: Round-Robin" --> S_RR[Chia đều xoay vòng lần lượt cho từng Giảng viên]
    E5 -- "Chiến lược 2: Cân bằng tải Load Balancing" --> S_LB[Ưu tiên giao cho Giảng viên hiện có ít bài đang chờ nhất]
    E5 -- "Chiến lược 3: Chỉ định trực tiếp" --> S_MAN[Khảo thí gán đích danh Giảng viên phụ trách]
    
    S_RR & S_LB & S_MAN --> E6[Kiểm tra Ràng buộc Xung đột Lợi ích Conflict of Interest]
    E6 --> E7{Giảng viên có dạy trực tiếp\nLớp của thí sinh này không?}
    
    E7 -- "Có trùng (Vi phạm quy chế)" --> E7_SKIP[Tự động điều phối bài thi sang Giảng viên khác]
    E7_SKIP --> E6
    
    E7 -- "Không trùng (Hợp lệ)" --> E8[Tạo bản ghi teacher_assignments]
    E8 --> E9[Cập nhật trạng thái bài thi: ASSIGNED_TO_TEACHER]
    
    E9 --> E10[Hệ thống gửi Thông báo Notification đến Giảng viên được phân công]
    E10 --> END_NODE([Hoàn thành Giai đoạn 6\nBài thi xuất hiện trên Dashboard của Giảng viên])
```

---

### 3. Đầu vào, Đầu ra & Thực thể dữ liệu liên quan

* **Tác tử thực hiện:** Cán bộ Khảo thí (`EXAMINER`).
* **Đầu vào (Input):**
  - Danh sách bài thi đã có điểm AI (`SCORED`).
  - Danh sách Giảng viên chấm thi (`users` có role `TEACHER`).
* **Đầu ra (Output):**
  - Các bản ghi `teacher_assignments`.
  - Thông báo giao việc tới tài khoản Giảng viên.
* **Thực thể dữ liệu (Database Tables):**
  - `schedule_slots` / `exam_sessions`
  - `teacher_assignments`
  - `users`
