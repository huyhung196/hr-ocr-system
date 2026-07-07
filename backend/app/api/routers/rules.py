from fastapi import APIRouter
from app.services.excel import get_doc_type_rules

router = APIRouter()

# Cache doc type rules on startup
RULES_CACHE = get_doc_type_rules()

@router.get("/doc_rules")
def get_doc_rules():
    return RULES_CACHE
