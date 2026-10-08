import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Ensure docs directory exists
output_dir = os.path.abspath("docs")
os.makedirs(output_dir, exist_ok=True)
pdf_path = os.path.join(output_dir, "giao_trinh_mau_software_testing.pdf")

# Register Arial for full Vietnamese Unicode support
font_dir = "C:/Windows/Fonts"
arial_regular = os.path.join(font_dir, "arial.ttf")
arial_bold = os.path.join(font_dir, "arialbd.ttf")
arial_italic = os.path.join(font_dir, "ariali.ttf")

if os.path.exists(arial_regular):
    pdfmetrics.registerFont(TTFont("Arial", arial_regular))
    font_name = "Arial"
else:
    font_name = "Helvetica"

if os.path.exists(arial_bold):
    pdfmetrics.registerFont(TTFont("Arial-Bold", arial_bold))
    font_bold = "Arial-Bold"
else:
    font_bold = "Helvetica-Bold"

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=A4,
    rightMargin=54,
    leftMargin=54,
    topMargin=54,
    bottomMargin=54
)

styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Title'],
    fontName=font_bold,
    fontSize=22,
    leading=28,
    textColor=colors.HexColor("#1e3a8a"),
    alignment=1, # Center
    spaceAfter=15
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName=font_name,
    fontSize=13,
    leading=18,
    textColor=colors.HexColor("#475569"),
    alignment=1,
    spaceAfter=25
)

chapter_style = ParagraphStyle(
    'ChapterHeading',
    parent=styles['Heading1'],
    fontName=font_bold,
    fontSize=16,
    leading=22,
    textColor=colors.HexColor("#0f172a"),
    spaceBefore=14,
    spaceAfter=10,
    keepWithNext=True
)

section_style = ParagraphStyle(
    'SectionHeading',
    parent=styles['Heading2'],
    fontName=font_bold,
    fontSize=12,
    leading=17,
    textColor=colors.HexColor("#2563eb"),
    spaceBefore=10,
    spaceAfter=6,
    keepWithNext=True
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName=font_name,
    fontSize=10,
    leading=15,
    textColor=colors.HexColor("#1e293b"),
    spaceAfter=8
)

bullet_style = ParagraphStyle(
    'BulletCustom',
    parent=body_style,
    leftIndent=18,
    firstLineIndent=-10,
    spaceAfter=4
)

story = []

# Title Page / Cover Section
story.append(Spacer(1, 20))
story.append(Paragraph("GIÁO TRÌNH TÓM TẮT KIỂM THỬ PHẦN MỀM", title_style))
story.append(Paragraph("Tài liệu tham khảo thi vấn đáp tự động (Oral Assessment)", subtitle_style))
story.append(Spacer(1, 15))

meta_data = [
    [Paragraph("<b>Học phần:</b>", body_style), Paragraph("SWT301 - Software Testing", body_style)],
    [Paragraph("<b>Bộ môn:</b>", body_style), Paragraph("Kỹ thuật phần mềm - FPT University", body_style)],
    [Paragraph("<b>Mục đích:</b>", body_style), Paragraph("Tài liệu chuẩn kiến thức phục vụ RAG Chấm thi Vấn đáp AI", body_style)],
]
t = Table(meta_data, colWidths=[120, 360])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story.append(t)
story.append(Spacer(1, 25))

# Chapter 1
story.append(Paragraph("Chương 1: Tổng quan về Kiểm thử phần mềm", chapter_style))
story.append(Paragraph("1.1 Định nghĩa và Mục tiêu của Kiểm thử", section_style))
story.append(Paragraph(
    "Kiểm thử phần mềm (Software Testing) là một tập hợp các hoạt động có cấu trúc nhằm đánh giá các đặc tính kỹ thuật "
    "và nghiệp vụ của một sản phẩm phần mềm, phát hiện các sai lệch so với yêu cầu thiết kế ban đầu, và xác minh tính đúng đắn. "
    "Mục tiêu cốt lõi của kiểm thử bao gồm: tìm kiếm lỗi (Defects/Bugs), tăng cường mức độ tin cậy vào chất lượng phần mềm, "
    "cung cấp dữ liệu định lượng cho ban quản trị đưa ra quyết định phát hành sản phẩm, và phòng ngừa lỗi tái xuất hiện.",
    body_style
))

story.append(Paragraph("1.2 Bảy nguyên lý cơ bản của kiểm thử (7 Testing Principles)", section_style))
story.append(Paragraph("• <b>Nguyên lý 1: Kiểm thử cho thấy sự hiện diện của lỗi, không chứng minh phần mềm không có lỗi.</b>", bullet_style))
story.append(Paragraph("• <b>Nguyên lý 2: Kiểm thử kiệt quệ là bất khả thi (Exhaustive testing is impossible):</b> Không thể kiểm thử hết tất cả tổ hợp đầu vào.", bullet_style))
story.append(Paragraph("• <b>Nguyên lý 3: Kiểm thử sớm (Early testing):</b> Hoạt động kiểm thử nên bắt đầu ngay từ giai đoạn phân tích tài liệu yêu cầu.", bullet_style))
story.append(Paragraph("• <b>Nguyên lý 4: Sự tập trung của lỗi (Defect clustering):</b> Phần lớn lỗi thường tập trung ở một số ít module có độ phức tạp cao.", bullet_style))
story.append(Paragraph("• <b>Nguyên lý 5: Nghịch lý thuốc trừ sâu (Pesticide paradox):</b> Nếu lặp đi lặp lại cùng một bộ test case, sẽ không tìm thấy lỗi mới.", bullet_style))
story.append(Paragraph("• <b>Nguyên lý 6: Kiểm thử phụ thuộc vào ngữ cảnh (Testing is context dependent):</b> Ứng dụng y tế khác với website thương mại điện tử.", bullet_style))
story.append(Paragraph("• <b>Nguyên lý 7: Sự ảo tưởng về việc không có lỗi (Absence-of-errors fallacy):</b> Phần mềm không có lỗi nhưng không đáp ứng nhu cầu sử dụng thì vẫn thất bại.", bullet_style))

story.append(PageBreak())

# Chapter 2
story.append(Paragraph("Chương 2: Các kỹ thuật Thiết kế Kiểm thử Hộp đen", chapter_style))
story.append(Paragraph("2.1 Phân vùng tương đương (Equivalence Partitioning - EP)", section_style))
story.append(Paragraph(
    "Phân vùng tương đương là kỹ thuật kiểm thử hộp đen chia miền giá trị đầu vào thành các phân vùng hợp lệ (Valid Partitions) "
    "và các phân vùng không hợp lệ (Invalid Partitions). Tất cả các giá trị trong cùng một phân vùng được giả định sẽ được phần mềm "
    "xử lý theo cùng một cơ chế logic. Mỗi phân vùng được chọn đại diện ít nhất một giá trị thử nghiệm, giúp giảm số lượng test case cần thiết.",
    body_style
))

story.append(Paragraph("2.2 Phân tích giá trị biên (Boundary Value Analysis - BVA)", section_style))
story.append(Paragraph(
    "Phân tích giá trị biên là kỹ thuật kiểm thử dựa trên quan sát thực tế rằng hầu hết các lỗi lập trình (lỗi phép toán <=, <, off-by-one) "
    "thường xảy ra tại biên của các phân vùng tương đương. Với mỗi biên giá trị [min, max], kiểm thử 2 giá trị biên bao gồm: biên chính xác "
    "và giá trị liền kề ngoài biên; hoặc kiểm thử 3 giá trị biên bao gồm: giá trị liền kề trước biên, giá trị tại biên và giá trị liền kề sau biên.",
    body_style
))

story.append(Paragraph("2.3 Bảng quyết định (Decision Table Testing)", section_style))
story.append(Paragraph(
    "Bảng quyết định là công cụ trực quan hữu hiệu để đặc tả các quy tắc nghiệp vụ phức tạp liên quan đến sự kết hợp nhiều điều kiện logic "
    "(Conditions/Inputs) để dẫn đến các hành động tương ứng (Actions/Outputs). Mỗi cột trong bảng đại diện cho một quy tắc nghiệp vụ "
    "(Business Rule) và tương ứng với một trường hợp kiểm thử độc lập.",
    body_style
))

story.append(PageBreak())

# Chapter 3
story.append(Paragraph("Chương 3: Các cấp độ và Quy trình Quản lý Lỗi", chapter_style))
story.append(Paragraph("3.1 Bốn cấp độ kiểm thử chính (Test Levels)", section_style))
story.append(Paragraph("1. <b>Kiểm thử đơn vị (Unit Testing):</b> Kiểm tra các thành phần nhỏ nhất (hàm, lớp, module) thường do lập trình viên thực hiện.", bullet_style))
story.append(Paragraph("2. <b>Kiểm thử tích hợp (Integration Testing):</b> Kiểm tra sự tương tác và giao tiếp giữa các thành phần hoặc hệ thống khác nhau.", bullet_style))
story.append(Paragraph("3. <b>Kiểm thử hệ thống (System Testing):</b> Đánh giá toàn bộ hệ thống tích hợp hoàn chỉnh dựa trên tài liệu yêu cầu (SRS).", bullet_style))
story.append(Paragraph("4. <b>Kiểm thử chấp nhận (Acceptance Testing):</b> Xác định hệ thống đã sẵn sàng bàn giao cho người dùng hoặc khách hàng nghiệm thu.", bullet_style))

story.append(Paragraph("3.2 Vòng đời của lỗi (Defect Life Cycle)", section_style))
story.append(Paragraph(
    "Vòng đời của một lỗi (Defect Life Cycle) bắt đầu từ khi kiểm thử viên phát hiện và tạo lỗi ở trạng thái New/Open. "
    "Sau khi được xem xét, lỗi được chuyển sang Assigned cho Developer phụ trách sửa chữa. Khi Developer sửa xong, trạng thái chuyển thành Fixed "
    "hoặc Ready for Retest. Tester thực hiện kiểm thử lại (Retest). Nếu lỗi đã được giải quyết triệt để, lỗi sẽ được Closed. "
    "Nếu lỗi vẫn còn tồn tại, lỗi được Reopened.",
    body_style
))

doc.build(story)
print(f"SUCCESS: Generated PDF at {pdf_path}")
