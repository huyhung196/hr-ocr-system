from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app import models
from app.database import engine
from app.api.routers import scans, employees, rules, settings as app_settings

# Create database tables at startup
models.Base.metadata.create_all(bind=engine)

# Alter database schema dynamically to add metadata columns if they do not exist
with engine.connect() as conn:
    from sqlalchemy import text
    for col_name, col_type in [
        ("document_number", "VARCHAR(255)"),
        ("document_date", "VARCHAR(50)"),
        ("period", "VARCHAR(50)"),
        ("detail_text", "VARCHAR(255)")
    ]:
        try:
            conn.execute(text(f'ALTER TABLE scan_logs ADD COLUMN "{col_name}" {col_type}'))
            conn.commit()
            print(f"Added column {col_name} to scan_logs table.")
        except Exception as e:
            conn.rollback()
            
    for col_name, col_type in [
        ("company", "VARCHAR(255)"),
        ("title", "VARCHAR(255)"),
        ("team", "VARCHAR(255)"),
        ("status", "VARCHAR(50)"),
        ("bhxh", "VARCHAR(50)"),
        ("cccd", "VARCHAR(50)"),
        ("join_date", "DATE")
    ]:
        try:
            conn.execute(text(f'ALTER TABLE employees ADD COLUMN "{col_name}" {col_type}'))
            conn.commit()
            print(f"Added column {col_name} to employees table.")
        except Exception as e:
            conn.rollback()

app = FastAPI(title="HR Document OCR API (Production)")

@app.on_event("startup")
def startup_event():
    print("[System] Warming up AI models...")
    try:
        # Tải sẵn OCR
        from app.services.ocr import get_vietocr_predictor
        get_vietocr_predictor()
        # Tải sẵn Local LLM
        from app.services.llm_service import get_local_llm
        get_local_llm()
        print("[System] Warmup complete.")
    except Exception as e:
        print(f"[System] Lỗi khởi động model: {e}")
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve directories relative to backend root
current_dir = os.path.dirname(__file__) # app/
backend_dir = os.path.dirname(current_dir) # backend/
UPLOAD_DIR = os.path.join(backend_dir, "uploads")
PROCESSED_DIR = os.path.join(backend_dir, "processed_files")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Mount static directories for previewing
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/api/processed", StaticFiles(directory=PROCESSED_DIR), name="processed")

# Register API Routers
app.include_router(scans.router, prefix="/api", tags=["Scans"])
app.include_router(employees.router, prefix="/api", tags=["Employees"])
app.include_router(rules.router, prefix="/api", tags=["Rules"])
app.include_router(app_settings.router, prefix="/api/settings", tags=["Settings"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "OCR Production API is running"}
