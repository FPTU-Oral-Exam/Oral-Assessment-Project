"""Kiểm tra tính toàn vẹn và sức khỏe của hệ thống tài liệu (Docs Health Check)."""

import os
import sys
from pathlib import Path

# Đảm bảo in UTF-8 không bị lỗi trên Windows PowerShell (cp1252)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent

def check_docs():
    print("=" * 60)
    print("[AUDIT] KIEM TRA SUC KHOE KHO TAI LIEU (DOCS HEALTH CHECK)")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    # 1. Kiểm tra các thư mục phân tầng bắt buộc
    required_dirs = [
        "docs/adr",
        "docs/api",
        "docs/specs",
        "docs/runbooks",
        "docs/research",
        "docs/diagrams",
        "docs/archive",
    ]
    
    print("\n[1] Kiem tra Thu muc Phan tang (Architecture Layers):")
    for d in required_dirs:
        dir_path = ROOT / d
        if dir_path.is_dir():
            print(f"  [PASS] Thu muc: {d}")
            passed += 1
        else:
            print(f"  [FAIL] Thieu thu muc: {d}")
            failed += 1
            
    # 2. Kiểm tra các tệp tin kiến trúc cốt lõi
    required_files = [
        "ARCHITECTURE.md",
        "docs/README.md",
        "docs/adr/README.md",
        "docs/runbooks/README.md",
        "docs/specs/README.md",
        "docs/api/README.md",
    ]
    
    print("\n[2] Kiem tra Tep tin Kien truc Cot loi (Core Files):")
    for f in required_files:
        file_path = ROOT / f
        if file_path.is_file():
            print(f"  [PASS] Tep tin: {f}")
            passed += 1
        else:
            print(f"  [FAIL] Thieu tep tin: {f}")
            failed += 1
            
    # 3. Đếm số lượng ADRs
    adr_dir = ROOT / "docs" / "adr"
    adr_files = list(adr_dir.glob("00*.md")) if adr_dir.is_dir() else []
    print(f"\n[3] Tong so ban ghi ADR hien huu: {len(adr_files)} ban ghi")
    for adr in sorted(adr_files):
        print(f"      - {adr.name}")
        
    # 4. Kiểm tra file rải rác ở thư mục gốc docs/
    print("\n[4] Kiem tra File Rai rac ngoai Quy hoach tai docs/:")
    docs_dir = ROOT / "docs"
    allowed_root_docs = {"README.md", "QUICK_START.md", "user-guide.md"}
    loose_files = [f.name for f in docs_dir.iterdir() if f.is_file() and f.name not in allowed_root_docs]
    if not loose_files:
        print("  [PASS] Goc docs/ sach se, khong co file rai rac ngoai quy hoach.")
        passed += 1
    else:
        print(f"  [WARN] Phat hien cac file chua duoc gom vao thu muc: {loose_files}")
        failed += 1

    print("\n" + "=" * 60)
    print(f"KET QUA: {passed} PASS, {failed} FAIL")
    print("=" * 60)
    
    return failed == 0

if __name__ == "__main__":
    success = check_docs()
    sys.exit(0 if success else 1)
