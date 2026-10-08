# GIẢI PHÁP TỐI ƯU THIẾT KẾ ĐỀ THI, RUBRIC & KIẾN TRÚC AI CHẤM NÓI TỰ ĐỘNG
## 🎓 PHIÊN BẢN THỰC CHIẾN ĐỒ ÁN SINH VIÊN (PRACTICAL ZERO-BUDGET CAPSTONE EDITION)
*(Kế thừa toàn diện 11 bài báo khoa học quốc tế 2014 – 2026, Tinh gọn 100% khả thi, Chi phí 0 đồng, Chạy mượt trên Local PC/Laptop)*

> **Định vị tài liệu:**
> - Tài liệu này là bản **kỹ thuật hóa thực tế (Pragmatic Engineering)** từ 11 nghiên cứu quốc tế (Routledge, Cambridge Linguaskill, Springer, Elsevier, ACL SpeechRater, John Benjamins, IJAIED, DigiTala Phần Lan, Socratic Mind Georgia Tech).
> - **Nguyên tắc cốt lõi:** Giữ trọn vẹn giá trị học thuật và độ tin cậy tương đương người thật, nhưng **CẮT BỎ TOÀN BỘ các công cụ hàn lâm nặng nề, cồng kềnh, đắt đỏ** (như Praat, MFA, Stanford CoreNLP, mô hình Rasch MFRM hay cụm Microservices phức tạp).
> - **Công nghệ sử dụng:** 100% mã nguồn mở và miễn phí: **Faster-Whisper Local + Python `jiwer` + Local LLM (Ollama) / Gemini Free + PostgreSQL pgvector**.

---

## ⚖️ BẢNG ĐỐI CHIẾU: HÀN LÂM LÝ THUYẾT VS THỰC CHIẾN ĐỒ ÁN (0 ĐỒNG)

| Tiêu chí / Kỹ thuật | Bản Hàn lâm (Nghiên cứu quốc tế) | Quyết định trong Đồ án | Giải pháp Thực chiến Tinh gọn (Khả thi 100%, 0 đồng) |
|---|---|:---:|---|
| **1. Nhận dạng giọng nói (ASR)** | Kaldi TDNN-F hoặc DeepSpeech 2 huấn luyện tốn hàng ngàn giờ GPU. | **GIỮ LẠI (TỐI ƯU)** | Dùng **Faster-Whisper Local** (model `small.en` hoặc `medium.en`). Chạy offline 100%, có sẵn Word Timestamps, tương quan thực chứng $r = -0.969$. |
| **2. Chấm Part 2 Đọc to (Controlled)** | Gọi API LLM tốn token hoặc dùng mô hình ASR chuyên biệt đắt đỏ. | **GIỮ LẠI (TỐI ƯU)** | **Python `jiwer` (Levenshtein WER)**: Chạy trong 0.05 giây, 0 đồng, 10 dòng code Python. Công thức Truncated WER triệt tiêu điểm âm. |
| **3. Phân tích âm học (Praat, MFA, Jitter, Shimmer, Pitch)** | Cài đặt Praat, Montreal Forced Aligner (MFA), đo formants, dây thanh chùng creaky voice. | ❌ **LOẠI BỎ TRIỆT ĐỂ** | **Quá cồng kềnh, dễ lỗi C++ trên Docker, không cần thiết.**<br>$\implies$ **Thay thế:** Trích xuất trực tiếp Tốc độ nói (wps) và Khoảng dừng (> 0.6s) ngay từ Word Timestamps của Whisper! |
| **4. Khoảng dừng cú pháp (Syntactic Pause Ratio - SPR)** | Dùng Stanford CoreNLP / Tree parser phân tích ranh giới mở/đóng thành tố ngữ pháp. | ❌ **LOẠI BỎ** | **Java CoreNLP ngốn hàng GB RAM, dễ sập máy.**<br>$\implies$ **Thay thế:** Tự động chèn nhãn `[pause]` vào transcript tại vị trí ngắt nghỉ $> 0.6$s. Để Local LLM đọc trong ngữ cảnh câu và nhận xét tự nhiên qua Chain-of-Thought. |
| **5. Bắt lỗi nuốt âm `/s/` (Duration-Alignment)** | Forced-alignment cấp độ âm vị (phoneme level) đo mili-giây âm ma sát vô thanh. | ❌ **LOẠI BỎ** | **Đòi hỏi căn chỉnh âm vị cực kỳ bất khả thi.**<br>$\implies$ **Thay thế:** Bỏ qua. Whisper khi không nghe thấy âm đuôi sẽ tự động hạ điểm chính xác của từ hoặc phản ánh trong token logprob. |
| **6. Bộ ngưỡng tốc độ & khoảng dừng (PDP/SHAP)** | Chạy mô hình XGBoost, Partial Dependence Plots và SHAP trên 47,000 bài thi. | **GIỮ LẠI (CỐT LÕI)** | Kế thừa trực tiếp các con số toán học đã chứng minh: Tốc độ chuẩn **$2.0 - 2.4$ từ/giây**, phạt chậm **$< 1.35$**, trần bão hòa **$> 2.4$** chống bắn liên thanh, trần dừng **$\le 0.27$** lần/từ. Viết bằng lệnh `if/else` Python đơn giản. |
| **7. Hiệu chuẩn mẫu Rasch (Many-Facet Rasch MFRM)** | Chạy phần mềm thống kê FACETS với ma trận hàng chục giám khảo quốc tế gối đầu. | ❌ **LOẠI BỎ** | **Quá hàn lâm đối với đồ án sinh viên.**<br>$\implies$ **Thay thế:** Nhờ 1 Thầy/Cô hướng dẫn thẩm định điểm chuẩn 3 bài mẫu (Level 1 Low, Level 2 Medium, Level 3 High) để nạp vào Prompt làm Anchor Exemplars. |
| **8. Kiểm tra bám đề (Task Accomplishment)** | Xây dựng BERT Classifier riêng biệt để phân loại hoàn thành nhiệm vụ. | **GIỮ LẠI (TỐI ƯU)** | Tận dụng **PostgreSQL pgvector** sẵn có trong project để làm Local RAG: So sánh độ tương đồng ngữ nghĩa giữa câu trả lời và đề bài, đẩy vào LLM kiểm tra. |
| **9. Vấn đáp Socratic Đa lượt (Part 5)** | Hệ thống phức tạp của Georgia Tech. | **GIỮ LẠI (TỐI ƯU)** | Sinh viên nói xong Part 5 $\rightarrow$ Celery Worker gọi LLM sinh 1 câu hỏi phụ đào sâu (DoK 3-4) $\rightarrow$ Student App phát âm/hiển thị câu hỏi $\rightarrow$ Sinh viên trả lời lượt 2. |
| **10. Kiến trúc Microservices 5 Evaluators** | Tách thành 5 service Docker riêng biệt chạy phân tán. | ❌ **LOẠI BỎ** | **Gây cạn kiệt RAM của máy tính phát triển.**<br>$\implies$ **Thay thế:** Giữ nguyên kiến trúc Monolith tinh gọn: Celery Worker xử lý tuần tự pipeline: *Filter âm thanh $\rightarrow$ Whisper STT $\rightarrow$ JiWER / LLM RAG $\rightarrow$ Lưu DB*. |

---

## 1. CẤU TRÚC ĐỀ THI 5 PHẦN TINH GỌN (CHỈNH CHU & CHỐNG GIAN LẬN)

Ma trận đề thi chuẩn Linguaskill được tinh chỉnh để sinh viên dễ dàng làm bài trên giao diện Web ([`apps/student-app`](file:///d:/DuAnKhoa/AI-Oral-Assessment-Platform/apps/student-app)) và giám khảo xem lại trên Portal ([`apps/staff-portal`](file:///d:/DuAnKhoa/AI-Oral-Assessment-Platform/apps/staff-portal)):

```
             [ MA TRẬN ĐỀ THI VẤN ĐÁP 5 PHẦN - TRỌNG SỐ ĐỒNG ĐỀU 20% ]
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ PART 1: INTERVIEW (Khởi động & Phản xạ nhanh) - 20%                       │
 │ • 4-6 câu hỏi ngắn cá nhân / kiến thức nền (10s chuẩn bị, 15-20s nói)     │
 │ • Mục tiêu: Giúp sinh viên quen mic, đo độ trễ phản xạ phản hồi.         │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ PART 2: READING ALOUD (Đọc đoạn văn / Câu kỹ thuật) - 20%                │
 │ • 4-6 câu kỹ thuật chuyên ngành CNTT (chuẩn hóa độ dài 10-18 từ)          │
 │ • Chấm tự động 100% bằng Python `jiwer` WER (Tốc độ 0.05s, chi phí $0)    │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ PART 3: STRUCTURED PRESENTATION (Thuyết trình ngắn 1 phút) - 20%          │
 │ • 1 chủ đề kỹ thuật có 3 gợi ý định hướng (30s chuẩn bị, 60s nói)        │
 │ • Đánh giá: Độ trôi chảy, từ nối diễn ngôn, cấu trúc mở - thân - kết.    │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ PART 4: SYSTEM DESIGN / AI-CRITIQUE (Phân tích hoặc Phê bình AI) - 20%   │
 │ • Tùy chọn A: Phân tích một sơ đồ kiến trúc / luồng dữ liệu (Visual)     │
 │ • Tùy chọn B (Chống gian lận AI): Xem một giải pháp do AI đề xuất có     │
 │   chứa lỗi kỹ thuật ngầm, sinh viên nói vạch lỗi và đề xuất cách sửa.    │
 ├──────────────────────────────────────────────────────────────────────────┤
 │ PART 5: VIVA VOCE & SOCRATIC PROBING (Vấn đáp Phản biện Đa lượt) - 20%   │
 │ • Lượt 1: Sinh viên trình bày giải pháp trước một bài toán tình huống.   │
 │ • Lượt 2: Local LLM sinh 1 câu hỏi phụ đào sâu (Trade-offs / Giả định)   │
 │   để sinh viên trả lời trực tiếp, triệt tiêu nguy cơ học thuộc lòng.     │
 └──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MA TRẬN RUBRIC 5 CHIỀU KÍCH OCC THỰC CHIẾN (THANG ĐIỂM 100)

Hệ thống chấm trên dải điểm số thực liên tục **0.0 – 100.0** ở 5 tiêu chí OCC (Oral Communicative Competence), sau đó lấy trung bình có trọng số để quy đổi ra Điểm hệ 10 hoặc Band CEFR:

| Chiều kích OCC | Trọng số | Chỉ số Kỹ thuật Đo lường (Thuần Python & LLM) | Thang điểm 0 - 100 | Cách triển khai 0 đồng |
|---|:---:|---|:---:|---|
| **1. Interaction Management** *(Quản lý tương tác)* | **15%** | • Độ trễ phản hồi âm thanh sau câu hỏi (`< 2s`)<br>• Khả năng phản xạ trước câu hỏi phụ Socratic Part 5<br>• Lời chào, cảm ơn, từ nối đối thoại (*politeness*) | **0 - 39:** Im lặng / bỏ cuộc.<br>**40 - 69:** Phản hồi chậm, câu trả lời cụt lủn.<br>**70 - 84:** Tương tác tự nhiên, trả lời đúng trọng tâm.<br>**85 - 100:** Phản xạ tức thì, làm chủ cuộc vấn đáp. | Đo đạc độ trễ bắt đầu nói từ file audio + LLM kiểm tra độ phù hợp của câu trả lời tương tác. |
| **2. Delivery, Speed & Rhythm** *(Độ trôi chảy & Nhịp điệu)* | **20%** | • Tốc độ nói: Chuẩn tối ưu **$2.0 - 2.4$ từ/giây** (phạt nếu $< 1.35$; áp trần bão hòa nếu $> 2.4$)<br>• Tần suất khoảng dừng: $\le 0.27$ lần dừng/từ (ngắt $> 0.6$s)<br>• Bảo vệ từ đệm chức năng (*fluencemes* như *uh, um* trước từ khó) | **0 - 39:** Đọc từng từ rời rạc, ngắt quãng liên tục.<br>**40 - 69:** Nói quá chậm hoặc bắn liên thanh không kiểm soát.<br>**70 - 84:** Tốc độ tương đối ổn (1.5 - 2.0 wps), ngắt nhịp chấp nhận được.<br>**85 - 100:** Tốc độ chuẩn mực (2.0 - 2.4 wps), trôi chảy, ngắt nghỉ đúng chỗ. | Tính trực tiếp bằng 5 dòng code Python từ Word Timestamps của Faster-Whisper. |
| **3. Textual Coherence & Cohesion** *(Mạch lạc & Liên kết)* | **20%** | • Cấu trúc câu và liên kết ý tưởng<br>• Sử dụng các từ nối diễn ngôn (*However, Therefore, In addition, As a result*)<br>• Không bị vỡ vụn câu giữa chừng | **0 - 39:** Câu què cụt, rời rạc, không liên kết.<br>**40 - 69:** Có ý tưởng nhưng thiếu từ nối, chắp vá.<br>**70 - 84:** Bố cục rõ ràng, liên kết mạch lạc.<br>**85 - 100:** Cấu trúc chặt chẽ, luận điểm chuyển tiếp mượt mà. | Local LLM CoT phân tích tính liên kết văn bản trong transcript. |
| **4. Argumentative Strategies & Task Depth** *(Lập luận & Chiều sâu nội dung)* | **30%** | • Mức độ hoàn thành yêu cầu đề bài (`Task Accomplishment`)<br>• Luận đề rõ ràng, dẫn chứng kỹ thuật thực tế<br>• Khả năng phân tích đánh đổi (*Trade-offs*) hoặc vạch lỗi giải pháp AI | **0 - 39:** Lạc đề hoàn toàn / nói sáo rỗng.<br>**40 - 69:** Trả lời đúng bề mặt nhưng thiếu dẫn chứng kỹ thuật.<br>**70 - 84:** Lập luận hợp lý, có minh họa thực tế.<br>**85 - 100:** Lập luận sắc sảo, phân tích sâu sắc về Trade-offs/bảo vệ giả định. | Local RAG (PostgreSQL pgvector) truy xuất tài liệu môn học để LLM đối chiếu độ chính xác. |
| **5. Technical Lexicon & Accuracy** *(Từ vựng & Thuật ngữ Chuyên ngành)* | **15%** | • Độ đa dạng từ vựng (TTR $0.50 - 0.68$)<br>• Tần suất và độ chính xác của các thuật ngữ kỹ thuật chuyên ngành (IT/CS) | **0 - 39:** Dưới chuẩn cơ bản, sai thuật ngữ.<br>**40 - 69:** Dùng từ lặp đi lặp lại, thuật ngữ nghèo nàn.<br>**70 - 84:** Thuật ngữ chính xác, vốn từ đầy đủ.<br>**85 - 100:** Sử dụng thuật ngữ học thuật và kỹ thuật chính xác, linh hoạt. | LLM đối chiếu từ vựng với danh mục từ khóa kỹ thuật của đề thi. |

---

## 3. KIẾN TRÚC KỸ THUẬT 0 ĐỒNG (ZERO-BUDGET TECHNICAL PIPELINE)

Hệ thống tích hợp trọn vẹn vào mã nguồn hiện tại của dự án: Frontend gửi audio $\rightarrow$ FastAPI tiếp nhận $\rightarrow$ Celery Worker chấm điểm $\rightarrow$ Trả kết quả về Database.

```
                  [ SINH VIÊN THI TRÊN APPS/STUDENT-APP ]
                                    │ (Gửi Audio qua REST API)
                                    ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ BƯỚC 1: PRE-SCORING FILTER NHANH (Python `wave` / `pydub` - 0.01 Giây)    │
 │ • Kiểm tra độ dài: Nếu < 2 giây ──> Trả về 0 Điểm (File rỗng)             │
 │ • Kiểm tra năng lượng RMS: Nếu âm lượng ~ 0 ──> Báo lỗi mic / Im lặng    │
 └──────────────────────────────────┬───────────────────────────────────────┘
                                    │ (Audio đạt chuẩn)
                                    ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ BƯỚC 2: FASTER-WHISPER LOCAL (Chạy trên CPU/GPU máy chủ - 0 Đồng)        │
 │ • Model: `faster-whisper` (small.en / medium.en)                         │
 │ • Xuất: Transcript + Word-level Timestamps                               │
 │ • Tính toán nhanh các chỉ số ngữ âm:                                     │
 │   - Tốc độ: words_per_second = total_words / duration_seconds            │
 │   - Khoảng dừng: Đếm số khoảng cách giữa 2 từ > 0.6s                    │
 │   - Chèn token `[pause]` vào văn bản tại vị trí dừng > 0.6s              │
 └──────────────────────────────────┬───────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │ (Phân luồng theo loại câu hỏi)                  │
           ▼                                                 ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ TRACK A: PART 2 ĐỌC TO (JiWER)      │   │ TRACK B: CÂU TỰ DO (PART 1, 3, 4, 5)│
│ • Không dùng LLM                    │   │ • RAG: Tìm tài liệu môn học qua     │
│ • Tính Levenshtein WER bằng `jiwer` │   │   Postgres pgvector (có sẵn trong DB)│
│ • Công thức Truncated WER:          │   │ • Gọi LLM (Ollama Local / Gemini):  │
│   Score = max(0, 1 - min(1, WER))*100│  │   Chấm 5 tiêu chí OCC + CoT JSON    │
│ • Thời gian: 0.05s | Chi phí: $0    │   │ • Part 5: Sinh câu hỏi Socratic     │
└──────────────────┬──────────────────┘   └──────────────────┬──────────────────┘
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ BƯỚC 3: LƯU KẾT QUẢ VÀ TRẢ VỀ GIAO DIỆN                                  │
 │ • Lưu điểm số 0-100 & Band CEFR vào PostgreSQL                           │
 │ • Trả báo cáo chẩn đoán (Conversation Summary & Điểm mạnh/yếu)           │
 │ • Cổng Giảng viên (`apps/staff-portal`): Xem lại audio, transcript & ký  │
 └──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. ĐẶC TẢ MÃ NGUỒN PYTHON THỰC THI (CODE SNIPPETS KHẢ THI 100%)

### 4.1. Module Đo Tốc Độ & Khoảng Dừng từ Faster-Whisper (`speech_metrics.py`)
Đo đạc chính xác các ngưỡng PDP ($2.0 - 2.4$ wps, pause ceiling $\le 0.27$) mà **không cần cài Praat**:

```python
def extract_pragmatic_metrics(segments, total_duration_seconds: float):
    """
    Trích xuất các chỉ số lưu loát thực chiến 100% từ Faster-Whisper timestamps.
    Hoàn toàn 0 đồng, không cần cài Praat hay MFA.
    """
    words = []
    pauses = 0
    punctuated_transcript_parts = []
    prev_end = 0.0

    for segment in segments:
        for word in segment.words:
            words.append(word.word.strip())
            # Nếu khoảng cách giữa 2 từ liên tiếp > 0.6 giây -> tính là 1 khoảng dừng
            if prev_end > 0 and (word.start - prev_end) > 0.6:
                pauses += 1
                punctuated_transcript_parts.append("[pause]")
            punctuated_transcript_parts.append(word.word.strip())
            prev_end = word.end

    word_count = len(words)
    speaking_speed_wps = round(word_count / total_duration_seconds, 2) if total_duration_seconds > 0 else 0.0
    pause_ratio_per_word = round(pauses / word_count, 2) if word_count > 0 else 0.0

    # Phân tích theo bộ ngưỡng thực nghiệm PDP/SHAP (Singla et al., 2023)
    speed_status = "OPTIMAL"  # 2.0 - 2.4 wps
    if speaking_speed_wps < 1.35:
        speed_status = "TOO_SLOW"
    elif speaking_speed_wps > 2.4:
        speed_status = "PLATEAU_RAPID"  # Bão hòa chống bắn liên thanh

    return {
        "word_count": word_count,
        "speaking_speed_wps": speaking_speed_wps,
        "speed_status": speed_status,
        "pause_count": pauses,
        "pause_ratio_per_word": pause_ratio_per_word,
        "transcript_with_pauses": " ".join(punctuated_transcript_parts)
    }
```

### 4.2. Module Chấm Điểm Part 2 Đọc To bằng Python JiWER (`reading_grader.py`)
Chạy trong 0.05 giây, độ chính xác thực chứng $r = -0.969$:

```python
import jiwer

def grade_reading_aloud(reference_text: str, candidate_transcript: str) -> float:
    """
    Chấm điểm Part 2 tự động bằng Levenshtein Word Error Rate (McGuire et al., 2025).
    Thời gian thực thi: ~0.05s, Chi phí: $0.
    """
    # Chuẩn hóa văn bản cơ bản
    ref_clean = jiwer.RemovePunctuation()(reference_text.lower().strip())
    hyp_clean = jiwer.RemovePunctuation()(candidate_transcript.lower().strip())

    if not hyp_clean:
        return 0.0

    # Tính WER
    raw_wer = jiwer.wer(ref_clean, hyp_clean)
    
    # Công thức Truncated WER chống điểm âm
    truncated_wer = min(1.0, max(0.0, raw_wer))
    accuracy_score = (1.0 - truncated_wer) * 100.0

    return round(accuracy_score, 1)
```

---

## 5. PROMPT CHẤM ĐIỂM TINH GỌN CHO LOCAL LLM / GEMINI FREE (TRACK B)

Prompt này được tối ưu để chạy mượt mà trên **Ollama (`qwen2.5:7b` / `llama3.2:3b`)** hoặc **Google Gemini Free Tier**, luôn đảm bảo trả về đúng định dạng JSON:

```markdown
[SYSTEM]
You are a calibrated Oral Exam Assessor in Higher Education. 
Your evaluation is strictly evidence-based, deterministic, and objective.

CONSTRAINTS:
1. Scoring Scale: Grade each of the 5 criteria on a continuous scale from 0.0 to 100.0.
2. Delivery Rules: 
   - Ideal speed: 2.0 - 2.4 words/second. Penalize if < 1.35 words/second. Do not award bonus delivery points for speech > 2.4 words/second (machine-gun pacing).
   - Natural hesitations ("uh", "um") before technical words are natural planning (fluencemes) - DO NOT penalize them.
3. Task Accomplishment: Check if candidate addressed the technical requirements in the syllabus context.

ANCHOR BENCHMARKS:
- Level Low (~30/100): Fragmented, no technical evidence, off-topic or unable to explain basic concept.
- Level Medium (~65/100): Clear answer, correct terminology, but lacks depth or discussion of trade-offs.
- Level High (~90/100): Structured thesis, accurate technical terms, explicitly evaluates trade-offs and edge cases.

[USER]
Candidate Transcript: """{transcript_with_pauses}"""
Exam Question & Blueprint Context: """{retrieved_context}"""
Acoustic Metrics: Speed: {speaking_speed_wps} words/s ({speed_status}), Pauses/word: {pause_ratio_per_word}

Evaluation Protocol:
1. Compare transcript against Benchmarks, Question Context, and Speed Metrics.
2. If this is Part 5 (Interactive Viva Voce), generate 1 sharp follow-up probing question challenging candidate's assumptions.
3. Return output strictly in valid JSON:
{
  "chain_of_thought": "Brief step-by-step reasoning...",
  "criteria_scores": {
    "interaction_management": {"score": 0.0-100.0, "comment": "..."},
    "delivery_speed_rhythm": {"score": 0.0-100.0, "comment": "..."},
    "textual_coherence": {"score": 0.0-100.0, "comment": "..."},
    "argumentative_depth": {"score": 0.0-100.0, "comment": "..."},
    "technical_lexicon": {"score": 0.0-100.0, "comment": "..."}
  },
  "overall_score": 0.0-100.0,
  "equivalent_grade_scale_10": 0.0-10.0,
  "equivalent_cefr": "A2 | B1 | B2 | C1",
  "adaptive_socratic_followup_question": "Follow-up question for Part 5 (or null)",
  "conversation_summary": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "actionable_feedback": "..."
  }
}
```

---

## 6. TỔNG KẾT: 16 ĐIỂM NGHẼN KHOA HỌC ĐÃ ĐƯỢC KỸ THUẬT HÓA 100%

Toàn bộ 16 điểm nghẽn từ 11 bài báo quốc tế đều đã được chuyển giao thành các giải pháp **khả thi thực tế với chi phí 0 đồng**:

- [x] **Điểm 1 (Âm thanh kém/Mic rè):** Lọc nhanh qua độ dài audio và năng lượng RMS (`pydub`/`wave`).
- [x] **Điểm 2 (Đánh giá lập luận bậc cao):** Local LLM CoT trên khung OCC 5 chiều kích.
- [x] **Điểm 3 (Nói tiếng mẹ đẻ/Nói nhảm):** Whisper tự nhận diện ngôn ngữ; nếu tiếng Việt/rác gán điểm 0.
- [x] **Điểm 4 (Tính giải trình XAI):** JSON trả về `conversation_summary` với điểm mạnh, điểm yếu rõ ràng.
- [x] **Điểm 5 (Máy chấm nới tay):** Quy tắc Evidence-based trong prompt: bác bỏ nỗ lực suông.
- [x] **Điểm 6 (Bài im lặng):** File audio $< 2$s hoặc RMS $= 0 \implies$ Chấm $0$ điểm tức thì.
- [x] **Điểm 7 (ASR cũ lỗi thời):** Dùng Faster-Whisper Local ($r = -0.969$), không tốn phí API.
- [x] **Điểm 8 (Thí sinh né tránh câu hỏi):** Đề thi có gợi ý định hướng (3 bullet points).
- [x] **Điểm 9 (Chấm Fluency bất công):** Dùng Word Timestamps chèn `[pause]` và bảo vệ từ đệm chức năng (*fluencemes*).
- [x] **Điểm 10 (Gian lận đọc kịch bản AI):** Kiểm tra tốc độ nói: không ngắt nghỉ và trơn tru bất thường sẽ bị cảnh báo.
- [x] **Điểm 11 (Trôi dạt giám khảo máy):** Cố định $\text{Temperature} = 0$ và nạp 3 bài mẫu Anchor Exemplars.
- [x] **Điểm 12 (Whisper nuốt âm):** Đơn giản hóa: tập trung vào tính mạch lạc tổng thể và độ trôi chảy thực tế.
- [x] **Điểm 13 (Gian lận bắn liên thanh):** Áp trần bão hòa tốc độ $> 2.4$ wps bằng lệnh `if/else` Python.
- [x] **Điểm 14 (Thiên kiến giảng viên & Tích hợp hệ thống):** Giảng viên duyệt lại qua Staff Portal; kết nối API thẳng tới Student App.
- [x] **Điểm 15 (Đánh giá tĩnh 1 lượt & Lo âu AI):** Part 5 có hỏi dồn Socratic 2 lượt; giao diện trực quan giảm lo âu.
- [x] **Điểm 16 (Nút thắt quy mô & Chống AI làm hộ):** Part 4 hỗ trợ bài thi vạch lỗi AI (Authentic AI-Critique); giải quyết hoàn toàn bài toán nhân lực chấm thi.
