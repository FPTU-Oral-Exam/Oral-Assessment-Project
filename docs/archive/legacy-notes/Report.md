# Báo cáo Nghiên cứu — AI Oral Assessment Platform

> **Tác giả:** Nguyễn Văn Gia Bình
> **Đơn vị:** Trường Đại học FPT

---

## Mô tả tài liệu

Tài liệu này trình bày kết quả nghiên cứu và phân tích tổng quan về hệ thống **AI Oral Assessment Platform** — nền tảng thi vấn đáp ứng dụng trí tuệ nhân tạo trong môi trường giáo dục đại học.

Báo cáo bao gồm: bối cảnh bài toán, khảo sát công nghệ liên quan, thiết kế kiến trúc hệ thống và định hướng triển khai thực tế tại Khoa.

---

## 1. Problem Statement (Phát biểu Bài toán)

### 1.1 Bối cảnh & Hiện trạng

Thi vấn đáp (oral examination) là hình thức kiểm tra đánh giá năng lực sinh viên thông qua đối thoại trực tiếp giữa giảng viên và sinh viên. Đây là phương pháp đánh giá toàn diện, phản ánh khả năng tư duy, diễn đạt và hiểu biết chuyên sâu của người học — những yếu tố mà bài thi viết trắc nghiệm khó đo lường được.

Tại các trường đại học kỹ thuật quy mô lớn như **Đại học FPT (FPTU)**, hình thức thi vấn đáp đang được áp dụng ở nhiều môn học quan trọng. Tuy nhiên, việc tổ chức hoàn toàn theo phương thức thủ công truyền thống đang bộc lộ nhiều hạn chế nghiêm trọng khi quy mô đào tạo ngày càng mở rộng. Trước mắt hệ thống tập trung phát triển cho kỳ thi kiểm tra tiếng Anh.

---

### 1.2 Đau điểm (Pain Points)

#### 🔴 Đối với Giảng viên & Cán bộ Khảo thí

| Vấn đề                                   | Mô tả cụ thể                                                                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tốn thời gian chuẩn bị**        | Mỗi đợt thi, giảng viên phải tự soạn ngân hàng câu hỏi, phân bổ câu hỏi cho từng sinh viên theo cấu trúc đề (Exam Blueprint) một cách thủ công                                            |
| **Gánh nặng chấm điểm**          | Với lớp 30–50 sinh viên, mỗi ca thi vấn đáp 10–15 phút/sinh viên, giảng viên phải "ngồi nghe" và chấm điểm liên tục trong 5–8 giờ mà không có tài liệu hỗ trợ tra cứu ngay lập tức |
| **Thiếu nhất quán**                | Tiêu chí chấm điểm (rubric) thường mang tính chủ quan, dễ bị ảnh hưởng bởi yếu tố cảm xúc, thứ tự thi hoặc sự mệt mỏi của giảng viên cuối buổi                                        |
| **Không có bằng chứng lưu trữ** | Kết quả bài thi không có recording audio/video, khi sinh viên khiếu nại không có cơ sở để phúc khảo khách quan                                                                                     |
| **Khó mở rộng quy mô**            | Tổ chức thi cho 200–500 sinh viên trong một học kỳ đòi hỏi điều phối lịch phức tạp, dễ xảy ra xung đột và thiếu giảng viên coi thi                                                          |

#### 🔴 Đối với Sinh viên

| Vấn đề                    | Mô tả cụ thể                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Thiếu công bằng** | Sinh viên được hỏi câu dễ/khó khác nhau do bộ câu hỏi không được chuẩn hóa theo cùng một mức độ |
| **Áp lực tâm lý**  | Thi trực tiếp với người chấm gây lo lắng, không phản ánh đúng năng lực thực sự của sinh viên        |
| **Thiếu minh bạch**  | Không biết điểm được chấm dựa trên tiêu chí gì cụ thể                                                   |

---

### 1.3 Quy mô vấn đề

Ước tính tại một khoa kỹ thuật quy mô trung bình tại FPTU:

- **~500–1.000 sinh viên/học kỳ** có môn học yêu cầu thi vấn đáp
- **~20–40 giảng viên** phải tham gia coi thi và chấm điểm
- **~3–5 ngày thi tập trung** mỗi học kỳ, mỗi ngày 8–10 ca thi
- Nếu mỗi ca thi 10 phút/sinh viên → **tổng cộng ~100–170 giờ-người** chỉ để ngồi coi thi và chấm điểm thủ công mỗi học kỳ

Đây là chi phí nhân lực lớn và khó duy trì khi quy mô tuyển sinh tăng.

---

### 1.4 Hạn chế của các Giải pháp Hiện có

Một số giải pháp công nghệ hiện có đã được khảo sát nhưng đều chưa đáp ứng đủ yêu cầu thực tế:

| Giải pháp                                         | Hạn chế                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Google Forms / Quiz trực tuyến**          | Chỉ kiểm tra được kiến thức dạng trắc nghiệm, không đánh giá được kỹ năng diễn đạt miệng            |
| **Zoom/Meet recording thủ công**            | Vẫn cần giảng viên ngồi nghe lại và chấm thủ công, không giảm tải được công việc                         |
| **Nền tảng IELTS/TOEFL AI (ETS, Duolingo)** | Đắt tiền, thiết kế cho tiếng Anh thương mại, không tùy biến được rubric theo từng môn học chuyên ngành |
| **Hệ thống LMS có sẵn (Moodle, Canvas)**  | Không hỗ trợ thi vấn đáp có STT, không tích hợp AI chấm điểm theo rubric                                      |

---

### 1.5 Phát biểu Bài toán (Problem Statement)

> **Làm thế nào để xây dựng một nền tảng thi vấn đáp tự động, ứng dụng AI, có khả năng:**
>
> 1. **Tự động sinh và phân bổ câu hỏi** theo Exam Blueprint và Learning Outcomes của từng môn học,
> 2. **Phiên âm tự động (Server-side STT)** bài trả lời của sinh viên từ audio thô, đảm bảo không thể gian lận transcript,
> 3. **Chấm điểm tự động theo Rubric** kết hợp Retrieval-Augmented Generation (RAG) từ giáo trình,
> 4. **Lưu trữ bằng chứng audio/video** phục vụ phúc khảo minh bạch,
> 5. **Hỗ trợ giảng viên kiểm tra và phê duyệt kết quả** (Human-in-the-loop),
>
> nhằm **giảm tải tối thiểu 70% thời gian tổ chức và chấm thi** cho giảng viên, đồng thời **tăng tính khách quan, công bằng và có thể kiểm chứng** trong công tác đánh giá sinh viên tại trường đại học?

---

## 2. Literature Review (Tổng quan Tài liệu)

Phần này tổng hợp các nghiên cứu, bài báo và công nghệ lõi đã được khảo sát nhằm xây dựng nền tảng lý thuyết và định hướng kiến trúc cho hệ thống **AI Oral Assessment Platform**. Quá trình đọc báo được thực hiện liên tục và kết quả tóm tắt sẽ được cập nhật dần vào danh sách dưới đây.

*(Ghi chú: Bản tóm tắt chi tiết của từng bài báo có thể được xem xét tại các tài liệu Markdown thông qua công cụ tóm tắt `summarize-research-paper`)*

### 2.1. DigiTala: Automatic Speaking Assessment for L2 Speech

---

**title:** "An Automatic Speaking Assessment System for Spontaneous L2 Speech in Under-Resourced Languages"
**authors:** Al-Ghezi, R., Getman, Y., Grönroos, S.-A., Kurimo, M., Lindén, K., Meister, L., Paukkonen, H., Qvintus, P., Rodina, J., Smit, P., & Ylinen, S.
**year:** 2022
**venue:** Fonetiikan päivät — Book of Abstracts, University of Eastern Finland, Joensuu
**tags:** paper-reading · topic/spoken-language-assessment · topic/asr · topic/nlp · status/completed
**rating:** ⭐⭐⭐⭐☆
**url:** *(Kỷ yếu hội nghị nội bộ, không có DOI public)*
**code_repo:** https://github.com/aalto-speech/moodle-mod_digitala
**read_date:** 2026-10-09

---

> **TL;DR:** Bài báo trình bày hệ thống DigiTala — một pipeline đánh giá kỹ năng nói ngẫu hứng (L2 spontaneous speech) cho ngôn ngữ ít tài nguyên (tiếng Phần Lan & Thụy Điển) bằng cách kết hợp mô hình ASR tự giám sát (wav2vec 2.0) với 5 phân hệ đánh giá độc lập (ngữ pháp, phát âm, độ trôi chảy, bám sát đề, tổng quát) tích hợp vào Moodle LMS.

---

#### 1. Context & Problem (Bối cảnh & Bài toán)

- **Vấn đề cần giải quyết:** Đánh giá kỹ năng nói ngẫu hứng (spontaneous speech) trong môi trường giáo dục ngoại ngữ (L2) đòi hỏi nhiều thời gian và nhân lực giảng viên; đặc biệt khó tự động hóa với các ngôn ngữ "ít tài nguyên" (under-resourced languages) vốn không có đủ dữ liệu gán nhãn âm thanh khổng lồ như tiếng Anh.
- **Hạn chế của giải pháp hiện tại:** Các hệ thống ASR và chấm điểm thương mại (ETS, Duolingo) chỉ tối ưu cho tiếng Anh. Các LMS như Moodle không tích hợp STT hay AI chấm theo rubric. Dữ liệu huấn luyện tiếng Phần Lan và tiếng Thụy Điển quá nhỏ nếu dùng phương pháp học có giám sát truyền thống.
- **Mục tiêu nghiên cứu:** Xây dựng một pipeline hoàn chỉnh — từ thu âm trong Moodle → ASR → trích xuất đặc trưng âm thanh + văn bản → chấm điểm đa tiêu chí tự động — có thể triển khai thực tế trong các khóa học tiếng Phần Lan và Thụy Điển tại hệ thống đại học Phần Lan.

#### 2. Proposed Method (Phương pháp đề xuất)

- **Ý tưởng cốt lõi:** Không dùng một mô hình AI nguyên khối (end-to-end). Thay vào đó, tách thành 5 phân hệ đánh giá (Evaluators) hoạt động độc lập rồi tổng hợp điểm cuối.
- **Kiến trúc hệ thống / Pipeline:**
  - *ASR Module (wav2vec 2.0 fine-tuned):* Nhận file âm thanh thô từ Moodle → xuất transcript văn bản (L2 speech → text). Dùng mô hình self-supervised learning để không cần data gán nhãn khổng lồ.
  - *Lexico-grammatical Evaluator:* Nhận transcript từ ASR → phân tích đặc trưng ngôn ngữ học (POS tagging, dependency parse, type-token ratio) → chấm điểm Ngữ pháp & Từ vựng.
  - *Pronunciation & Fluency Evaluator:* Nhận **tín hiệu âm thanh thô** (bỏ qua transcript) → dùng forced alignment (Montreal Forced Aligner) để đo tốc độ nói (speech rate), tỷ lệ khoảng lặng (pause ratio), số lần ngập ngừng (disfluency count) và đặc trưng ngữ điệu (prosodic features) → chấm điểm Phát âm & Độ trôi chảy.
  - *Task Accomplishment Evaluator:* Đối chiếu nội dung transcript với yêu cầu đề bài thông qua mô hình NLU → chấm điểm mức độ bám sát câu hỏi.
  - *Holistic Overall Score Evaluator:* Một mô hình máy học nhỏ (hồi quy) nhận điểm từ 4 phân hệ trên làm đặc trưng đầu vào → xuất điểm tổng quát theo thang chuẩn CEFR (A1–C2).
- **Xử lý thiên vị người chấm (Rater Bias):** Dữ liệu huấn luyện là điểm do nhiều giảng viên khác nhau chấm. Nhóm tác giả áp dụng **Many-facet Rasch Measurement (MFRM)** để tính "điểm công bằng" (fair average score), triệt tiêu mức độ khắt khe/nương tay cố hữu của từng rater trước khi đưa vào huấn luyện mô hình.

#### 3. Evaluation & Key Results (Thực nghiệm & Kết quả)

- **Dataset:** Bộ dữ liệu bài nói ngẫu hứng của học sinh học tiếng Phần Lan và tiếng Thụy Điển như ngoại ngữ thứ 2 (L2), thu thập trong môi trường học thực tế qua Moodle. Quy mô không công bố cụ thể trong bản tóm tắt này.
- **Baseline so sánh:** Hệ thống chấm thủ công bởi giảng viên (Human raters); một số baseline ASR truyền thống (HMM-GMM).
- **Chỉ số chính:** Pearson correlation giữa điểm AI và điểm Human, WER/CER của ASR.
- **Kết quả nổi bật:**
  - Mô hình wav2vec 2.0 fine-tuned đạt WER (Work error rate) thấp hơn đáng kể so với các baseline ASR truyền thống trên tập dữ liệu tiếng Phần Lan ít tài nguyên.
  - Kiến trúc 5 phân hệ cho tương quan Human-System Agreement (Pearson r) cao hơn so với baseline chấm nguyên khối.
  - Ablation Study cho thấy **Pronunciation & Fluency Evaluator** (phân tích âm thanh thô) là module đóng góp quan trọng nhất vào điểm tổng quát, chứng tỏ đặc trưng acoustic vượt trội hơn đặc trưng văn bản đơn thuần khi chấm L2 speech.

#### 4. Critical Thinking & Limitations (Phản biện & Hạn chế)

- **Tại sao phương pháp này hiệu quả?** Vì nó tách biệt hai nguồn tín hiệu khác nhau về bản chất: *âm thanh học* (acoustic) cho Fluency/Pronunciation và *ngôn ngữ học* (linguistic) cho Grammar/Task. Mỗi nguồn cần công cụ chuyên biệt khác nhau, và việc kết hợp chúng cho kết quả tốt hơn bất kỳ nguồn đơn lẻ nào.
- **Hạn chế tự thừa nhận:**
  - Hệ thống Frontend là plugin Moodle viết bằng PHP, không tái sử dụng được cho kiến trúc khác.
  - Phụ thuộc vào Montreal Forced Aligner cần từ điển phát âm (pronunciation lexicon) riêng cho từng ngôn ngữ — tốn công chuẩn bị nếu chuyển sang ngôn ngữ mới.
  - Mô hình được huấn luyện trên phân phối L2 tiếng Phần Lan/Thụy Điển, chưa kiểm chứng khả năng transfer sang ngôn ngữ khác.
- **Trade-offs & Rủi ro tiềm ẩn:**
  - Pipeline có nhiều bước nối tiếp (ASR → Alignment → Feature Extraction → Grading) tạo ra latency cao, không phù hợp cho chấm điểm real-time.
  - Lỗi ASR sẽ lan truyền (error propagation) xuống các Evaluators phía sau dựa vào transcript.
  - Dataset nhỏ và chưa public → khó tái lập kết quả độc lập (reproducibility thấp).

#### 5. Actionable Takeaways & Next Steps (Ứng dụng)

- **Ý tưởng áp dụng trực tiếp vào dự án:**
  - Thiết kế **Grading Engine trên Celery/Redis** theo kiến trúc 2-pipeline song song: *(a)* Pipeline âm thanh: file audio từ MinIO → `librosa`/`parselmouth` trích xuất speech rate, pause ratio, disfluency → điểm Fluency; *(b)* Pipeline văn bản: transcript từ PhoWhisper/Whisper → LLM + RAG (pgvector) → điểm Grammar & Task Response.
  - Tích hợp ý tưởng **MFRM** vào chức năng Phúc khảo của `EXAMINER`: khi có ≥2 giảng viên chấm lại, dùng thuật toán chuẩn hóa thay vì trung bình đơn giản để triệt tiêu rater bias.
- **Tài liệu cần đọc tiếp (Seed citations):**
  - [ ] *wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations* (Baevski et al., 2020) — Nền tảng ASR mà DigiTala sử dụng.
  - [ ] *Montreal Forced Aligner* (McAuliffe et al., 2017) — Công cụ forced alignment để đo Fluency features.
  - [ ] *SpeechBrain: A General-Purpose Speech Toolkit* (Ravanelli et al., 2021) — Bộ công cụ Python thay thế tổng hợp cho ASR + Pronunciation scoring.

### 2.2. Whisper ASR & WER Scoring for Elicited Imitation (McGuire & Larson-Hall, 2025)

---

**title:** "Assessing Whisper automatic speech recognition and WER scoring for elicited imitation: Steps toward automation"
**authors:** Michael McGuire, Jenifer Larson-Hall
**year:** 2025
**venue:** Research Methods in Applied Linguistics, Elsevier (Vol. 4, Issue 1, 100197)
**tags:** paper-reading · topic/spoken-language-assessment · topic/asr · topic/whisper · topic/wer · status/completed
**rating:** ⭐⭐⭐⭐⭐
**url:** https://doi.org/10.1016/j.rmal.2025.100197
**code_repo:** N/A *(Sử dụng mô hình OpenAI Whisper mã nguồn mở)*
**read_date:** 2026-10-10

---

> **TL;DR:** Nghiên cứu chứng minh tính khả thi của việc tự động hóa hoàn toàn quá trình chấm điểm bài thi nghe-lặp lại (Elicited Imitation - EI) bằng cách kết hợp mô hình mã nguồn mở Whisper ASR (chuyển âm thanh thành văn bản) và chỉ số Word Error Rate (WER). Điểm số tự động đạt độ tương quan cực kỳ cao ($r = 0.969$) so với giám khảo con người chấm theo rubric truyền thống của Ortega et al. (2002).

---

#### 1. Context & Problem (Bối cảnh & Bài toán)

- **Vấn đề cần giải quyết:** Elicited Imitation (EI - Nghe câu mẫu rồi lặp lại chính xác) là phương pháp tâm lý ngôn ngữ học đo lường năng lực nói tổng quát (oral proficiency) và mức độ thẩm thấu cấu trúc ngữ pháp rất hiệu quả. Tuy nhiên, EI bị hạn chế ứng dụng rộng rãi do khâu chấm điểm thủ công tốn quá nhiều thời gian và công sức của giảng viên.
- **Hạn chế của giải pháp hiện tại:** Phương pháp chấm truyền thống dựa vào con người (Human raters) dùng thang đo thứ bậc (ordinal-scale rubric) rất chậm chạp, tốn kém chi phí và khó mở rộng khi số lượng thí sinh lên tới hàng trăm, hàng nghìn người.
- **Mục tiêu nghiên cứu:** Kiểm nghiệm tính khả thi của việc tự động hóa hoàn toàn pipeline chấm điểm EI bằng sự kết hợp giữa hệ thống ASR mã nguồn mở (OpenAI Whisper) và độ đo lệch từ vựng tự động (Word Error Rate - WER).

#### 2. Proposed Method (Phương pháp đề xuất)

- **Ý tưởng cốt lõi (Core Intuition):** Khi câu mẫu trong bài thi EI đủ dài (vượt dung lượng bộ nhớ làm việc 8–10 âm tiết), thí sinh buộc phải hiểu và tái cấu trúc câu trong não bộ trước khi nói lại. Hệ thống chuyển đổi giọng nói thí sinh thành văn bản (Speech-to-Text), sau đó đo lường độ sai lệch giữa câu thí sinh nói với câu gốc bằng công thức toán học để quy đổi thành điểm số khách quan.
- **Kiến trúc hệ thống / Pipeline:**
  - *Module 1 (Speech-to-Text):* Sử dụng Whisper ASR (chạy server-side) phiên âm câu trả lời dạng audio của thí sinh thành văn bản tiếng Anh mà không cần con người can thiệp hay can thiệp từ client.
  - *Module 2 (Automated Scoring):* Sử dụng thuật toán Word Error Rate (WER) so sánh chuỗi văn bản transcript của Whisper với văn bản prompt gốc của đề thi.
- **Công thức / Thuật toán quan trọng:**
  $$\text{WER} = \frac{S + D + I}{N}$$
  *(Trong đó: $S$ là số từ bị thay thế/nói sai, $D$ là số từ bị bỏ sót/nói thiếu, $I$ là số từ chèn thêm/nói thừa, $N$ là tổng số từ của câu prompt gốc).*

#### 3. Evaluation & Key Results (Thực nghiệm & Kết quả)

- **Dataset:** 900 câu trả lời nói tiếng Anh dạng EI thu thập từ 30 người học tiếng Anh bản ngữ tiếng Nhật (L1 Japanese, L2 English), mỗi thí sinh hoàn thành bài thi 30 câu với độ khó và cấu trúc ngữ pháp đa dạng.
- **Baseline so sánh:** 2 chuyên gia khảo thí chấm độc lập theo thang điểm 5 mức truyền thống của Ortega et al. (2002) (Ortega test and rubric).
- **Chỉ số chính:** Hệ số tương quan nội bộ Intraclass Correlation Coefficient (ICC) giữa tỷ lệ lỗi, và hệ số tương quan tuyến tính Pearson ($r$) giữa điểm số tổng thể.
- **Kết quả nổi bật:**
  - **Độ chính xác phiên âm:** Tỷ lệ lỗi do Whisper ghi nhận căn chỉnh cực kỳ chuẩn xác với người chấm con người qua toàn bộ 900 câu trả lời: $\text{ICC} = 0.929$ (95% CI [0.921, 0.936]).
  - **Độ tương quan điểm số tổng thể:** Điểm số tự động bằng Whisper + WER đạt mức tương quan gần như tuyệt đối với điểm chấm tay của giám khảo con người: $r = 0.969$ (95% CI [0.935, 0.985]).
  - Khẳng định pipeline Whisper + WER hoàn toàn đủ độ tin cậy để thay thế phương pháp chấm thủ công truyền thống trong các kỳ thi kiểm tra năng lực nói.

#### 4. Critical Thinking & Limitations (Phản biện & Hạn chế)

- **Tại sao phương pháp này hiệu quả?** Whisper được huấn luyện trước trên 680.000 giờ dữ liệu đa dạng giúp nhận diện âm thanh L2 có ngữ điệu và phát âm không chuẩn cực tốt. Khi transcript chuẩn xác, thuật toán WER cung cấp một thước đo liên tục (continuous metric) nhạy bén và công bằng hơn thang đo thứ bậc rời rạc (ordinal scale 0–4) của con người.
- **Hạn chế tự thừa nhận:**
  - Whisper có xu hướng ngầm "tự sửa lỗi" (auto-correct) ngữ pháp hoặc từ ngữ nếu phát âm của người học gần đúng, vô tình làm giảm độ nhạy phát hiện lỗi phát âm tinh vi ở cấp độ âm vị (phoneme level).
  - Nghiên cứu chỉ thử nghiệm trên nhóm người học nói tiếng Nhật (L1 Japanese); cần kiểm chứng thêm trên người học nói tiếng Việt (L1 Vietnamese) với đặc trưng phát âm âm cuối (ending sounds) và cụm phụ âm (consonant clusters) khác biệt.
- **Đánh đổi & Rủi ro tiềm ẩn (Trade-offs & Hidden costs):**
  - Cần tài nguyên tính toán (GPU / Celery worker queue) để xử lý ASR trên server, tránh nghẽn khi có hàng trăm sinh viên nộp bài đồng thời.
  - Whisper có thể gặp hiện tượng lặp từ hoặc ảo giác (hallucination) trong các đoạn âm thanh im lặng kéo dài nếu không có pre-processing cắt lọc khoảng lặng (VAD - Voice Activity Detection).

#### 5. Actionable Takeaways & Next Steps (Ứng dụng vào Hệ thống)

- **Ý tưởng áp dụng trực tiếp vào dự án AI Oral Assessment Platform:**
  - **Chứng minh cơ sở khoa học:** Dùng bài báo này làm dẫn chứng học thuật then chốt để bảo vệ kiến trúc **Server-side STT + Automated Grading Engine** trước Hội đồng: khẳng định việc dùng mô hình Whisper chuyển giọng nói thành text trên Server rồi tính điểm hoàn toàn tương đương với giám khảo con người ($r = 0.969$).
  - **Thiết kế phân hệ chấm câu hỏi Elicited / Read-aloud:** Tích hợp pipeline Whisper/PhoWhisper kết hợp thuật toán so khớp WER trực tiếp vào Celery Background Worker để chấm tự động các phần thi đọc/nhại câu mẫu với độ trễ thấp và độ tin cậy tuyệt đối.
  - **Tiền xử lý âm thanh:** Tích hợp bộ lọc nhiễu RNNoise và Voice Activity Detection (VAD) trước khi đưa audio vào Whisper để triệt tiêu ảo giác âm thanh.
- **Tài liệu cần đọc tiếp (Seed citations):**
  - [ ] *Ortega, L., et al. (2002)* — Bộ rubric chuẩn và bài kiểm tra Elicited Imitation kinh điển trong đánh giá năng lực nói.
  - [ ] *Graham, C. R., et al. (2008)* — Elicited imitation as an oral proficiency measure with L2 English learners.

### 2.3. Zechner et al. (2014) — ETS Automated Speech Scoring for EFL Teachers

---

**title:** "Automated Scoring of Speaking Items in an Assessment for Teachers of English as a Foreign Language"
**authors:** Klaus Zechner, Keelan Evanini, Su-Youn Yoon, Lawrence Davis, Xinhao Wang, Lei Chen, Chong Min Lee, Chee Wee Leong
**year:** 2014
**venue:** BEA Workshop @ ACL (Association for Computational Linguistics)
**tags:** paper-reading · topic/ai-assessment · topic/asr · topic/ets · status/completed
**rating:** ⭐⭐⭐⭐☆
**url:** https://aclanthology.org/W14-0516/
**code_repo:** N/A (ETS proprietary — không public source)
**read_date:** 2025-01-XX

---

> **TL;DR:** Bài báo mô tả hệ thống chấm điểm tự động 21 câu hỏi speaking cho giáo viên EFL của ETS, sử dụng ASR + 19 features + Linear Regression đạt **speaker-level correlation r = 0.73** với human raters. Đây là nghiên cứu industry-grade với dataset thực tế 1,423 thí sinh, cung cấp baseline benchmark cho mọi hệ thống automated speaking scoring.

---

#### 1. Context & Problem (Bối cảnh & Bài toán)

- **Vấn đề cần giải quyết:** Đánh giá kỹ năng nói tiếng Anh của giáo viên EFL (non-native speakers) một cách tự động, khả thi về chi phí ở quy mô lớn, đặc biệt khi giáo viên đến từ nhiều ngôn ngữ mẹ đẻ (L1) khác nhau.
- **Hạn chế của giải pháp hiện tại:**
  - Hầu hết hệ thống ASR scoring trước đó chỉ hỗ trợ **Read Aloud** (restricted/constrained speech).
  - Responses rất ngắn (trung bình **6–14 words**) → các fluency/pronunciation features kém hiệu quả hơn so với read speech dài hơn.
  - Hơn **7% responses** có vấn đề kỹ thuật (noise, background speech, empty) → không thể chấm tự động.
  - Inter-rater reliability cho Read Aloud chỉ đạt **r = 0.51** — rubric không đủ rõ ràng.
- **Mục tiêu nghiên cứu:** Xây dựng prototype end-to-end cho bài thi EFL với **8 loại item** khác nhau, từ restricted (Read Aloud) đến semi-restricted (describe chart, answer visual prompts).

#### 2. Proposed Method (Phương pháp đề xuất)

- **Ý tưởng cốt lõi (Core Intuition):** Pipeline tuyến tính 4 bước: ASR → Feature Extraction → Filtering → Scoring. Mỗi item type có Linear Regression model riêng. Dùng Linear Regression thay vì deep learning — vì 19 features được thiết kế tốt đã đủ hiệu quả.
- **Kiến trúc hệ thống / Pipeline:**
  - *ASR Module (HMM-based Triphone):* Trained trên ~800 giờ non-native speech. 8 adapted Language Models (interpolation weight 0.9) cho 8 item types. WER: 11.4% (Read Aloud) → 41.4% (Incomplete Sentence).
  - *Feature Computation (19 features):* Trích xuất từ ASR output + Praat (pitch/power). Bao phủ 6 constructs: Content, Fluency, Pronunciation, Prosody, Vocabulary, Grammar.
  - *Filtering Model (Decision Tree):* Phát hiện responses không thể chấm (noise, empty, background speech) dựa trên ASR features + pitch/energy. Accuracy: **97%**, Recall: 90%, F-score: 0.84.
  - *Scoring Models:* 8 Linear Regression models (1/item type), predict score 1–3.
- **Công thức / Thuật toán quan trọng:**
  $$Score_{pred} = \beta_0 + \sum_{i=1}^{k} \beta_i \cdot Feature_i$$
  *(Linear Regression với features được chọn tối ưu cho từng item type. Ví dụ: Content WER cho Read Aloud, Grammar LM score cho Semi-restricted.)*

#### 3. Evaluation & Key Results (Thực nghiệm & Kết quả)

- **Dataset:**
  - **1,423 speakers**, ~29,699 responses, ~215.8 giờ speech
  - 8 loại item: Read Aloud (RA), Repeat Aloud (RP), Multiple Choice (MC), Chart (CH), Key Words (KW), Keyword Chart (KC), Incomplete Sentence (IS), Visuals (VI)
  - Mỗi test taker: 21 items ≈ **9 phút audio**
  - Double-scored bởi 2 human raters, thang điểm 1–3

- **Kết quả nổi bật — Item-level Pearson r:**

  | Item Type | S-H1 (AI-Human) | H1-H2 (Human-Human) | ASR WER |
  |---|---|---|---|
  | MC | **0.67** | 0.83 | 17.1% |
  | KC | 0.57 | 0.74 | 28.8% |
  | CH | 0.44 | 0.67 | 26.3% |
  | KW | 0.45 | 0.67 | 28.7% |
  | IS | 0.46 | 0.69 | 41.4% |
  | VI | 0.43 | 0.80 | 30.4% |
  | RP | 0.41 | 0.73 | 21.8% |
  | RA | 0.34 | 0.51 | 11.4% |

  - **Speaker-level (21 items aggregated):** `r = 0.73` (S-H1), `r = 0.742` (S-H2), `r = 0.934` (H1-H2 inter-rater)

- **Feature importance (Pearson r với human scores):**

  | Sub-construct | Restricted | Semi-restricted | Ý nghĩa |
  |---|---|---|---|
  | **Content** (WER, keywords, RegEx) | 0.33–0.67 | 0.34–0.61 | **Mạnh nhất** |
  | **Grammar** (LM score, POS) | – | 0.23–0.49 | Khá mạnh |
  | **Fluency** (rate, chunks, disfluencies) | 0.19–0.33 | 0.20–0.33 | Yếu — cần speech dài |
  | **Pronunciation** (vowel duration) | 0.20–0.22 | 0.13–0.31 | Rất yếu |
  | **Prosody** (stress, pitch) | 0.18–0.24 | 0.12–0.27 | Rất yếu |

#### 4. Critical Thinking & Limitations (Phản biện & Hạn chế)

- **Tại sao Linear Regression đủ tốt?** Với 19 features được thiết kế có chủ đích cho từng construct (content, fluency, prosody...), Linear Regression đạt `r = 0.73` — không cần deep learning. Điều này nghịch lý với intuition thường gặp ("cần LLM mạnh"). Câu trả lời: **feature quality > model complexity**.
- **Hạn chế tự thừa nhận:**
  - Responses ngắn (6–14 words) → fluency/pronunciation features kém hiệu quả.
  - Dataset tương đối nhỏ (300 speakers cho Model Training/Evaluation).
  - Inter-rater reliability cho Read Aloud chỉ r=0.51 → lỗi nằm ở rubric, không phải hệ thống.
  - WER biến đổi lớn (11–41%) nhưng **không ảnh hưởng nhiều** đến model performance như kỳ vọng.
- **Trade-offs & Rủi ro tiềm ẩn:**
  - 8 model riêng biệt → chi phí maintain cao, khó generalize sang item type mới.
  - Filtering model là bước bắt buộc: 7% responses không scorable sẽ làm nhiễu toàn bộ pipeline.

#### 5. Actionable Takeaways & Next Steps (Ứng dụng)

- **Ý tưởng áp dụng trực tiếp vào dự án AI Oral Assessment Platform:**

  1. **Filter là bước không thể bỏ qua:** 7% audio có vấn đề → cần Decision Tree detector TRƯỚC khi STT. Hiện tại dự án có mic check đầu vào (SNR), nhưng thiếu real-time detection trong lúc thi.
  2. **Content features mạnh nhất:** Ưu tiên WER, keyword presence, RAG retrieval match thay vì đầu tư nhiều vào pronunciation/prosody scoring — đặc biệt nếu câu hỏi thi ngắn.
  3. **Per-item-type models:** Nếu exam có nhiều loại câu hỏi speaking, train riêng model thay vì dùng chung 1 model.
  4. **Speaker-level aggregation:** Nếu có nhiều items, tổng hợp điểm trước khi đánh giá final score — tăng correlation từ ~0.47 lên **0.73**.
  5. **Disfluency detection:** Features `Fluency Disfl1/2/3` (interruption points, repetitions) giúp phát hiện "lắp bắp" — hữu ích cho rubric.
  6. **Praat cho prosody:** Dùng Praat (hoặc equivalent như `librosa`) để extract pitch/prosody features khi cần.

- **Baseline để so sánh:** `r = 0.73` là mốc speaker-level correlation mà dự án nên hướng tới. Automated scoring **không cần vượt trội hơn human raters** — chỉ cần đạt mức "acceptable reliability" để reduce grader workload.

- **Tài liệu cần đọc tiếp (Seed citations):**
  - [ ] Higgins et al. (2011) — "A three-stage approach to automated scoring of spontaneous spoken responses" (SpeechRater v1.0, ETS)
  - [ ] Chen & Zechner (2011) — "Computing and evaluating syntactic complexity features" (Grammar LM features)
  - [ ] Zechner et al. (2009) — ETS SpeechRater (system tổ tiên)
  - [ ] Bernstein et al. (2010) — "Fluency and structural complexity as predictors of L2 oral proficiency"

---

### 2.4. LLM-RUBRIC: Multidimensional, Calibrated Evaluation of Natural Language Texts (Hashemi et al., ACL 2024)

---

**title:** "LLM-RUBRIC: A Multidimensional, Calibrated Approach to Automated Evaluation of Natural Language Texts"  
**authors:** Helia Hashemi, Jason Eisner, Corby Rosset, Benjamin Van Durme, Chris Kedzie (Microsoft)  
**year:** 2024  
**venue:** ACL 2024 (Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics)  
**tags:** paper-reading · topic/ai-assessment · topic/llm-as-a-judge · topic/rubric-calibration · status/completed  
**rating:** ⭐⭐⭐⭐⭐  
**url:** https://aclanthology.org/2024.acl-long.746/  
**code_repo:** https://github.com/microsoft/llm-rubric  
**read_date:** 2026-10-10  

---

> **TL;DR:** Nghiên cứu từ Microsoft giải quyết triệt để "căn bệnh" thiếu tin cậy và thiên lệch của LLM khi làm giám khảo chấm điểm (LLM-as-a-judge) bằng cách phân rã tiêu chí thành Rubric đa chiều ($Q_1 \dots Q_8$) và sử dụng mạng nơ-ron hiệu chỉnh cá nhân hóa (Personalized Calibration Network). Phương pháp giúp giảm hơn 50% sai số (RMSE < 0.5) và tăng gấp 2.4 lần độ tương quan với con người, chứng minh rằng sự bất đồng giữa các giám khảo là tín hiệu cần mô hình hóa chứ không phải nhiễu.

---

#### 1. Context & Problem (Bối cảnh & Bài toán)

- **Vấn đề cần giải quyết:** Đánh giá chất lượng ngôn ngữ tự nhiên (đặc biệt là các đoạn hội thoại hỏi đáp thông tin người–AI phức tạp) đòi hỏi phải cân nhắc nhiều yếu tố cạnh tranh: tính đúng đắn, chất lượng trích dẫn nguồn, tính cô đọng súc tích và phong cách diễn đạt. Đánh giá thủ công thì quá tốn kém và chậm trễ, nhưng giao phó hoàn toàn cho LLM tự chấm (zero-shot/few-shot LLM evaluation) thì điểm số rất lệch lạc so với con người.
- **Hạn chế của giải pháp hiện tại:**
  - *Cái bẫy "nhét rubric vào một prompt":* Khi prompt LLM hỏi thẳng điểm tổng quan ($Q_0$), hệ số tương quan với giám khảo con người cực kỳ thấp (Pearson $\rho$ chỉ đạt $0.10 - 0.14$), sai số RMSE rất lớn ($0.86 - 1.18$ trên thang điểm 4).
  - *Thiên lệch cố hữu của LLM:* LLM mắc các bệnh thiên vị ngầm nghiêm trọng như thiên vị độ dài (Length Bias - nói càng dài càng được điểm cao dù lan man), bệnh dễ dãi (Positivity Bias - ngại cho điểm liệt, dồn điểm vào mức khá giỏi).
  - *Sự bất đồng giữa các giám khảo con người (Inter-rater Disagreement):* Các giám khảo con người không hề đồng nhất — có thầy cô chấm rất khắt khe, có người lại nương tay; người thích câu trả lời ngắn gọn, người lại thích dẫn chứng chi tiết. Một mô hình LLM đơn lẻ với một prompt cố định không thể nào đại diện cho tất cả các giám khảo.
  - *Độ đo truyền thống:* Các độ đo chồng lấn từ vựng (BLEU, ROUGE) hay chỉ số tính đúng sự thật đơn lẻ (FActScore) không phản ánh được mức độ hài lòng tổng thể của người học/người dùng.
- **Mục tiêu nghiên cứu:** Xây dựng framework **LLM-RUBRIC** kết hợp giữa: *(1)* Đánh giá Rubric đa chiều bằng LLM cố định để trích xuất phân bố xác suất cho từng thuộc tính riêng biệt; *(2)* Mạng nơ-ron hiệu chỉnh cá nhân hóa (Personalized Calibration Network) để dự đoán chính xác điểm số theo "gu" và thang đo của từng giám khảo cụ thể.

#### 2. Proposed Method (Phương pháp đề xuất)

- **Ý tưởng cốt lõi (Core Intuition):** Tách bạch rõ ràng 2 trách nhiệm: LLM đóng vai trò là "mắt thấy tai nghe" (bộ trích xuất đặc trưng có cấu trúc cho từng tiêu chí nhỏ), còn việc cân đo trọng số và cộng trừ điểm theo đúng chuẩn của từng giám khảo do một mạng máy học hiệu chỉnh (Calibration Network) đảm nhận.
- **Kiến trúc hệ thống / Pipeline:**
  - *Module 1 — Trích xuất đặc trưng Rubric đa chiều (LLM Feature Extractor):* Nhận văn bản hội thoại $T$, gọi LLM độc lập cho từng câu hỏi trong Rubric ($Q_1 \dots Q_8$ gồm: tính tự nhiên, độ bao phủ tài liệu, tần suất trích dẫn, tính phù hợp trích dẫn, chất lượng nguồn trích dẫn, độ trùng lặp/thừa thãi, tính cô đọng, số lượt tương tác). LLM xuất ra phân bố xác suất $p_{\text{LLM}}(y_i | T, Q_i)$ trên các mức điểm $Y_i = \{1, 2, 3, 4\}$. Vector đặc trưng đầu vào là tập hợp tất cả các phân bố xác suất:
    $$x = [p_{\text{LLM}}(y_i | T, Q_i) : i \in \{0, \dots, 8\}, y_i \in Y_i]$$
  - *Module 2 — Mạng hiệu chỉnh cá nhân hóa (Personalized Calibration Network):* Mạng nơ-ron Feed-Forward 2 tầng ẩn kết hợp trọng số dùng chung ($W_k$) và trọng số riêng của từng giám khảo $a$ ($W_k^a$):
    $$z_1 = \sigma((W_1 + W_1^a)[1; x]), \quad z_2 = \sigma((W_2 + W_2^a)[1; z_1])$$
  - *Module 3 — Dự đoán đa nhiệm & Giả mã (Multi-Task Head & Bayes Decoding):* Dự đoán phân bố xác suất của giám khảo $a$ cho câu hỏi $Q_i$:
    $$\hat{p}_a(y_i | T, Q_i) = \text{softmax}((V_i + V_i^a)[1; z_2])$$
    Điểm số dự đoán kỳ vọng $\hat{y}_i^a$ được giải mã theo nguyên lý cực tiểu hóa rủi ro Bayes (Bayes risk under $L_2$ loss):
    $$\hat{y}_i^a = \sum_{y_i \in Y_i} \hat{p}_a(y_i | T, Q_i) \cdot y_i$$
- **Chiến lược Huấn luyện Đa nhiệm 2 pha (Two-phase Training):**
  - *Pha 1 — Pre-training (học biểu diễn chung $z_2$ trên tất cả câu hỏi rubric):* Tối đa hóa hàm Log-likelihood trên toàn bộ tập dữ liệu chú thích:
    $$\mathcal{L}_{\text{pre}} = \sum_{(T, i, a, y_i^a) \in D} \log \hat{p}_a(y_i^a | T, Q_i)$$
  - *Pha 2 — Fine-tuning (tập trung tối ưu cho điểm tổng quan $Q_0$ - Overall Satisfaction):* Tiếp tục huấn luyện chỉ trên các mẫu nhãn của câu hỏi $i = 0$:
    $$\mathcal{L}_{\text{ft}} = \sum_{(T, 0, a, y_0^a) \in D} \log \hat{p}_a(y_0^a | T, Q_0)$$

#### 3. Evaluation & Key Results (Thực nghiệm & Kết quả)

- **Dataset:** 
  - *Tác vụ & Miền dữ liệu:* Thông tin hỗ trợ kỹ thuật (IT help / Azure support) khai thác từ 2.275 truy vấn thực tế của Bing và 23.243 tài liệu crawled.
  - *Synthetic Conversations:* 250 cuộc hội thoại tổng hợp sinh từ 5 hệ thống (DS1–DS5), được 24 giám khảo chuyên nghiệp chấm thành 741 mẫu dữ liệu đa chiều.
  - *Real Conversations:* 223 cuộc hội thoại người thật tương tác với DS1–DS3 do 13 giám khảo đóng vai người dùng và tự chấm.
- **Baseline so sánh:** Random, Argmax LLM $Q_0$, Expected LLM $Q_0$ (GPT-3.5-turbo-16k), Calibrated LLM $Q_0$ (chỉ hiệu chỉnh duy nhất câu hỏi $Q_0$), FActScore và Oracle (có nhãn thực của con người trên các câu hỏi phụ).
- **Chỉ số chính:** Root Mean Squared Error (RMSE), Hệ số tương quan Pearson ($\rho$), Spearman ($\rho$), Kendall ($\tau$).
- **Kết quả nổi bật:**
  - **Giảm 50% sai số:** LLM-RUBRIC đạt RMSE = **0.396** (dữ liệu tổng hợp) và **0.422** (dữ liệu thực tế), trong khi Expected LLM $Q_0$ có RMSE lên tới $0.856 - 0.901$.
  - **Tăng vọt độ tương quan:** Hệ số tương quan Pearson trên dữ liệu hội thoại thực tế tăng từ **0.143** (Expected LLM $Q_0$) lên **0.350** (LLM-RUBRIC) — cải thiện hơn **2.4 lần**.
  - **Kết quả Ablation Study then chốt:**
    - *Bỏ cá nhân hóa (w/o Personalization):* RMSE vọt lên **0.601** và tương quan $\rho$ tụt xuống **0.198** — chứng minh tham số riêng theo từng giám khảo ($W^a, V^a$) đóng vai trò sống còn.
    - *Bỏ Pre-training hoặc Fine-tuning:* RMSE tăng lên lần lượt **0.525** và **0.493**.
    - *Độ quan trọng của từng tiêu chí Rubric:* Tiêu chí $Q_3$ (Có trích dẫn nguồn hay không) là quan trọng nhất (bỏ $Q_3$ làm $\rho$ rơi từ 0.350 xuống 0.075); kế đến là $Q_8$ (Hiệu quả tương tác) và $Q_5$ (Chất lượng nguồn). Tiêu chí $Q_6$ (Lặp từ) ít ảnh hưởng nhất.

#### 4. Critical Thinking & Limitations (Phản biện & Hạn chế)

- **Tại sao phương pháp này hiệu quả?**
  1. *Phân rã nhận thức:* Bắt LLM trả lời từng thuộc tính đơn lẻ giải phóng LLM khỏi gánh nặng phải tự cân đối trọng số trong 1 prompt.
  2. *Mô hình hóa sự chủ quan:* Thay vì ép buộc mọi giám khảo theo một barem duy nhất, việc phân tách tham số chung (văn hóa chung) và tham số riêng (khẩu vị cá nhân) giúp giải quyết triệt để sự bất đồng giữa các giám khảo.
- **Hạn chế tự thừa nhận:**
  - *Chi phí tính toán cao:* Phải gọi LLM độc lập 9 lần cho mỗi văn bản để lấy đủ vector đặc trưng, tạo ra độ trễ (latency) và chi phí token lớn.
  - *Chưa đánh giá ở cấp độ chi tiết (Span-level):* Phương pháp chỉ cho điểm số tổng quát trên toàn bài, chưa chỉ ra cụ thể sinh viên nói sai ở câu nào, từ nào.
  - *Vấn đề Cold-start:* Để huấn luyện tham số cá nhân hóa cho một giám khảo mới, người đó phải chấm trước một số lượng bài nhất định.
- **Đánh đổi & Rủi ro tiềm ẩn:**
  - *Nguy cơ Goodhart's Law:* Nếu sinh viên hoặc hệ thống AI sinh văn bản biết được rubric, họ có thể "tối ưu hóa" bài nói để đánh lừa các câu hỏi rubric mà không thực sự cải thiện năng lực ngôn ngữ thực tế.

#### 5. Actionable Takeaways & Next Steps (Ứng dụng vào Hệ thống)

- **Ý tưởng áp dụng trực tiếp vào dự án AI Oral Assessment Platform:**
  1. **Tuyệt đối không dùng "Một Prompt Chấm Hết":** Tránh hoàn toàn việc nhét toàn bộ rubric vào 1 system prompt duy nhất rồi bảo LLM cho điểm 1–10. Phải tách thành các phân hệ đánh giá độc lập (Module Phát âm/Fluency từ âm thanh thô, Module Ngữ pháp từ Transcript, Module Nội dung kiến thức đối chiếu RAG).
  2. **Trích xuất Token Logprobs / Phân bố xác suất:** Khi dùng LLM chấm từng tiêu chí nội dung, cấu hình API để lấy xác suất của các lựa chọn điểm thay vì chỉ lấy 1 con số thô. Điều này cho phép đo được **độ bất định (Predictive Uncertainty / Entropy)** của AI.
  3. **Cơ chế kích hoạt Phúc khảo tự động (Active Review / Confidence Guardrail):** Khi phân bố xác suất bị phân tán (AI phân vân, độ tự tin thấp), Celery Worker tự động gắn cờ bài thi và chuyển vào hàng đợi chấm duyệt của `EXAMINER` trên Staff Portal (Human-in-the-loop) — đúng theo kiến trúc phân quyền đã thiết kế.
  4. **Chuẩn hóa độ lệch điểm giữa Giảng viên (Grader Calibration):** Khi có nhiều giảng viên (`TEACHER`) cùng tham gia chấm thi trong một học kỳ, áp dụng mô hình hiệu chỉnh (hoặc MFRM kết hợp Calibration Network) để triệt tiêu độ khắt khe/dễ tính riêng biệt, đảm bảo sự công bằng tuyệt đối cho sinh viên giữa các ca thi.
  5. **Bằng chứng học thuật đắt giá khi bảo vệ đồ án:** Sử dụng bài báo ACL 2024 này làm cơ sở lý thuyết vững chắc để bảo vệ kiến trúc chấm điểm đa tầng của đồ án trước Hội đồng chấm tốt nghiệp.

- **Tài liệu cần đọc tiếp (Seed citations):**
  - [ ] *Min et al. (2023)* — FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation.
  - [ ] *Gantt et al. (2020)* — Natural Language Inference with Mixed Effects (Lý thuyết mô hình hóa tham số riêng theo từng annotator).
  - [ ] *Chiang & Lee (2023)* — Can Large Language Models Be an Alternative to Human Evaluations?

---

### 2.5. [Tên Bài Báo Tiếp Theo]

- **Tác giả / Năm:** [Cập nhật]
- **Mã nguồn / Link URL:** [Cập nhật]
- **Vấn đề giải quyết:** [Cập nhật]
- **Giá trị ứng dụng vào dự án:**
  - [Cập nhật]

