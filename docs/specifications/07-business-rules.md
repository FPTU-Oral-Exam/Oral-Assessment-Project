# Business Rules (Quy tắc Nghiệp vụ)

## 1. Giới thiệu

Tài liệu này quy định toàn bộ các quy tắc nghiệp vụ bất biến của hệ thống **AI Oral Assessment Platform**, đảm bảo tính toàn vẹn dữ liệu, phân định quyền hạn chuẩn mực giữa các bên và tuân thủ khung chuẩn đo lường giáo dục của Steven M. Downing.

---

## 2. Quy tắc về Ban Học thuật & Thiết kế Đề thi (Academy & Test Design)

| BR-ID | Quy tắc | Lý do nghiệp vụ |
| :--- | :--- | :--- |
| **BR-ACA-001** | **Độc quyền Học thuật:** Chỉ tài khoản có vai trò `ACADEMY` mới có quyền tạo/sửa Chuẩn đầu ra (LO), Cây chủ đề (Topics), Khung Rubric chuẩn, Ma trận đề chuẩn (Master Blueprint) và quản lý Ngân hàng câu hỏi (Item Bank). | Đảm bảo tính nhất quán và chuẩn mực học thuật của nhà trường; ngăn chặn việc giảng viên tự ý thay đổi chuẩn môn học. |
| **BR-ACA-002** | **Ma trận chuẩn Duy nhất & Cố định (Master Blueprint Invariant):** Mỗi môn học trong kỳ thi chỉ có duy nhất 1 Ma trận đề thi chuẩn. Ma trận này quy định số lượng câu hỏi, thời gian, LO, Topic, mức nhận thức Bloom và tỷ lệ điểm (tổng điểm luôn bằng 10.0). | Đảm bảo mọi đề thi sinh ra đều đo lường cùng một chuẩn năng lực đào tạo, công bằng cho mọi sinh viên. |
| **BR-ACA-003** | **Zero AI Question Generation (Tuyệt đối không để AI sinh đề thi):** 100% câu hỏi sử dụng trong kỳ thi chính thức phải được lấy từ Ngân hàng câu hỏi (Item Bank) đã qua hội đồng chuyên môn thẩm định (`VERIFIED` hoặc `ACTIVE`). Tuyệt đối không cho AI tự do bịa câu hỏi trong phòng thi. | Triệt tiêu rủi ro AI hallucination (ảo giác), câu hỏi sai kiến thức hoặc lệch chuẩn đầu ra môn học. |
| **BR-ACA-004** | **Cấu trúc Câu hỏi chuẩn trong Ngân hàng:** Mỗi câu hỏi (`QuestionItem`) bắt buộc phải có: Mã câu hỏi, Chủ đề (Topic), Chuẩn đầu ra (LO), Mức độ nhận thức (Bloom), Giới hạn thời gian (giây), Nội dung câu hỏi (Prompt), Hướng dẫn chấm/Điểm mấu chốt (Expected Points), Từ khóa chuyên môn bắt buộc (Key Terms), và Tiêu chí Rubric tương ứng. | Cung cấp đầy đủ căn cứ sư phạm để AI Grader và Giảng viên chấm điểm chính xác. |
| **BR-ACA-005** | **Đóng băng Tri thức Học thuật (Academic Baseline Freeze):** Khi kỳ thi bắt đầu, toàn bộ cấu hình học thuật và ngân hàng câu hỏi của môn học được đóng băng (Freeze). Mọi chỉnh sửa của Academy sau đó sẽ được lưu thành phiên bản mới cho kỳ sau, không làm thay đổi đề thi đang chạy. | Bảo đảm tính bất biến của kỳ thi đang diễn ra. |

---

## 3. Quy tắc về Khảo thí & Vận hành Kỳ thi (Examiner & Operations)

| BR-ID | Quy tắc | Lý do nghiệp vụ |
| :--- | :--- | :--- |
| **BR-EXM-001** | **Phân cấp Tổ chức thi:** Cấu trúc tổ chức thi tuân thủ nghiêm ngặt mô hình 4 cấp: Học kỳ (`Semester`) $\rightarrow$ Kỳ thi (`Final Exam`) $\rightarrow$ Môn mở trong kỳ (`Course Offering`) $\rightarrow$ Ca thi (`Schedule Slot / Shift`). | Giúp quản lý rõ ràng, dễ dàng mở rộng và thống kê theo từng đợt thi của nhà trường. |
| **BR-EXM-002** | **Lắp ráp Đề song song (Parallel Exam Variants):** Khi lập ca thi, hệ thống Automated Test Assembly (ATA) tự động rút trích câu hỏi từ Item Bank theo Master Blueprint để tạo ra các mã đề khác nhau cho các ca thi khác nhau. | Chống lộ đề giữa các ca thi liên tiếp (sinh viên thi ca 1 không thể mách đề cho sinh viên thi ca 2). |
| **BR-EXM-003** | **Tương đương Đề thi (Parallel Form Equivalence):** Các mã đề thi khác nhau của cùng một môn phải hoàn toàn tương đương về: số lượng câu, mức độ khó Bloom, độ bao phủ LO, thời gian trả lời và thang điểm. | Bảo đảm sự công bằng tuyệt đối giữa các thí sinh thi ở các ca khác nhau. |
| **BR-EXM-004** | **Gán Mã đề theo Ca thi:** Sinh viên trong cùng một ca thi sẽ làm cùng một mã đề (hoặc hoán vị câu hỏi); các ca thi khác khung giờ bắt buộc phải có mã đề khác nhau. | Tránh hiện tượng sinh viên trao đổi đề giữa các ca. |
| **BR-EXM-005** | **Phân công Giám thị & Chấm thi:** Khảo thí có quyền chỉ định Giảng viên coi thi và Giảng viên chấm thi. Hỗ trợ quy tắc "Chấm chéo" (Giảng viên không chấm sinh viên lớp mình dạy nếu bộ môn yêu cầu). | Đảm bảo tính khách quan và phòng chống tiêu cực trong chấm điểm. |
| **BR-EXM-006** | **Khóa sổ điểm FAP (Final Grade Lock):** Sau khi điểm được Khảo thí duyệt, bảng điểm chuyển sang trạng thái `LOCKED_FINAL`. Không ai (kể cả Giảng viên hay Khảo thí) được phép sửa điểm trực tiếp; mọi thay đổi điểm bắt buộc phải qua quy trình Phúc khảo chính thức. | Bảo vệ tính pháp lý của điểm số khi nộp lên Phòng Đào tạo FAP. |

---

## 4. Quy tắc về Giảng viên Coi thi & Chấm thi (Teacher Boundary & Grading)

| BR-ID | Quy tắc | Lý do nghiệp vụ |
| :--- | :--- | :--- |
| **BR-TCH-001** | **Ranh giới Nghiệp vụ (Strict Teacher Boundary):** Giảng viên không có quyền tạo hoặc chỉnh sửa LO, Rubric, Ma trận đề thi hoặc Ngân hàng câu hỏi. Giảng viên chỉ thực hiện coi thi và chấm/rà soát bài thi. | Tránh tình trạng mỗi giảng viên tự ý ra đề hoặc sửa tiêu chí chấm theo ý thích cá nhân. |
| **BR-TCH-002** | **Chấm điểm dựa trên Bằng chứng (Evidence-Based Grading):** Giảng viên khi chấm/rà soát bài thi bắt buộc phải đối soát giữa: file âm thanh gốc của sinh viên (nghe trực tiếp), transcript Faster-Whisper và hướng dẫn chấm chuẩn (Expected Points & Key Terms). | Đảm bảo điểm số được đưa ra có căn cứ xác thực, không chấm mò. |
| **BR-TCH-003** | **Quy tắc Điều chỉnh điểm (Override Score Rule):** Giảng viên có quyền điều chỉnh điểm mà AI gợi ý. Tuy nhiên, nếu điểm điều chỉnh chênh lệch từ $\ge 1.0$ điểm cho một câu hỏi, Giảng viên bắt buộc phải nhập văn bản giải trình lý do chuyên môn vào hệ thống. | Tạo nhật ký kiểm toán (Audit Trail), ngăn chặn việc sửa điểm tùy tiện. |
| **BR-TCH-004** | **Ngưỡng Cảnh báo Chênh lệch Điểm (Score Discrepancy Alert):** Nếu điểm tổng kết của Giảng viên và điểm do AI chấm chênh lệch nhau từ $\ge 1.5$ điểm trên thang 10, hệ thống tự động gắn cờ cảnh báo (`FLAGGED_DISCREPANCY`) và gửi thông báo cho Khảo thí để xem xét chấm chéo. | Giám sát chất lượng chấm thi và phát hiện sớm các trường hợp bất thường. |
| **BR-TCH-005** | **Chấm chéo Độc lập (Blind Re-evaluation):** Khi được Khảo thí phân công chấm phúc khảo hoặc chấm chéo, Giảng viên thứ hai sẽ không nhìn thấy điểm số và nhận xét của Giảng viên thứ nhất cho đến khi hoàn tất việc chấm của mình. | Tránh tâm lý nể nang hoặc định kiến giữa các đồng nghiệp. |

---

## 5. Quy tắc về Sinh viên & Phòng thi (Student & Examination Integrity)

| BR-ID | Quy tắc | Lý do nghiệp vụ |
| :--- | :--- | :--- |
| **BR-STU-001** | **Thi bằng Giọng nói Thuần túy (Voice-Only Examination):** Trong suốt quá trình làm bài thi, sinh viên chỉ trả lời bằng giọng nói trực tiếp vào micro. Ứng dụng khóa hoàn toàn bàn phím (không cho gõ text, copy/paste, chuyển tab). | Ngăn chặn việc sinh viên sử dụng ChatGPT hoặc tài liệu chép sẵn để paste vào bài thi. |
| **BR-STU-002** | **Kiểm tra Độ ồn Bắt buộc (Pre-Exam Noise Test):** Trước khi vào bài thi, sinh viên bắt buộc phải vượt qua bài kiểm tra độ ồn môi trường 10 giây qua bộ lọc RNNoise WASM. Nếu độ ồn vượt ngưỡng cho phép, hệ thống yêu cầu tìm phòng yên tĩnh hơn trước khi bắt đầu. | Đảm bảo chất lượng âm thanh đầu vào đạt chuẩn cho mô hình bóc băng Faster-Whisper. |
| **BR-STU-003** | **Bảo vệ Bằng chứng Âm thanh (Zero Client STT & Anti-Tampering):** Toàn bộ file âm thanh được tải trực tiếp từ máy sinh viên lên MinIO qua các chunk 4MB có mã băm SHA-256. Sinh viên tuyệt đối không được xem hay chỉnh sửa transcript trên máy trạm. | Triệt tiêu hoàn toàn nguy cơ sinh viên can thiệp vào mã nguồn client để sửa nội dung câu trả lời. |
| **BR-STU-004** | **Đúng Ca - Đúng Giờ:** Sinh viên chỉ có thể nhấn "Vào thi" khi ca thi chuyển sang trạng thái mở và sinh viên có tên trong danh sách lớp được gán cho ca đó. Hết giờ quy định, hệ thống tự động khóa và nộp toàn bộ các phần đã trả lời. | Đảm bảo kỷ luật phòng thi nghiêm túc. |

---

## 6. Quy tắc về AI Grader & Bóc băng STT (AI & STT Engine Rules)

| BR-ID | Quy tắc | Lý do nghiệp vụ |
| :--- | :--- | :--- |
| **BR-AI-001** | **Bóc băng Server Tập trung (Faster-Whisper Source of Truth):** Quá trình chuyển giọng nói thành văn bản (STT) diễn ra 100% tại Background Worker trên máy chủ, sử dụng mô hình Faster-Whisper hỗ trợ song ngữ Anh - Việt. Bản bóc băng trên server là căn cứ duy nhất để AI chấm điểm. | Đảm bảo kết quả bóc băng đồng nhất, không bị phụ thuộc vào cấu hình phần cứng yếu của máy sinh viên. |
| **BR-AI-002** | **Rubric-Bounded LLM Grading:** Khi chấm điểm, AI Grader chỉ được phép chấm dựa trên: (1) Nội dung câu hỏi, (2) Expected Points & Key Terms của câu hỏi đó, (3) Khung Rubric chuẩn của Academy, và (4) Transcript của sinh viên. AI không được tự ý bịa thêm tiêu chí ngoài Rubric. | Đảm bảo điểm số có căn cứ pháp lý và không bị hallucination. |
| **BR-AI-003** | **Structured Output Bắt buộc:** AI Grader bắt buộc phải trả về định dạng JSON nghiêm ngặt với điểm số thành phần cho từng tiêu chí, đoạn trích dẫn từ transcript làm chứng cứ (quote), điểm đạt được và lời giải thích ngắn gọn bằng tiếng Việt. | Giúp Giảng viên dễ dàng đối soát từng câu chữ khi rà soát bài thi. |
