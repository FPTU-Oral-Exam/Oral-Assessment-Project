# STT Model Update Plan - PTE Approach

**Date:** 30/09/2026  
**Status:** Planning  

---

## 1. Current State

### Desktop App (apps/desktop)
- **Model:** PhoWhisper-small
- **Language:** Vietnamese (default)
- **Issue:** Poor English accuracy

### Server (services/api)
- **Model:** faster-whisper (configurable)
- **Provider:** local_server, google, gemini

---

## 2. New Architecture (PTE Approach)

### 2.1 Student App (NEW - Electron)
- **NO STT LOCAL** - Zero-STT approach
- Audio upload directly to MinIO
- Server handles all STT processing

### 2.2 Central Server
- **STT Model:** Whisper-large-v3 (GỐC)
- **Priority:** Accuracy > Speed (batch processing)
- **Language:** English-only

### 2.3 Desktop (Legacy - Benchmark only)
- **STT Model:** Whisper-large-v3-turbo
- **Priority:** Speed (real-time preview)
- **Language:** English-only

---

## 3. Model Selection

### Central Server (Batch Processing)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHISPER LARGE-V3 (GỐC)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Accuracy:      98-99% WER                                            │
│  Speed:         1x realtime (acceptable for batch)                    │
│  Size:          3GB                                                     │
│  Memory:       ~6GB VRAM (GPU)                                        │
│  Language:      English-only                                            │
│                                                                             │
│  ✅ USE FOR: Server-side STT (batch processing)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Desktop (Legacy - Preview only)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHISPER LARGE-V3-TURBO                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Accuracy:      97% WER (slightly lower but acceptable)              │
│  Speed:         5x realtime (fast for real-time)                      │
│  Size:          800MB (compact)                                        │
│  Memory:       ~2GB RAM (CPU)                                         │
│  Language:      English-only                                            │
│                                                                             │
│  ✅ USE FOR: Desktop preview (if needed)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Tasks

### Task 1: Update Server STT Configuration
**File:** `services/api/app/runtime_settings.py`
```python
# Current
stt_model: str = Field(pattern=r"^(tiny|base|small|medium|large-v3|turbo)$")

# Keep as-is, admin can set to "large-v3" for maximum accuracy
```

### Task 2: Update Speech Provider
**File:** `services/api/app/speech.py`
```python
# whisper() function - already uses settings().stt_model
# Just need to set default to "large-v3" in config
```

### Task 3: Update Default Configuration
**File:** `services/api/app/config.py`
```python
# Add default STT model setting
STT_MODEL: Literal["tiny", "base", "small", "medium", "large-v3", "turbo"] = "large-v3"
```

### Task 4: Update Desktop Build Script (Legacy)
**File:** `scripts/build_desktop_stt.py`
```python
# Current: PhoWhisper-small
# Update to: Whisper-large-v3-turbo for English-only
MODEL_ID = "Systran/faster-whisper-large-v3-turbo"
```

### Task 5: Update Desktop Transcribe (Legacy)
**File:** `apps/desktop/transcribe.py`
```python
# Current: language=os.getenv("STT_LANGUAGE", "vi")
# Update to: language=os.getenv("STT_LANGUAGE", "en")
```

### Task 6: Update Backend API
**File:** `services/api/app/routes_exam.py`
```python
# Ensure submit-audio endpoint uses server-side STT
# Already implemented in dual-frontend architecture
```

---

## 5. Files to Update

| File | Change | Priority |
|------|--------|----------|
| `services/api/app/config.py` | Add STT model default | P1 |
| `services/api/app/speech.py` | Update whisper() defaults | P1 |
| `scripts/build_desktop_stt.py` | Update to whisper-large-v3-turbo | P2 |
| `apps/desktop/transcribe.py` | Change language to "en" | P2 |
| `apps/student-app/` | NEW - Zero-STT architecture | P1 |

---

## 6. New Student App Architecture

### apps/student-app/
```
apps/student-app/
├── src/
│   ├── components/     # AudioLevel, CameraPreview, RecordingControls
│   ├── pages/         # Login, ExamList, DeviceCheck, ExamRoom, Results
│   ├── hooks/        # useRecording, useChunkedUpload, useAuth
│   ├── lib/          # RNNoise WASM
│   └── electron/     # Electron main/preload
├── package.json
├── vite.config.ts
├── electron-builder.yml
└── tsconfig.json
```

**Key Features:**
- NO Python runtime
- NO STT/AI models
- Chunked upload to MinIO
- RNNoise WASM for noise suppression

---

## 7. Configuration for English-Only

### .env for Central Server
```bash
# STT Configuration
STT_PROVIDER=local_server
STT_MODEL=large-v3
STT_LANGUAGE=en

# AI Grading
GEMINI_API_KEY=your-key-here
LLM_MODEL=gemini-2.5-flash
```

### Exam Policy (per exam)
```json
{
  "provider": "local_server",
  "language": "en",
  "preprocessing": "rnnoise"
}
```

---

## 8. Testing Plan

### Server STT (Batch)
1. Upload audio test files (English speech)
2. Verify transcript accuracy >= 98%
3. Check batch processing time

### Desktop Preview (Legacy)
1. Run benchmark with Whisper-large-v3-turbo
2. Compare accuracy vs PhoWhisper
3. Verify English-only mode works

### Student App (New)
1. Test recording and upload flow
2. Verify chunked upload resilience
3. Test offline recovery

---

## 9. Migration Checklist

- [ ] Update server config to use large-v3
- [ ] Set default language to "en"
- [ ] Update desktop build script (legacy)
- [ ] Update desktop transcribe.py (legacy)
- [ ] Create new student-app with Zero-STT
- [ ] Test server-side STT accuracy
- [ ] Update documentation

---

## 10. Rollback Plan

If issues arise:
1. Revert `runtime_settings.py` to previous defaults
2. Change STT_MODEL back to "small"
3. Use PhoWhisper-small as fallback (English accuracy will be lower)

---

## Status

- [ ] Server config: PENDING
- [ ] Server speech.py: PENDING
- [ ] Desktop build: PENDING
- [ ] Desktop transcribe: PENDING
- [ ] Student-app: PLANNING
