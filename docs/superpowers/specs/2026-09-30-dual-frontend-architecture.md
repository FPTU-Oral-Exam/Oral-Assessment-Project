# Dual-Frontend Architecture Specification

**Project:** AI Oral Assessment Platform
**Date:** 2026-09-30
**Status:** Approved for Implementation
**Authors:** Development Team

---

## 1. Executive Summary

Tách hệ thống frontend hiện tại thành **2 phân hệ độc lập**:

| Phân hệ              | Công nghệ                    | Mục đích                                                                      | Deployment         |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------- | ------------------ |
| **Student App**  | React 18 + Vite + Electron 33  | Thi vấn đáp (Thin-Client ghi âm, RNNoise, proctoring & chunked upload MinIO) | Desktop app (.exe) |
| **Staff Portal** | Next.js 15 + RBAC (TypeScript) | Quản lý học liệu RAG, cấu hình Rubric, chấm bài & phúc khảo ca thi     | Web (cloud/server) |

**Nguyên tắc cốt lõi:**

- Mỗi phiên thi là một transaction online hoàn chỉnh: đăng nhập → thi → nộp → xem kết quả.
- **Zero-Trust Client & Chống gian lận (Anti-Tampering):** Desktop là "cảm biến bất biến" chỉ thu âm/quay hình raw. KHÔNG chạy PhoWhisper local, KHÔNG cho xem/sửa transcript, KHÔNG cho gõ phím.
- **Server là Source of Truth:** Quá trình phiên âm (PhoWhisper), truy vấn RAG pgvector và chấm điểm LLM Judge do Server Worker đảm nhiệm 100%. File audio MinIO là bằng chứng pháp lý tối cao.

---

## 2. Architecture Overview

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────────────────────┐      ┌──────────────────────────────┐    │
│    │   STUDENT APP (Electron)   │      │   STAFF PORTAL (Next.js)     │    │
│    │                            │      │                              │    │
│    │   - Login (Google/Pass)   │      │   - SYSTEM_ADMIN            │    │
│    │   - View assigned exams   │      │   - EXAMINER               │    │
│    │   - Device check          │      │   - TEACHER                 │    │
│    │                           │      │                              │    │
│    │   - Upload evidence       │      │   RBAC-gated routes         │    │
│    │   - View results          │      │                              │    │
│    └──────────────┬────────────┘      └──────────────┬───────────────┘    │
│                   │                                     │                   │
└───────────────────┼─────────────────────────────────────┼───────────────────┘
                    │                                     │
                    │ HTTPS (REST API + WebSocket)        │
                    │                                     │
                    ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REVERSE PROXY (Nginx)                              │
│                      /api/*  →  Backend API                                    │
└──────────────────────────────────┬────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│      FASTAPI BACKEND      │      │      MINIO STORAGE       │
│                          │      │                          │
│  - JWT Authentication    │      │  - Audio files           │
│  - RBAC Authorization    │      │  - Video files           │
│  - AI Services (Grading) │      │  - Documents             │
│  - PostgreSQL + pgvector │      │                          │
└──────────────────────────┘      └──────────────────────────┘
```

### 2.2 Repository Structure

```
AI-Oral-Assessment-Platform/
├── packages/
│   └── shared/                      # Shared workspace package (@oralai/shared)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/               # Shared TypeScript domain types
│           │   └── index.ts
│           ├── api-client/          # Shared ApiClient & ChunkedUploader (4MB, SHA-256)
│           │   └── index.ts
│           └── utils/               # Zod validation & utilities
│               └── index.ts
│
├── apps/
│   ├── student-app/                 # Student Desktop App (Thin-Client, Zero-STT local)
│   │   ├── src/
│   │   │   ├── components/         # UI components
│   │   │   ├── pages/             # Page components (Login, Exams, DeviceCheck, ExamRoom)
│   │   │   ├── hooks/             # React hooks (useAudioLevel, useMediaDevices)
│   │   │   ├── lib/               # RNNoise WASM audio worklet
│   │   │   ├── electron/          # Electron main/preload (kiosk, window management)
│   │   │   └── styles/           # CSS modules
│   │   ├── resources/              # Static assets (icon.ico, sounds) - ZERO AI model
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── electron-builder.yml
│   │   └── tsconfig.json
│   │
│   ├── staff-portal/                # Staff Web Portal (Next.js App Router, RBAC)
│   │   ├── app/
│   │   │   ├── (auth)/            # Auth routes
│   │   │   ├── (admin)/           # SYSTEM_ADMIN routes
│   │   │   ├── (examiner)/        # EXAMINER routes
│   │   │   ├── (teacher)/         # TEACHER routes
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── admin-web/                   # Legacy Admin Web (active until staff-portal verified)
│   └── desktop/                     # Legacy Electron app (active for benchmark, deprecate later)
│
├── services/                        # Backend Services & AI Workers
│   ├── api/                         # FastAPI Backend (REST API, JWT/Cookie Auth)
│   │   ├── app/
│   │   └── requirements.txt
│   └── worker/                      # Celery Worker (Server STT PhoWhisper + RAG + Grading)
│       └── ...
│
├── docs/                            # Specifications & Implementation Plans
│   └── superpowers/
│       ├── specs/
│       └── plans/
│
├── docs-local/                      # Living Project Memory & Local Notes (.git/info/exclude)
│   ├── README.md
│   ├── CURRENT_STATE.md
│   └── sessions/
│
├── package.json                     # Workspace root (npm workspaces: ["packages/*", "apps/*"])
└── package-lock.json
```

---

## 3. Student App Specification

### 3.1 Technology Stack

| Component       | Technology               | Version |
| --------------- | ------------------------ | ------- |
| UI Framework    | React                    | 18.2.0  |
| Build Tool      | Vite                     | 6.x     |
| Desktop Runtime | Electron                 | 33.x    |
| Packaging       | electron-builder         | 25.x    |
| STT Engine      | Server-side (PhoWhisper) | Worker  |
| Language        | TypeScript               | 5.x     |
| Styling         | CSS Modules / Tailwind   | -       |

> **Note:** Student App là Thin-Client - không đóng gói Python hay model AI. Chỉ ghi âm + upload.

### 3.1.1 State Machine Specification

#### ExamSession State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXAM SESSION STATE MACHINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │   (start)    │
  └──────┬───────┘
         │ POST /api/exam-sessions {exam_id}
         ▼
  ┌──────────────┐    device check OK     ┌──────────────┐
  │ DEVICE_CHECK │──────────────────────►│ IN_PROGRESS  │
  └──────┬───────┘                       └──────┬───────┘
         │ device check FAIL                     │
         │ (can retry)                          │ all questions answered
         ▼                                      │ + POST /api/exam-sessions/{id}/finish
  ┌──────────────┐                       ┌──────▼───────┐
  │  (blocked)   │                       │   SUBMITTED  │
  └──────────────┘                       └──────┬───────┘
                                                  │
                           ┌──────────────────────┼──────────────────────┐
                           │                      │                      │
                           ▼                      ▼                      ▼
                   ┌──────────────┐        ┌──────────────┐       ┌──────────────┐
                   │  COMPLETED   │        │REVIEW_REQUIRED│       │   COMPLETED   │
                   │  (passed)   │        │  (borderline) │       │  (practice)  │
                   └──────────────┘       └──────┬───────┘       └──────────────┘
                                                 │ teacher graded
                                                 ▼
                                          ┌──────────────┐
                                          │  COMPLETED   │
                                          └──────────────┘

  Terminal States: DEVICE_CHECK (timeout) | SUBMITTED | COMPLETED | REVIEW_REQUIRED
```

#### QuestionAttempt State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      QUESTION ATTEMPT STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │    READY     │◄─── ExamSession enters IN_PROGRESS
  └──────┬───────┘
         │ POST /api/question-attempts/{id}/start
         ▼
  ┌──────────────┐    user clicks Record    ┌──────────────┐
  │   WAITING    │─────────────────────────►│  RECORDING   │
  └──────┬───────┘                          └──────┬───────┘
         │ user skips                              │ user clicks Stop
         ▼                                         ▼
  ┌──────────────┐                        ┌──────────────┐
  │   SKIPPED    │                        │  UPLOADING   │
  └──────────────┘                        │ (MinIO Chunk)│
                                           └──────┬───────┘
                                                  │ upload complete
                                                  ▼
                                           ┌──────────────┐
                                           │  SUBMITTED   │
                                           └──────┬───────┘
                                                  │ server worker STT & grade
                                                  ▼
                                           ┌──────────────┐
                                           │    GRADED    │
                                           └──────────────┘

  Terminal States: SKIPPED | SUBMITTED | GRADED

#### State Transition Triggers

| From State      | To State        | Trigger             | API                                     |
| --------------- | --------------- | ------------------- | --------------------------------------- |
| (start)         | DEVICE_CHECK    | Create session      | POST /api/exam-sessions                 |
| DEVICE_CHECK    | IN_PROGRESS     | Device OK           | POST /api/exam-sessions/{id}/start      |
| IN_PROGRESS     | SUBMITTED       | All done            | POST /api/exam-sessions/{id}/finish     |
| SUBMITTED       | COMPLETED       | Auto grade OK       | Worker (Server STT + RAG + LLM)         |
| SUBMITTED       | REVIEW_REQUIRED | Confidence gate     | Worker                                  |
| REVIEW_REQUIRED | COMPLETED       | Teacher graded      | PUT /api/admin/grading/{id}             |
| READY           | RECORDING       | User records        | (client-side)                           |
| RECORDING       | UPLOADING       | Stop recording      | (client-side MediaRecorder)             |
| UPLOADING       | SUBMITTED       | Chunk upload done   | POST /api/question-attempts/{id}/submit |

### 3.2 Core Features

| Feature      | Priority | Description                                           |
| ------------ | -------- | ----------------------------------------------------- |
| Login        | P0       | Google OAuth + MSSV/Password (JWT in memory)          |
| Exam List    | P0       | View assigned exams with status                       |
| Device Check | P0       | Camera + Microphone verification & audio level meter  |
| Recording    | P0       | Audio/Video recording raw during exam                 |
| Noise Filter | P0       | RNNoise WASM audio worklet (realtime noise suppression)|
| Upload       | P0       | Chunked upload 4MB with SHA-256 to MinIO              |
| Results      | P1       | View graded results (after server AI/teacher grading) |
| Settings     | P2       | Audio gain, device selector                           |

### 3.3 User Flow
```

┌──────────────────────────────────────────────────────────────────────────────┐
│                           STUDENT APP FLOW                                     │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │  OPEN APP   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────┐
    │     LOGIN       │
    │  ┌───────────┐  │
    │  │ Google    │  │────► Redirect to Google OAuth
    │  │  OAuth   │  │     Verify @student.school.edu.vn
    │  └───────────┘  │
    │  ┌───────────┐  │
    │  │ MSSV +    │  │────► POST /api/auth/login
    │  │ Password  │  │     Return JWT token
    │  └───────────┘  │
    └──────┬──────┘
           │ (No token cached after app close)
           ▼
    ┌─────────────────┐
    │   EXAM LIST     │◄─── GET /api/exams/available
    │                 │     JWT token in header
    │  ┌───────────┐  │
    │  │ Exam A    │──┼──► Device Check → Start Exam
    │  │ Status:P  │  │     (PUBLISHED)
    │  └───────────┘  │
    │  ┌───────────┐  │
    │  │ Exam B    │  │
    │  │ Status:D  │  │     (DRAFT - not visible)
    │  └───────────┘  │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────┐
    │  DEVICE CHECK   │
    │                 │
    │  □ Camera OK    │
    │  □ Mic OK       │
    │  □ Noise check  │
    │                 │
    │ [Start Exam]───►│ (Proceed if all checks pass)
    └──────┬──────┘
           │
           ▼
    ┌─────────────────┐
    │   EXAM ROOM     │
    │                 │
    │  ┌───────────┐  │
    │  │ Question  │  │
    │  │ 1 of N    │  │
    │  └───────────┘  │
    │                 │
    │  [Record]──────►│ ─── Start MediaRecorder (RNNoise WASM)
    │                 │       ↓
    │  [Stop]────────►│ ─── Stop recording
    │                 │       ↓
    │                 │   Chunked Upload to MinIO (4MB chunks)
    │                 │       ↓
    │  [Submit]──────►│ ─── POST /api/question-attempts/:id/submit
    │                 │     (Zero-tampering: NO local STT/transcript)
    │                 │       ↓
    │  Next Question ─┤
    │  └───────────┘  │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────┐
    │   EXAM DONE     │
    │                 │
    │  Submitted N/N   │
    │  Questions       │
    │                 │
    │ [View Results]──►│ ─── GET /api/sessions/:id
    │                 │     (After grading complete)
    └─────────────────┘

    ┌─────────────┐
    │  CLOSE APP  │ ─── Token cleared from memory
    └─────────────┘     (No persistence)

```

### 3.4 Page Specifications

#### 3.4.1 Login Page (`/login`)

**URL:** N/A (Desktop app, no URL routing)

**Components:**

- Logo + App name
- Google OAuth button
- OR divider
- MSSV input field
- Password input field
- Login button

**API:**

```typescript
// Google OAuth
GET /api/auth/google/callback?code=xxx
Response: { user: User; token: string }

// Password Login
POST /api/auth/login
Body: { username: string; password: string }
Response: {
  user: User;
  token: string;          // For Student App (JWT in memory)
  // Backend also sets: HttpOnly Cookie for Staff Portal
}
```

**Behavior:**

- Token stored in memory only (not localStorage)
- Redirect to Exam List on success
- Show error on failure

#### 3.4.1.1 Authentication Flow

**Student App (JWT in memory):**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STUDENT APP AUTH FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐      POST /api/auth/login                   ┌─────────┐
    │  LOGIN UI   │ ────────────────────────────────────────►  │         │
    │             │      { username, password }               │  BACKEND│
    │             │ ◄────────────────────────────────────────  │         │
    └──────┬──────┘      { user, token, expires_at }          └────┬────┘
           │                                                      │
           │  Store in memory:                                     │
           │  window.__authToken = token                          │
           │  window.__user = user                                │
           │                                                      │
           ▼                                                      ▼
    ┌─────────────┐      Authorization: Bearer <token>        ┌─────────┐
    │  API CALLS  │ ────────────────────────────────────────►  │  API    │
    │             │      (token in header, not cookie)         │  ROUTES  │
    └─────────────┘                                             └─────────┘

    ┌─────────────┐      On token expiry (401):                  ┌─────────┐
    │  AUTO LOGOUT│ ◄────────────────────────────────────────  │  BACKEND│
    └─────────────┘      { error: "TOKEN_EXPIRED" }             └─────────┘
```

**Staff Portal (HTTP-only cookie):**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STAFF PORTAL AUTH FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐      POST /api/auth/login                   ┌─────────┐
    │  LOGIN UI   │ ────────────────────────────────────────►  │         │
    │             │      { username, password }               │  BACKEND│
    │             │ ◄────────────────────────────────────────  │         │
    └──────┬──────┘      Set-Cookie: auth_token=xxx;         └────┬────┘
           │           HttpOnly; Secure; SameSite=Strict           │
           │                                                      │
           ▼                                                      ▼
    ┌─────────────┐      Requests automatically include:         ┌─────────┐
    │  API CALLS  │      Cookie: auth_token=xxx                │  API    │
    │             │ ────────────────────────────────────────►  │  ROUTES  │
    └─────────────┘                                             └─────────┘

    Session refresh: Backend tracks last_activity, auto-extends
```

**Unified Auth Response:**

```typescript
// Both apps receive the same response structure
interface AuthResponse {
  user: User;
  token: string;           // JWT for Student App
  expires_at: number;      // Unix timestamp
  refresh_token?: string;   // Optional, for staff portal
  roles: UserRole[];       // ['STUDENT'] or ['TEACHER', 'EXAMINER']
}

// Backend sets cookie for staff portal
Set-Cookie: auth_token=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
```

**Token Specifications:**

| App          | Storage          | Expiry  | Refresh                   |
| ------------ | ---------------- | ------- | ------------------------- |
| Student App  | Memory only      | 1 hour  | Not stored - force logout |
| Staff Portal | HTTP-only cookie | 8 hours | Automatic via session     |

#### 3.4.2 Exam List Page (`/exams`)

**Components:**

- Header with user name + logout button
- Course filter dropdown
- Exam cards grid
- Practice exam badge
- Attempt history toggle

**API:**

```typescript
GET /api/exams/available
Headers: Authorization: Bearer <token>
Response: StudentExam[]
```

**Exam Card States:**

| Status          | UI                              |
| --------------- | ------------------------------- |
| `PUBLISHED`   | Green badge, "Start" button     |
| `IN_PROGRESS` | Yellow badge, "Continue" button |
| `SUBMITTED`   | Blue badge, "View" button       |
| `COMPLETED`   | Green badge, shows score        |

#### 3.4.3 Exam Room Page (`/exam/:sessionId`)

**Sections:**

1. **Header:** Exam name, Timer, Question progress (X/N)
2. **Main Area:**
   - Question text & media attachments (if any)
   - Real-time audio visualizer (speech indicator)
   - Recording controls (Start / Stop & Next)
   - Upload progress bar (4MB chunk status)
   - *Anti-tamper policy:* Zero local transcript, zero manual text edit. Audio is uploaded directly to MinIO.
3. **Sidebar:**
   - Camera preview (proctoring)
   - Mic level meter (RNNoise status)
   - Device selectors
   - Question navigation list

**Recording & Upload Flow:**

```typescript
async function startRecording() {
  // 1. Request media permissions with RNNoise WASM audio worklet
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  // 2. Start MediaRecorder (audio + video)
  const audioRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  const videoRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

  // 3. Record chunks
  audioRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  videoRecorder.ondataavailable = (e) => videoChunks.push(e.data);

  // 4. Start both recorders
  audioRecorder.start(1000);
  videoRecorder.start(1000);
}

async function stopAndUpload(attemptId: string) {
  // 1. Stop recorders
  audioRecorder.stop();
  videoRecorder.stop();

  // 2. Combine chunks into blobs & create File
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const audioFile = new File([audioBlob], `attempt-${attemptId}.webm`, { type: 'audio/webm' });

  // 3. Chunked upload to MinIO via @oralai/shared (4MB chunks + SHA-256)
  await chunkedUploader.upload(audioFile, {
    attemptId,
    kind: 'AUDIO',
    mimeType: 'audio/webm',
    onProgress: (p) => setUploadProgress(p.percentage),
  });

  // 4. Submit attempt signal (Server Worker handles PhoWhisper STT & AI Grading)
  await apiClient.post(`/api/question-attempts/${attemptId}/submit`);
}
```

#### 3.4.4 Results Page (`/results/:sessionId`)

**Components:**

- Score display (X/10)
- Per-question breakdown
- Playback controls for audio/video
- Grading feedback from AI/teacher

### 3.5 STT Integration (Server-Side)

**Student App la Thin-Client:** Khong co Python runtime, khong co model AI. Chi ghi am + upload len MinIO.

**AI Pipeline tren Server Worker:**

```
+-----------------------------------------------------------------------------+
|                      SERVER-SIDE STT & GRADING PIPELINE                       |
+-----------------------------------------------------------------------------+

  +-------------+
  |   MinIO     |<- Student uploads audio/video
  |  (Storage)  |
  +-----+------+
        |
        | Worker picks up
        v
  +-------------+
  | PhoWhisper  |---> Audio -> Transcript
  |   Server    |
  +-----+------+
        |
        v
  +-------------+
  |     RAG     |---> Retrieve relevant chunks
  +-----+------+
        |
        v
  +-------------+
  |   Gemini    |---> LLM Grading
  |  2.5 Flash |
  +-----+------+
        |
        v
  +-------------+
  |Confidence   |---> Gate check
  |   Gate      |
  +-----+------+
        |
   +----+----+
   |         |
   v         v
COMPLETED  REVIEW_REQUIRED
            (manual)
```

**Chien luc Cuu ho 3 Tang:**

```
+-----------------------------------------------------------------------------+
|                         FAILOVER STRATEGY                                     |
+-----------------------------------------------------------------------------+

  Tang 1: STT Thanh cong
  ------------------------
  MinIO Audio -> PhoWhisper Server -> Transcript -> Grade -> COMPLETED

  Tang 2: STT That bai (Server error)
  ------------------------------------
  Worker gap loi -> Attempt vao hang doi REVIEW_REQUIRED
  -> Giang vien mo Staff Portal -> Nghe file goc -> Cham thu cong

  Tang 3: Upload That bai
  -------------------------
  Client retry voi resume -> Neu khong duoc -> Thong bao sinh vien
  -> Session tam khoa -> Can bo khao thi xu ly
```

**Client-side (Student App):** Chi record + upload. Khong STT, khong transcript.

```typescript
// Student App - Recording Flow (NO STT on client)
async function submitAnswer(attemptId: string, recordedBlob: Blob) {
  // 1. Upload audio/video len MinIO
  const uploadResult = await chunkedUploader.upload(recordedBlob);

  // 2. Gui submit signal (khong co transcript - server tu xu ly STT)
  await fetch(`/api/question-attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': generateUUID(),
    },
  });

  // 3. Cho server xu ly STT + grading (async)
}
```

**Server-side (Backend Worker):** Xu ly STT sau khi nhan upload.

```python
# Backend Worker - STT Pipeline
async def process_upload(upload_key: str):
    # 1. Lay file tu MinIO
    audio_data = await minio.get_object(upload_key)

    # 2. PhoWhisper transcription
    transcript = await phowhisper.transcribe(audio_data)

    # 3. RAG retrieval
    chunks = await rag.retrieve(exam_id, transcript)

    # 4. LLM Grading
    assessment = await gemini.grade(
        question=attempt.question,
        transcript=transcript,
        chunks=chunks,
        rubric=exam.rubric,
    )

    # 5. Confidence Gate
    if assessment.confidence < 0.85 or is_borderline(assessment.score):
        attempt.status = 'REVIEW_REQUIRED'
    else:
        attempt.status = 'GRADED'
```

### 3.6 Build & Distribution

**Installer Size:** ~60-80MB (khong co Python/Model)

```yaml
electron-builder.yml:

appId: com.oralai.student
productName: OralAI Student
copyright: Copyright 2024

directories:
  output: dist-electron
  buildResources: resources

files:
  - dist/**/*
  # KHONG co resources/stt/ nua

win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icon.ico
  artifactName: "${productName}-${version}-Setup.${ext}"

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: true

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  icon: resources/icon.icns

linux:
  target:
    - target: AppImage
      arch: [x64]
  icon: resources/icon.png

publish:
  provider: github
  owner: your-org
  repo: AI-Oral-Assessment-Platform
```

**Distribution Flow:**

```bash
# 1. Developer pushes code
git push

# 2. CI builds and creates release
npm run build && npm run electron:build

# 3. Create GitHub Release
gh release create v1.0.0 \
  --title "OralAI Student v1.0.0" \
  --notes "First stable release"

# 4. Upload installer
gh release upload v1.0.0 dist-electron/*.exe

# 5. Admin shares download link with students
# https://github.com/org/repo/releases/download/v1.0.0/OralAI-Student-1.0.0-Setup.exe
```

---

## 4. Staff Portal Specification

### 4.1 Technology Stack

| Component | Technology               | Version           |
| --------- | ------------------------ | ----------------- |
| Framework | Next.js                  | 15.x (App Router) |
| Language  | TypeScript               | 5.x               |
| Styling   | Tailwind CSS             | 4.x               |
| State     | React hooks / Zustand    | -                 |
| Auth      | NextAuth.js / Custom JWT | -                 |

> **Note:** Next.js 15 yêu cầu Node.js 18.17+. Dùng `nvm` để quản lý Node versions.

### 4.2 RBAC Model

**Roles:**

| Role                 | Code             | Permissions                                                      |
| -------------------- | ---------------- | ---------------------------------------------------------------- |
| System Administrator | `SYSTEM_ADMIN` | Full system access, user management, system config               |
| Examiner             | `EXAMINER`     | Exam management, student enrollment, scheduling, result approval |
| Teacher              | `TEACHER`      | Course management, RAG upload, rubric creation, grading          |

**Role Relationships:**

- One user can have multiple roles
- Higher privilege role takes precedence
- If user is both EXAMINER and TEACHER, they see combined menu

### 4.3 Route Structure

```
staff-portal/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── logout/
│       └── page.tsx
│
├── (shared)/                  # Routes visible to all authenticated users
│   └── dashboard/
│       └── page.tsx
│
├── (admin)/                  # SYSTEM_ADMIN only
│   ├── users/
│   │   ├── page.tsx         # User list
│   │   └── [id]/page.tsx    # User detail
│   ├── settings/
│   │   ├── page.tsx         # System settings
│   │   ├── ai/page.tsx      # AI provider config
│   │   ├── stt/page.tsx     # STT config
│   │   └── oauth/page.tsx   # OAuth config
│   └── audit/
│       └── page.tsx         # Audit logs
│
├── (examiner)/               # EXAMINER only
│   ├── exams/
│   │   ├── page.tsx         # Exam list
│   │   ├── [id]/page.tsx    # Exam detail
│   │   └── new/page.tsx     # Create exam
│   ├── schedule/
│   │   ├── page.tsx         # Schedule list
│   │   └── new/page.tsx     # Create schedule
│   ├── students/
│   │   ├── page.tsx         # Enrollment management
│   │   └── import/page.tsx  # Bulk import
│   └── results/
│       ├── page.tsx         # Results overview
│       └── [id]/page.tsx    # Session result
│
├── (teacher)/                # TEACHER only
│   ├── courses/
│   │   ├── page.tsx         # Course list
│   │   └── [id]/
│   │       ├── page.tsx     # Course detail
│   │       ├── knowledge/page.tsx    # RAG documents
│   │       ├── outcomes/page.tsx     # Learning outcomes
│   │       ├── topics/page.tsx        # Topics
│   │       ├── rubrics/page.tsx       # Rubrics
│   │       └── exams/page.tsx         # Course exams
│   ├── rubrics/
│   │   ├── page.tsx         # Rubric list
│   │   └── [id]/page.tsx    # Rubric detail
│   └── grading/
│       ├── page.tsx         # Pending grading list
│       └── [attemptId]/page.tsx  # Grade single attempt
│
├── layout.tsx                # Root layout (sidebar, header)
├── not-found.tsx
└── error.tsx
```

### 4.4 RBAC Implementation

**Middleware:**

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rolePermissions: Record<string, RegExp[]> = {
  SYSTEM_ADMIN: [
    /^\/admin\/.*/,
    /^\/users\/.*/,
    /^\/settings\/.*/,
  ],
  EXAMINER: [
    /^\/exams\/.*/,
    /^\/schedule\/.*/,
    /^\/students\/.*/,
    /^\/results\/.*/,
  ],
  TEACHER: [
    /^\/courses\/.*/,
    /^\/rubrics\/.*/,
    /^\/grading\/.*/,
  ],
};

export function middleware(request: NextRequest) {
  // Get user from cookie/header (set by API route)
  const userCookie = request.cookies.get('user');
  if (!userCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const user = JSON.parse(decodeURIComponent(userCookie.value));
  const path = request.nextUrl.pathname;

  // Check if path matches user's roles
  const hasAccess = user.roles.some((role: string) => {
    const patterns = rolePermissions[role] || [];
    return patterns.some(pattern => pattern.test(path));
  });

  if (!hasAccess) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
```

**Component-level guards:**

```typescript
// components/RoleGuard.tsx
'use client';

import { useUser } from '@/hooks/useUser';

export function RoleGuard({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user } = useUser();

  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

// Usage
<RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
  <SystemSettingsPanel />
</RoleGuard>
```

### 4.5 Dynamic Sidebar

```typescript
// components/Sidebar.tsx
const menuItems: Record<string, MenuItem[]> = {
  SYSTEM_ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Người dùng', icon: Users },
    { href: '/settings', label: 'Cấu hình', icon: Settings },
    { href: '/audit', label: 'Nhật ký', icon: FileText },
  ],
  EXAMINER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/exams', label: 'Kỳ thi', icon: ClipboardList },
    { href: '/schedule', label: 'Lịch thi', icon: Calendar },
    { href: '/students', label: 'Sinh viên', icon: GraduationCap },
    { href: '/results', label: 'Kết quả', icon: CheckCircle },
  ],
  TEACHER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/courses', label: 'Môn học', icon: BookOpen },
    { href: '/rubrics', label: 'Rubric', icon: FileText },
    { href: '/grading', label: 'Chấm bài', icon: Star },
  ],
};

export function Sidebar() {
  const { user } = useUser();

  // Merge menus if user has multiple roles
  const items = user.roles.flatMap(role => menuItems[role] || []);
  const uniqueItems = deduplicateByHref(items);

  return (
    <nav>
      {uniqueItems.map(item => (
        <NavLink key={item.href} href={item.href}>
          <item.icon />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

---

## 5. Shared Package Specification

### 5.1 Package Structure

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── types/
    │   ├── index.ts
    │   ├── user.ts
    │   ├── exam.ts
    │   ├── course.ts
    │   └── assessment.ts
    │
    ├── api-client/
    │   ├── index.ts
    │   ├── client.ts
    │   ├── endpoints.ts
    │   └── errors.ts
    │
    └── utils/
        ├── index.ts
        ├── format.ts
        └── validation.ts
```

### 5.2 Shared Types

```typescript
// packages/shared/src/types/index.ts

// ===== User Types =====
export type UserRole = 'STUDENT' | 'TEACHER' | 'EXAMINER' | 'SYSTEM_ADMIN';

export interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: UserRole;
  created_at: number;
}

export interface Student extends User {
  role: 'STUDENT';
  student_id?: string;
}

// ===== Exam Types =====
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type SessionStatus =
  | 'DEVICE_CHECK'
  | 'IN_PROGRESS'
  | 'UPLOADING'
  | 'SUBMITTED'
  | 'REVIEW_REQUIRED'
  | 'COMPLETED';
export type AttemptStatus =
  | 'READY'
  | 'RECORDING'
  | 'PROCESSING'
  | 'SUBMITTED'
  | 'GRADED';

export interface Exam {
  id: string;
  name: string;
  course_id: string;
  course_name?: string;
  status: ExamStatus;
  time_limit: number;      // seconds
  question_count: number;
  rubric_id?: string;
  max_attempts?: number;
  practice?: boolean;
}

export interface StudentExam extends Exam {
  session_id?: string;
  status: SessionStatus;
  attempt_count: number;
  remaining_attempts?: number;
  can_start_new: boolean;
  history?: ExamSessionSummary[];
}

export interface ExamSession {
  id: string;
  exam_id: string;
  exam_name: string;
  user_id: string;
  status: SessionStatus;
  started_at?: number;
  time_limit: number;
  server_time: number;
  question_count: number;
  answered_count: number;
  current_attempt?: QuestionAttempt;
  attempt_number?: number;
  final_score?: number;
  grading_message?: string;
  practice: boolean;
}

export interface QuestionAttempt {
  id: string;
  sequence: number;
  text: string;
  status: AttemptStatus;
  transcript?: string;
  stt_confidence?: number;
}

// ===== Course Types =====
export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: number;
}

export interface LearningOutcome {
  id: string;
  code: string;
  description: string;
  weight: number;
  course_id: string;
}

export interface Topic {
  id: string;
  name: string;
  course_id: string;
  outcome_ids: string[];
}

// ===== Rubric Types =====
export interface Rubric {
  id: string;
  name: string;
  version: number;
  course_id: string;
  criteria: Criterion[];
}

export interface Criterion {
  name: string;
  description: string;
  max_score: number;
  weight: number;
}

// ===== Assessment Types =====
export interface Assessment {
  id: string;
  attempt_id: string;
  score: number | null;
  confidence: number | null;
  reasoning_summary: string;
  criteria: CriterionScore[];
  error?: string;
  error_code?: string;
  retrieved_chunks?: Chunk[];
}

export interface CriterionScore {
  name: string;
  score: number | null;
  comment: string;
}

export interface Chunk {
  id: string;
  content: string;
  page?: number;
  source_document_id: string;
}

// ===== Evidence Types =====
export interface Evidence {
  id: string;
  attempt_id: string;
  kind: 'AUDIO' | 'VIDEO';
  url: string;
  size: number;
  created_at: number;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
```

### 5.3 API Client

```typescript
// packages/shared/src/api-client/client.ts
export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',  // Include cookies for Staff Portal
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new ApiError(response.status, error.detail || 'Request failed');
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, {
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, {
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### 5.4 ChunkedUploader

```typescript
// packages/shared/src/api-client/chunked-uploader.ts

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
}

export interface UploadOptions {
  attemptId: string;
  kind: 'AUDIO' | 'VIDEO';
  mimeType: string;
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number) => void;
}

export class ChunkedUploader {
  private readonly CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
  private readonly baseUrl: string;
  private token?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  async upload(file: File, options: UploadOptions): Promise<{ id: string }> {
    const { attemptId, kind, mimeType, onProgress, onChunkComplete } = options;

    // Step 1: Initialize upload
    const initResponse = await fetch(`${this.baseUrl}/api/uploads/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      },
      body: JSON.stringify({
        attempt_id: attemptId,
        kind,
        size: file.size,
        sha256: await this.computeFileHash(file),
        mime_type: mimeType,
      }),
      credentials: 'include',
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initialize upload');
    }

    const { id: uploadId, chunk_size } = await initResponse.json();
    const chunkSize = chunk_size || this.CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Step 2: Upload chunks
    let uploadedBytes = 0;
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      // Compute chunk hash
      const chunkHash = await this.computeChunkHash(chunk);

      // Upload chunk
      const chunkResponse = await fetch(
        `${this.baseUrl}/api/uploads/${uploadId}/chunks/${i}`,
        {
          method: 'PUT',
          headers: {
            'X-Chunk-Sha256': chunkHash,
            ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
          },
          body: chunk,
          credentials: 'include',
        }
      );

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${i}`);
      }

      uploadedBytes += chunk.size;

      // Report progress
      if (onProgress) {
        onProgress({
          loaded: uploadedBytes,
          total: file.size,
          percentage: Math.round((uploadedBytes / file.size) * 100),
          currentChunk: i + 1,
          totalChunks,
        });
      }

      if (onChunkComplete) {
        onChunkComplete(i);
      }
    }

    // Step 3: Complete upload
    const completeResponse = await fetch(
      `${this.baseUrl}/api/uploads/${uploadId}/complete`,
      {
        method: 'POST',
        headers: {
          ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        },
        credentials: 'include',
      }
    );

    if (!completeResponse.ok) {
      throw new Error('Failed to complete upload');
    }

    return { id: uploadId };
  }

  async resume(uploadId: string, file: File, options: UploadOptions): Promise<{ id: string }> {
    // Get upload status
    const statusResponse = await fetch(
      `${this.baseUrl}/api/uploads/${uploadId}/status`,
      {
        headers: {
          ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        },
        credentials: 'include',
      }
    );

    if (!statusResponse.ok) {
      throw new Error('Failed to get upload status');
    }

    const { received_chunks, total_chunks } = await statusResponse.json();
    const chunkSize = this.CHUNK_SIZE;

    // Upload missing chunks
    for (let i = 0; i < total_chunks; i++) {
      if (received_chunks.includes(i)) continue;

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const chunkHash = await this.computeChunkHash(chunk);

      await fetch(`${this.baseUrl}/api/uploads/${uploadId}/chunks/${i}`, {
        method: 'PUT',
        headers: {
          'X-Chunk-Sha256': chunkHash,
          ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        },
        body: chunk,
        credentials: 'include',
      });

      if (options.onChunkComplete) {
        options.onChunkComplete(i);
      }
    }

    // Complete
    await fetch(`${this.baseUrl}/api/uploads/${uploadId}/complete`, {
      method: 'POST',
      headers: {
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      },
      credentials: 'include',
    });

    return { id: uploadId };
  }

  private async computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async computeChunkHash(chunk: Blob): Promise<string> {
    const buffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

---

## 6. Backend API Specification

### 6.1 CORS Configuration

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [
    "http://localhost:3000",           # Staff Portal (dev)
    "http://localhost:5173",           # Student App (dev)
    "https://portal.oralai.edu.vn",   # Staff Portal (prod)
    # Add production origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6.2 Student-Specific Endpoints

| Method | Endpoint                              | Description                            |
| ------ | ------------------------------------- | -------------------------------------- |
| GET    | `/api/exams/available`              | Get assigned exams for current student |
| GET    | `/api/exam-sessions/{id}`           | Get exam session details               |
| POST   | `/api/exam-sessions`                | Start new exam session                 |
| POST   | `/api/exam-sessions/{id}/start`     | Start exam (device check done)         |
| POST   | `/api/exam-sessions/{id}/finish`    | Submit all answers                     |
| GET    | `/api/student/results`              | Get student's all results              |
| GET    | `/api/student/results/{session_id}` | Get specific result                    |

### 6.3 Staff-Specific Endpoints

| Method | Endpoint                              | Role      | Description        |
| ------ | ------------------------------------- | --------- | ------------------ |
| GET    | `/api/admin/users`                  | ADMIN     | List all users     |
| POST   | `/api/admin/users`                  | ADMIN     | Create user        |
| PUT    | `/api/admin/users/{id}/role`        | ADMIN     | Update user role   |
| GET    | `/api/admin/courses`                | TEACHER+  | List courses       |
| POST   | `/api/admin/courses`                | TEACHER+  | Create course      |
| GET    | `/api/admin/courses/{id}/workspace` | TEACHER+  | Course workspace   |
| POST   | `/api/admin/exams`                  | EXAMINER+ | Create exam        |
| POST   | `/api/admin/exams/{id}/publish`     | EXAMINER+ | Publish exam       |
| POST   | `/api/admin/exams/{id}/assign`      | EXAMINER+ | Assign to students |
| GET    | `/api/admin/results`                | EXAMINER+ | List all results   |
| PUT    | `/api/admin/results/{id}/finalize`  | EXAMINER  | Finalize score     |
| POST   | `/api/admin/grading/{attempt_id}`   | TEACHER+  | Submit grading     |

---

## 7. Complete API Specification

### 6.1 Student Endpoints (Student App)

#### 6.1.1 Authentication

```typescript
// POST /api/auth/login
// Login with MSSV + Password
Request:
{
  "username": "SE170001",
  "password": "secure_password"
}

Response (200 OK):
{
  "user": {
    "id": "usr_uuid",
    "username": "SE170001",
    "name": "Nguyễn Văn A",
    "role": "STUDENT"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

// POST /api/auth/google/callback
// Google OAuth callback
Response (200 OK):
{
  "user": {
    "id": "usr_uuid",
    "username": "student@gmail.com",
    "name": "Nguyễn Văn A",
    "role": "STUDENT"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 6.1.2 Exam Operations

```typescript
// GET /api/exams/available
// Get list of assigned exams
Headers: Authorization: Bearer <token>
Query: ?course_id=uuid (optional)

Response (200 OK):
[
  {
    "id": "exam_uuid",
    "name": "Thi vấn đáp Kiến trúc Phần mềm",
    "course_name": "Software Architecture",
    "course_id": "course_uuid",
    "time_limit": 900,
    "question_count": 3,
    "max_attempts": 1,
    "status": "PUBLISHED",
    "can_start_new": true,
    "session_id": null,
    "practice": false
  },
  {
    "id": "exam_uuid_2",
    "name": "Luyện tập Microservices",
    "course_name": "Software Architecture",
    "time_limit": 1800,
    "question_count": 5,
    "status": "PUBLISHED",
    "can_start_new": true,
    "session_id": "session_uuid",  // existing session
    "attempt_count": 1,
    "history": [
      {
        "session_id": "session_uuid",
        "score": 7.5,
        "completed_at": 1727769600
      }
    ]
  }
]

// POST /api/exam-sessions
// Create or resume exam session
Headers: Authorization: Bearer <token>
Request:
{
  "exam_id": "exam_uuid"
}

Response (200 OK):
{
  "id": "session_uuid",
  "exam_id": "exam_uuid",
  "exam_name": "Thi vấn đáp Kiến trúc Phần mềm",
  "status": "DEVICE_CHECK",
  "time_limit": 900,
  "server_time": 1727769600.0,
  "question_count": 3,
  "answered_count": 0,
  "practice": false,
  "current_attempt": null
}

// POST /api/exam-sessions/{id}/start
// Start exam after device check passes
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "id": "session_uuid",
  "status": "IN_PROGRESS",
  "current_attempt": {
    "id": "attempt_uuid",
    "sequence": 1,
    "text": "Hãy trình bày về kiến trúc Microservices...",
    "status": "READY"
  }
}

// POST /api/exam-sessions/{id}/finish
// Submit all answers and finish exam
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "id": "session_uuid",
  "status": "SUBMITTED",
  "answered_count": 3,
  "submitted_at": 1727770500
}
```

#### 6.1.3 Question Attempt Operations

```typescript
// POST /api/question-attempts/{id}/start
// Start recording for a question
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "id": "attempt_uuid",
  "status": "RECORDING",
  "started_at": 1727769650.0
}

// POST /api/question-attempts/{id}/submit
// Submit answer signal (STT done server-side)
// Idempotent: same Idempotency-Key returns same result
Headers: Authorization: Bearer <token>
      Idempotency-Key: <uuid>  // Required for idempotency
Request: (empty body or optional)
{
  "duration_seconds": 45  // optional: recording duration
}

Response (200 OK):
{
  "id": "attempt_uuid",
  "status": "SUBMITTED",
  "sequence": 1,
  "submitted_at": 1727769800
  // transcript will be added by worker later
}

// GET /api/question-attempts/{id}
// Get attempt details
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "id": "attempt_uuid",
  "sequence": 1,
  "text": "Hãy trình bày về kiến trúc Microservices...",
  "status": "SUBMITTED",
  "transcript": "Kiến trúc Microservices...",
  "stt_confidence": 0.92,
  "submitted_at": 1727769800
}
```

#### 6.1.4 Chunked Upload (MinIO)

```typescript
// POST /api/uploads/init
// Initialize chunked upload
// Backend tự tính total_chunks dựa trên size / chunk_bytes
Headers: Authorization: Bearer <token>
Request:
{
  "attempt_id": "attempt_uuid",
  "kind": "VIDEO",           // "AUDIO" | "VIDEO"
  "size": 15728640,          // bytes
  "sha256": "abc123...",      // file hash for integrity
  "mime_type": "video/webm"
}

Response (200 OK):
{
  "id": "upload_uuid",         // Backend trả về "id", không phải "upload_id"
  "chunk_size": 4194304,     // 4MB
  "expires_at": 1727856000   // 24h later
}

// PUT /api/uploads/{id}/chunks/{chunk_index}
// Upload single chunk (0-indexed)
// Body: raw binary blob
// Header: X-Chunk-Sha256: sha256_of_chunk
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "chunk_index": 0,
  "uploaded": true,
  "uploaded_bytes": 4194304
}

// POST /api/uploads/{id}/complete
// Finalize upload - server concatenates and verifies
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "status": "COMPLETED"
}

// GET /api/uploads/{id}/status
// Check upload status (for resume)
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "id": "upload_uuid",
  "status": "PENDING",      // PENDING | COMPLETED | FAILED
  "received_chunks": [0, 1],  // Backend trả về "received_chunks"
  "total_chunks": 4
}
```

#### 6.1.5 Results

```typescript
// GET /api/student/results
// Get all my results
Headers: Authorization: Bearer <token>

Response (200 OK):
[
  {
    "session_id": "session_uuid",
    "exam_id": "exam_uuid",
    "exam_name": "Thi vấn đáp Kiến trúc Phần mềm",
    "status": "COMPLETED",
    "score": 8.0,
    "completed_at": 1727856000,
    "attempts": [
      {
        "sequence": 1,
        "question_score": 8.0,
        "transcript": "..."
      }
    ]
  }
]

// GET /api/student/results/{session_id}
// Get specific result details
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "session_id": "session_uuid",
  "exam_name": "Thi vấn đáp Kiến trúc Phần mềm",
  "status": "COMPLETED",
  "score": 8.0,
  "completed_at": 1727856000,
  "grading_message": "Bài làm tốt, nắm vững kiến thức...",
  "attempts": [
    {
      "sequence": 1,
      "question": "Hãy trình bày về kiến trúc Microservices...",
      "transcript": "Kiến trúc Microservices...",
      "status": "GRADED",
      "question_score": 8.0,
      "assessment": {
        "score": 8.0,
        "reasoning_summary": "Trả lời đúng trọng tâm, có ví dụ minh họa",
        "criteria": [
          { "name": "Độ chính xác", "score": 8.0, "comment": "Tốt" },
          { "name": "Độ sâu", "score": 8.0, "comment": "Khá sâu" }
        ]
      },
      "audio_url": "/api/uploads/{upload_id}/file"
    }
  ]
}
```

### 6.2 Error Response Format

```typescript
// All error responses follow FastAPI standard format
interface ErrorResponse {
  detail: {
    code: string;           // e.g., "AUTH_TOKEN_EXPIRED"
    message: string;        // e.g., "Token has expired"
    details?: Record<string, unknown>;  // Optional additional info
  }
}

// Common Error Codes
const ErrorCodes = {
  AUTH_TOKEN_EXPIRED: 'Phien dang nhap het han',
  AUTH_TOKEN_INVALID: 'Token khong hop le',
  AUTH_FORBIDDEN: 'Khong co quyen truy cap',
  EXAM_NOT_FOUND: 'De thi khong ton tai',
  EXAM_SESSION_EXISTS: 'Phien thi da ton tai',
  EXAM_SESSION_EXPIRED: 'Phien thi da het han',
  ATTEMPT_NOT_FOUND: 'Cau hoi khong ton tai',
  UPLOAD_NOT_FOUND: 'File khong ton tai',
  UPLOAD_CHUNK_MISSING: 'Chunk upload bi thieu',
  RATE_LIMITED: 'Qua nhieu yeu cau, thu lai sau',
};
```

### 6.3 Grading Flow & Confidence Gate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GRADING WORKER FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐
  │  SUBMITTED  │◄─── Student submits answer
  │  (attempt)  │
  └──────┬──────┘
         │ Worker picks up
         ▼
  ┌─────────────┐
  │  RAG Query  │───► pgvector: Top-K chunks from exam.snapshot
  └──────┬──────┘
         │ Chunks + Transcript + Rubric
         ▼
  ┌─────────────┐
  │   Gemini    │───► LLM Grading with context
  │   2.5 Flash │
  └──────┬──────┘
         │ Assessment result
         ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                        CONFIDENCE GATE CHECK                               │
  ├───────────────────────────────────────────────────────────────────────────┤
  │  REVIEW_REQUIRED = true if ANY of:                                         │
  │    1. AI confidence < 0.85                                                │
  │    2. STT confidence < 0.85                                               │
  │    3. |score - 5.0| <= 0.25 (borderline pass/fail)                        │
  │    4. practice = true (always manual review)                              │
  └───────────────────────────────────────────────────────────────────────────┘
         │
         ├─► [GATE PASS] ──► ExamSession: COMPLETED
         │                    (auto-calculate final_score)
         │
         └─► [GATE FAIL] ──► ExamSession: REVIEW_REQUIRED
                              (teacher must review)

  Teacher grading: PUT /api/admin/grading/{attempt_id}
  After grading: ExamSession recalculates final_score
```

### 5.4 Rate Limiting

| Endpoint                                | Limit | Window     |
| --------------------------------------- | ----- | ---------- |
| POST /api/auth/login                    | 10    | per minute |
| POST /api/exam-sessions                 | 5     | per minute |
| POST /api/question-attempts/{id}/submit | 10    | per minute |
| POST /api/uploads/init                  | 20    | per minute |
| PUT /api/uploads/*/chunks/*           | 60    | per minute |

---

## 8. Error Handling Specification

### 7.1 Error Categories

| Category          | Description                    | User-facing Message                      | Recovery Action                |
| ----------------- | ------------------------------ | ---------------------------------------- | ------------------------------ |
| `AUTH_ERROR`    | Token expired, invalid         | "Phiên đăng nhập hết hạn"          | Redirect to login              |
| `NETWORK_ERROR` | No internet, timeout           | "Mất kết nối mạng"                   | Retry with exponential backoff |
| `UPLOAD_ERROR`  | Upload failed, chunk timeout   | "Lỗi khi tải bài làm lên máy chủ" | ChunkedUploader auto-resumes   |
| `DEVICE_ERROR`  | Camera/mic not found or denied | "Thiết bị không khả dụng"           | Show device check settings     |
| `SERVER_ERROR`  | 5xx API backend errors         | "Lỗi hệ thống, thử lại sau"         | Retry with backoff             |

> **Nguyên tắc chống gian lận (Anti-tampering & Server Failover):**
> Student App KHÔNG xử lý STT và KHÔNG có trạng thái gõ phím thủ công (Manual Input). Nếu âm thanh thu được trên Server không thể nhận dạng hoặc độ tin cậy thấp (`confidence < 0.85`), bài thi được hệ thống tự động đánh dấu `REVIEW_REQUIRED`. Giảng viên sẽ trực tiếp nghe lại file audio gốc từ MinIO trên Staff Portal để chấm điểm thủ công.

### 7.2 Student App Error Handling

```typescript
// Error Handler Service (Thin-Client Anti-Tamper)
class ExamErrorHandler {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async handleError(error: AppError, context: ExamContext): Promise<ErrorAction> {
    console.error('Error occurred:', error.code, error.message);

    switch (error.code) {
      case 'TOKEN_EXPIRED':
        return this.handleAuthError(error, context);

      case 'NETWORK_OFFLINE':
      case 'NETWORK_TIMEOUT':
        return this.handleNetworkError(error, context);

      case 'UPLOAD_INTERRUPTED':
      case 'UPLOAD_CHUNK_FAILED':
        return this.handleUploadError(error, context);

      case 'DEVICE_NOT_FOUND':
      case 'DEVICE_PERMISSION_DENIED':
        return this.handleDeviceError(error, context);

      default:
        return this.handleGenericError(error, context);
    }
  }

  private async handleNetworkError(error: AppError, context: ExamContext): Promise<ErrorAction> {
    // 1. Check if we have unsaved recording
    if (context.hasUnsavedRecording) {
      // 2. Keep raw chunks in memory / temporary safe buffer
      await this.saveToLocalBackup(context);
    }

    // 3. Show offline banner
    return {
      type: 'SHOW_OFFLINE_BANNER',
      message: 'Mất kết nối mạng. Bản ghi âm đang được giữ an toàn trên bộ nhớ đệm.',
      retryable: true,
    };
  }

  private async handleUploadError(error: AppError, context: ExamContext): Promise<ErrorAction> {
    // Resume chunked upload via ChunkedUploader
    const uploadedBytes = error.metadata?.uploadedBytes || 0;
    const totalBytes = error.metadata?.totalBytes || 0;

    if (uploadedBytes > 0 && uploadedBytes < totalBytes) {
      return {
        type: 'RETRY_UPLOAD',
        message: 'Đang tiếp tục tải lên các phân mảnh còn lại...',
        retryable: true,
        resumeFrom: uploadedBytes,
      };
    }

    return {
      type: 'RETRY_UPLOAD',
      message: 'Tải bài làm thất bại. Đang tự động thử lại...',
      retryable: true,
    };
  }

  private async handleDeviceError(error: AppError, context: ExamContext): Promise<ErrorAction> {
    return {
      type: 'SHOW_DEVICE_MODAL',
      message: 'Vui lòng kiểm tra quyền truy cập Camera/Microphone.',
      retryable: true,
    };
  }

  private calculateBackoff(attempt: number): number {
    return Math.min(this.baseDelay * Math.pow(2, attempt), 30000);
  }
}
```

### 7.3 Upload Resume Mechanism

```typescript
// Chunked upload with resume capability
interface UploadState {
  attemptId: string;
  fileId: string;
  totalBytes: number;
  uploadedBytes: number;
  chunkSize: number;
  chunks: Map<number, boolean>; // chunkIndex -> uploaded
}

class ResumableUploader {
  private state: UploadState;
  private readonly MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  async uploadChunk(blob: Blob, chunkIndex: number): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', blob);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('attemptId', this.state.attemptId);
    formData.append('fileId', this.state.fileId);

    await fetch('/api/uploads/chunk', {
      method: 'POST',
      body: formData,
    });

    this.state.chunks.set(chunkIndex, true);
    this.state.uploadedBytes += blob.size;

    // Save state to localStorage for resume
    this.persistState();
  }

  async resume(): Promise<void> {
    const uploadedChunks = await this.getUploadedChunks(this.state.fileId);

    for (let i = 0; i < this.state.chunks.size; i++) {
      if (!uploadedChunks.includes(i)) {
        // Re-upload missing chunk
        await this.uploadMissingChunk(i);
      }
    }
  }

  private persistState(): void {
    localStorage.setItem(`upload_${this.state.fileId}`, JSON.stringify({
      ...this.state,
      chunks: Array.from(this.state.chunks.entries()),
    }));
  }
}
```

### 7.4 Exam Session Recovery

```typescript
// Auto-save and recovery
class ExamSessionRecovery {
  private autoSaveInterval = 30000; // 30 seconds
  private backupKey = 'exam_backup';

  startAutoSave(session: ExamSession): void {
    setInterval(() => {
      this.saveBackup(session);
    }, this.autoSaveInterval);
  }

  private saveBackup(session: ExamSession): void {
    const backup = {
      sessionId: session.id,
      currentQuestion: session.currentQuestionIndex,
      answers: session.answers,
      savedAt: Date.now(),
    };
    localStorage.setItem(this.backupKey, JSON.stringify(backup));
  }

  async tryRecover(sessionId: string): Promise<ExamSession | null> {
    const backup = localStorage.getItem(this.backupKey);
    if (!backup) return null;

    const parsed = JSON.parse(backup);
    if (parsed.sessionId !== sessionId) return null;

    // Check if backup is recent (within 1 hour)
    if (Date.now() - parsed.savedAt > 3600000) {
      localStorage.removeItem(this.backupKey);
      return null;
    }

    // Show recovery dialog
    const shouldRecover = window.confirm(
      `Tìm thấy phiên làm bài chưa lưu từ ${new Date(parsed.savedAt).toLocaleTimeString()}. Bạn có muốn khôi phục không?`
    );

    if (shouldRecover) {
      localStorage.removeItem(this.backupKey);
      return await this.fetchSessionFromServer(sessionId);
    }

    return null;
  }
}
```

### 6.5 Staff Portal Error Handling

```typescript
// Next.js Error Boundary
'use client';

import { useRouter } from 'next/navigation';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  const isAuthError = error.message.includes('TOKEN');
  const isServerError = error.message.includes('500');

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          {isAuthError ? 'Phiên hết hạn' : 'Đã xảy ra lỗi'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isAuthError
            ? 'Vui lòng đăng nhập lại'
            : 'Vui lòng thử lại sau'}
        </p>
        <button
          onClick={() => isAuthError ? router.push('/login') : reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {isAuthError ? 'Đăng nhập lại' : 'Thử lại'}
        </button>
      </div>
    </div>
  );
}
```

---

## 9. Deployment Strategy

### 7.1 Environment Matrix

| Environment | Staff Portal              | Student App        | Backend API                   |
| ----------- | ------------------------- | ------------------ | ----------------------------- |
| Development | `localhost:3000`        | `localhost:5173` | `localhost:8000`            |
| Staging     | `staging.oralai.edu.vn` | Download link      | `api-staging.oralai.edu.vn` |
| Production  | `portal.oralai.edu.vn`  | Download link      | `api.oralai.edu.vn`         |

### 7.2 Staff Portal Deployment (Vercel)

```bash
# Connect repo to Vercel
vercel --prod

# Or via GitHub integration
# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://api.oralai.edu.vn
```

### 7.3 Student App Distribution

```bash
# Build command
npm run build && npm run electron:build

# Output
# dist-electron/
# ├── OralAI-Student-1.0.0-Setup.exe
# └── OralAI-Student-1.0.0.dmg

# Upload to GitHub Releases
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"
gh release upload v1.0.0 dist-electron/*.exe

# Alternative: Upload to S3
aws s3 cp dist-electron/*.exe s3://oralai-releases/student-app/
```

### 7.4 Update Notification Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │────▶│   GitHub    │────▶│   Student   │
│  releases   │     │  Releases   │     │  downloads  │
│   new .exe  │     │   stores    │     │   new .exe  │
└─────────────┘     └─────────────┘     └─────────────┘
                                                  │
                            ┌─────────────────────┘
                            │
                     Share link via:
                     - Email
                     - Staff Portal
                     - USB/Network drive
```

---

## 10. Migration Plan

### Phase 0: Backend Updates (Before Frontend Work) - Week 0

#### 0.1 RBAC Role Migration

```python
# backend/app/models/user.py
# BEFORE:
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"
    REVIEWER = "REVIEWER"

# AFTER:
class UserRole(str, Enum):
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    EXAMINER = "EXAMINER"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

# Data migration SQL:
# UPDATE users SET role = 'SYSTEM_ADMIN' WHERE role = 'ADMIN';
# UPDATE users SET role = 'EXAMINER' WHERE role = 'REVIEWER';
```

#### 0.2 Auth Response Update

```python
# backend/app/routers/auth.py
@router.post("/login")
async def login(request: LoginRequest, response: Response):
    # ... authenticate user ...

    # Set HTTP-only cookie for Staff Portal
    response.set_cookie(
        key="auth_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=8 * 3600,  # 8 hours
    )

    # Return token in JSON body for Student App
    return {
        "user": user_data,
        "token": access_token,  # <-- ADD THIS LINE
        "expires_at": expires_at,
    }
```

#### 0.3 New Student Results Endpoint

```python
# backend/app/routers/exam.py
@router.get("/student/results", response_model=List[StudentResult])
async def get_student_results(current_user: User = Depends(get_current_user)):
    """Get all results for current student - NEW ENDPOINT"""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(403, "Only students can access this endpoint")

    sessions = await get_completed_sessions_for_student(current_user.id)
    return sessions
```

#### 0.4 Sync Upload API Contracts

```python
# backend/app/routers/exam.py - Update response models
class UploadInitResponse(BaseModel):
    id: str  # Changed from upload_id
    chunk_size: int
    expires_at: int

class UploadStatusResponse(BaseModel):
    id: str
    status: str  # PENDING | COMPLETED | FAILED
    received_chunks: List[int]  # Changed from uploaded_chunks
    total_chunks: int
```

#### 0.5 Config Files to Update

```bash
# Update BEFORE renaming admin-web -> staff-portal
# Files that reference "admin-web":
# - docker-compose.yml
# - Jenkinsfile
# - playwright.config.ts
# - .github/workflows/*.yml
# - any npm scripts referencing admin-web

# Example docker-compose.yml change:
# BEFORE: - ./apps/admin-web:/app
# AFTER:  - ./apps/staff-portal:/app
```

---

### Phase 0: Backend & RBAC Migration (Week 0) — ✅ [COMPLETED & VERIFIED]

1. Chuẩn hóa 4 roles: `SYSTEM_ADMIN`, `EXAMINER`, `TEACHER`, `STUDENT`
2. Dual auth (JWT Bearer Token cho Desktop + Cookie cho Staff Web)
3. Endpoints `/api/student/results` và cấu hình CORS dev
4. Database migration thành công, integration tests pass 100%

### Phase 1: Extract Shared Package (Week 1) — ✅ [COMPLETED & VERIFIED]

1. Create `packages/shared` (`@oralai/shared`) monorepo workspace
2. Extract TypeScript domain types matching Pydantic backend
3. Create `ApiClient` and `ChunkedUploader` (4MB chunk, SHA-256 integrity checksum)
4. Add Zod schemas validation
5. Integrate into `admin-web`, unit tests pass 100% (Vitest)

### Phase 2: Create Student App (Week 2-3) — 🚀 [CURRENT MISSION]

1. Setup Vite + React 18.2 + Electron 33 project (Thin-Client)
2. Install shared package (`@oralai/shared`)
3. Implement Login page (MSSV/Password, JWT stored in memory only)
4. Implement Exam List & Device Check (Camera, Mic level meter with RNNoise WASM)
5. Implement Exam Room: Audio/Video recording raw + Chunked Upload MinIO (NO Python, NO local STT, NO manual typing)
6. Build and test packaging (`electron-builder`)

### Phase 3: Refactor Staff Portal (Week 4)

1. **Update config files FIRST:** docker-compose.yml, Jenkinsfile, playwright.config.ts
2. Rename `admin-web` -> `staff-portal`
3. Install shared package
4. Implement RBAC middleware
5. Organize routes by role
6. Update sidebar dynamically
7. Deploy and test

### Phase 4: Deprecate Legacy (Week 5+)

1. Keep `desktop` app running for comparison
2. Migrate remaining features
3. Document migration steps
4. Deprecate and archive

---

## 11. Testing Strategy

### 9.1 Student App Tests

```typescript
// tests/e2e/student-app.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Student App', () => {
  test('login with MSSV and password', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Mã sinh viên').fill('B1234567');
    await page.getByLabel('Mật khẩu').fill('password123');
    await page.click('button:has-text("Đăng nhập")');
    await expect(page).toHaveURL('/exams');
  });

  test('complete exam flow', async ({ page }) => {
    // Login
    // Select exam
    // Device check
    // Answer questions
    // Submit
    // Verify results
  });

  test('logout clears session', async ({ page }) => {
    // Login
    // Logout
    // Reload app
    // Should require login
  });
});
```

### 9.2 Staff Portal Tests

```typescript
// tests/e2e/staff-portal.spec.ts
test.describe('RBAC', () => {
  test('admin sees all menu items', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.locator('text=Người dùng')).toBeVisible();
    await expect(page.locator('text=Cấu hình')).toBeVisible();
  });

  test('teacher cannot access admin routes', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/unauthorized');
  });
});
```

---

## 12. Security Considerations

### 10.1 Student App Security

| Concern          | Mitigation                                         | Priority |
| ---------------- | -------------------------------------------------- | -------- |
| Token theft      | JWT short expiry (1 hour), no refresh token stored | P0       |
| Exam cheating    | Camera + audio recording, device fingerprinting    | P0       |
| Replay attacks   | Idempotency keys on submissions                    | P1       |
| Man-in-middle    | Certificate pinning (future)                       | P2       |
| Screen recording | Disable screen capture during exam (Electron flag) | P1       |
| DevTools         | Disable DevTools in production build               | P1       |
| Memory dump      | Obfuscate token in memory, clear on logout         | P1       |

**Student App Security Implementation:**

```typescript
// main.ts - Electron main process
import { session } from 'electron';

// Disable screen capture
session.setPermissionRequestHandler((webContents, permission, callback) => {
  if (permission === 'media') {
    callback(true); // Allow for exam recording
  } else if (permission === 'desktopCapture') {
    callback(false); // Block screen sharing
  }
});

// Disable DevTools in production
if (!isDev) {
  webContents.on('devtools-opened', () => {
    webContents.closeDevTools();
  });
}

// Set Content Security Policy
session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "media-src 'self' blob:; " +
        "connect-src 'self' https://api.oralai.edu.vn;"
      ],
    },
  });
});
```

### 10.2 Staff Portal Security

| Concern           | Mitigation                                        | Priority |
| ----------------- | ------------------------------------------------- | -------- |
| RBAC bypass       | Server-side permission checks, not just UI hiding | P0       |
| Session hijacking | Secure HTTP-only cookies, session rotation        | P0       |
| CSRF              | CSRF tokens on state-changing requests            | P1       |
| XSS               | Content Security Policy, sanitized inputs         | P0       |
| SQL Injection     | ORM with parameterized queries                    | P0       |
| Rate limiting     | Per-user rate limits on sensitive endpoints       | P1       |
| Audit logging     | Log all admin actions with user, IP, timestamp    | P1       |

**Staff Portal Security Implementation:**

```typescript
// middleware.ts - Enhanced RBAC
export function middleware(request: NextRequest) {
  const user = await getUserFromCookie(request);

  // Server-side permission check (not just UI hiding)
  const requiredPermission = getRequiredPermission(request.nextUrl.pathname);
  if (!userHasPermission(user, requiredPermission)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// API Route - Server-side permission check
export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  // Double-check permission on server (UI hiding is not enough)
  if (!userHasPermission(user, 'exam:create')) {
    throw new UnauthorizedError('Không có quyền tạo đề thi');
  }

  // Proceed with creation
}
```

### 10.3 Shared Security Guidelines

| Guideline                    | Implementation                                         |
| ---------------------------- | ------------------------------------------------------ |
| **Input Validation**   | Zod schemas on both client and server                  |
| **Output Encoding**    | React auto-escapes, use DOMPurify for HTML             |
| **Secrets Management** | Environment variables, never commit secrets            |
| **Logging**            | Log security events (login, logout, permission denied) |
| **HTTPS Only**         | Enforce in production via HSTS                         |

```typescript
// shared/src/utils/validation.ts
import { z } from 'zod';

export const CreateExamSchema = z.object({
  name: z.string().min(1).max(200),
  course_id: z.string().uuid(),
  time_limit: z.number().min(300).max(7200), // 5min - 2hr
  question_count: z.number().min(1).max(100),
  max_attempts: z.number().min(1).max(10).optional(),
  practice: z.boolean().optional(),
});

// Use in both apps
type CreateExamInput = z.infer<typeof CreateExamSchema>;
```

---

## 13. Glossary

| Term       | Definition                                                         |
| ---------- | ------------------------------------------------------------------ |
| RBAC       | Role-Based Access Control                                          |
| STT        | Speech-to-Text                                                     |
| PhoWhisper | Server-side STT engine chạy trên Celery Worker (Whisper variant) |
| RNNoise    | WASM AudioWorklet lọc tạp âm real-time trên Client Desktop     |
| RAG        | Retrieval-Augmented Generation                                     |
| LO         | Learning Outcome                                                   |
| VLAN       | Virtual Local Area Network                                         |
| CID        | Course ID                                                          |
| E2E        | End-to-End (testing)                                               |

---

## 14. Appendix

### A. Existing Components to Migrate

| Source                               | Destination                         | Notes                        |
| ------------------------------------ | ----------------------------------- | ---------------------------- |
| `admin-web/components/student.tsx` | `student-app/pages/ExamRoom.tsx`  | Major rewrite for standalone |
| `admin-web/components/shared.tsx`  | `packages/shared/`                | Extract shared components    |
| `admin-web/components/api.ts`      | `packages/shared/src/api-client/` | Already partially done       |
| `desktop/transcribe.py`            | **REMOVED**                   | STT now server-side (Worker) |
| `admin-web/lib/noise-filter.ts`    | `student-app/lib/`                | Keep for audio processing    |
| `admin-web/lib/microphone-gain.ts` | `student-app/hooks/`              | Keep as-is                   |

### B. New Dependencies

```json
{
  "student-app": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "zustand": "^4.x",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  },
  "packages/shared": {
    "typescript": "^5.0.0"
  }
}
```

### C. Milestones

| Milestone | Description                                                          | Target | Status           |
| --------- | -------------------------------------------------------------------- | ------ | ---------------- |
| M0        | Backend: role migration + auth + /api/student/results                | Week 0 | ✅ DONE          |
| M1        | Shared package created (`@oralai/shared`, types, ChunkedUploader)  | Week 1 | ✅ DONE          |
| M2        | Student app login + exam list + device check (RNNoise)               | Week 2 | 🚀 WIP (Phase 2) |
| M3        | Student app exam flow + chunked upload MinIO (Zero-STT local)        | Week 3 | ⏳ PENDING       |
| M4        | Student app packaged (`.exe`) + tested                             | Week 4 | ⏳ PENDING       |
| M5        | Staff portal RBAC implemented (`SYSTEM_ADMIN`, `EXAMINER`, etc.) | Week 4 | ⏳ PENDING       |
| M6        | Full integration testing (Dual-Frontend E2E)                         | Week 5 | ⏳ PENDING       |
| M7        | Production deployment                                                | Week 6 | ⏳ PENDING       |
