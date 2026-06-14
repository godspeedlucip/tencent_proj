from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from ..models import SessionLocal
from ..models.intern import Intern
from ..models.task import Task, TaskStatus
from ..models.checkin import CheckIn
from ..services.intern_service import get_intern, submit_checkin, detect_duplicate_checkin, submit_checkin_with_ai

router = APIRouter()


@router.get("")
def list_interns(status: str | None = Query(None), mentor_id: str | None = Query(None)):
    db = SessionLocal()
    try:
        q = db.query(Intern)
        if status:
            q = q.filter(Intern.status == status)
        if mentor_id:
            q = q.filter(Intern.mentor_id == mentor_id)
        interns = q.all()
        result = []
        for intern in interns:
            tasks = db.query(Task).filter(Task.intern_id == intern.id).all()
            completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
            task_rate = round(completed / len(tasks), 2) if tasks else 0

            last_checkin = (
                db.query(CheckIn).filter(CheckIn.intern_id == intern.id)
                .order_by(CheckIn.submitted_at.desc()).first()
            )
            last_emotion = last_checkin.emotion_capsule.value if last_checkin else None

            result.append({
                "id": intern.id, "name": intern.name, "role": intern.role,
                "department": intern.department, "mentor_name": intern.mentor.name if intern.mentor else "",
                "mentor_id": intern.mentor_id,
                "onboard_week": intern.onboard_week, "status": intern.status.value,
                "task_completion_rate": task_rate,
                "last_emotion": last_emotion,
            })
        dist = {}
        for s in ["normal", "potential", "watch", "risk"]:
            dist[s] = sum(1 for i in interns if i.status.value == s)
        return {"interns": result, "total": len(result), "status_distribution": dist}
    finally:
        db.close()


@router.get("/{intern_id}")
def get_intern_detail(intern_id: str):
    data = get_intern(intern_id)
    if not data:
        raise HTTPException(404, "Intern not found")
    return data


@router.get("/{intern_id}/tasks")
def get_intern_tasks(intern_id: str):
    db = SessionLocal()
    try:
        tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
        return {"tasks": [
            {"id": t.id, "title": t.title, "type": t.type.value, "priority": t.priority.value,
             "status": t.status.value, "due_date": t.due_date.isoformat() if t.due_date else None,
             "description": t.description,
             "approval_status": t.approval_status.value if t.approval_status else "pending",
             "report_md": t.report_md,
             "attachment_url": t.attachment_url,
             "attachment_name": t.attachment_name,
             "score": t.score}
            for t in tasks
        ]}
    finally:
        db.close()


@router.get("/{intern_id}/checkins")
def get_intern_checkins(intern_id: str, week: int | None = Query(None)):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        q = db.query(CheckIn).filter(CheckIn.intern_id == intern_id)
        if week:
            q = q.filter(CheckIn.week == week)
        checkins = q.order_by(CheckIn.submitted_at.desc()).all()
        from ..models.mentor_feedback import MentorFeedback
        from ..services.mentor_service import compute_is_late
        mentor_id = intern.mentor_id
        return {"checkins": [
            {
                "id": c.id, "week": c.week, "progress": c.progress, "blockers": c.blockers,
                "emotion_capsule": c.emotion_capsule.value, "next_plan": c.next_plan,
                "submitted_at": c.submitted_at.isoformat(),
                "has_feedback": db.query(MentorFeedback).filter(
                    MentorFeedback.intern_id == intern_id,
                    MentorFeedback.checkin_id == c.id,
                ).count() > 0,
                "weekly_report_md": c.weekly_report_md,
                "is_late": compute_is_late(c.submitted_at, mentor_id),
                "attachment_url": c.attachment_url,
                "attachment_name": c.attachment_name,
            }
            for c in checkins
        ]}
    finally:
        db.close()


class CheckInRequest(BaseModel):
    week: int
    progress: str
    blockers: str | None = None
    emotion_capsule: str
    next_plan: str | None = None
    attachment_url: str | None = None
    attachment_name: str | None = None


@router.post("/{intern_id}/checkins")
def create_checkin(intern_id: str, req: CheckInRequest):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
    finally:
        db.close()
    if detect_duplicate_checkin(intern_id, req.progress):
        return {"id": "", "warning": "内容与上周高度相似，请确认并非敷衍填写。"}
    return submit_checkin_with_ai(intern_id, req.model_dump())


class BaselineRequest(BaseModel):
    scores: dict[str, int]


@router.post("/{intern_id}/baseline")
def submit_baseline(intern_id: str, req: BaselineRequest):
    from ..services.mentor_service import submit_baseline as svc_submit_baseline
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        mentor_id = intern.mentor_id
    finally:
        db.close()
    result = svc_submit_baseline(mentor_id, intern_id, req.scores)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return {"id": result["id"], "status": "submitted"}


class TaskReportRequest(BaseModel):
    report_md: str
    attachment_url: str | None = None
    attachment_name: str | None = None


@router.get("/{intern_id}/growth-timeline")
def growth_timeline(intern_id: str):
    from ..services.intern_service import get_growth_timeline
    return get_growth_timeline(intern_id)


@router.post("/{intern_id}/tasks/{task_id}/report")
def submit_task_report(intern_id: str, task_id: str, req: TaskReportRequest):
    from ..services.intern_service import submit_task_report
    result = submit_task_report(intern_id, task_id, req.report_md, req.attachment_url, req.attachment_name)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result
