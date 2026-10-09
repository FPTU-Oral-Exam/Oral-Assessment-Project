# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG ĐÁNH GIÁ THI VẤN ĐÁP AI (MASTER PLAN)
> **Dự án:** OralAI — Nền tảng Thi Vấn đáp Tự động Bằng AI  
> **Phiên bản:** 1.0 (Zero-Budget Capstone Edition)  
> **Chi phí vận hành:** **0 VNĐ** (100% Open-Source & tài nguyên cục bộ: Faster-Whisper, Python `jiwer`, PostgreSQL `pgvector`, Ollama / Gemini Free tier)  
> **Mục tiêu:** Hoàn thiện bộ engine đánh giá toàn diện kỹ năng Nói tiếng Anh & Chuyên ngành (Fluency, Pronunciation, Grammar/Vocabulary, Socratic Reasoning) trong 4 tuần.

---

## 📑 MỤC LỤC
1. [Tổng quan Kiến trúc & Nguyên tắc cốt lõi](#1-tổng-quan-kiến-trúc--nguyên-tắc-cốt-lõi)
2. [Cấu trúc Ma trận Đề thi 5 Phần](#2-cấu-trúc-ma-trận-đề-thi-5-phần)
3. [Đặc tả Kỹ thuật Các Engine Chấm điểm](#3-đặc-tả-kỹ-thuật-các-engine-chấm-điểm)
4. [Lộ trình 6 Giai đoạn Triển khai Chi tiết](#4-lộ-trình-6-giai-đoạn-triển-khai-chi-tiết)
5. [Phân công Công việc (WBS) & Timeline 4 Tuần](#5-phân-công-công-việc-wbs--timeline-4-tuần)
6. [Tiêu chí Nghiệm thu & Checklist Kiểm thử](#6-tiêu-chí-nghiệm-thu--checklist-kiểm-thử)

---

## 1. TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC CỐT LÕI

### 1.1. Kiến trúc Hybrid Scoring (Tách bạch 2 tầng)
Thay vì đẩy toàn bộ bài nói cho LLM đoán mò gây tốn kém và hallucination, hệ thống áp dụng kiến trúc **2 Tầng Hybrid**:

```
                              [ AUDIO PHÁT NGÔN CỦA SINH VIÊN ]
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
         [ TẦNG 1: THUẬT TOÁN ÂM HỌC ]                  [ TẦNG 2: BẢN GỠ BĂNG STT ]
         • Faster-Whisper + Silero VAD                  • Faster-Whisper INT8
         • Đo Tốc độ nói: Words / Second                • Word Timestamps + avg_logprob
         • Đo Khoảng dừng chết: Pauses >= 0.25s                        │
         • Bắt từ đệm: uh, um, ah                                      ▼
                       │                                [ ENGINE CHẤM NỘI DUNG ]
                       │                                • Part 2: Python `jiwer` WER
                       │                                • Part 3-5: LLM (Ollama/Gemini Free)
                       │                                  kết hợp RAG pgvector & Anchor Prompts
                       └───────────────────────┬───────────────────────┘
                                               ▼
                           [ BẢNG ĐIỂM CHI TIẾT & RADAR CHART ]
                           (Lưu DB -> Hiển thị trên Staff Portal)
```

### 1.2. Ba Nguyên tắc Không thỏa hiệp
1. **0 VNĐ Ngân sách:** Tuyệt đối không dùng API Speech-to-Text trả phí theo phút (Google STT / Azure Speech). Chạy Faster-Whisper trực tiếp trên máy chủ / Celery Worker.
2. **Khách quan & Có thể giải thích (Explainable AI):** Điểm số phát âm và độ trôi chảy phải có số liệu toán học minh chứng cụ thể (ví dụ: `2.1 wps`, `3 pauses`, `WER = 6%`), không cho điểm cảm tính.
3. **Chống gian lận học thuộc & AI mớm lời:** Kết hợp bài toán **AI-Critique** (vạch lỗi code/thiết kế do AI sinh) và **Socratic Viva Voce** (vấn đáp phản biện đa lượt đào sâu).

---

## 2. CẤU TRÚC MA TRẬN ĐỀ THI 5 PHẦN

Ma trận đề thi chuẩn Linguaskill được tinh chỉnh cho sinh viên chuyên ngành Công nghệ thông tin:

| Phần thi | Tên phần | Thời gian chuẩn bị | Thời gian nói | Cơ chế chấm điểm | Trọng số |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **Part 1** | **Interview** (Khởi động & Phản xạ nhanh) | 10 giây | 15–20 giây | Đo độ trễ phản xạ phản hồi + Độ trôi chảy (Fluency) | **20%** |
| **Part 2** | **Read Aloud** (Đọc câu văn / Thuật ngữ CNTT) | 15 giây | 30 giây | Thuật toán Levenshtein Word Error Rate (`jiwer`) + Logprob | **20%** |
| **Part 3** | **Structured Presentation** (Thuyết trình ngắn 1 phút) | 30 giây | 60 giây | Fluency metrics + LLM chấm Bố cục (Intro - Body - Conclusion) | **20%** |
| **Part 4** | **AI-Critique / System Design** (Phản biện giải pháp AI) | 30 giây | 60 giây | Local RAG `pgvector` + LLM chấm độ chính xác phát hiện lỗi sai ngầm | **20%** |
| **Part 5** | **Socratic Viva Voce** (Vấn đáp phản biện 2 lượt) | 15 giây / lượt | 30s / lượt | **Lượt 1:** Sinh viên trình bày giải pháp.<br>**Lượt 2:** LLM sinh câu hỏi đào sâu $\rightarrow$ Thí sinh phản biện. | **20%** |

---

## 3. ĐẶC TẢ KỸ THUẬT CÁC ENGINE CHẤM ĐIỂM

### 3.1. Fluency Engine (`services/api/app/fluency.py`)
- **Tốc độ nói (Speech Rate / Articulation Rate):**
  $$\text{Speech Rate} = \frac{\text{Tổng số từ (Word Count)}}{\text{Thời gian phát ngôn thực tế (Duration in seconds)}}$$
  - **Ngưỡng chuẩn (PDP/SHAP ETS Standard):**
    - $2.0 - 2.4$ từ/giây: Chuẩn lưu loát tự nhiên $\rightarrow$ **10/10 điểm tốc độ**.
    - $1.7 - 2.0$ hoặc $2.4 - 2.8$ từ/giây: Khá $\rightarrow$ **8.5/10 điểm**.
    - $< 1.35$ từ/giây: Phạt nói chậm, ngắc ngứ nặng.
    - $> 2.8$ từ/giây: Khóa trần bão hòa (chống đọc vẹt bắn liên thanh).
- **Khoảng dừng chết (Breakdown Fluency):**
  - Tận dụng Silero VAD trong Faster-Whisper quét khoảng lặng $\ge 0.25$ giây.
  - Tỷ lệ dừng chuẩn: $\text{Pause Ratio} = \frac{\text{Số lần dừng}}{\text{Tổng số từ}} \le 0.27$.
- **Từ đệm (Hesitations / Filled Pauses):**
  - Regex đếm tần suất các từ: `\b(uh|um|er|ah|like|you know)\b`.

### 3.2. Pronunciation WER Engine (`services/api/app/pronunciation_wer.py`)
- Dành riêng cho **Part 2 (Read Aloud)**:
  - Thư viện: `jiwer>=3.0.0`.
  - Chuẩn hóa: Lowercase, Remove punctuation, Remove excess whitespace.
  - Công thức WER có cận trên: $\text{WER} = \min(1.0, \frac{S + D + I}{N})$.
  - Quy đổi điểm: $\text{Score} = (1.0 - \text{WER}) \times 10.0$.
  - Kết hợp độ tự tin âm học của Whisper (`avg_logprob`):
    $$\text{Final Pronunciation Score} = 0.7 \times \text{Score}_{\text{WER}} + 0.3 \times \text{Score}_{\text{Logprob}}$$

### 3.3. Content & Socratic Engine (`services/api/app/ai.py`)
- **Prompt Anchoring:** Cung cấp 3 bài mẫu cố định (High - Medium - Low) trong System Prompt để LLM bám sát chuẩn điểm CEFR B1-B2.
- **Evidence Injection:** Đưa thẳng các chỉ số toán học (`speech_rate`, `pause_ratio`, `wer`) vào User Prompt để LLM sinh nhận xét thuyết phục.
- **Socratic Generation:** Prompt chuyên biệt sinh câu hỏi phản biện ngắn gọn ($\le 25$ từ) xoay quanh trade-off hoặc giả định kỹ thuật của sinh viên.

---

## 4. LỘ TRÌNH 6 GIAI ĐOẠN TRIỂN KHAI CHI TIẾT

### 📍 GIAI ĐOẠN 1: Chuẩn hóa Database Schema & Item Bank
- **Mục tiêu:** Lưu trữ đề thi 5 phần và cấu trúc điểm chi tiết.
- **Files cần tác động:**
  - `services/api/app/models.py`
  - `services/api/alembic/versions/` (Tạo migration `0008_speaking_5parts_schema.py`)
- **Nhiệm vụ:**
  1. Thêm enum `QuestionPartType` (`INTERVIEW`, `READ_ALOUD`, `PRESENTATION`, `AI_CRITIQUE`, `SOCRATIC_VIVA`).
  2. Bổ sung trường `part_number`, `reference_text`, `ai_flaw_hint`, `time_prep_seconds`, `time_speak_seconds` vào model `QuestionItem`.
  3. Cập nhật schema lưu trữ `Attempt.assessment` chứa đầy đủ breakdown: `fluency`, `pronunciation`, `content_reasoning`.

### 📍 GIAI ĐOẠN 2: Xây dựng Module Đo lường Âm học (`fluency.py`)
- **Mục tiêu:** Bật word timestamps trên Faster-Whisper và tính toán tốc độ, khoảng dừng.
- **Files cần tác động:**
  - `services/api/app/speech.py` (Bật `word_timestamps=True` khi gọi `transcribe`)
  - `services/api/app/fluency.py` (File mới hoàn toàn)
- **Nhiệm vụ:**
  1. Viết hàm `extract_word_timing(segments)`.
  2. Viết hàm `calculate_speech_rate(words, duration_seconds)`.
  3. Viết hàm `detect_silent_pauses(words, threshold_seconds=0.25)`.
  4. Viết hàm `count_filled_pauses(transcript)`.
  5. Viết unit test trong `services/api/tests/test_fluency.py` kiểm thử với dữ liệu mock.

### 📍 GIAI ĐOẠN 3: Xây dựng Engine Chấm Phát âm Part 2 (`pronunciation_wer.py`)
- **Mục tiêu:** Chấm tự động 100% Part 2 trong $\le 0.05$ giây bằng `jiwer`.
- **Files cần tác động:**
  - `services/api/pyproject.toml` (Thêm dependency `jiwer`)
  - `services/api/app/pronunciation_wer.py` (File mới hoàn toàn)
  - `services/api/app/worker.py` (Tích hợp logic gọi chấm Part 2)
- **Nhiệm vụ:**
  1. Xây dựng pipeline tiền xử lý và chuẩn hóa chuỗi `jiwer.Compose`.
  2. Viết hàm `evaluate_read_aloud(reference, hypothesis, avg_logprob)`.
  3. Tạo bảng chi tiết các từ sai (`substitutions`, `deletions`, `insertions`) để gửi về frontend hiển thị.

### 📍 GIAI ĐOẠN 4: Chấm Ngữ nghĩa & Vấn đáp Socratic Đa lượt (Part 5)
- **Mục tiêu:** Tích hợp prompt LLM chấm nội dung và sinh câu hỏi phụ cho Part 5.
- **Files cần tác động:**
  - `services/api/app/ai.py`
  - `services/api/app/routes_exam.py` (Endpoint nhận Lượt 1 và trả về câu hỏi Lượt 2)
  - `services/api/app/worker.py`
- **Nhiệm vụ:**
  1. Viết template prompt chấm rubric 4 tiêu chí có nạp kết quả âm học.
  2. Viết endpoint `POST /api/exams/sessions/{session_id}/socratic-probe`:
     - Nhận audio Lượt 1 $\rightarrow$ Gỡ băng nhanh $\rightarrow$ Gọi LLM sinh 1 câu hỏi phụ DoK 3-4 $\rightarrow$ Trả về cho Student App.
  3. Tổng hợp điểm 2 lượt của Part 5 vào kết quả chung.

### 📍 GIAI ĐOẠN 5: Nâng cấp Giao diện Làm bài trên Student App
- **Mục tiêu:** Trải nghiệm thi mượt mà, trực quan theo từng Part.
- **Files cần tác động:**
  - `apps/student-app/src/pages/ExamSessionPage.tsx`
  - `apps/student-app/src/components/exam/`
    - `Part1InterviewView.tsx`
    - `Part2ReadAloudView.tsx`
    - `Part3PresentationView.tsx`
    - `Part4AiCritiqueView.tsx`
    - `Part5SocraticVivaView.tsx`
- **Nhiệm vụ:**
  1. Tạo đồng hồ đếm ngược phân chia rõ 2 giai đoạn: **Chuẩn bị (Preparation)** và **Đang nói (Speaking)**.
  2. Part 2 hiển thị văn bản to rõ, hỗ trợ highlight câu đang đọc.
  3. Part 4 hiển thị giao diện xem sơ đồ / đoạn code do AI tạo.
  4. Part 5 hiển thị luồng 2 lượt: Gửi Lượt 1 $\rightarrow$ Hiệu ứng "Giám khảo đang chuẩn bị câu hỏi phản biện..." $\rightarrow$ Hiển thị câu hỏi phụ Lượt 2 $\rightarrow$ Bật mic trả lời.

### 📍 GIAI ĐOẠN 6: Nâng cấp Giao diện Giám sát & Bảng điểm trên Staff Portal
- **Mục tiêu:** Minh bạch toàn bộ kết quả thi và bằng chứng âm học cho Giảng viên / Khảo thí.
- **Files cần tác động:**
  - `apps/staff-portal/app/(examiner)/results/[slot_id]/page.tsx`
  - `apps/staff-portal/components/results/TranscriptDiffViewer.tsx`
  - `apps/staff-portal/components/results/FluencyAcousticPanel.tsx`
- **Nhiệm vụ:**
  1. Dựng `TranscriptDiffViewer`: Tô màu đỏ từ phát âm sai/nuốt âm (Part 2), màu vàng từ chèn thừa.
  2. Dựng `FluencyAcousticPanel`: Hiển thị thanh đo tốc độ nói (wps), số lần ngắc ngứ và danh sách từ đệm.
  3. Radar Chart 4 kỹ năng: Phát âm, Độ trôi chảy, Ngữ pháp - Từ vựng, Lập luận.
  4. Giữ nguyên tính năng Giảng viên ghi đè điểm (`Score Override`) và Khảo thí phê duyệt (`Approve`).

---

## 5. PHÂN CÔNG CÔNG VIỆC (WBS) & TIMELINE 4 TUẦN

```
Tuần 1: [DB Schema & Item Bank] + [Fluency Engine (WPS, VAD Pauses)]
Tuần 2: [Pronunciation Engine (jiwer WER)] + [Student UI Part 1, 2, 3]
Tuần 3: [Socratic Engine Part 5] + [Student UI Part 4, 5 & Staff Results UI]
Tuần 4: [Tích hợp End-to-End, Tối ưu Celery Docker & Kiểm thử Thực tế]
```

| Thành viên đảm nhiệm | Trách nhiệm chính (Core Tasks) |
| :--- | :--- |
| **Backend & Pipeline Dev** | - Alembic Migration DB Schema.<br>- Viết module `fluency.py` & `pronunciation_wer.py`.<br>- Tích hợp Celery worker pipeline và tổng hợp điểm 5 phần. |
| **AI / NLP Specialist** | - Tinh chỉnh Prompt System và Anchor Exemplars trong `ai.py`.<br>- Xây dựng luồng sinh câu hỏi phản biện Socratic trong $\le 2$ giây.<br>- Tối ưu Faster-Whisper và Silero VAD parameters. |
| **Frontend Dev (Student App)** | - Xây dựng flow làm bài tuần tự 5 Part trên `apps/student-app`.<br>- Thiết kế timer đếm ngược chuẩn bị / phát ngôn.<br>- Xử lý WebRTC audio recording và chunked upload. |
| **Frontend Dev (Staff Portal)** | - Nâng cấp trang chi tiết kết quả thi tại `apps/staff-portal`.<br>- Dựng component tô màu từ sai (WER Diff) và biểu đồ radar kỹ năng.<br>- Hoàn thiện form Giảng viên phúc khảo / chỉnh sửa điểm. |
| **Tester & QA** | - Thu âm 15 bộ dữ liệu test mẫu (5 Giỏi, 5 Trung bình, 5 Yếu).<br>- Chạy so sánh đối chứng điểm AI chấm với điểm Giảng viên chấm thủ công.<br>- Kiểm thử tải Celery Worker khi nộp bài đồng thời. |

---

## 6. TIÊU CHÍ NGHIỆM THU & CHECKLIST KIỂM THỬ

- [ ] **Tốc độ xử lý:** Part 2 chấm xong trong $\le 0.1$ giây; các Part gọi LLM hoàn tất trong $\le 4$ giây trên máy tính cá nhân.
- [ ] **Độ chính xác WER:** Thư viện `jiwer` bắt chính xác các lỗi đọc thiếu từ, đọc sai từ so với câu nhắc gốc.
- [ ] **Bắt lỗi trôi chảy:** Bài nói ngắc ngứ $> 0.5$ lần dừng/từ hoặc tốc độ $< 1.35$ wps bị trừ điểm rõ ràng và có log giải thích.
- [ ] **Chống học vẹt:** Part 5 sinh câu hỏi phụ bám sát câu trả lời thực tế của thí sinh, không bị lặp lại câu hỏi rập khuôn.
- [ ] **Tài nguyên phần cứng:** Celery worker chạy ổn định trong giới hạn RAM $\le 4\text{GB}$, không bị OOM crash.
- [ ] **Bảo mật & Tính vẹn toàn:** Audio và video chunked upload được lưu an toàn tại MinIO/Local Storage, Giảng viên có thể nghe lại từng câu bất kỳ lúc nào.
