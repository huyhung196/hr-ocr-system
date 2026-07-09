from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.excel import get_doc_type_rules
from app.database import get_db
from app import models, schemas
from typing import List

router = APIRouter()

# Cache doc type rules on startup
RULES_CACHE = get_doc_type_rules()

def reload_rules_cache():
    global RULES_CACHE
    RULES_CACHE = get_doc_type_rules()

def get_all_rules(db: Session) -> List[dict]:
    # Get DB rules
    db_rules = db.query(models.DocRule).all()
    
    db_rule_map = {}
    for r in db_rules:
        db_rule_map[r.doc_type] = r
        
    final_rules = []
    
    # 1. Add Excel rules that are not overridden or deleted in DB
    for excel_rule in RULES_CACHE:
        doc_type = excel_rule['doc_type']
        if doc_type in db_rule_map:
            db_rule = db_rule_map[doc_type]
            if db_rule.is_deleted == 0:
                final_rules.append({
                    'doc_type': db_rule.doc_type,
                    'keyword': db_rule.keyword,
                    'required_phrases': db_rule.required_phrases or "",
                    'excluded_phrases': db_rule.excluded_phrases or "",
                    'format': db_rule.format or "",
                    'folder_path': db_rule.folder_path or ""
                })
        else:
            final_rules.append(excel_rule)
            
    # 2. Add DB-only rules (created via UI)
    excel_doc_types = {r['doc_type'] for r in RULES_CACHE}
    for db_rule in db_rules:
        if db_rule.doc_type not in excel_doc_types and db_rule.is_deleted == 0:
            final_rules.append({
                'doc_type': db_rule.doc_type,
                'keyword': db_rule.keyword,
                'required_phrases': db_rule.required_phrases or "",
                'excluded_phrases': db_rule.excluded_phrases or "",
                'format': db_rule.format or "",
                'folder_path': db_rule.folder_path or ""
            })
            
    return final_rules

@router.get("/doc_rules")
def get_doc_rules(db: Session = Depends(get_db)):
    return get_all_rules(db)

@router.post("/doc_rules", response_model=schemas.DocRule)
def create_rule(rule: schemas.DocRuleCreate, db: Session = Depends(get_db)):
    db_rule = db.query(models.DocRule).filter(models.DocRule.doc_type == rule.doc_type).first()
    
    if db_rule:
        if db_rule.is_deleted == 1:
            # Reactivate and update
            db_rule.is_deleted = 0
            for key, value in rule.dict().items():
                setattr(db_rule, key, value)
            db.commit()
            db.refresh(db_rule)
            return db_rule
        else:
            raise HTTPException(status_code=400, detail="Mã loại quy tắc đã tồn tại")
            
    # If not in DB but in Excel, we just create it in DB to override
    new_rule = models.DocRule(**rule.dict(), is_deleted=0)
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@router.put("/doc_rules/{doc_type}", response_model=schemas.DocRule)
def update_rule(doc_type: str, rule_update: schemas.DocRuleUpdate, db: Session = Depends(get_db)):
    db_rule = db.query(models.DocRule).filter(models.DocRule.doc_type == doc_type).first()
    
    if not db_rule:
        # Check if it exists in Excel
        excel_rule = next((r for r in RULES_CACHE if r['doc_type'] == doc_type), None)
        if not excel_rule:
            raise HTTPException(status_code=404, detail="Không tìm thấy quy tắc")
            
        # Create DB override
        db_rule = models.DocRule(
            doc_type=excel_rule['doc_type'],
            keyword=excel_rule['keyword'],
            required_phrases=excel_rule['required_phrases'],
            excluded_phrases=excel_rule['excluded_phrases'],
            format=excel_rule['format'],
            folder_path=excel_rule['folder_path'],
            is_deleted=0
        )
        db.add(db_rule)
        db.commit()
        db.refresh(db_rule)
        
    for key, value in rule_update.dict(exclude_unset=True).items():
        setattr(db_rule, key, value)
        
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.delete("/doc_rules/{doc_type}")
def delete_rule(doc_type: str, db: Session = Depends(get_db)):
    db_rule = db.query(models.DocRule).filter(models.DocRule.doc_type == doc_type).first()
    
    if db_rule:
        db_rule.is_deleted = 1
        db.commit()
        return {"status": "success", "message": "Đã xóa quy tắc"}
        
    # If not in DB, it might be an Excel rule
    excel_rule = next((r for r in RULES_CACHE if r['doc_type'] == doc_type), None)
    if excel_rule:
        # Create a deleted marker in DB
        db_rule = models.DocRule(
            doc_type=excel_rule['doc_type'],
            keyword=excel_rule['keyword'],
            is_deleted=1
        )
        db.add(db_rule)
        db.commit()
        return {"status": "success", "message": "Đã xóa quy tắc"}
        
    raise HTTPException(status_code=404, detail="Không tìm thấy quy tắc")
