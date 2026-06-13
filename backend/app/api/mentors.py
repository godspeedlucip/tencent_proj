from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.mentor_service import get_mentor_interns, submit_feedback, create_task, review_task, get_pending_reviews
from ..services.ai_service import generate_talking_points, generate_feedback_draft

router = APIRouter()


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
def create_feedback(intern_id: str, req: FeedbackRequest):
    return submit_feedback(intern_id, "default", req.model_dump())


class CreateTaskRequest(BaseModel):
    intern_id: str
    title: str
    description: str | None = None
    type: str
    priority: str = "medium"
    due_date: str | None = None


@router.post("/tasks")
def create_task_endpoint(req: CreateTaskRequest):
    from ..services.mentor_service import create_task
    return create_task("default", req.model_dump())


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


@router.get("/pending-reviews")
def pending_reviews(mentor_id: str):
    from ..services.mentor_service import get_pending_reviews
    return get_pending_reviews(mentor_id)
