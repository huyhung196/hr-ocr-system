from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.excel import get_employee_data
from app.database import get_db
from app import models, schemas
from typing import List

router = APIRouter()

# Cache parsed employee list on startup
EMPLOYEES_CACHE = get_employee_data()

def get_all_employees(db: Session) -> List[dict]:
    # Get DB employees
    db_employees = db.query(models.Employee).all()
    db_emp_list = []
    for emp in db_employees:
        db_emp_list.append({
            'employee_code': emp.employee_code,
            'full_name': emp.full_name,
            'company': emp.company or "Thuần Việt Global",
            'department': emp.department or "Chưa phân bổ",
            'team': emp.team or "",
            'title': emp.title or "Nhân viên",
            'bhxh': emp.bhxh or "",
            'cccd': emp.cccd or "",
            'status': emp.status or "Chính thức",
            'join_date': emp.join_date.strftime("%Y-%m-%d") if emp.join_date else None,
            'resignation_date': emp.resignation_date.strftime("%Y-%m-%d") if emp.resignation_date else None,
            'notes': emp.notes or ""
        })
    
    # Merge, DB employees override Excel if same employee_code
    db_emp_codes = {e['employee_code'] for e in db_emp_list}
    filtered_excel = [e for e in EMPLOYEES_CACHE if e['employee_code'] not in db_emp_codes]
    
    return db_emp_list + filtered_excel

@router.get("/employees")
def get_employees(db: Session = Depends(get_db)):
    return get_all_employees(db)

@router.post("/employees", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    db_emp = db.query(models.Employee).filter(models.Employee.employee_code == employee.employee_code).first()
    if db_emp:
        raise HTTPException(status_code=400, detail="Mã nhân viên đã tồn tại trong hệ thống (DB).")
    
    # Check in excel cache
    excel_emp = next((e for e in EMPLOYEES_CACHE if e['employee_code'] == employee.employee_code), None)
    if excel_emp:
        raise HTTPException(status_code=400, detail="Mã nhân viên đã tồn tại trong file Excel. Vui lòng sử dụng mã khác.")
        
    db_item = models.Employee(**employee.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/companies", response_model=List[schemas.Company])
def get_companies(db: Session = Depends(get_db)):
    return db.query(models.Company).all()

@router.post("/companies", response_model=schemas.Company)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Company).filter(models.Company.name == company.name).first()
    if db_item:
        raise HTTPException(status_code=400, detail="Công ty đã tồn tại")
    new_item = models.Company(**company.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/departments", response_model=List[schemas.Department])
def get_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()

@router.post("/departments", response_model=schemas.Department)
def create_department(dept: schemas.DepartmentCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Department).filter(models.Department.name == dept.name).first()
    if db_item:
        raise HTTPException(status_code=400, detail="Phòng ban đã tồn tại")
    new_item = models.Department(**dept.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/positions", response_model=List[schemas.Position])
def get_positions(db: Session = Depends(get_db)):
    return db.query(models.Position).all()

@router.post("/positions", response_model=schemas.Position)
def create_position(pos: schemas.PositionCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Position).filter(models.Position.name == pos.name).first()
    if db_item:
        raise HTTPException(status_code=400, detail="Vị trí đã tồn tại")
    new_item = models.Position(**pos.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item
