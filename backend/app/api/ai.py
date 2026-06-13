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


@router.post("/review-draft/{task_id}")
def task_review_draft(task_id: str):
    from ..models import SessionLocal
    from ..models.task import Task
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task or not task.report_md:
            raise HTTPException(404, "Task or report not found")
        context = {"task_title": task.title, "intern_name": task.intern.name if task.intern else ""}
        content = task.report_md
    finally:
        db.close()
    from ..services.ai_service import generate_review_draft
    return generate_review_draft(content, "task_report", context)


@router.post("/review-draft/checkin/{checkin_id}")
def checkin_review_draft(checkin_id: str):
    from ..models import SessionLocal
    from ..models.checkin import CheckIn
    db = SessionLocal()
    try:
        checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
        if not checkin or not checkin.weekly_report_md:
            raise HTTPException(404, "CheckIn or weekly report not found")
        context = {"intern_name": checkin.intern.name if checkin.intern else "", "week": str(checkin.week)}
        content = checkin.weekly_report_md
    finally:
        db.close()
    from ..services.ai_service import generate_review_draft
    return generate_review_draft(content, "weekly_report", context)
