from sqlalchemy import Column, Integer, String, DateTime, Text, Date
from sqlalchemy.sql import func
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, index=True)
    full_name = Column(String(255))
    department = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    title = Column(String(255), nullable=True)
    team = Column(String(255), nullable=True)
    status = Column(String(50), default="Chính thức")
    bhxh = Column(String(50), nullable=True)
    cccd = Column(String(50), nullable=True)
    join_date = Column(Date, nullable=True)
    resignation_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    is_deleted = Column(Integer, default=0)

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    abbr = Column(String(50), nullable=True)
    folder = Column(String(255), nullable=True)

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)

class Position(Base):
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)

class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    original_file_name = Column(String(255))
    extracted_employee_code = Column(String(50), nullable=True)
    extracted_doc_type = Column(String(50), nullable=True)
    new_file_name = Column(String(255), nullable=True)
    folder_path = Column(String(500), nullable=True)
    status = Column(String(50)) # Chờ review tên, Đã đổi tên, Lỗi xử lý
    drive_file_id = Column(String(255), nullable=True)
    drive_file_url = Column(String(500), nullable=True)
    
    # Metadata columns for Storage Tree renaming rules
    document_number = Column(String(255), nullable=True)
    document_date = Column(String(50), nullable=True)
    period = Column(String(50), nullable=True)
    detail_text = Column(String(255), nullable=True)

class DocRule(Base):
    __tablename__ = "doc_rules"

    id = Column(Integer, primary_key=True, index=True)
    doc_type = Column(String(50), unique=True, index=True)
    keyword = Column(String(255))
    required_phrases = Column(Text, nullable=True)
    excluded_phrases = Column(Text, nullable=True)
    format = Column(String(255), nullable=True)
    folder_path = Column(String(500), nullable=True)
    is_deleted = Column(Integer, default=0)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=True)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
