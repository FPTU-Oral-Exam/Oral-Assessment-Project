# TỔNG HỢP 11 BÀI BÁO KHOA HỌC: 7 BÀI GIỮ LẠI & 4 BÀI LOẠI BỎ
> **Tài liệu đối chiếu:** Dành cho nhóm sinh viên verify nội bộ và giải trình với Thầy Hướng dẫn  
> **Dự án:** OralAI — Nền tảng Thi Vấn đáp Tự động Bằng AI  
> **Tiêu chí sàng lọc:** Khả thi 100% trong đồ án Capstone, Ngân sách 0 VNĐ, Chạy được trên máy tính cá nhân/Docker local.

---

## 📊 BẢNG TỔNG HỢP NHANH 11 BÀI BÁO

| STT | Tên bài báo (Paper Title) & Tác giả | Năm / NXB | Quyết định | Lý do cốt lõi |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **Assessing Whisper automatic speech recognition and WER scoring for elicited imitation**<br>*(Michael McGuire, Jenifer Larson-Hall)* | 2025<br>Elsevier | ✅ **GIỮ LẠI** | Cung cấp thuật toán cốt lõi cho **Part 2 (Read Aloud)**: Chấm điểm phát âm bằng Levenshtein Word Error Rate (WER) kết hợp Whisper STT trong 0.05 giây. |
| **2** | **Automated Scoring of Speaking Items in an Assessment for Teachers of English**<br>*(Klaus Zechner et al. - ETS)* | 2014<br>ACL | ✅ **GIỮ LẠI** | Cung cấp khung **Restricted Speech Rubric** chuẩn hóa và tương quan chấm điểm tự động cho các bài đọc đoạn văn ngắn. |
| **3** | **Prosodic features of second language fluency**<br>*(Jürgen Trouvain, Bernd Möbius, Nivja H. de Jong)* | 2026<br>John Benjamins | ✅ **GIỮ LẠI** | Cung cấp cơ sở khoa học cho **Fluency Engine**: Đo Breakdown Fluency (khoảng dừng $\ge 250$ms qua Silero VAD, tỷ lệ dừng $\le 0.27$). |
| **4** | **Automated Speech Scoring System Under The Lens: Evaluating linguistic cues**<br>*(Yaman Kumar Singla et al.)* | 2023<br>Springer | ✅ **GIỮ LẠI** | Cung cấp số liệu toán học thực nghiệm từ **47,000 bài thi**: Tốc độ tối ưu $2.0 - 2.4$ wps, ngưỡng phạt $< 1.35$ wps, trần bão hòa $> 2.4$ wps. |
| **5** | **Developing an Automatic Speaking Assessment System for L2 Speech (DigiTala Project)**<br>*(Ragheb Al-Ghezi et al.)* | 2022<br>Phonetics Days | ✅ **GIỮ LẠI** | Cung cấp phương pháp trích xuất Lexico-grammatical Range & Accuracy (TTR, phân tích ngữ pháp) từ bản gỡ băng ASR. |
| **6** | **AI Literacy as a Key Driver: Insights from Socratic Mind**<br>*(Meryem Yilmaz Soylu, David A. Joyner et al. - Georgia Tech)* | 2025<br>arXiv | ✅ **GIỮ LẠI** | Cung cấp ý tưởng cốt lõi cho **Part 5 (Socratic Viva Voce)**: Vấn đáp phản biện đa lượt theo thang Webb DoK 3-4, triệt tiêu gian lận học thuộc. |
| **7** | **Generative AI in higher education psychology programs: assessment methods**<br>*(Sarah Halliday et al.)* | 2026<br>Routledge | ✅ **GIỮ LẠI** | Cung cấp ý tưởng cho **Part 4 (AI-Critique)**: Thí sinh vạch lỗi ngầm trong giải pháp/mã nguồn do AI sinh, kiểm tra tư duy chuyên môn thực chất. |
| **8** | **Fully automated speaking assessments: Changes to proficiency testing and pronunciation**<br>*(Okim Kang)* | 2022<br>Routledge | ❌ **LOẠI BỎ** | Thuần túy là bài **khảo sát lý thuyết tổng quan (Conceptual Review)**, chỉ nói chung chung về Pearson/Duolingo, không có thuật toán hay pipeline kỹ thuật để code. |
| **9** | **Assessing L2 English speaking using automated scoring: examining automarker reliability**<br>*(Chun et al.)* | 2021<br>Language Testing | ❌ **LOẠI BỎ** | Quá nặng về **Mô hình thống kê Rasch (Many-Facet Rasch MFRM)** và phần mềm FACETS. Đòi hỏi ma trận hàng chục giám khảo quốc tế, hoàn toàn bất khả thi với đồ án sinh viên. |
| **10** | **Rethinking Assessment of Oral Competence: Integrating Questionnaires with GenAI** | 2024<br>Higher Ed | ❌ **LOẠI BỎ** | Đánh giá năng lực nói thông qua **Bảng hỏi khảo sát (Questionnaires)** và GenAI sinh trắc nghiệm. Không liên quan đến xử lý âm thanh (Speech/Audio) trực tiếp. |
| **11** | **Language assessment in the era of generative AI: Opportunities, challenges, and future** | 2023<br>Language Assessment | ❌ **LOẠI BỎ** | Là bài **bình luận học thuật (Editorial/Position Paper)** bàn về đạo đức và chính sách ứng dụng AI. Không có mô hình kỹ thuật, không có dữ liệu thực nghiệm để lập trình. |

---

## ❌ PHẦN 1: CHI TIẾT 4 BÀI BÁO BỊ LOẠI BỎ & LÝ DO GIẢI TRÌNH VỚI THẦY

Nếu Thầy/Cô hỏi: *"Tại sao trong 11 bài tải về nhóm lại không dùng 4 bài này?"*, nhóm có thể giải trình rành mạch như sau:

### 1. Bài báo: *Fully automated speaking assessments: Changes to proficiency testing and the role of pronunciation* (Okim Kang, 2022)
- **Bản chất của bài báo:** Đây là một bài khảo sát lý thuyết (State-of-the-Art Review) mang tính xã luận và giáo dục học. Tác giả thảo luận về lịch sử chuyển dịch từ chấm thi bằng người sang chấm thi tự động trên các nền tảng thương mại lớn (Pearson Versant, Duolingo English Test, TOEFL iBT).
- **Lý do loại bỏ:**
  - Không cung cấp bất kỳ mã nguồn mở, kiến trúc hệ thống hay thuật toán cụ thể nào.
  - Các hệ thống được đề cập trong bài đều là công nghệ độc quyền đóng kín (Proprietary Black-box), nhóm sinh viên không thể sao chép hay tái hiện được.

### 2. Bài báo: *Assessing L2 English speaking using automated scoring technology: examining automarker reliability* (Chun et al., 2021)
- **Bản chất của bài báo:** Nghiên cứu thuần về lý thuyết khảo thí tâm lý học (Psychometrics), sử dụng mô hình đo lường Many-Facet Rasch Measurement (MFRM) chạy trên phần mềm thống kê chuyên dụng FACETS.
- **Lý do loại bỏ:**
  - Để chạy được mô hình Rasch MFRM, bài báo đòi hỏi một ma trận dữ liệu khổng lồ với hàng trăm thí sinh và hàng chục giám khảo con người chấm chéo nhiều vòng để hiệu chuẩn độ khó đề thi và độ khắt khe của giám khảo.
  - Đây là bài toán hàn lâm dành cho các viện khảo thí quốc tế lớn. Đối với đồ án Kỹ thuật Phần mềm / Trí tuệ Nhân tạo của sinh viên, phương pháp này **hoàn toàn bất khả thi và lạc đề** so với mục tiêu xây dựng hệ thống phần mềm chạy thật.
  - $\implies$ **Thay thế:** Nhóm thay thế bằng phương pháp **Anchor Exemplars** (nạp 3 bài mẫu điểm Cao - Trung bình - Thấp đã được Giảng viên thẩm định vào Prompt LLM) nhẹ nhàng và hiệu quả hơn rất nhiều.

### 3. Bài báo: *Rethinking the Assessment of Oral Communicative Competence in Higher Education: Integrating Closed-Ended and Open-Ended Questionnaires with Generative AI Tools* (2024)
- **Bản chất của bài báo:** Nghiên cứu phương pháp sư phạm đánh giá năng lực giao tiếp thông qua việc phát phiếu điều tra/bảng hỏi (Questionnaires) kết hợp với các bài tập do ChatGPT tạo ra.
- **Lý do loại bỏ:**
  - Trọng tâm bài báo là nghiên cứu khảo sát ý kiến và kỹ năng viết/trắc nghiệm, hoàn toàn **không xử lý dữ liệu âm thanh (Audio/Speech)** của thí sinh.
  - Dự án OralAI của nhóm là hệ thống thu âm giọng nói sinh viên từ Micro, gỡ băng STT và chấm âm học, do đó phương pháp bảng hỏi của bài báo này hoàn toàn không ăn nhập.

### 4. Bài báo: *Language assessment in the era of generative artificial intelligence: Opportunities, challenges, and future directions* (2023)
- **Bản chất của bài báo:** Bài xã luận / quan điểm (Position Paper / Commentary) đưa ra khuyến nghị chính sách về đạo đức, tính công bằng và tương lai của GenAI trong giáo dục.
- **Lý do loại bỏ:**
  - Không có mô hình kỹ thuật (No technical architecture), không có thuật toán xử lý âm học hay NLP, không có tập dữ liệu thực nghiệm để lập trình hay kiểm thử.

---

## ✅ PHẦN 2: CHI TIẾT 7 BÀI BÁO ĐƯỢC GIỮ LẠI & GIÁ TRỊ THỰC CHIẾN

Cả 7 bài báo này được giữ lại vì **mỗi bài giải quyết trực tiếp 1 bài toán kỹ thuật cụ thể** trong codebase của dự án:

### 1. McGuire & Larson-Hall (2025, Elsevier - Q1) $\rightarrow$ Cốt lõi cho Part 2 (Read Aloud)
- **Đóng góp:** Chứng minh Whisper ASR kết hợp thuật toán Levenshtein Word Error Rate (WER) có hệ số tương quan rất cao với con người ($r = 0.81 - 0.88$).
- **Ứng dụng vào code:** Viết module `services/api/app/pronunciation_wer.py` dùng thư viện pure-Python `jiwer`. Chấm điểm phát âm câu đọc mẫu trong $\le 0.05$ giây, chi phí $0$ VNĐ.

### 2. Zechner et al. (2014, ACL / ETS) $\rightarrow$ Khung Rubric chuẩn hóa
- **Đóng góp:** Bộ khung Restricted Speech Rubric từ tổ chức khảo thí giáo dục hàng đầu thế giới (ETS - tác giả của bài thi TOEFL).
- **Ứng dụng vào code:** Chuẩn hóa các tiêu chí phân rã cho các bài nói có kiểm soát (Read Aloud, Repeat Aloud) và tích hợp vào Database rubric schema.

### 3. Trouvain, Möbius & de Jong (2026, John Benjamins - Q1) $\rightarrow$ Cốt lõi cho Fluency Engine
- **Đóng góp:** Định lượng chính xác hai thành phần của độ trôi chảy: **Speed Fluency** (tốc độ nói) và **Breakdown Fluency** (độ đứt đoạn: khoảng dừng im lặng và từ đệm).
- **Ứng dụng vào code:** Cài đặt thông số cho Silero VAD bắt khoảng lặng $\ge 250$ms. Thiết lập trần tỷ lệ dừng tự nhiên $\le 0.27$ lần dừng/từ trong module `services/api/app/fluency.py`.

### 4. Singla et al. (2023, Springer - Q1) $\rightarrow$ Bộ ngưỡng toán học 47,000 bài thi
- **Đóng góp:** Sử dụng kỹ thuật XAI (PDP/SHAP) trên 47,000 bài thi để chứng minh hành vi cho điểm: Tốc độ tối ưu $2.0 - 2.4$ wps, sụt giảm mạnh khi $< 1.35$ wps, bão hòa khi $> 2.4$ wps.
- **Ứng dụng vào code:** Viết trực tiếp thành các lệnh `if/else` toán học chuẩn hóa điểm 10 trong hàm `calculate_speech_rate()`. Khách quan tuyệt đối, có minh chứng khoa học vững chắc.

### 5. Al-Ghezi et al. (2022, DigiTala Project - Phần Lan) $\rightarrow$ Đánh giá Từ vựng - Ngữ pháp
- **Đóng góp:** Kỹ thuật trích xuất đặc trưng Lexico-grammatical Range & Accuracy (TTR, phân tích cấu trúc câu) từ bản gỡ băng ASR của người học L2.
- **Ứng dụng vào code:** Tự động tính Type-Token Ratio và trích xuất độ phức tạp ngữ pháp đẩy vào Prompt làm bằng chứng cho LLM chấm điểm.

### 6. Soylu, Joyner et al. (2025, Georgia Tech) $\rightarrow$ Cốt lõi cho Part 5 (Socratic Viva Voce)
- **Đóng góp:** Mô hình Socratic Dialogue Engagement đo lường tư duy phản biện theo thang Webb DoK 3-4 (đào sâu giả định, phân tích trade-offs).
- **Ứng dụng vào code:** Thiết kế luồng thi vấn đáp 2 lượt: Sinh viên nói xong Lượt 1 $\rightarrow$ Celery Worker gọi LLM sinh ngay 1 câu hỏi phụ phản biện $\rightarrow$ Sinh viên trả lời Lượt 2, triệt tiêu 100% nguy cơ học thuộc lòng bài văn mẫu.

### 7. Halliday et al. (2026, Routledge - Q1) $\rightarrow$ Cốt lõi cho Part 4 (AI-Critique)
- **Đóng góp:** Đổi mới phương pháp đánh giá trong kỷ nguyên GenAI: Biến AI từ "công cụ gian lận" thành "đối tượng bị thẩm định và phản biện".
- **Ứng dụng vào code:** Thiết kế bài thi Part 4: Cho sinh viên xem giải pháp/mã nguồn do AI tạo có cài 1 lỗi kiến trúc ngầm $\rightarrow$ Sinh viên phải phát hiện và phân tích lỗi sai bằng tiếng Anh.

---

## 🎯 TÓM LẠI CHO BẠN TRONG NHÓM:
- **Nhớ ngắn gọn:** Trong 11 bài tải về, **7 bài là có thuật toán / số liệu thực nghiệm / đề thi thực tế để đưa vào code**; còn **4 bài bị loại là vì toàn lý thuyết tổng quan, nghiên cứu bảng hỏi hoặc mô hình thống kê Rasch quá hàn lâm không dùng để lập trình được**.
- Cả nhóm cứ tự tin dùng **7 bài đã chọn** để làm cơ sở khoa học và báo cáo với Thầy!
