# 🚀 QUICK START — Hướng dẫn Khởi động Nhanh

> **Mục tiêu:** Người mới có thể hiểu, cài đặt và chạy được hệ thống trong **15 phút**.
>
> **Đối tượng:** Sinh viên NCKH, thành viên nhóm phát triển mới, người muốn demo hệ thống.

---

## 📋 MỤC LỤC

1. [Hệ thống này là gì?](#1-hệ-thống-này-là-gì)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cài đặt từ đầu (Windows)](#3-cài-đặt-từ-đầu-windows)
4. [Chạy hệ thống Backend](#4-chạy-hệ-thống)
5. [Staff Portal - Đăng nhập & Làm quen](#5-đăng-nhập--làm-quen-staff-portal)
6. [Student App - Ứng dụng Desktop Sinh viên](#5b-student-app-ứng-dụng-desktop-sinh-viên)
7. [Luồng làm việc cơ bản](#6-luồng-làm-việc-cơ-bản)
8. [Kiểm tra hoạt động](#7-kiểm-tra-hoạt-động)
9. [Xử lý lỗi thường gặp](#8-xử-lý-lỗi-thường-gặp)
10. [Tài liệu bổ sung](#9-tài-liệu-bổ-sung)

---

## 1. HỆ THỐNG NÀY LÀ GÌ?

### Tên dự án

**OralAI** — Nền Tảng Thi Vấn đáp Tự động bằng AI

### Giải thích đơn giản

Một hệ thống thi trắc nghiệm / vấn đáp **hoàn toàn tự động**:

- **Sinh viên** làm bài thi trên ứng dụng Desktop, nói câu trả lời bằng micro
- **AI tự động** phiên âm (STT) và chấm điểm dựa trên rubric
- **Giảng viên** chỉ cần xem lại và xác nhận điểm

### 3 thành phần chính

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORALAI SYSTEM                            │
├─────────────────┬─────────────────────┬─────────────────────────┤
│  Student App    │    Staff Portal     │      Backend API        │
│  (Desktop)      │    (Web Browser)    │    (FastAPI + Worker)   │
├─────────────────┼─────────────────────┼─────────────────────────┤
│  Sinh viên      │  Cán bộ/Giảng viên  │  Xử lý ngầm            │
│  Làm bài thi    │  Quản lý đề thi,    │  - STT (PhoWhisper)    │
│  Ghi âm câu     │  xem điểm, chấm    │  - AI Grading          │
│  trả lời        │  thi, phê duyệt    │  - Lưu trữ MinIO       │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

### Ai nên đọc file này?

| Vai trò                    | Bạn cần làm gì?                         |
| --------------------------- | ------------------------------------------- |
| **Thành viên mới** | Đọc toàn bộ → cài đặt → chạy thử |
| **Người demo**      | Đọc mục 1-4 → Bỏ qua mục 5-8          |
| **Người sửa lỗi** | Nhảy thẳng mục 8                         |

---

## 2. YÊU CẦU HỆ THỐNG

### Phần cứng tối thiểu

| Thành phần       | Tối thiểu        | Khuyến nghị   |
| ------------------ | ------------------ | --------------- |
| **RAM**      | 8 GB               | 16 GB           |
| **Ổ cứng** | 20 GB trống       | SSD 50 GB       |
| **CPU**      | 4 cores            | 8 cores         |
| **GPU**      | Không bắt buộc* | NVIDIA 4GB VRAM |

> *GPU chỉ cần nếu dùng Ollama local cho AI Grading. Demo/Gemini không cần GPU.

### Phần mềm cần cài

| Phần mềm               | Phiên bản  | Mục đích                      |
| ------------------------ | ------------ | -------------------------------- |
| **Git**            | ≥ 2.30      | Clone project                    |
| **Docker Desktop** | ≥ 4.20      | Chạy backend, database, storage |
| **Node.js**        | ≥ 20 LTS    | Chạy Staff Portal dev           |
| **Python**         | ≥ 3.11      | Scripts cài đặt               |
| **VS Code**        | (tùy chọn) | Code editor                      |

### Cổng mạng sử dụng

| Cổng    | Dịch vụ       | Mô tả                    |
| -------- | --------------- | -------------------------- |
| `3000` | Staff Portal    | Web quản lý (Next.js)    |
| `3001` | Student App Dev | Dev server cho Desktop App |
| `8000` | Backend API     | FastAPI server             |
| `5432` | PostgreSQL      | Database                   |
| `6379` | Redis           | Message queue              |
| `9000` | MinIO API       | Object storage             |
| `9001` | MinIO Console   | Giao diện quản lý file  |

---

## 3. CÀI ĐẶT TỪ ĐẦU (WINDOWS)

### 3.1 Clone dự án

```powershell
# Mở PowerShell, chạy:
git clone https://github.com/your-repo/oralai.git
cd oralai
```

### 3.2 Cài đặt Docker Desktop

1. Tải Docker Desktop: https://docker.com/products/docker-desktop
2. Cài đặt (chọn **WSL 2** khi được hỏi)
3. Khởi động Docker Desktop, đợi icon whale xanh xuất hiện

> **Kiểm tra:** Mở PowerShell mới, gõ `docker --version` → thấy phiên bản là OK.

### 3.3 Cài đặt Python

1. Tải Python: https://python.org/downloads (chọn **Python 3.11+**)
2. **Quan trọng:** Tick ✅ **Add Python to PATH**
3. Kiểm tra: mở PowerShell, gõ `python --version`

### 3.4 Cài đặt Node.js

1. Tải Node.js: https://nodejs.org (chọn **LTS**)
2. Cài đặt mặc định
3. Kiểm tra: mở PowerShell, gõ `node --version` và `npm --version`

### 3.5 Cài đặt các công cụ bổ trợ

```powershell
# Cài đặt dependencies cho project
npm install

# Chạy script tạo file .env từ template
python scripts/setup_env.py
```

> Script `setup_env.py` sẽ tạo file `.env` với cấu hình mặc định.

---

## 4. CHẠY HỆ THỐNG BACKEND

### 4.1 Cấu hình AI (Tùy chọn)

Mở file `.env` vừa tạo, chỉnh sửa phần AI:

```dotenv
# ═══════════════════════════════════════════════════════════════
# CHỌN CHẾ ĐỘ AI (bỏ comment dòng bạn muốn dùng)
# ═══════════════════════════════════════════════════════════════

# Chế độ 1: DEMO (mặc định) — không cần API key, chỉ test luồng
AI_PROVIDER=demo

# Chế độ 2: Gemini (cần API key từ Google AI Studio)
# AI_PROVIDER=gemini
# GEMINI_API_KEY=your-api-key-here
# LLM_MODEL=gemini-2.0-flash

# Chế độ 3: Ollama local (cần GPU, chạy trên server)
# AI_PROVIDER=local
# LOCAL_LLM_URL=http://localhost:11434
# LLM_MODEL=qwen3:8b
```

> **Khuyến nghị cho người mới:** Dùng `AI_PROVIDER=demo` trước để test nhanh.

### 4.2 Khởi động toàn bộ hệ thống

```powershell
# Chạy lệnh này tại thư mục gốc của project
docker compose up -d --build --wait
```

**Docker sẽ tạo và chạy các container:**

| Container    | Mô tả                         |
| ------------ | ------------------------------- |
| `postgres` | Database PostgreSQL + pgvector  |
| `redis`    | Message queue cho Celery        |
| `minio`    | Lưu trữ file (audio, video)   |
| `api`      | Backend FastAPI                 |
| `worker`   | Celery worker (STT, AI Grading) |
| `web`      | Staff Portal Next.js            |

### 4.3 Đợi hệ thống sẵn sàng

```powershell
# Kiểm tra trạng thái các container
docker compose ps
```

Kết quả mong đợi:

```
NAME                IMAGE               STATUS
oralai-postgres-1   postgres:16        Up
oralai-redis-1      redis:7            Up
oralai-minio-1      minio/minio        Up
oralai-api-1        oralai-api         Up
oralai-worker-1     oralai-worker      Up
oralai-web-1        oralai-web         Up
```

### 4.4 Xác nhận hệ thống đang chạy

Mở trình duyệt, truy cập:

| Địa chỉ                 | Kiểm tra                         |
| -------------------------- | --------------------------------- |
| http://localhost:3000      | ✅ Staff Portal hiện trang login |
| http://localhost:8000/docs | ✅ Swagger API docs               |
| http://localhost:9001      | ✅ MinIO Console                  |

---

## 5. ĐĂNG NHẬP & LÀM QUEN (STAFF PORTAL) (STAFF PORTAL)

### 5.1 Tài khoản mặc định

Sau khi chạy `setup_env.py`, tài khoản bootstrap được tạo:

| Trường           | Giá trị                                        |
| ------------------ | ------------------------------------------------ |
| **Username** | `BOOTSTRAP_ADMIN`                              |
| **Password** | Giá trị trong`.env` (`BOOTSTRAP_PASSWORD`) |

### 5.2 Các vai trò trong hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                     4 VAI TRÒ NGƯỜI DÙNG                       │
├────────────────┬────────────────────────────────────────────────┤
│ SYSTEM_ADMIN   │ Quản trị hệ thống, tài khoản, cấu hình AI    │
│ ACADEMY        │ Ban Học thuật: Môn học, câu hỏi, Rubric       │
│ EXAMINER       │ Khảo thí: Tổ chức kỳ thi, ca thi, xuất điểm   │
│ TEACHER        │ Giảng viên: Coi thi, chấm bài, rà soát         │
│ STUDENT        │ Sinh viên: Làm bài thi trên Desktop App        │
└────────────────┴────────────────────────────────────────────────┘
```

### 5.3 Giao diện Staff Portal

Sau khi đăng nhập với `BOOTSTRAP_ADMIN`:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 OralAI                                    [Admin] ▼ [Logout]│
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  📋 Dashboard│           NỘI DUNG CHÍNH                          │
│  ────────────│                                                  │
│  👥 Users    │                                                  │
│  🔧 Settings │                                                  │
│  📚 Courses  │                                                  │
│  📝 Exams    │                                                  │
│  📅 Schedule │                                                  │
│  📊 Grading  │                                                  │
│  📦 Results  │                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## 5B. STUDENT APP (ỨNG DỤNG DESKTOP SINH VIÊN)

### 5B.1 Giới thiệu Student App

Student App là ứng dụng **Electron** chạy trên máy sinh viên để làm bài thi vấn đáp:

```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT APP FEATURES                        │
├─────────────────────────────────────────────────────────────────┤
│  🎤 Ghi âm câu trả lời → Tự động upload lên MinIO            │
│  🔇 Lọc nhiễu RNNoise (WASM AudioWorklet)                      │
│  🔒 Chống gian lận: Khóa bàn phím, chặn copy/paste            │
│  📊 PhoWhisper STT local (tiếng Việt)                         │
│  📹 Hỗ trợ ghi hình (tùy cấu hình đề thi)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5B.2 Cách 1: Chạy từ Source ( cho developer)

**Yêu cầu:**
- Node.js 22.12+
- Python 3.12
- Docker đã chạy (backend ở port 3000)

**Windows PowerShell:**

```powershell
# 1. Cài dependencies
npm ci

# 2. Tạo virtual environment và cài STT bundle
py -3.12 -m venv .venv-stt
.\.venv-stt\Scripts\pip install -r scripts/requirements-desktop-stt.txt
.\.venv-stt\Scripts\python scripts/build_desktop_stt.py

# 3. Chạy Student App (kết nối server localhost:3000)
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:ORAL_WEB_URL = "http://localhost:3000"
npm run desktop
```

**Linux/macOS:**

```bash
npm ci
python3.12 -m venv .venv-stt
.venv-stt/bin/pip install -r scripts/requirements-desktop-stt.txt
.venv-stt/bin/python scripts/build_desktop_stt.py
env -u ELECTRON_RUN_AS_NODE ORAL_WEB_URL=http://localhost:3000 npm run desktop
```

### 5B.3 Cách 2: Chạy từ Bộ cài đã build

**Tải bộ cài:**

1. Truy cập **GitHub Actions → Desktop installers**
2. Chọn workflow **Run workflow**
3. Chọn branch `main`, bấm **Run workflow**
4. Đợi build hoàn tất → Tải artifact đúng OS:
   - **Windows:** `OralAI-x.x.x-win.exe`
   - **Linux:** `OralAI-x.x.x-linux-amd64.deb` hoặc `.AppImage`
   - **macOS:** `OralAI-x.x.x.dmg`

**Cài đặt:**

```
# Windows: Chạy file .exe, làm theo wizard

# Linux (Ubuntu/Debian):
sudo dpkg -i OralAI-x.x.x-linux-amd64.deb
oralai

# Linux (AppImage):
chmod +x OralAI-x.x.x-linux-x86_64.AppImage
./OralAI-x.x.x-linux-x86_64.AppImage

# macOS: Mount .dmg, kéo OralAI vào Applications
```

### 5B.4 Kết nối Student App với Server

**Lần đầu mở app:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORALAI - CẤU HÌNH                            │
│                                                                 │
│    🖥️ Địa chỉ máy chủ:                                        │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │  http://localhost:3000                                  │   │
│    └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│    [ Tiếp tục ]                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Hoặc đổi server sau:**

1. Menu **OralAI → Cấu hình máy chủ…**
2. Nhập URL server (VD: `http://localhost:3000` hoặc `https://oral.example.edu`)
3. Bấm **Tiếp tục**

> ⚠️ **Lưu ý:** Dùng URL gốc (không thêm `/api`). HTTPS bắt buộc nếu server ở máy khác.

### 5B.5 Luồng làm bài thi trên Student App

```
┌─────────────────────────────────────────────────────────────────┐
│                     LUỒNG LÀM BÀI THI                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 📋 ĐĂNG NHẬP                                              │
│     └─> Nhập Username + Password của sinh viên                │
│                                                                 │
│  2. 🎯 VÀO PHÒNG THI                                          │
│     └─> Đợi đến giờ thi → Bấm "Vào phòng thi"               │
│                                                                 │
│  3. 🎤 KIỂM TRA THIẾT BỊ                                      │
│     ├─> Cấp quyền Camera + Microphone                         │
│     ├─> Chọn thiết bị từ danh sách                           │
│     ├─> Bấm "Kiểm tra độ ồn" (10 giây: 3s im + 7s nói)     │
│     └─> Nghe lại bản thu, điều chỉnh Gain nếu cần            │
│                                                                 │
│  4. 📝 LÀM BÀI                                                │
│     ├─> Đọc câu hỏi trên màn hình                            │
│     ├─> Bấm "Bắt đầu trả lời" → Nói vào micro              │
│     ├─> Bấm "Dừng" khi xong                                 │
│     └─> Xem transcript → Sửa nếu cần → Gửi                    │
│                                                                 │
│  5. ✅ NỘP BÀI                                                 │
│     └─> Xem biên lai xác nhận nộp thành công                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5B.6 Hướng dẫn chi tiết từng bước

#### Bước 1: Đăng nhập

```
┌─────────────────────────────────────────────────────────────────┐
│                         ĐĂNG NHẬP                               │
│                                                                 │
│    Username:  [ SV001              ]                           │
│    Password:  [ ••••••••           ]                           │
│                                                                 │
│                         [ ĐĂNG NHẬP ]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Nhập **Username** và **Password** được cấp bởi Examiner
- Tài khoản sinh viên được tạo khi Examiner import danh sách lớp

#### Bước 2: Kiểm tra thiết bị

```
┌─────────────────────────────────────────────────────────────────┐
│                    KIỂM TRA THIẾT BỊ                            │
│                                                                 │
│  🎤 Microphone: [ Built-in Microphone      ▼ ]                 │
│  📹 Camera:     [ Integrated Camera       ▼ ]                 │
│                                                                 │
│  🔊 Gain microphone:  [────●────] 0 dB                          │
│                                                                 │
│  [ ] Lọc nhiễu RNNoise khi nhận dạng                          │
│                                                                 │
│              [ KIỂM TRA ĐỘ ỒN ]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Cách kiểm tra:**
1. Chọn **Microphone** và **Camera** từ dropdown
2. Điều chỉnh **Gain** nếu giọng nhỏ (tăng) hoặc bị rè (giảm)
3. Bấm **Kiểm tra độ ồn**
4. **Giữ im lặng 3 giây đầu**, sau đó **nói thử 7 giây**
5. Bấm **Phát** để nghe lại
6. Checkbox **Nghe bản đã lọc nhiễu RNNoise** để so sánh

#### Bước 3: Làm bài

```
┌─────────────────────────────────────────────────────────────────┐
│                     CÂU HỎI 1/5                                 │
│                                                                 │
│  Thời gian còn lại:  00:45                                    │
│  ════════════════════════════════════════                        │
│                                                                 │
│  📝 Câu hỏi:                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Describe the process of software testing.              │    │
│  │ (Mô tả quy trình kiểm thử phần mềm)                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ⏱ Thời gian trả lời: 00:32                                   │
│                                                                 │
│       [ ⏹ DỪNG ]          [ 🎤 BẮT ĐẦU TRẢ LỜI ]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Khi đang ghi âm:**
- Màn hình hiện **thời gian đang ghi**
- **Không thể dùng bàn phím** (bị khóa chống gian lận)
- Bấm **DỪNG** khi đã trả lời xong

**Sau khi ghi:**
- Xem **transcript** được tạo tự động
- **Sửa transcript** nếu cần (VD: thuật ngữ chuyên môn)
- Bấm **Gửi câu trả lời**

#### Bước 4: Nộp bài

```
┌─────────────────────────────────────────────────────────────────┐
│                      BIÊN LAI NỘP BÀI                           │
│                                                                 │
│  ✅ Đã nộp thành công!                                         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Mã phiên thi:     ORAL-2024-ABCD1234                         │
│  Thời gian nộp:   2024-10-15 14:32:45                        │
│  Số câu đã trả:   5/5                                        │
│  Trạng thái:       ⏳ ĐANG CHỜ XỬ LÝ                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Kết quả sẽ được thông báo sau khi AI chấm xong.              │
│                                                                 │
│              [ ĐÓNG ]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5B.7 Xử lý sự cố Student App

| Vấn đề | Cách xử lý |
|---------|------------|
| **Mic không hoạt động** | Kiểm tra quyền truy cập mic trong Windows Settings → Privacy → Microphone |
| **Âm thanh bị rè/nhiễu** | Giảm Gain microphone, kiểm tra lại với tùy chọn RNNoise |
| **STT không nhận dạng được** | Kiểm tra câu ngắn hơn, thử bản gốc thay vì bản lọc nhiễu |
| **App không kết nối server** | Kiểm tra URL đã nhập đúng, thử restart Docker |
| **Transcript sai nhiều** | Sửa thủ công trước khi gửi (vẫn upload audio gốc) |
| **Hết thời gian khi đang ghi** | Hệ thống tự dừng và submit câu trả lời hiện tại |

### 5B.8 Lệnh nhanh cho Developer

```powershell
# Windows - Mở Student App dev (UI mới nhất từ source)
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:ORAL_WEB_URL = "http://localhost:3000"
npm run desktop

# Windows - Chạy bộ cài đã build với server khác
$env:ORAL_WEB_URL = "https://oral.example.edu"
& "C:\duong-dan-cai-dat\OralAI.exe"

# Linux/macOS
env -u ELECTRON_RUN_AS_NODE ORAL_WEB_URL=http://localhost:3000 npm run desktop
```

---

### 5.4 Tạo tài khoản mới cho các vai trò

1. Vào **Users** → Bấm **Add User**
2. Điền thông tin:
   - Username, Email, Full Name
   - Role: chọn `SYSTEM_ADMIN`, `ACADEMY`, `EXAMINER`, hoặc `TEACHER`
   - Password tạm thời (user sẽ đổi sau)
3. Bấm **Create**

---

## 6. LUỒNG LÀM VIỆC CƠ BẢN

### Luồng hoàn chỉnh: Tạo đề thi → Sinh viên làm bài → Chấm điểm

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ACADEMY   │    │  EXAMINER   │    │   STUDENT   │    │   TEACHER   │
│─────────────│    │─────────────│    │─────────────│    │─────────────│
│ 1. Tạo môn  │    │ 4. Mở kỳ   │    │ 6. Đăng nhập│    │ 8. Xem bài │
│    học      │───▶│    thi      │    │    Desktop  │    │    thi     │
│ 2. Thêm     │    │ 5. Sinh mã │───▶│ 7. Làm bài  │───▶│ 9. Chấm   │
│    câu hỏi  │    │    đề       │    │    → Nộp    │    │    điểm   │
│ 3. Tạo     │    │             │    │             │    │ 10. Duyệt │
│    Rubric   │    │             │    │             │    │    FAP    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Chi tiết từng bước

#### Bước 1-3: ACADEMY chuẩn bị nội dung

1. **Courses** → Tạo môn học (VD: `CSD201 - Software Engineering`)
2. **Question Bank** → Thêm câu hỏi (hoặc Import từ Excel)
3. **Rubrics** → Tạo tiêu chí chấm điểm (VD: Pronunciation, Fluency, Content)
4. **Exam Matrix** → Thiết lập cấu trúc đề thi

#### Bước 4-5: EXAMINER tổ chức kỳ thi

1. **Semester** → Tạo học kỳ (VD: `Fall_2026`)
2. **Subject Offering** → Mở môn thi trong kỳ
3. **Schedule** → Tạo ca thi, gán mã đề
4. **Import Students** → Nạp danh sách sinh viên

#### Bước 6-7: STUDENT làm bài

1. Mở **Student App** (Desktop)
2. Đăng nhập bằng tài khoản sinh viên
3. Vào phòng thi đúng giờ
4. Trả lời câu hỏi bằng micro
5. Nộp bài → Nhận biên lai

#### Bước 8-10: TEACHER chấm & duyệt

1. **Grading** → Xem danh sách bài cần chấm
2. Nghe audio, xem transcript, điểm AI
3. Xác nhận hoặc điều chỉnh điểm
4. **Results** → Khóa sổ điểm, xuất Excel

---

## 7. KIỂM TRA HOẠT ĐỘNG

### 7.1 Kiểm tra API

```powershell
# Test endpoint đăng nhập
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "BOOTSTRAP_ADMIN", "password": "your-password"}'
```

Kết quả mong đợi: `{ "access_token": "eyJ...", "user": {...} }`

### 7.2 Kiểm tra Worker

```powershell
# Xem logs của worker (AI đang xử lý)
docker compose logs -f worker
```

### 7.3 Kiểm tra MinIO (lưu trữ file)

1. Mở http://localhost:9001
2. Đăng nhập: Access Key / Secret Key trong `.env`
3. Kiểm tra bucket `oralai-audio` có chứa file sau khi sinh viên nộp bài

### 7.4 Chạy tests

```powershell
# Backend tests
cd services/api
python -m pytest tests/ -v

# Frontend typecheck
npm run typecheck

# Frontend build
npm run build
```

---

## 8. XỬ LÝ LỖI THƯỜNG GẶP

### ❌ Lỗi: Docker containers không start

**Nguyên nhân:** Docker chưa khởi động

**Cách sửa:**

```powershell
# Khởi động Docker Desktop, đợi icon xanh
# Sau đó chạy lại:
docker compose up -d
```

---

### ❌ Lỗi: `port is already allocated`

**Nguyên nhân:** Cổng đã được sử dụng bởi ứng dụng khác

**Cách sửa:**

```powershell
# Xem cổng nào đang dùng port 3000
netstat -ano | findstr :3000

# Hoặc đổi cổng trong docker-compose.yml
```

---

### ❌ Lỗi: Worker không xử lý bài thi

**Nguyên nhân:** Redis hoặc Celery chưa kết nối

**Cách sửa:**

```powershell
# Kiểm tra logs
docker compose logs worker

# Restart worker
docker compose restart worker
```

---

### ❌ Lỗi: `GEMINI_API_KEY` không hợp lệ

**Nguyên nhân:** API key chưa được cấu hình đúng

**Cách sửa:**

1. Lấy API key từ https://aistudio.google.com
2. Cập nhật trong `.env`
3. Restart API: `docker compose restart api`

---

### ❌ Lỗi: Database migration lỗi

**Nguyên nhân:** Database schema chưa được apply

**Cách sửa:**

```powershell
# Xóa database volume và tạo lại
docker compose down -v
docker compose up -d
```

> ⚠️ **Cảnh báo:** Cách này xóa toàn bộ dữ liệu!

---

### ❌ Lỗi: Student App không kết nối được server

**Nguyên nhân:** Server URL chưa đúng

**Cách sửa:**

1. Mở Student App
2. Vào **Cấu hình** → **Máy chủ**
3. Đổi URL thành `http://localhost:8000`
4. Lưu và thử lại

---

## 9. TÀI LIỆU BỔ SUNG

### Đọc tiếp theo thứ tự ưu tiên

| Ưu tiên | Tài liệu                                                                       | Mô tả                                          |
| --------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| ⭐⭐⭐    | [docs/user-guide.md](user-guide.md)                                               | Hướng dẫn sử dụng chi tiết theo 4 vai trò |
| ⭐⭐      | [docs/specifications/01-system-overview.md](specifications/01-system-overview.md) | Tổng quan kiến trúc                           |
| ⭐⭐      | [README.md](../README.md)                                                         | Hướng dẫn cấu hình AI nâng cao             |
| ⭐        | [docs/specifications/05-actor-student.md](specifications/05-actor-student.md)     | Luồng thi của sinh viên                       |
| ⭐        | [docs/architecture/knowledge-speech.md](architecture/knowledge-speech.md)         | Kiến trúc STT & AI                             |

### Cấu trúc thư mục

```
oralai/
├── apps/
│   ├── staff-portal/      # Web quản lý (Next.js)
│   └── student-app/       # Desktop app (Electron)
├── packages/
│   └── shared/            # Code chia sẻ
├── services/
│   └── api/               # Backend API (FastAPI)
├── docs/                  # Tài liệu
├── docker-compose.yml      # Cấu hình Docker
└── .env                   # Biến môi trường
```

---

## 🎉 HOÀN TẤT!

Nếu bạn đã đến đây, hệ thống đã chạy và bạn đã hiểu luồng làm việc cơ bản.

**Bước tiếp theo:**

- 📖 Đọc [docs/user-guide.md](user-guide.md) để nắm rõ từng tính năng
- 🧪 Thử tạo một môn học và câu hỏi mẫu
- 👥 Thêm tài khoản sinh viên và test luồng thi

**Cần hỗ trợ?**

- Xem [SYSTEM_FEEDBACK_AND_BUGS.md](../docs-local/SYSTEM_FEEDBACK_AND_BUGS.md) cho các lỗi đã biết
- Tạo issue mới nếu gặp lỗi chưa được ghi nhận
