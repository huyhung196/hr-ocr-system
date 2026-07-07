import pandas as pd
import os

# Resolve path to the Excel configuration file
current_dir = os.path.dirname(__file__) # backend/app/services
backend_dir = os.path.dirname(os.path.dirname(current_dir)) # backend/
root_excel = os.path.join(backend_dir, "LOGIC CÂY LƯU TRỮ.xlsx")
docker_excel = "/app/LOGIC CÂY LƯU TRỮ.xlsx"

EXCEL_FILE_PATH = docker_excel if os.path.exists(docker_excel) else root_excel

def get_employee_data():
    try:
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Database_nhan_vien')
        # Filter out nan
        df = df.dropna(subset=['Mã nhân viên', 'Họ và tên'])
        employees = []
        for _, row in df.iterrows():
            emp_code = str(row['Mã nhân viên'])
            if emp_code.endswith('.0'):
                emp_code = emp_code[:-2]
            
            # Formatting join_date and resignation_date to YYYY-MM-DD
            join_date = row.get('Ngày vào làm')
            join_date_str = None
            if pd.notna(join_date):
                if hasattr(join_date, 'strftime'):
                    join_date_str = join_date.strftime('%Y-%m-%d')
                else:
                    join_date_str = str(join_date).strip()

            resigned_date = row.get('Ngày nghỉ việc')
            resigned_date_str = None
            if pd.notna(resigned_date):
                if hasattr(resigned_date, 'strftime'):
                    resigned_date_str = resigned_date.strftime('%Y-%m-%d')
                else:
                    resigned_date_str = str(resigned_date).strip()

            # Clean helper for string columns
            def get_str_val(col_name, default=""):
                val = row.get(col_name)
                if pd.isna(val) or str(val).strip() == '0' or str(val).strip() == '':
                    return default
                
                val_str = str(val).strip()
                if val_str.endswith('.0'):
                    val_str = val_str[:-2]
                    
                if val_str.isdigit():
                    if col_name == 'Số CCCD':
                        if len(val_str) == 8 or len(val_str) < 9:
                            val_str = val_str.zfill(9)
                        elif len(val_str) == 11 or (len(val_str) < 12 and len(val_str) > 9):
                            val_str = val_str.zfill(12)
                    elif col_name == 'Mã BHXH':
                        if len(val_str) == 9 or len(val_str) < 10:
                            val_str = val_str.zfill(10)
                            
                return val_str

            employees.append({
                'employee_code': emp_code,
                'full_name': str(row['Họ và tên']).strip(),
                'company': get_str_val('Công ty', 'Thuần Việt Global'),
                'department': get_str_val('Khu vực chuyên môn', 'Chưa phân bổ'),
                'team': get_str_val('Team', ''),
                'title': get_str_val('Chức danh', 'Nhân viên'),
                'bhxh': get_str_val('Mã BHXH', ''),
                'cccd': get_str_val('Số CCCD', ''),
                'status': get_str_val('Trạng thái', 'Chính thức'),
                'join_date': join_date_str,
                'resignation_date': resigned_date_str,
                'notes': get_str_val('Ghi chú', '')
            })
        return employees
    except Exception as e:
        print(f"Error reading employee database: {e}")
        return []

def get_doc_type_rules():
    try:
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Config_rule_scan')
        df = df.dropna(subset=['Viết tắt', 'Phân loại giấy tờ'])
        rules = []
        for _, row in df.iterrows():
            abbr = str(row['Viết tắt']).strip()
            name = str(row['Phân loại giấy tờ']).strip()
            
            # Extract optional required/excluded phrases
            required = row.get('Cụm từ bắt buộc')
            required_str = str(required).strip() if pd.notna(required) else ""
            
            excluded = row.get('Cụm từ loại trừ')
            excluded_str = str(excluded).strip() if pd.notna(excluded) else ""
            
            # Format pattern
            fmt = row.get('Format tên file')
            fmt_str = str(fmt).strip() if pd.notna(fmt) else ""
            
            # Folder template
            folder = row.get('Folder logic')
            folder_str = str(folder).strip() if pd.notna(folder) else ""
            
            rules.append({
                'doc_type': abbr,
                'keyword': name,
                'required_phrases': required_str,
                'excluded_phrases': excluded_str,
                'format': fmt_str,
                'folder_path': folder_str
            })
        return rules
    except Exception as e:
        print(f"Error reading doc type rules: {e}")
        return []
        
def get_folder_logic():
    try:
        df = pd.read_excel(EXCEL_FILE_PATH, sheet_name='Config_rule_scan')
        df = df.dropna(subset=['Viết tắt', 'Folder logic'])
        logic = {}
        for _, row in df.iterrows():
            logic[str(row['Viết tắt']).strip()] = str(row['Folder logic']).strip()
        return logic
    except Exception as e:
        print(f"Error reading folder logic: {e}")
        return {}

COMPANY_MAPPING = {
    "Thuần Việt Global": {"abbr": "Global", "folder": "Công ty CP Thuần Việt Global"},
    "Thuần Việt Digital": {"abbr": "Digital", "folder": "Công ty TNHH Thuần Việt Digital"},
    "Nệm Thuần Việt": {"abbr": "NTV", "folder": "Công ty Cổ phần Nệm Thuần Việt"},
    "Night Dream": {"abbr": "ND", "folder": "Công ty TNHH Night Dream"},
    "Nệm Thành Công": {"abbr": "NTC", "folder": "Công ty TNHH SX & TM Nệm Thành Công"},
}

def get_company_info(company_name: str) -> dict:
    name_clean = str(company_name).strip()
    for key, val in COMPANY_MAPPING.items():
        if key.lower() in name_clean.lower() or name_clean.lower() in key.lower():
            return val
            
    # Try to find in database
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        db_company = db.query(models.Company).filter(models.Company.name.ilike(f"%{name_clean}%")).first()
        db.close()
        if db_company:
            return {"abbr": db_company.abbr or "Global", "folder": db_company.folder or name_clean}
    except Exception as e:
        print(f"Error checking company in db: {e}")
        
    return {"abbr": "Global", "folder": "Công ty CP Thuần Việt Global"}

def format_path_and_filename(doc_type: str, emp_code: str, meta: dict, rules: list, employees: list) -> tuple[str, str]:
    # 1. Resolve employee info
    emp = next((e for e in employees if e['employee_code'] == emp_code), None)
    emp_name = emp['full_name'] if emp else ""
    company_name = emp['company'] if emp else "Thuần Việt Global"
    
    # Resolve company abbr and folder name
    co_info = get_company_info(company_name)
    company_abbr = co_info["abbr"]
    company_folder = co_info["folder"]
    
    # 2. Get rule formats
    rule = next((r for r in rules if r['doc_type'] == doc_type), None)
    file_format = rule['format'] if (rule and rule.get('format')) else "{{CongTy}}_{{Viết tắt}}_{{HoTen}}_{{MNV}}_{{NgayVanBan}}"
    folder_template = rule['folder_path'] if (rule and rule.get('folder_path')) else "{{CongTy}}/01. HỒ SƠ NHÂN VIÊN/{{Mã nhân viên}}_{{Họ và tên}}"
    
    # 3. Clean and map metadata values
    doc_num = meta.get("document_number") or ""
    doc_date = meta.get("document_date") or ""
    period = meta.get("period") or ""
    detail = meta.get("detail_text") or ""
    
    # Extract year and month from document_date or period or current time
    import time
    current_year = time.strftime("%Y")
    current_month = time.strftime("%m")
    
    year_str = current_year
    month_str = current_month
    
    if period and len(period) >= 4:
        import re
        year_match = re.search(r'(20\d{2})', period)
        if year_match:
            year_str = year_match.group(1)
        month_match = re.search(r'^(0[1-9]|1[0-2])', period)
        if month_match:
            month_str = month_match.group(1)
    elif doc_date and len(doc_date) >= 4:
        import re
        year_match = re.search(r'(20\d{2})', doc_date)
        if year_match:
            year_str = year_match.group(1)
        month_match = re.search(r'^(0[1-9]|1[0-2])', doc_date)
        if month_match:
            month_str = month_match.group(1)
            
    # Replace all placeholders in both file format and folder format
    replacements = {
        "{{CongTy}}": company_abbr,
        "{{Công ty}}": company_folder,
        "{{HoTen}}": emp_name,
        "{{Tên nhân viên}}": emp_name,
        "{{Họ và tên}}": emp_name,
        "{{MNV}}": emp_code,
        "{{Mã nhân viên}}": emp_code,
        "{{SoHopDong}}": doc_num,
        "{{SoPhuLuc}}": doc_num,
        "{{SoQuyetDinh}}": doc_num,
        "{{SoBienBan}}": doc_num,
        "{{MaHoSo}}": doc_num,
        "{{NgayVanBan}}": doc_date,
        "{{NgayHieuLuc}}": doc_date,
        "{{NgayBanHanh}}": doc_date,
        "{{NgayNhanViec}}": doc_date,
        "{{KyLuong}}": period,
        "{{KyKeKhai}}": period,
        "{{KyBHXH}}": period,
        "{{DotChi}}": period,
        "{{TenNoiDung}}": detail,
        "{{ChiTiet}}": detail,
        "{{TenPhucLoi}}": detail,
        "{{LoaiCheDo}}": detail,
        "{{ChucDanh}}": detail,
        "{{HoNghe}}": detail,
        "{{Nam}}": year_str,
        "{{Thang}}": month_str,
        "{{Viết tắt}}": doc_type,
    }
    
    formatted_file = file_format
    formatted_folder = folder_template
    
    for k, v in replacements.items():
        formatted_file = formatted_file.replace(k, str(v))
        formatted_folder = formatted_folder.replace(k, str(v))
        
    if not formatted_file.lower().endswith(".pdf"):
        formatted_file += ".pdf"
        
    return formatted_file, formatted_folder
