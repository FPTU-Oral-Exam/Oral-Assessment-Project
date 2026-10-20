# TASK ASSIGNMENT: Demo Preparation
> **Assigned to:** Team Member  
> **Due:** Tomorrow (Before Demo)  
> **Supervisor:** [Your Name]

---

## 📋 TASKS OVERVIEW

You have 1 main task tonight:
1. **Test the Demo Flow** - Make sure everything works end-to-end
2. **Prepare Demo Script** - Practice the presentation

---

## 🎯 TASK 1: Test Demo Flow

### 1.1 Start the System

```bash
# Navigate to project
cd D:\DuAnKhoa\AI-Oral-Assessment-Platform

# Start Docker services
docker compose up -d

# Wait for services to be healthy (postgres, redis, minio, api)
docker compose ps
```

### 1.2 Start Frontend

```bash
# In a new terminal
cd apps/staff-portal
npm run dev
```

### 1.3 Test the Demo Page

```
URL: http://localhost:3000/teacher/grading/live
```

### 1.4 Test Flow

```
Part 1: Free Response
├── Open page
├── Click "Part 1" button
├── Show question: "Tell me about your favorite hobby"
├── Click microphone
├── Speak for 30-60 seconds
├── Click stop
├── Click "Submit & Grade"
└── Verify results show Fluency + Vocabulary metrics

Part 2: Read Aloud
├── Click "Part 2" button
├── Show sentence: "The quick brown fox..."
├── Click microphone
├── Read the sentence aloud
├── Click stop
├── Click "Submit & Grade"
└── Verify WER score shows
```

### 1.5 If Errors Occur

**Error: "Cannot access microphone"**
→ Allow microphone permission in browser

**Error: "Failed to grade"**
→ Check API logs: `docker compose logs -f api`

**Error: "Container not running"**
→ Restart: `docker compose restart api`

---

## 🎬 TASK 2: Demo Script

### Opening (1 minute)
```
"Xin chào thầy/cô. Hôm nay chúng em sẽ demo hệ thống OralAI - 
nền tảng thi vấn đáp tiếng Anh tự động bằng AI.

Hệ thống này có 2 điểm đặc biệt:
1. Chấm điểm TỰ ĐỘNG với độ chính xác cao
2. Chi phí VẬN HÀNH = 0 ĐỒNG (Zero-Budget)"
```

### Demo Part 1 (2 minutes)
```
"Bây giờ em sẽ demo Part 1 - Free Response

[Click Part 1]

Câu hỏi: 'Tell me about your favorite hobby'
Thí sinh có 30 giây chuẩn bị và 60 giây để trả lời.

[Click microphone, speak]

Đã submit. Hệ thống sẽ:
1. Ghi âm bằng browser
2. Gửi lên server
3. Whisper chuyển giọng nói thành text
4. Tính toán Fluency metrics

[Kết quả hiện ra]
- Fluency: 2.1 words/second (TỐI ƯU)
- Vocabulary: TTR 0.73 (PHONG PHÚ)
- Score: 7.5/10
```

### Demo Part 2 (2 minutes)
```
"Part 2 - Read Aloud

[Click Part 2]

Đề bài: Đọc câu 'The quick brown fox jumps over the lazy dog...'
Không có thời gian chuẩn bị - đọc ngay!

[Click microphone, read sentence]

Đã submit. Hệ thống sẽ:
1. Whisper chuyển thành text
2. So sánh với đáp án bằng WER (Word Error Rate)
3. Tính điểm phát âm

[Kết quả hiện ra]
- WER: 3.2% (XUẤT SẮC - gần như hoàn hảo)
- Fluency: 2.3 words/second (TỐI ƯU)
- Score: 8.5/10
```

### Explain the Science (2 minutes)
```
"Hệ thống dựa trên 7 bài báo khoa học quốc tế:

1. McGuire & Larson-Hall (2025) - WER scoring
2. Singla et al. (2023) - Speech rate thresholds
3. Trouvain et al. (2026) - Pause detection
4. Al-Ghezi et al. (2022) - Vocabulary analysis

Điểm đặc biệt:
- Tốc độ nói chuẩn: 2.0-2.4 words/second (từ nghiên cứu 47,000 bài thi)
- WER có độ tương quan r=0.81 với giám khảo người"
```

### Zero-Budget Explanation (1 minute)
```
"Vì sao chi phí = 0?

1. Faster-Whisper - Nhận dạng giọng nói MIỄN PHÍ, chạy local
2. Python jiwer - Tính WER MIỄN PHÍ, 0.05 giây
3. PostgreSQL pgvector - Tìm kiếm ngữ nghĩa MIỄN PHÍ
4. Ollama/Gemini Free - Chấm lập luận MIỄN PHÍ"
```

### Future Plans (1 minute)
```
"Trong tương lai, hệ thống sẽ mở rộng lên 5 parts:

Part 3: Topic Description
Part 4: AI-Critique (vạch lỗi AI)
Part 5: Socratic Viva (vấn đáp phản biện)"
```

---

## 📞 IF STUCK

**Can't start Docker:**
```bash
docker compose down
docker compose up -d
```

**API errors:**
```bash
docker compose logs api
```

**Frontend not loading:**
```bash
# Check if port 3000 is in use
netstat -an | findstr 3000
```

---

## ✅ DONE CHECKLIST

- [ ] Docker running
- [ ] Frontend accessible
- [ ] Part 1 recording works
- [ ] Part 1 grading shows results
- [ ] Part 2 recording works
- [ ] Part 2 grading shows WER
- [ ] Demo script practiced
- [ ] Ready for tomorrow!

---

## 📝 NOTES FOR SUPERVISOR

This task is assigned to help you prepare for the demo. If you encounter any issues:
1. Check the logs first
2. Try restarting Docker
3. Contact me if needed

Good luck! 🍀
