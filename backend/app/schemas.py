from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    department: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    team: Optional[str] = None
    status: Optional[str] = "Chính thức"
    bhxh: Optional[str] = None
    cccd: Optional[str] = None
    join_date: Optional[date] = None
    resignation_date: Optional[date] = None
    notes: Optional[str] = None

class CompanyBase(BaseModel):
    name: str
    abbr: Optional[str] = None
    folder: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    class Config:
        from_attributes = True

class DepartmentBase(BaseModel):
    name: str

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: int
    class Config:
        from_attributes = True

class PositionBase(BaseModel):
    name: str

class PositionCreate(PositionBase):
    pass

class Position(PositionBase):
    id: int
    class Config:
        from_attributes = True

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    class Config:
        from_attributes = True

class ScanLogBase(BaseModel):
    original_file_name: str
    extracted_employee_code: Optional[str] = None
    extracted_doc_type: Optional[str] = None
    new_file_name: Optional[str] = None
    folder_path: Optional[str] = None
    status: str
    drive_file_id: Optional[str] = None
    drive_file_url: Optional[str] = None
    
    document_number: Optional[str] = None
    document_date: Optional[str] = None
    period: Optional[str] = None
    detail_text: Optional[str] = None

class ScanLogCreate(ScanLogBase):
    pass

class ScanLogUpdate(BaseModel):
    extracted_employee_code: Optional[str] = None
    extracted_doc_type: Optional[str] = None
    new_file_name: Optional[str] = None
    folder_path: Optional[str] = None
    status: Optional[str] = None
    drive_file_id: Optional[str] = None
    drive_file_url: Optional[str] = None
    
    document_number: Optional[str] = None
    document_date: Optional[str] = None
    period: Optional[str] = None
    detail_text: Optional[str] = None

class ScanLog(ScanLogBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class SystemSettingBase(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    key: str

class SystemSetting(SystemSettingBase):
    key: str
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True
