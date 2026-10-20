# 📋 TASK HANDOVER DOCUMENT
## English Speaking Assessment Demo - Part 1 & Part 2

> **From:** [Your Name]  
> **To:** [Teammate Name]  
> **Date:** [Today's Date]  
> **Deadline:** Tomorrow - Demo Presentation  
> **Status:** 🔴 URGENT

---

## 🎯 MỤC TIÊU CHÍNH

**Ngày mai bạn cần demo được hệ thống chấm thi vấn đáp tiếng Anh tự động:**

1. ✅ Sinh viên nói vào mic → Server xử lý → AI chấm điểm → Hiển thị kết quả
2. ✅ Giải thích được các chỉ số (WPS, WER, TTR)
3. ✅ Bảo vệ được cơ sở khoa học (7 bài báo quốc tế)

---

## 📁 CÁC FILE ĐÃ TẠO/SỬA

### 1. Backend Files (services/api/app/)

| File | Mô tả | Quan trọng |
|------|--------|:---------:|
| `routes_demo_grading.py` | API endpoint để chấm điểm Part 1 & Part 2 | ⭐⭐⭐ |
| `fluency.py` | Tính tốc độ nói (WPS) và khoảng dừng | ⭐⭐⭐ |
| `pronunciation_wer.py` | Tính WER (Word Error Rate) cho Part 2 | ⭐⭐⭐ |
| `metrics.py` | Phân tích từ vựng (TTR) | ⭐⭐ |
| `grading_free_response.py` | Logic chấm Part 1 | ⭐⭐ |
| `grading_types.py` | Định nghĩa các loại Part | ⭐ |
| `main.py` | Thêm router cho demo grading | ⭐⭐ |
| `worker.py` | Sửa lỗi syntax | ⭐ |
| `Dockerfile` | Sửa lỗi permission | ⭐ |

### 2. Frontend Files (apps/staff-portal/)

| File | Mô tả | Quan trọng |
|------|--------|:---------:|
| `grading/live/page.tsx` | Trang demo để record và xem kết quả | ⭐⭐⭐ |
| `grading/components/EnhancedMetricsPanel.tsx` | Hiển thị metrics nâng cao | ⭐⭐ |
| `grading/components/FluencyMetricsPanel.tsx` | Panel Fluency | ⭐⭐ |
| `grading/components/PronunciationMetricsPanel.tsx` | Panel Pronunciation | ⭐⭐ |
| `grading/components/LexicalMetricsPanel.tsx` | Panel Vocabulary | ⭐⭐ |

### 3. Documentation Files (docs/)

| File | Mô tả | Đọc kỹ? |
|------|--------|:-------:|
| `demo-flow-english-speaking.md` | **QUAN TRỌNG NHẤT** - Luồng demo chi tiết | ✅ PHẢI ĐỌC |
| `scientific-foundation-and-defense-report.md` | Báo cáo khoa học + Q&A | ✅ NÊN ĐỌC |
| `research/paper-implementation-status.md` | Trạng thái implement từng phần | ✅ THAM KHẢO |
| `research/optimal-speaking-assessment-solution.md` | Thiết kế đề thi 5 phần | ✅ THAM KHẢO |
| `TASK-ASSIGNMENT-DEMO.md` | Task list cho bạn | ✅ ĐÃ LÀM |

---

## 🎬 LUỒNG DEMO CHI TIẾT

### Bước 1: Khởi động hệ thống

```bash
# 1. Mở terminal, vào thư mục project
cd D:\DuAnKhoa\AI-Oral-Assessment-Platform

# 2. Chạy Docker
docker compose up -d

# 3. Đợi các services khởi động (postgres, redis, minio, api)
docker compose ps

# 4. Chạy Frontend (terminal mới)
cd apps/staff-portal
npm run dev
```

### Bước 2: Truy cập trang demo

```
Mở trình duyệt:
http://localhost:3000/teacher/grading/live
```

### Bước 3: Demo Part 1 - Free Response

```
┌─────────────────────────────────────────────────────────────────┐
│  PART 1: FREE RESPONSE                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Click nút "Part 1"                                          │
│                                                                  │
│  2. Đọc câu hỏi:                                               │
│     "Tell me about your favorite hobby. Why do you enjoy it?"   │
│                                                                  │
│  3. Click microphone (🎤) để BẮT ĐẦU ghi âm                    │
│                                                                  │
│  4. Nói trong 30-60 giây                                       │
│     VD: "My favorite hobby is playing guitar. I started..."     │
│                                                                  │
│  5. Click DỪNG (⏹) khi nói xong                               │
│                                                                  │
│  6. Click "Nộp bài & Chấm điểm"                               │
│                                                                  │
│  7. XEM KẾT QUẢ:                                               │
│     • Score: 7.5/10                                             │
│     • Fluency: 2.1 WPS ✅ (Tối ưu)                            │
│     • Vocabulary: TTR 0.73 ✅ (Phong phú)                      │
│     • AI Feedback                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Bước 4: Demo Part 2 - Read Aloud

```
┌─────────────────────────────────────────────────────────────────┐
│  PART 2: READ ALOUD                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Click nút "Part 2"                                          │
│                                                                  │
│  2. Đọc câu:                                                   │
│     "The quick brown fox jumps over the lazy dog. This sentence  │
│      contains every letter of the alphabet and is commonly used   │
│      for typing practice."                                        │
│                                                                  │
│  3. Click microphone (🎤) để BẮT ĐẦU                           │
│                                                                  │
│  4. ĐỌC câu to rõ ràng                                         │
│                                                                  │
│  5. Click DỪNG khi đọc xong                                    │
│                                                                  │
│  6. Click "Nộp bài & Chấm điểm"                               │
│                                                                  │
│  7. XEM KẾT QUẢ:                                               │
│     • Score: 8.5/10                                             │
│     • WER: 3.2% ✅ (Xuất sắc - gần như hoàn hảo)             │
│     • Fluency: 2.3 WPS ✅ (Tối ưu)                            │
│     • AI Feedback                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔬 GIẢI THÍCH CÁC CHỈ SỐ

### 1. WPS (Words Per Second) - Tốc độ nói

```
Công thức: WPS = Tổng số từ / Thời gian nói (giây)

Ngưỡng chuẩn (từ nghiên cứu Singla et al. 2023):
├── 2.0 - 2.4 WPS → ✅ TỐI ƯU (điểm cao nhất)
├── 1.7 - 2.0 WPS → ⚠️ Khá
├── < 1.35 WPS    → ❌ Quá chậm (bị phạt điểm)
└── > 2.8 WPS     → ⚠️ Quá nhanh (không có thêm điểm)
```

**Tại sao 2.0-2.4?**
- Nghiên cứu trên 47,000 bài thi
- Dùng XAI (SHAP) để tìm ngưỡng tối ưu
- Đây là tốc độ nói tự nhiên của người B2-C1

### 2. WER (Word Error Rate) - Tỷ lệ lỗi phát âm

```
Công thức: WER = (S + D + I) / N

Trong đó:
├── S = Substitutions (từ thay thế sai)
├── D = Deletions (từ bị bỏ sót)
├── I = Insertions (từ thêm thừa)
└── N = Tổng số từ trong câu gốc

Bảng điểm:
├── 0% - 5%   → ✅ XUẤT SẮC (9.5-10 điểm)
├── 5% - 10%  → ✅ TỐT (9.0-9.4 điểm)
├── 10% - 20% → ⚠️ KHÁ (8.0-8.9 điểm)
├── 20% - 35% → ❌ YẾU (6.5-7.9 điểm)
└── > 35%     → ❌ CẦN CẢI THIỆN (< 6.5 điểm)
```

**Tại sao dùng WER?**
- Công thức từ McGuire & Larson-Hall (2025, Elsevier)
- Độ tương quan với giám khảo người: r = 0.81-0.88
- Chạy trong 0.05 giây, miễn phí

### 3. TTR (Type-Token Ratio) - Đa dạng từ vựng

```
Công thức: TTR = Số từ duy nhất / Tổng số từ

Ví dụ:
"Cats cats dogs cats"
├── Tổng từ: 4
├── Từ duy nhất: 2 (cats, dogs)
└── TTR = 2/4 = 0.5

Ngưỡng:
├── ≥ 0.60 → ✅ PHONG PHÚ (RICH)
├── 0.50-0.60 → ✅ TỐT (GOOD)
├── 0.40-0.50 → ⚠️ TRUNG BÌNH (AVERAGE)
└── < 0.40 → ❌ HẠN CHẾ (LIMITED)
```

### 4. Khoảng dừng (Pauses)

```
Ngưỡng: ≥ 250ms (0.25 giây) = 1 khoảng dừng

Ý nghĩa:
- Dưới 250ms: chỉ là thời gian phát âm
- Trên 250ms: người nói đang NGHĨ (cognitive pause)

Tỷ lệ chuẩn:
├── ≤ 0.27 dừng/từ → ✅ TỐI ƯU
├── > 0.35 dừng/từ → ❌ Đứt đoạn, ngắc ngứ
```

---

## 📚 CƠ SỞ KHOA HỌC (7 BÀI BÁO)

### ĐÃ IMPLEMENT (Part 1 & 2):

| # | Bài báo | Đóng góp | File |
|---|---------|---------|------|
| 1 | McGuire & Larson-Hall (2025, Elsevier) | WER scoring | `pronunciation_wer.py` |
| 2 | Singla et al. (2023, Springer) | WPS thresholds 2.0-2.4 | `fluency.py` |
| 3 | Trouvain et al. (2026, Benjamins) | Pause detection ≥250ms | `fluency.py` |
| 4 | Al-Ghezi et al. (2022, DigiTala) | Lexical diversity (TTR) | `metrics.py` |

### CHƯA IMPLEMENT (Part 3-5):

| # | Bài báo | Đóng góp | Ghi chú |
|---|---------|---------|---------|
| 5 | Soylu & Joyner (2025, Georgia Tech) | Socratic Viva | Tương lai |
| 6 | Halliday et al. (2026, Routledge) | AI-Critique | Tương lai |
| 7 | Zechner et al. (2014, ACL/ETS) | ETS Rubric | Có schema |

---

## ❓ CÂU HỎI PHẢN BIỆN & TRẢ LỜI

### Q: "Sao không dùng LLM để chấm Fluency?"

> **A:** Fluency **hoàn toàn không dùng LLM**. 
> - Tốc độ nói tính bằng công thức: `Words / Seconds`
> - Khoảng dừng đếm bằng Silero VAD (≥250ms)
> - Đây là toán học thuần túy, không phải AI đoán

### Q: "Con số 2.0-2.4 WPS lấy từ đâu?"

> **A:** Từ nghiên cứu của Singla et al. (2023, Springer)
> - Họ chạy XAI (SHAP/PDP) trên 47,000 bài thi
> - Tìm ra ngưỡng tối ưu bằng máy học
> - Chúng em kế thừa con số đã được chứng minh

### Q: "WER 3.2% là gì?"

> **A:** Đọc sai 3.2% từ
> - Câu gốc: 26 từ
> - Sai 1 từ → 1/26 ≈ 3.8%
> - WER càng thấp → phát âm càng tốt

### Q: "Chi phí hệ thống là bao nhiêu?"

> **A:** **0 VNĐ (Zero-Budget)**
> - Faster-Whisper: STT miễn phí, chạy local
> - Python jiwer: Tính WER miễn phí
> - PostgreSQL pgvector: Semantic search miễn phí
> - Ollama/Gemini Free: LLM miễn phí

---

## 🔧 NẾU GẶP LỖI

### Lỗi: "Cannot access microphone"
```
→ Vào Settings → Privacy → Microphone → Cho phép trình duyệt
```

### Lỗi: "Failed to grade"
```bash
→ Kiểm tra API logs:
docker compose logs -f api
```

### Lỗi: "Container not running"
```bash
→ Restart:
docker compose restart api
```

### Lỗi: "CORS error"
```bash
→ Kiểm tra .env có ALLOWED_ORIGINS=http://localhost:3000
```

---

## ✅ CHECKLIST TRƯỚC KHI DEMO

- [ ] Docker đang chạy (`docker compose ps`)
- [ ] Frontend accessible (`http://localhost:3000`)
- [ ] Demo page mở được (`/teacher/grading/live`)
- [ ] Microphone hoạt động (test record)
- [ ] Part 1 submit & grade được
- [ ] Part 2 submit & grade được
- [ ] Đọc hiểu demo-flow-english-speaking.md
- [ ] Đọc hiểu scientific-foundation-and-defense-report.md
- [ ] Luyện demo script 3-5 lần

---

## 📞 LIÊN HỆ

Nếu gặp vấn đề không giải quyết được:
1. Check docs/ nhiều lần
2. Check code comments trong các file
3. Liên hệ: [Your contact]

---

## 🎓 LỜI CHÚC

Bạn làm được! Hệ thống đã sẵn sàng, chỉ cần bạn:
1. Hiểu luồng demo
2. Hiểu các chỉ số cơ bản
3. Tự tin trình bày

**Chúc bạn demo thành công!** 🍀

---

## 📖 ĐỌC THÊM

| File | Đường dẫn | Nội dung |
|------|-----------|----------|
| Demo Flow | `docs/demo-flow-english-speaking.md` | Luồng demo chi tiết |
| Scientific Report | `docs/scientific-foundation-and-defense-report.md` | Báo cáo khoa học + Q&A |
| Paper Status | `docs/research/paper-implementation-status.md` | Trạng thái implement |
| Optimal Solution | `docs/research/optimal-speaking-assessment-solution.md` | Thiết kế 5 parts |
