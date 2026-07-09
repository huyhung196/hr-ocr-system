from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, BackgroundTasks
from sqlalchemy.orm import Session
import shutil
import os
import urllib.parse
from typing import List

from app import models, schemas
from app.database import get_db, SessionLocal
from app.services.ocr import extract_text_from_image, identify_document
from app.services.excel import format_path_and_filename
from app.api.routers.employees import get_all_employees
from app.api.routers.rules import get_all_rules

router = APIRouter()

# Resolve directory locations dynamically relative to backend root
current_dir = os.path.dirname(__file__) # app/api/routers
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir))) # backend/
UPLOAD_DIR = os.path.join(backend_dir, "uploads")
PROCESSED_DIR = os.path.join(backend_dir, "processed_files")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

def upload_file_to_gdrive_if_possible(target_file_path: str, folder_path: str, new_file_name: str, db: Session) -> tuple[str, str]:
    try:
        import sys
        if backend_dir not in sys.path:
            sys.path.append(backend_dir)
            
        from drive_api import get_gdrive_service, create_folder, upload_to_drive, extract_folder_id
        service = get_gdrive_service()
        if service:
            # Đọc cấu hình từ DB
            setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "GDRIVE_ROOT_FOLDER_NAME").first()
            gdrive_val = setting.value.strip() if setting and setting.value else os.environ.get("GDRIVE_ROOT_FOLDER_NAME", "HR_OCR_HoSo")
            
            # Nếu người dùng nhập URL, lấy ID
            root_folder_id = extract_folder_id(gdrive_val)
            if not root_folder_id:
                # Nếu không phải URL (nghĩa là Tên thư mục), thì tạo/lấy folder theo tên
                root_folder_id = create_folder(service, gdrive_val, parent_id=None)
                
            if not root_folder_id:
                print("[GDrive] Cannot resolve root project folder.")
                return "local", None

            # Tạo sub-folder theo cấu trúc folder_path bên trong folder gốc
            parent_id = root_folder_id
            path_parts = [p for p in folder_path.split("/") if p.strip()]
            for part in path_parts:
                parent_id = create_folder(service, part, parent_id)
                if not parent_id:
                    break
            if parent_id:
                drive_file_id, drive_file_url = upload_to_drive(service, target_file_path, parent_id, new_file_name)
                if drive_file_id and drive_file_url:
                    return drive_file_id, drive_file_url
    except Exception as e:
        print(f"[GDrive] Failed to upload to Google Drive: {e}")
    return "local", None

def process_single_file_background(file_path: str, original_filename: str, ocr_method: str, log_id: int):
    """Xử lý ngầm từng file để không làm treo giao diện UI"""
    db = SessionLocal()
    try:
        # Lấy record từ DB
        db_log = db.query(models.ScanLog).filter(models.ScanLog.id == log_id).first()
        if not db_log:
            return
            
        # 3. OCR Text Extraction
        extracted_text = extract_text_from_image(file_path, ocr_method=ocr_method)
        
        # Fetch dynamic employees and rules list
        current_employees = get_all_employees(db)
        current_rules = get_all_rules(db)
        
        # 4. Identify Doc Type & Employee
        doc_type, emp_code, meta = identify_document(extracted_text, current_rules, current_employees)
        
        # Filename Fallback Parsing (useful for handwritten documents or OCR failures)
        filename_upper = original_filename.upper()
        if not doc_type:
            for rule in current_rules:
                abbr = rule['doc_type'].upper()
                keyword = rule['keyword'].upper()
                if abbr in filename_upper or keyword in filename_upper:
                    doc_type = rule['doc_type']
                    print(f"[Filename Fallback] Guessed Doc Type: {doc_type} from filename: {original_filename}")
                    break
                    
        if not emp_code:
            # 1. Match by numeric employee code inside filename
            for emp in current_employees:
                emp_code_db = emp['employee_code'].upper()
                emp_code_no_dot = emp_code_db.rstrip('.')
                if emp_code_db in filename_upper or emp_code_no_dot in filename_upper:
                    emp_code = emp['employee_code']
                    print(f"[Filename Fallback] Guessed Employee: {emp_code} by code in filename: {original_filename}")
                    break
            # 2. Match by normalized name inside filename
            if not emp_code:
                from app.services.ocr import remove_vietnamese_diacritics
                norm_filename = remove_vietnamese_diacritics(filename_upper)
                for emp in current_employees:
                    norm_name = remove_vietnamese_diacritics(emp['full_name']).upper()
                    variants = [
                        norm_name,
                        norm_name.replace(" ", "_"),
                        norm_name.replace(" ", "-"),
                        norm_name.replace(" ", "")
                    ]
                    if any(v in norm_filename for v in variants if v):
                        emp_code = emp['employee_code']
                        print(f"[Filename Fallback] Guessed Employee: {emp_code} by normalized name in filename: {original_filename}")
                        break
        
        # 5. Determine New Name and Folder
        status = "Chờ review tên"
        new_file_name = None
        folder_path = None
        
        if doc_type and emp_code:
            status = "Sẵn sàng đặt tên"
            new_file_name, folder_path = format_path_and_filename(doc_type, emp_code, meta, current_rules, current_employees)
            file_ext = os.path.splitext(original_filename)[1]
            if file_ext:
                base_name = os.path.splitext(new_file_name)[0]
                new_file_name = base_name + file_ext
        elif doc_type or emp_code:
            status = "Chờ review tên"
            new_file_name, folder_path = format_path_and_filename(doc_type or "UNKNOWN", emp_code or "UNKNOWN", meta, current_rules, current_employees)
            file_ext = os.path.splitext(original_filename)[1]
            if file_ext:
                base_name = os.path.splitext(new_file_name)[0]
                new_file_name = base_name + file_ext
            
        # Update Record
        db_log.extracted_employee_code = emp_code
        db_log.extracted_doc_type = doc_type
        db_log.status = status
        db_log.new_file_name = new_file_name
        db_log.folder_path = folder_path
        
        if meta:
            if 'document_number' in meta: db_log.document_number = meta['document_number']
            if 'document_date' in meta: db_log.document_date = meta['document_date']
            if 'period' in meta: db_log.period = meta['period']
            if 'detail_text' in meta: db_log.detail_text = meta['detail_text']
            
        db.commit()
    except Exception as e:
        print(f"Error processing file background: {e}")
        db_log = db.query(models.ScanLog).filter(models.ScanLog.id == log_id).first()
        if db_log:
            db_log.status = "Lỗi xử lý"
            db.commit()
    finally:
        db.close()

@router.post("/upload", response_model=List[schemas.ScanLog])
def upload_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    ocr_method: str = Form("paddle"),
    db: Session = Depends(get_db)
):
    results = []
    for file in files:
        # 1. Save uploaded file temporarily
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Initial DB Record (Trả về UI ngay lập tức)
        db_log = models.ScanLog(
            original_file_name=file.filename,
            status="Đang xử lý"
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        results.append(db_log)
        
        # 3. Đẩy tác vụ OCR nặng chạy nền
        background_tasks.add_task(
            process_single_file_background,
            file_path,
            file.filename,
            ocr_method,
            db_log.id
        )
        
    return results

@router.get("/scans", response_model=List[schemas.ScanLog])
def get_scans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    scans = db.query(models.ScanLog).order_by(models.ScanLog.created_at.desc()).offset(skip).limit(limit).all()
    return scans

@router.put("/scans/{scan_id}", response_model=schemas.ScanLog)
def update_scan(scan_id: int, scan_update: schemas.ScanLogUpdate, db: Session = Depends(get_db)):
    db_scan = db.query(models.ScanLog).filter(models.ScanLog.id == scan_id).first()
    if not db_scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    old_status = db_scan.status
    
    update_data = scan_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_scan, key, value)
        
    if scan_update.status == "Đã đổi tên" and old_status != "Đã đổi tên":
        try:
            meta = {
                "document_number": db_scan.document_number,
                "document_date": db_scan.document_date,
                "period": db_scan.period,
                "detail_text": db_scan.detail_text
            }
            current_rules = get_all_rules(db)
            new_file_name, folder_path = format_path_and_filename(
                db_scan.extracted_doc_type or "UNKNOWN",
                db_scan.extracted_employee_code or "UNKNOWN",
                meta,
                current_rules,
                get_all_employees(db)
            )
            file_ext = os.path.splitext(db_scan.original_file_name)[1]
            if file_ext:
                base_name = os.path.splitext(new_file_name)[0]
                new_file_name = base_name + file_ext
                
            db_scan.folder_path = folder_path
            db_scan.new_file_name = new_file_name
            
            file_path = os.path.join(UPLOAD_DIR, db_scan.original_file_name)
            
            if os.path.exists(file_path):
                folders = [f for f in folder_path.split("/") if f.strip()]
                target_folder = os.path.join(PROCESSED_DIR, *folders)
                
                os.makedirs(target_folder, exist_ok=True)
                
                target_file_path = os.path.join(target_folder, new_file_name)
                shutil.move(file_path, target_file_path)
                
                # Try GDrive upload
                drive_id, drive_url = upload_file_to_gdrive_if_possible(target_file_path, folder_path, new_file_name, db)
                if drive_id != "local" and drive_url:
                    db_scan.drive_file_id = drive_id
                    db_scan.drive_file_url = drive_url
                else:
                    # Friendly HTTP URL conversion (Fallback)
                    relative_url = "/".join([urllib.parse.quote(f) for f in folders]) + "/" + urllib.parse.quote(new_file_name)
                    db_scan.drive_file_url = f"http://localhost:8000/api/processed/{relative_url}"
                    db_scan.drive_file_id = "local"
                
        except Exception as e:
            print(f"Error saving file locally: {e}")
            db_scan.status = "Lỗi lưu file local"
            
    elif scan_update.status == "Lỗi xử lý" and old_status != "Lỗi xử lý":
        file_path = os.path.join(UPLOAD_DIR, db_scan.original_file_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
            
    db.commit()
    db.refresh(db_scan)
    return db_scan

class BulkApproveRequest(schemas.BaseModel):
    scan_ids: List[int]

@router.post("/scans/bulk_approve")
def bulk_approve_scans(req: BulkApproveRequest, db: Session = Depends(get_db)):
    success_count = 0
    errors = []
    
    for scan_id in req.scan_ids:
        db_scan = db.query(models.ScanLog).filter(models.ScanLog.id == scan_id).first()
        if not db_scan:
            errors.append(f"Không tìm thấy scan #{scan_id}")
            continue
            
        if db_scan.status == "Đã đổi tên":
            success_count += 1
            continue
            
        if not db_scan.extracted_doc_type or not db_scan.extracted_employee_code:
            errors.append(f"Tài liệu #{scan_id} ({db_scan.original_file_name}) chưa đủ thông tin Loại/Mã nhân sự để duyệt hàng loạt.")
            continue
            
        try:
            db_scan.status = "Đã đổi tên"
            
            meta = {
                "document_number": db_scan.document_number,
                "document_date": db_scan.document_date,
                "period": db_scan.period,
                "detail_text": db_scan.detail_text
            }
            current_rules = get_all_rules(db)
            new_file_name, folder_path = format_path_and_filename(
                db_scan.extracted_doc_type,
                db_scan.extracted_employee_code,
                meta,
                current_rules,
                get_all_employees(db)
            )
            file_ext = os.path.splitext(db_scan.original_file_name)[1]
            if file_ext:
                base_name = os.path.splitext(new_file_name)[0]
                new_file_name = base_name + file_ext
                
            db_scan.folder_path = folder_path
            db_scan.new_file_name = new_file_name
            
            file_path = os.path.join(UPLOAD_DIR, db_scan.original_file_name)
            if os.path.exists(file_path):
                folders = [f for f in folder_path.split("/") if f.strip()]
                target_folder = os.path.join(PROCESSED_DIR, *folders)
                os.makedirs(target_folder, exist_ok=True)
                
                target_file_path = os.path.join(target_folder, new_file_name)
                shutil.move(file_path, target_file_path)
                
                # Try GDrive upload
                drive_id, drive_url = upload_file_to_gdrive_if_possible(target_file_path, folder_path, new_file_name, db)
                if drive_id != "local" and drive_url:
                    db_scan.drive_file_id = drive_id
                    db_scan.drive_file_url = drive_url
                else:
                    # Friendly HTTP URL conversion (Fallback)
                    relative_url = "/".join([urllib.parse.quote(f) for f in folders]) + "/" + urllib.parse.quote(new_file_name)
                    db_scan.drive_file_url = f"http://localhost:8000/api/processed/{relative_url}"
                    db_scan.drive_file_id = "local"
                success_count += 1
            else:
                errors.append(f"Không tìm thấy file tạm cho scan #{scan_id}")
        except Exception as e:
            print(f"Error bulk approving scan #{scan_id}: {e}")
            db_scan.status = "Lỗi lưu file local"
            errors.append(f"Lỗi lưu file local cho scan #{scan_id}: {str(e)}")
            
    db.commit()
    return {"success": True, "success_count": success_count, "errors": errors}
