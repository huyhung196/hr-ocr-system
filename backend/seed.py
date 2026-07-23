import sys
import os

# Add backend dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models
from app.services.excel import get_employee_data, get_doc_type_rules, COMPANY_MAPPING
from datetime import datetime

def seed_data():
    # Make sure tables are created
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Seed Companies
    print("Seeding Companies...")
    for name, info in COMPANY_MAPPING.items():
        db_company = db.query(models.Company).filter(models.Company.name == name).first()
        if not db_company:
            db_company = models.Company(name=name, abbr=info['abbr'], folder=info['folder'])
            db.add(db_company)
    db.commit()

    # 2. Seed Employees
    print("Seeding Employees...")
    employees = get_employee_data()
    departments = set()
    positions = set()
    
    for emp_data in employees:
        if emp_data.get('department'):
            departments.add(emp_data['department'])
        if emp_data.get('title'):
            positions.add(emp_data['title'])
            
        db_emp = db.query(models.Employee).filter(models.Employee.employee_code == emp_data['employee_code']).first()
        if not db_emp:
            join_date_val = None
            if emp_data.get('join_date'):
                try:
                    join_date_val = datetime.strptime(emp_data['join_date'], "%Y-%m-%d").date()
                except ValueError:
                    pass

            res_date_val = None
            if emp_data.get('resignation_date'):
                try:
                    res_date_val = datetime.strptime(emp_data['resignation_date'], "%Y-%m-%d").date()
                except ValueError:
                    pass

            db_emp = models.Employee(
                employee_code=emp_data['employee_code'],
                full_name=emp_data['full_name'],
                department=emp_data['department'],
                company=emp_data['company'],
                title=emp_data['title'],
                team=emp_data['team'],
                status=emp_data['status'],
                bhxh=emp_data['bhxh'],
                cccd=emp_data['cccd'],
                join_date=join_date_val,
                resignation_date=res_date_val,
                notes=emp_data['notes'],
                is_deleted=0
            )
            db.add(db_emp)
        else:
            # Update missing fields if needed or leave as is
            pass
    db.commit()
    
    # 3. Seed Departments
    print("Seeding Departments...")
    for dept_name in departments:
        db_dept = db.query(models.Department).filter(models.Department.name == dept_name).first()
        if not db_dept:
            db_dept = models.Department(name=dept_name)
            db.add(db_dept)
    db.commit()
    
    # 4. Seed Positions
    print("Seeding Positions...")
    for pos_name in positions:
        db_pos = db.query(models.Position).filter(models.Position.name == pos_name).first()
        if not db_pos:
            db_pos = models.Position(name=pos_name)
            db.add(db_pos)
    db.commit()

    # 5. Seed Rules
    print("Seeding DocRules...")
    rules = get_doc_type_rules()
    for rule_data in rules:
        db_rule = db.query(models.DocRule).filter(models.DocRule.doc_type == rule_data['doc_type']).first()
        if not db_rule:
            db_rule = models.DocRule(
                doc_type=rule_data['doc_type'],
                keyword=rule_data['keyword'],
                required_phrases=rule_data['required_phrases'],
                excluded_phrases=rule_data['excluded_phrases'],
                format=rule_data['format'],
                folder_path=rule_data['folder_path']
            )
            db.add(db_rule)
        else:
            db_rule.keyword = rule_data['keyword']
            db_rule.required_phrases = rule_data['required_phrases']
            db_rule.excluded_phrases = rule_data['excluded_phrases']
            db_rule.format = rule_data['format']
            db_rule.folder_path = rule_data['folder_path']
    db.commit()

    print("Seeding Complete!")
    db.close()

if __name__ == "__main__":
    seed_data()
