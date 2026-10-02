# STT Benchmark Report - Whisper-large-v3-turbo

**Date:** 30/09/2026  
**Model:** `deepdml/faster-whisper-large-v3-turbo-ct2` (CTranslate2 INT8)  
**Device:** NVIDIA RTX 4060 Laptop GPU 8GB  

---

## 1. Overview

| Metric | Value |
|--------|-------|
| Load Time | 4.84s |
| Transcribe Speed | 2.65s for 15s audio (5.6x realtime) |
| GPU Memory | ~2GB |
| Multi-language | ✅ English, Vietnamese, Code-switching |

---

## 2. Test Results

### 2.1 English (Pure) - Score: 8/10 ✅

| You said | Whisper heard | Assessment |
|----------|---------------|------------|
| "RESTful API" | "RESTful API" | ✅ Correct |
| "Microservices" | "Microservices" | ✅ Correct |
| "I use Docker for containerization" | "I use Docker for containerization" | ✅ Correct |
| "CI/CD pipeline" | "CICD filet line" | ⚠️ Close |
| "O(n log n)" | "O N" | ❌ Missing log |

### 2.2 Vietnamese - Score: 3/10 ❌

| You said | Whisper heard | Assessment |
|----------|---------------|------------|
| "Tôi đang học" | "Cô đang học" | ❌ Wrong |
| "Con trỏ" | "Con trọng" | ❌ 1 letter |
| "Thuật toán" | "Tập toán" | ❌ |

### 2.3 Code-switching (VN-EN) - Score: 5/10 ⚠️

| You said | Whisper heard | Assessment |
|----------|---------------|------------|
| "implement abstraction" | "implement attraction" | ⚠️ 1 letter |
| "class Rectangle" | "toát" | ❌ Wrong |
| "calculateArea" | "cắt full layer ở rear" | ❌ Meaningless |

---

## 3. Summary Score

| Test | Score | Notes |
|------|-------|-------|
| English (Pure) | 8/10 | Good |
| Vietnamese | 3/10 | Weak |
| Code-switching | 5/10 | Moderate |
| Technical terms | 7/10 | Good for EN |

**Average: 5.7/10 (57%)**

---

## 4. Recommendations

### For English-only exams: ✅ USE Whisper-large-v3-turbo

### For Vietnamese or mixed: ⚠️ Consider PhoWhisper or hybrid approach

### For Server-side (batch processing): ✅ Use Whisper-large-v3 (non-turbo) for maximum accuracy
