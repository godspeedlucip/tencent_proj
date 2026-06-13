from fastapi import APIRouter, HTTPException
from ..models import SessionLocal
from ..models.intern import Intern
from ..services.ai_service import generate_daily_tip

router = APIRouter()


@router.get("/daily-tip/{intern_id}")
def daily_tip(intern_id: str):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        name = intern.name
    finally:
        db.close()
    result = generate_daily_tip(name)
    return {"tip": result["tip"], "generated_at": "", "source": result.get("source", "fallback")}
