# Thiết kế Kỹ thuật: Phân hệ Thí sinh (Student) làm bài thi PTE Speaking - Đề 1 (6 Phần)

- **Ngày tạo:** 12/10/2026
- **Trạng thái:** Đã phê duyệt (Approved)
- **Mục tiêu:** Cung cấp trải nghiệm thi nói chuẩn PTE (Pearson Test of English) trên nền tảng AI Oral Assessment Platform cho sinh viên, hỗ trợ đầy đủ 6 dạng bài với media âm thanh, hình ảnh và cơ chế tự động đếm ngược chuyển pha (Prep -> Beep -> Record).

---

## 1. Bối cảnh & Mục tiêu

Hệ thống hiện tại được thiết kế cho các bài thi vấn đáp lý thuyết (câu hỏi văn bản thuần túy, ghi âm 1 lần). Để mở rộng sang đánh giá năng lực tiếng Anh theo chuẩn PTE:
- Sinh viên cần làm bài thi gồm 6 dạng bài đặc thù:
  1. **Read Aloud (RA)**
  2. **Repeat Sentence (RS)**
  3. **Describe Image (DI)**
  4. **Re-tell Lecture (RL)**
  5. **Summarize Group Discussion (SGD)**
  6. **Respond to a Situation (RTS)**
- Đề thi đòi hỏi các tương tác đa phương tiện:
  - Tự động phát âm thanh đề bài (RS, RL, SGD, RTS).
  - Hiển thị hình ảnh biểu đồ / slide sắc nét (DI, RL).
  - Tự động chuyển pha đếm ngược thời gian chuẩn bị (Preparation Time) sang thời gian ghi âm (Recording Time) kèm tín hiệu âm thanh Bíp (Beep).
  - Tự động ngắt khi hết thời gian trả lời hoặc thí sinh chủ động kết thúc.

---

## 2. Dữ liệu Đề 1 (PTE Speaking Test 1 Dataset)

Tất cả tài nguyên tĩnh đã được tạo và đặt tại `apps/admin-web/public/pte/test1/`:
- `q1_ra_sample.mp3`
- `q2_rs.mp3`
- `q3_di.svg`
- `q4_rl.mp3`
- `q5_sgd.mp3`
- `q6_rts.mp3`

### Chi tiết 6 câu hỏi:

1. **Câu 1: Read Aloud (RA)**
   - Type: `READ_ALOUD`
   - Instruction: *"Look at the text below. In 40 seconds, you must read this text aloud as naturally and clearly as possible. You have 40 seconds to read aloud. The microphone will stop after 3 seconds of silence!"*
   - Text: *"Sleep behavior is also known as a sleep disorder. People with sleep disorders often talk or walk in their sleep. They are not aware of what they are talking about or where they are going. There aren't any serious effects on the body in general but it may be connected to mental health. People with childhood trauma, unspeakable problems or depression are the ones with different sleep behavior."*
   - Prep Time: 40s | Speak Time: 40s | Silence Timeout: 3s
   - Model Audio: `/pte/test1/q1_ra_sample.mp3`

2. **Câu 2: Repeat Sentence (RS)**
   - Type: `REPEAT_SENTENCE`
   - Instruction: *"You will hear a sentence. Please repeat the sentence exactly as you hear it. The microphone will stop after 3 seconds of silence!"*
   - Text (Sentence): *"At that time, people moved from towns to villages."*
   - Prompt Audio: `/pte/test1/q2_rs.mp3`
   - Prep Time: 0s | Speak Time: 15s | Silence Timeout: 3s

3. **Câu 3: Describe Image (DI)**
   - Type: `DESCRIBE_IMAGE`
   - Instruction: *"Look at the image below. In 25 seconds, please speak into the microphone and describe in detail what the image is showing. You have 40 seconds to give your response. The microphone will stop after 3 seconds of silence!"*
   - Prompt Image: `/pte/test1/q3_di.svg`
   - Text: *"Approximate composition of the air (Nitrogen: 79%, Oxygen: 20%, Other gases: 1%)"*
   - Prep Time: 25s | Speak Time: 40s | Silence Timeout: 3s

4. **Câu 4: Re-tell Lecture (RL)**
   - Type: `RETELL_LECTURE`
   - Instruction: *"You will hear a lecture. After listening to the lecture, in 10 seconds, please speak into the microphone and retell what you have just heard from the lecture in your own words. You will have 40 seconds to give your response. The microphone will stop after 3 seconds of silence!"*
   - Prompt Audio: `/pte/test1/q4_rl.mp3`
   - Text: *"Lecture on Successful Entrepreneurship and Innovative Ideas"*
   - Prep Time: 10s | Speak Time: 40s | Silence Timeout: 3s

5. **Câu 5: Summarize Group Discussion (SGD)**
   - Type: `SUMMARIZE_GROUP_DISCUSSION`
   - Instruction: *"You will hear three people having a discussion. When you hear the beep, summarize the whole discussion. You will have 10 seconds to prepare and 2 minutes to give your response. The microphone will stop after 3 seconds of silence!"*
   - Prompt Audio: `/pte/test1/q5_sgd.mp3`
   - Text: *"Group Discussion on Artificial Intelligence in Creative Fields"*
   - Prep Time: 10s | Speak Time: 120s | Silence Timeout: 3s

6. **Câu 6: Respond to a Situation (RTS)**
   - Type: `RESPOND_TO_SITUATION`
   - Instruction: *"Listen to and read a description of a situation. Then answer a question about it with an extended response. You will have 10 seconds to think about your answer. You will have 40 seconds to give your response. The microphone will stop after 3 seconds of silence!"*
   - Prompt Audio: `/pte/test1/q6_rts.mp3`
   - Text: *"You're at a local café and realize you left your wallet at home after ordering. The cashier is waiting for payment, and you don't have enough time to go back home. What would you say to the cashier to resolve the situation?"*
   - Prep Time: 10s | Speak Time: 40s | Silence Timeout: 3s

---

## 3. Kiến trúc Luồng thi Thí sinh (Student Examination Engine)

### 3.1. Cỗ máy trạng thái (Question State Machine)
Mỗi câu hỏi trải qua các trạng thái tuần tự:
1. `PROMPT_AUDIO`: Nếu có `prompt_audio`, audio phát tự động. Nút ghi âm bị khóa, thanh tiến trình hiển thị "Playing audio...".
2. `PREPARING`: Đếm ngược thời gian chuẩn bị (`prep_time`). Thanh trạng thái màu xanh dương hiển thị "Beginning in: Xs". Có nút "Skip & Record Now".
3. `BEEP_TRANSITION`: Khi hết `prep_time`, phát âm thanh Bíp (Web Audio API, 880Hz, 300ms).
4. `RECORDING`: Tự động bật micro và webcam để thu âm câu trả lời. Thanh trạng thái màu đỏ nhấp nháy "Recording: Ys left". Có nút "Kết thúc trả lời" để nộp sớm.
5. `PROCESSING_STT`: Khi hết `speak_time` hoặc thí sinh bấm kết thúc, micro dừng thu, audio được chuyển đổi STT, video/audio chunks upload ngầm lên server.
6. `SUBMITTED`: Nộp kết quả câu hỏi và chuyển sang câu kế tiếp.

### 3.2. Cấu trúc Component
- `PTEQuestionCard`: Render đề bài (Instruction, Text, Image SVG/PNG, Audio Player).
- `PTECountdownBar`: Render thanh đếm ngược 2 pha với màu sắc trực quan (xanh cho Prep, đỏ nhấp nháy cho Record).
- `playPTEBeep()`: Hàm Web Audio API phát tiếng bíp chuẩn xác.

---

## 4. Dữ liệu Database Seed
Tạo script seed `scripts/seed_pte_test1.py`:
- Tạo Môn học: `PTE-CORE` (PTE Core & Academic Speaking Assessment).
- Tạo Rubric: Tiêu chí Content (3đ), Oral Fluency (5đ), Pronunciation (5đ).
- Tạo Đề thi: `PTE-TEST-1` (PTE Speaking Practice Test 1), trạng thái `PUBLISHED`.
- Snapshot đề thi chứa đầy đủ 6 câu hỏi đa phương tiện trên.
- Tự động ghi danh (Enroll) tất cả sinh viên hoặc tạo sẵn bài thi khả dụng.

---

## 5. Kế hoạch Kiểm thử & Xác minh (Verification)
1. Chạy seed nạp đề `PTE Speaking Practice Test 1`.
2. Đăng nhập tài khoản sinh viên.
3. Kiểm tra hiển thị đề thi trong danh sách `Bài thi khả dụng`.
4. Bắt đầu thi:
   - Câu 1: Đếm ngược 40s chuẩn bị -> Bíp -> Thu âm 40s.
   - Câu 2: Tự phát audio câu lặp lại -> Bíp -> Thu âm 15s.
   - Câu 3: Hiển thị biểu đồ SVG -> Đếm ngược 25s -> Bíp -> Thu âm 40s.
   - Câu 4: Phát audio bài giảng -> Đếm ngược 10s -> Bíp -> Thu âm 40s.
   - Câu 5: Phát audio thảo luận nhóm -> Đếm ngược 10s -> Bíp -> Thu âm 120s.
   - Câu 6: Phát tình huống -> Đếm ngược 10s -> Bíp -> Thu âm 40s.
5. Nộp bài thành công và xác nhận các chunk media upload đầy đủ.
