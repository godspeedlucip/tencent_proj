from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from ..models import SessionLocal
from ..models.mentor import Mentor
from ..services.mentor_service import get_mentor_interns, submit_feedback, create_task, review_task, get_pending_reviews
from ..services.ai_service import generate_talking_points, generate_feedback_draft

router = APIRouter()


def _get_real_mentor_id(request: Request) -> str:
    db = SessionLocal()
    try:
        mentor = db.query(Mentor).filter(Mentor.user_id == request.state.user_id).first()
        if not mentor:
            raise HTTPException(403, "当前用户不是导师")
        return mentor.id
    finally:
        db.close()


@router.get("/{mentor_id}/interns")
def list_mentor_interns(mentor_id: str):
    return {"interns": get_mentor_interns(mentor_id)}


@router.get("/talking-points/{intern_id}")
def get_talking_points(intern_id: str):
    from ..models import SessionLocal
    from ..models.intern import Intern
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        name = intern.name
    finally:
        db.close()
    result = generate_talking_points(name)
    return {
        "intern_name": name,
        "generated_at": "",
        "source": result.get("source", "fallback"),
        "outline": result["outline"],
    }


@router.get("/feedback-draft/{intern_id}")
def get_feedback_draft(intern_id: str):
    from ..models import SessionLocal
    from ..models.intern import Intern
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        name = intern.name
    finally:
        db.close()
    result = generate_feedback_draft(name)
    return {"intern_id": intern_id, "ai_draft": result["ai_draft"], "generated_at": "", "source": result.get("source", "fallback")}


class FeedbackRequest(BaseModel):
    checkin_id: str | None = None
    final_feedback: str
    rating: str | None = None
    ai_suggestion_vote: str = "none"


@router.post("/feedback/{intern_id}")
def create_feedback(intern_id: str, req_body: FeedbackRequest, request: Request):
    return submit_feedback(intern_id, _get_real_mentor_id(request), req_body.model_dump())


class CreateTaskRequest(BaseModel):
    intern_id: str
    title: str
    description: str | None = None
    type: str
    priority: str = "medium"
    due_date: str | None = None


@router.post("/tasks")
def create_task_endpoint(req: CreateTaskRequest, request: Request):
    from ..services.mentor_service import create_task
    return create_task(_get_real_mentor_id(request), req.model_dump())


class ReviewTaskRequest(BaseModel):
    approval: str
    score: int | None = None
    annotations: list[dict] | None = None
    rejection_reason: str | None = None


@router.post("/tasks/{task_id}/review")
def review_task(task_id: str, req: ReviewTaskRequest):
    from ..services.mentor_service import review_task
    result = review_task(task_id, req.model_dump())
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


class ScoreCheckinRequest(BaseModel):
    score: int
    comment: str | None = None

@router.post("/checkins/{checkin_id}/score")
def score_checkin(checkin_id: str, req: ScoreCheckinRequest):
    from ..services.mentor_service import score_checkin
    result = score_checkin(checkin_id, req.model_dump())
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


class CreateTemplateRequest(BaseModel):
    title: str
    description: str | None = None
    type: str
    priority: str = "medium"

class ApplyTemplateRequest(BaseModel):
    intern_id: str
    due_date: str | None = None

@router.get("/task-templates")
def list_templates(mentor_id: str):
    from ..services.mentor_service import list_templates
    return list_templates(mentor_id)

@router.post("/task-templates")
def create_template(req: CreateTemplateRequest, request: Request):
    from ..services.mentor_service import create_template
    return create_template(_get_real_mentor_id(request), req.model_dump())

@router.post("/task-templates/{template_id}/apply")
def apply_template(template_id: str, req: ApplyTemplateRequest, request: Request):
    from ..services.mentor_service import apply_template
    result = apply_template(_get_real_mentor_id(request), template_id, req.model_dump())
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result

@router.delete("/task-templates/{template_id}")
def delete_template(template_id: str, request: Request):
    from ..services.mentor_service import delete_template
    result = delete_template(_get_real_mentor_id(request), template_id)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


@router.get("/pending-reviews")
def pending_reviews(mentor_id: str):
    from ..services.mentor_service import get_pending_reviews
    return get_pending_reviews(mentor_id)


# --- Deadline ---

class DeadlineRequest(BaseModel):
    day_of_week: int  # 0=Mon..6=Sun
    hour: int         # 0-23


@router.post("/deadline")
def set_deadline_endpoint(req: DeadlineRequest, request: Request):
    from ..services.mentor_service import set_deadline
    if not (0 <= req.day_of_week <= 6):
        raise HTTPException(400, "day_of_week must be 0-6")
    if not (0 <= req.hour <= 23):
        raise HTTPException(400, "hour must be 0-23")
    return set_deadline(_get_real_mentor_id(request), req.day_of_week, req.hour)


@router.get("/{mentor_id}/deadline")
def get_deadline(mentor_id: str):
    from ..services.mentor_service import get_or_create_deadline
    return get_or_create_deadline(mentor_id)


# --- Baseline ---

class BaselineRequest(BaseModel):
    scores: dict[str, int]


@router.post("/interns/{intern_id}/baseline")
def submit_baseline_endpoint(intern_id: str, req: BaselineRequest, request: Request):
    from ..services.mentor_service import submit_baseline
    expected_dims = ["业务理解", "需求分析", "协作沟通", "交付质量"]
    for dim in expected_dims:
        if dim not in req.scores:
            raise HTTPException(400, f"Missing dimension: {dim}")
        if not (1 <= req.scores[dim] <= 5):
            raise HTTPException(400, f"{dim} score must be 1-5")
    result = submit_baseline(_get_real_mentor_id(request), intern_id, req.scores)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


# --- Intern detail views for mentor ---

@router.get("/{mentor_id}/interns/{intern_id}/tasks")
def get_intern_tasks_for_mentor(mentor_id: str, intern_id: str):
    from ..models import SessionLocal
    from ..models.task import Task
    from ..models.intern import Intern
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id, Intern.mentor_id == mentor_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
        return {"tasks": [
            {
                "id": t.id, "title": t.title, "type": t.type.value, "priority": t.priority.value,
                "status": t.status.value, "due_date": t.due_date.isoformat() if t.due_date else None,
                "score": t.score, "approval_status": t.approval_status.value if t.approval_status else "pending",
                "report_md": t.report_md,
                "attachment_url": t.attachment_url,
                "attachment_name": t.attachment_name,
            }
            for t in tasks
        ]}
    finally:
        db.close()


@router.get("/{mentor_id}/interns/{intern_id}/checkins")
def get_intern_checkins_for_mentor(mentor_id: str, intern_id: str):
    from ..models import SessionLocal
    from ..models.checkin import CheckIn
    from ..models.intern import Intern
    from ..services.mentor_service import compute_is_late
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id, Intern.mentor_id == mentor_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        checkins = db.query(CheckIn).filter(CheckIn.intern_id == intern_id).order_by(CheckIn.submitted_at.desc()).all()
        return {"checkins": [
            {
                "id": c.id, "week": c.week, "progress": c.progress,
                "blockers": c.blockers, "emotion_capsule": c.emotion_capsule.value,
                "next_plan": c.next_plan, "weekly_report_md": c.weekly_report_md,
                "mentor_score": c.mentor_score, "mentor_comment": c.mentor_comment,
                "submitted_at": c.submitted_at.isoformat(),
                "is_late": compute_is_late(c.submitted_at, mentor_id),
                "attachment_url": c.attachment_url,
                "attachment_name": c.attachment_name,
            }
            for c in checkins
        ]}
    finally:
        db.close()
