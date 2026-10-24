"""
Script phát sinh File Excel Phân bổ Thí sinh theo 6 Level môn học ENTs (ENT001 - ENT503).
Tạo file Excel đa trang (Multi-sheet):
1. Sheet 'Tong_Quan_Level': Tổng hợp 6 level, chuẩn CEFR, hình thức thi và ca thi.
2. 6 Sheet riêng cho từng Level (Level1_ENT001 -> Level6_ENT503).
3. Sheet 'Danh_Sach_Tong_Hop': Toàn bộ 48 sinh viên của 6 level để phục vụ import tổng hợp.
"""

import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

LEVEL_DEFINITIONS = [
    {
        "code": "ENT001",
        "name": "Tiếng Anh Dự bị 1",
        "level": "Level 1 (A1 - Starter)",
        "cefr": "A1",
        "format": "Part 1: Phỏng vấn cá nhân (5 câu) + Part 2: Miêu tả tranh",
        "duration": "5 - 6 phút",
        "sheet_name": "Level1_ENT001",
        "date": "2026-10-25",
        "slots": [
            {"ca": 1, "start": "08:00", "end": "09:30", "room": "AL-L101", "teacher": "teacher1@fpt.edu.vn", "class": "SE1701"},
        ],
        "students": [
            ("SE170101", "Nguyễn Hoàng Long", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
            ("SE170102", "Trần Thị Mai Anh", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
            ("SE170103", "Lê Minh Tuấn", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
            ("SE170104", "Phạm Quỳnh Nga", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
            ("student_l1", "Nguyễn Anh Dũng (Demo Level 1)", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
            ("SE170106", "Hoàng Thu Thảo", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
            ("SE170107", "Vũ Gia Huy", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
            ("SE170108", "Đỗ Bích Ngọc", "SE1701", 1, "AL-L101", "teacher1@fpt.edu.vn"),
        ]
    },
    {
        "code": "ENT104",
        "name": "Tiếng Anh Cơ sở 2",
        "level": "Level 2 (A2 - Elementary)",
        "cefr": "A2",
        "format": "Part 1: Phỏng vấn cá nhân (5 câu) + Part 2: Miêu tả tranh",
        "duration": "5 - 6 phút",
        "sheet_name": "Level2_ENT104",
        "date": "2026-10-25",
        "slots": [
            {"ca": 1, "start": "08:00", "end": "09:30", "room": "AL-L401", "teacher": "teacher1@fpt.edu.vn", "class": "SE1702"},
            {"ca": 2, "start": "10:00", "end": "11:30", "room": "AL-L402", "teacher": "teacher@fpt.edu.vn", "class": "SE1702"},
        ],
        "students": [
            ("student", "Nguyễn Văn An (Demo Student)", "SE1702", 1, "AL-L401", "teacher1@fpt.edu.vn"),
            ("student_l2", "Trần Bảo Nam (Demo Level 2)", "SE1702", 1, "AL-L401", "teacher1@fpt.edu.vn"),
            ("SE170203", "Đặng Minh Quân", "SE1702", 1, "AL-L401", "teacher1@fpt.edu.vn"),
            ("SE170204", "Bùi Khánh Linh", "SE1702", 1, "AL-L401", "teacher1@fpt.edu.vn"),
            ("SE170205", "Võ Hải Đăng", "SE1702", 2, "AL-L402", "teacher@fpt.edu.vn"),
            ("SE170206", "Lý Thanh Trúc", "SE1702", 2, "AL-L402", "teacher@fpt.edu.vn"),
            ("SE170207", "Dương Nhật Minh", "SE1702", 2, "AL-L402", "teacher@fpt.edu.vn"),
            ("SE170208", "Mai Phương Uyên", "SE1702", 2, "AL-L402", "teacher@fpt.edu.vn"),
        ]
    },
    {
        "code": "ENT203",
        "name": "Tiếng Anh Giao tiếp 3",
        "level": "Level 3 (B1 - Intermediate)",
        "cefr": "B1",
        "format": "Part 1: Đóng vai theo cặp (Role-play) + Part 2: Thảo luận sâu",
        "duration": "10 phút / cặp",
        "sheet_name": "Level3_ENT203",
        "date": "2026-10-25",
        "slots": [
            {"ca": 2, "start": "10:00", "end": "11:30", "room": "AL-L201", "teacher": "teacher@fpt.edu.vn", "class": "SE1703"},
        ],
        "students": [
            ("student_l3", "Lê Thanh Tùng (Demo Level 3)", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
            ("SE170302", "Nguyễn Hải Yến", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
            ("SE170303", "Trần Đình Trọng", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
            ("SE170304", "Phan Thùy Chi", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
            ("SE170305", "Lâm Quốc Cường", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
            ("SE170306", "Hồ Bích Trâm", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
            ("SE170307", "Ngô Thành Nam", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
            ("SE170308", "Đinh Mỹ Hạnh", "SE1703", 2, "AL-L201", "teacher@fpt.edu.vn"),
        ]
    },
    {
        "code": "ENT303",
        "name": "Tiếng Anh Học thuật 4",
        "level": "Level 4 (B1+ - High Intermediate)",
        "cefr": "B1+",
        "format": "Part 1: Đóng vai theo cặp (Role-play) + Part 2: Thảo luận sâu",
        "duration": "10 phút / cặp",
        "sheet_name": "Level4_ENT303",
        "date": "2026-10-25",
        "slots": [
            {"ca": 3, "start": "13:30", "end": "15:00", "room": "AL-L301", "teacher": "teacher1@fpt.edu.vn", "class": "SE1704"},
        ],
        "students": [
            ("student_l4", "Phạm Văn Đức (Demo Level 4)", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
            ("SE170402", "Chu Kim Ngân", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
            ("SE170403", "Lê Hồng Đăng", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
            ("SE170404", "Tạ Lan Anh", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
            ("SE170405", "Đỗ Mạnh Hùng", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
            ("SE170406", "Vương Thúy Diễm", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
            ("SE170407", "Trịnh Hữu Thắng", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
            ("SE170408", "Nguyễn Thu Thủy", "SE1704", 3, "AL-L301", "teacher1@fpt.edu.vn"),
        ]
    },
    {
        "code": "ENT403",
        "name": "Tiếng Anh Nâng cao 5",
        "level": "Level 5 (B2 - Upper Intermediate)",
        "cefr": "B2",
        "format": "Part 1: Thuyết trình độc thoại (Long Run) + Part 2: Phản biện",
        "duration": "5 - 6 phút",
        "sheet_name": "Level5_ENT403",
        "date": "2026-10-25",
        "slots": [
            {"ca": 3, "start": "13:30", "end": "15:00", "room": "AL-L403", "teacher": "teacher@fpt.edu.vn", "class": "SE1705"},
        ],
        "students": [
            ("student_l5", "Bùi Hoàng Việt (Demo Level 5)", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
            ("SE170502", "Cao Phương Thảo", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
            ("SE170503", "Hà Quốc Huy", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
            ("SE170504", "Trần Ngọc Ánh", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
            ("SE170505", "Nguyễn Đắc Chung", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
            ("SE170506", "Phan Thu Trang", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
            ("SE170507", "Lương Tuấn Khang", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
            ("SE170508", "Tô Cẩm Nhung", "SE1705", 3, "AL-L403", "teacher@fpt.edu.vn"),
        ]
    },
    {
        "code": "ENT503",
        "name": "Tiếng Anh Biện luận 6",
        "level": "Level 6 (B2+ - Advanced)",
        "cefr": "B2+",
        "format": "Part 1: Thuyết trình độc thoại (Long Run) + Part 2: Phản biện chuyên sâu",
        "duration": "5 - 6 phút",
        "sheet_name": "Level6_ENT503",
        "date": "2026-10-25",
        "slots": [
            {"ca": 4, "start": "15:30", "end": "17:00", "room": "AL-L501", "teacher": "teacher1@fpt.edu.vn", "class": "SE1706"},
        ],
        "students": [
            ("student_l6", "Trần Quang Minh (Demo Level 6)", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
            ("SE170602", "Nguyễn Thùy Dung", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
            ("SE170603", "Đào Khắc Hiếu", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
            ("SE170604", "Vũ Hoàng Yến", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
            ("SE170605", "Lê Tuấn Kiệt", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
            ("SE170606", "Đoàn Như Quỳnh", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
            ("SE170607", "Phạm Quốc Tuấn", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
            ("SE170608", "Hoàng Kim Oanh", "SE1706", 4, "AL-L501", "teacher1@fpt.edu.vn"),
        ]
    },
]

def generate_excel():
    wb = openpyxl.Workbook()
    # Sheet 1: Tổng quan
    ws_ov = wb.active
    ws_ov.title = "Tong_Quan_Level"

    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    accent_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid")

    # Header Tổng quan
    ws_ov.merge_cells("A1:G1")
    t_cell = ws_ov["A1"]
    t_cell.value = "HỆ THỐNG PHÂN BỔ CA THI VÀ LEVEL MÔN HỌC ENTs SPEAKING (FPT UNIVERSITY)"
    t_cell.font = Font(name="Calibri", size=13, bold=True, color="1E3A8A")
    t_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws_ov.row_dimensions[1].height = 32

    ov_headers = ["Level", "Mã môn", "Tên môn học", "Chuẩn CEFR", "Hình thức thi", "Thời lượng", "Tên Sheet chi tiết"]
    ws_ov.append(ov_headers)
    ws_ov.row_dimensions[2].height = 24
    for col_idx in range(1, len(ov_headers) + 1):
        c = ws_ov.cell(row=2, column=col_idx)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border

    for l_idx, l in enumerate(LEVEL_DEFINITIONS, start=1):
        row_vals = [
            f"Level {l_idx}",
            l["code"],
            l["name"],
            l["cefr"],
            l["format"],
            l["duration"],
            l["sheet_name"]
        ]
        ws_ov.append(row_vals)
        r_num = ws_ov.max_row
        ws_ov.row_dimensions[r_num].height = 22
        for col_idx in range(1, len(row_vals) + 1):
            c = ws_ov.cell(row=r_num, column=col_idx)
            c.border = thin_border
            c.font = Font(name="Calibri", size=10)
            if col_idx in (1, 2, 4, 6, 7):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

    # Sheet chi tiết cho từng Level
    detail_headers = [
        "Ca_Thi", "Ngay_Thi", "Gio_Bat_Dau", "Gio_Ket_Thuc", "Phong_Thi",
        "Giang_Vien_Email", "MSSV", "Ho_Ten", "Lop_Hoc"
    ]

    flat_data_all = []

    for l in LEVEL_DEFINITIONS:
        ws_l = wb.create_sheet(title=l["sheet_name"])
        ws_l.append(detail_headers)
        ws_l.row_dimensions[1].height = 24
        for col_idx in range(1, len(detail_headers) + 1):
            c = ws_l.cell(row=1, column=col_idx)
            c.fill = header_fill
            c.font = header_font
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = thin_border

        # Map slot info
        slot_dict = {s["ca"]: s for s in l["slots"]}

        for st in l["students"]:
            mssv, name, lop, ca_num, room, gv_email = st
            s_info = slot_dict.get(ca_num, l["slots"][0])
            row_data = [
                ca_num,
                l["date"],
                s_info["start"],
                s_info["end"],
                room,
                gv_email,
                mssv,
                name,
                lop
            ]
            ws_l.append(row_data)
            r_num = ws_l.max_row
            ws_l.row_dimensions[r_num].height = 20
            for col_idx in range(1, len(row_data) + 1):
                c = ws_l.cell(row=r_num, column=col_idx)
                c.border = thin_border
                c.font = Font(name="Calibri", size=10)
                if col_idx in (1, 2, 3, 4, 5, 7, 9):
                    c.alignment = Alignment(horizontal="center", vertical="center")
                else:
                    c.alignment = Alignment(horizontal="left", vertical="center")

            flat_data_all.append(row_data + [l["code"], l["name"], l["level"]])

    # Sheet 8: Danh Sách Tổng Hợp
    ws_all = wb.create_sheet(title="Danh_Sach_Tong_Hop")
    flat_headers = detail_headers + ["Ma_Mon", "Ten_Mon", "Level"]
    ws_all.append(flat_headers)
    ws_all.row_dimensions[1].height = 24
    for col_idx in range(1, len(flat_headers) + 1):
        c = ws_all.cell(row=1, column=col_idx)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border

    for r in flat_data_all:
        ws_all.append(r)
        r_num = ws_all.max_row
        ws_all.row_dimensions[r_num].height = 20
        for col_idx in range(1, len(r) + 1):
            c = ws_all.cell(row=r_num, column=col_idx)
            c.border = thin_border
            c.font = Font(name="Calibri", size=10)
            if col_idx in (1, 2, 3, 4, 5, 7, 9, 10, 12):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

    # Tự động căn chỉnh độ rộng cột cho toàn bộ sheets
    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = 0
            for cell in col:
                val = str(cell.value or "")
                if len(val) > max_len:
                    max_len = len(val)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # Save to both target locations
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    p1 = os.path.join(base_dir, "sample_data", "demo_import_sinh_vien_theo_level.xlsx")
    p2 = os.path.join(base_dir, "apps", "staff-portal", "public", "demo_import_sinh_vien_theo_level.xlsx")

    os.makedirs(os.path.dirname(p1), exist_ok=True)
    os.makedirs(os.path.dirname(p2), exist_ok=True)

    wb.save(p1)
    wb.save(p2)
    print("Multi-level Excel generated successfully:")
    print(" - Location 1:", p1)
    print(" - Location 2:", p2)
    print(f" - Total students: {len(flat_data_all)} across 6 Levels.")

if __name__ == "__main__":
    generate_excel()
