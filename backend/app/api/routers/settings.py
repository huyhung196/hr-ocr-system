from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
import os
import shutil

router = APIRouter()

# Dành cho gdrive files
current_dir = os.path.dirname(__file__) # app/api/routers
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir))) # backend/

@router.get("/gdrive", response_model=schemas.SystemSetting)
def get_gdrive_setting(db: Session = Depends(get_db)):
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "GDRIVE_ROOT_FOLDER_NAME").first()
    if not setting:
        # Lấy từ env làm mặc định nếu chưa có
        default_val = os.environ.get("GDRIVE_ROOT_FOLDER_NAME", "HR_OCR_HoSo")
        setting = models.SystemSetting(
            key="GDRIVE_ROOT_FOLDER_NAME",
            value=default_val,
            description="Tên hoặc Link thư mục gốc trên Google Drive"
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.put("/gdrive", response_model=schemas.SystemSetting)
def update_gdrive_setting(setting_update: schemas.SystemSettingBase, db: Session = Depends(get_db)):
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "GDRIVE_ROOT_FOLDER_NAME").first()
    if not setting:
        setting = models.SystemSetting(key="GDRIVE_ROOT_FOLDER_NAME")
        db.add(setting)
        
    setting.value = setting_update.value
    if setting_update.description is not None:
        setting.description = setting_update.description
        
    db.commit()
    db.refresh(setting)
    return setting

@router.post("/gdrive/auth")
def upload_gdrive_auth_files(
    credentials_file: UploadFile = File(None),
    token_file: UploadFile = File(None)
):
    """
    Upload credentials.json hoặc token.json để thay đổi tài khoản Google Drive.
    """
    files_saved = []
    
    if credentials_file:
        cred_path = os.path.join(backend_dir, "credentials.json")
        with open(cred_path, "wb") as buffer:
            shutil.copyfileobj(credentials_file.file, buffer)
        files_saved.append("credentials.json")
        
        # Nếu tải lên credentials.json mới, ta thường nên xóa token.json cũ đi để buộc auth lại
        token_path = os.path.join(backend_dir, "token.json")
        if os.path.exists(token_path) and not token_file:
            os.remove(token_path)
            files_saved.append("(deleted old token.json)")
            
    if token_file:
        token_path = os.path.join(backend_dir, "token.json")
        with open(token_path, "wb") as buffer:
            shutil.copyfileobj(token_file.file, buffer)
        files_saved.append("token.json")
        
    if not files_saved:
        raise HTTPException(status_code=400, detail="Không có file nào được tải lên.")
        
    return {"message": "Tải lên thành công", "files": files_saved}

@router.post("/upload-excel")
def upload_excel_config(file: UploadFile = File(...)):
    """
    Upload file Excel (LOGIC CÂY LƯU TRỮ.xlsx) để cập nhật cấu hình hệ thống
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file Excel (.xlsx hoặc .xls)")
        
    from app.services.excel import EXCEL_FILE_PATH
    from app.api.routers.employees import reload_employees_cache
    from app.api.routers.rules import reload_rules_cache
    
    try:
        # Save the uploaded file, overwriting the existing Excel file
        with open(EXCEL_FILE_PATH, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Trigger cache reloads
        reload_employees_cache()
        reload_rules_cache()
        
        return {"status": "success", "message": "Đã cập nhật hệ thống từ file Excel thành công!"}
    except Exception as e:
        print(f"Error updating from excel: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật cấu hình: {str(e)}")
