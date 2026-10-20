# RUNBOOK-02: Quy Trình Kiểm Thử & Xác Minh Toàn Diện (Testing & Verification Suite)

> **Mục tiêu:** Hướng dẫn thực thi toàn bộ các bộ kiểm thử tĩnh (Typecheck), kiểm thử đơn vị (Unit Tests), và kiểm thử tích hợp (Integration Tests) trong toàn bộ Monorepo trước khi tạo Pull Request hoặc bàn giao phiên làm việc.

---

## 1. Triết lý Kiểm thử: "Evidence Before Assertions"

Tuyệt đối không bao giờ khẳng định một tính năng "đã chạy tốt" hoặc "đã sửa xong lỗi" nếu chưa thực thi các lệnh kiểm chứng và ghi nhận bằng chứng đầu ra (output log) thành công 100%.

---

## 2. Lớp 1: Kiểm thử Kiểu dữ liệu Tĩnh (Typecheck toàn Monorepo)

Kiểm tra tính nhất quán của TypeScript giữa `@oralai/shared`, `apps/student-app`, và `apps/staff-portal`:

```powershell
# Chạy typecheck trên toàn bộ các workspace
npm.cmd run typecheck
```

Hoặc chạy chi tiết từng phân hệ:

```powershell
# 1. Thư viện dùng chung
npm.cmd run typecheck -w packages/shared

# 2. Ứng dụng Desktop Sinh viên
npm.cmd run typecheck -w apps/student-app

# 3. Web Portal Cán bộ & Giảng viên
npm.cmd run typecheck -w apps/staff-portal
```

*Tiêu chí vượt qua (PASS):* **0 errors** trên cả 3 workspace.

---

## 3. Lớp 2: Kiểm thử Frontend & Shared Package (Vitest)

Chạy bộ unit tests cho các thuật toán phân mảnh `ChunkedUploader`, Zod validation schemas, và UI components:

```powershell
# Chạy test cho @oralai/shared
npm.cmd run test -w packages/shared

# Chạy test cho Student App
npm.cmd run test -w apps/student-app
```

*Tiêu chí vượt qua (PASS):* Toàn bộ test cases báo xanh (Green).

---

## 4. Lớp 3: Kiểm thử Bản dựng Production (Production Build Smoke Test)

Kiểm tra xem ứng dụng Next.js có thể compile và đóng gói thành công mà không gặp lỗi đứt gãy route hoặc thiếu biến môi trường:

```powershell
# Build thử nghiệm Staff Portal
npm.cmd run build -w apps/staff-portal
```

> [!WARNING]
> **Phòng ngừa Lỗi Xung đột Cache Next.js (CRITICAL):**
> Lệnh `next build` sẽ ghi đè lên thư mục `.next/`. Nếu dev server `next dev` đang chạy ngầm, việc này sẽ làm đứt manifest và mất toàn bộ CSS của giao diện.
> Nếu muốn quay lại chế độ phát triển sau khi build, **bắt buộc chạy lệnh dọn dẹp**:
> ```powershell
> if (Test-Path apps/staff-portal/.next) { Remove-Item -Recurse -Force apps/staff-portal/.next }
> npm.cmd run dev -w apps/staff-portal
> ```

---

## 5. Lớp 4: Kiểm thử Backend API & AI Engine (Pytest Suite)

Di chuyển vào thư mục backend và kích hoạt môi trường ảo Python:

```powershell
cd services/api
.venv\Scripts\Activate.ps1
```

### 5.1. Chạy kiểm thử Phân hệ Học vụ (Academy & Item Bank):
```powershell
pytest tests/test_routes_academy.py -v
```

### 5.2. Chạy kiểm thử Phân hệ Khảo thí (Examiner Schedules & Results):
```powershell
pytest tests/test_routes_examiner.py -v
```

### 5.3. Chạy kiểm thử Phân hệ Giảng viên (Teacher Proctoring & Grading):
```powershell
pytest tests/test_routes_teacher.py -v
```

### 5.4. Chạy kiểm thử Bộ Chấm điểm ENTs 5 Tiêu chí (AI Grading Engine):
```powershell
pytest tests/test_ents_grading.py -v
```

### 5.5. Chạy toàn bộ Test Suites Backend:
```powershell
pytest tests/ -v
```

---

## 6. Lệnh Kiểm tra Nhanh Tổng thể (One-Liner Verification)

Chạy chuỗi lệnh sau tại root để kiểm tra toàn bộ hệ thống trong 60 giây:

```powershell
npm.cmd run typecheck && npm.cmd run test -w packages/shared
```
