"""Mentor business logic: intern list, talking points, feedback."""
from ..models import SessionLocal
from ..models.intern import Intern
from ..models.task import Task, TaskStatus
from ..models.checkin import CheckIn
from ..models.mentor_feedback import MentorFeedback


def get_mentor_interns(mentor_id: str) -> list[dict]:
    db = SessionLocal()
    try:
        interns = db.query(Intern).filter(Intern.mentor_id == mentor_id).all()
        result = []
        for intern in interns:
            tasks = db.query(Task).filter(Task.intern_id == intern.id).all()
            completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
            task_rate = completed / len(tasks) if tasks else 0
            last_checkin = (
                db.query(CheckIn).filter(CheckIn.intern_id == intern.id)
                .order_by(CheckIn.submitted_at.desc()).first()
            )
            pending_feedback = (
                db.query(MentorFeedback).filter(
                    MentorFeedback.intern_id == intern.id, MentorFeedback.final_feedback.is_(None)
                ).first() is not None
            )
            result.append({
                "id": intern.id,
                "name": intern.name,
                "status": intern.status.value,
                "task_completion_rate": round(task_rate, 2),
                "last_emotion": last_checkin.emotion_capsule.value if last_checkin else None,
                "last_checkin_week": last_checkin.week if last_checkin else None,
                "pending_feedback": pending_feedback,
                "risk_level": intern.status.value,
            })
        return result
    finally:
        db.close()


def submit_feedback(intern_id: str, mentor_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        fb = MentorFeedback(
            intern_id=intern_id,
            mentor_id=mentor_id,
            checkin_id=data.get("checkin_id"),
            final_feedback=data["final_feedback"],
            rating=data.get("rating"),
            ai_suggestion_vote=data.get("ai_suggestion_vote", "none"),
        )
        db.add(fb)
        db.commit()
        return {"id": fb.id}
    finally:
        db.close()
