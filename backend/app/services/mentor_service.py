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


from ..models.task import Task, TaskType, TaskPriority, TaskStatus, ApprovalStatus
from ..models.intern import Intern
from ..models.checkin import CheckIn
from datetime import date


def create_task(mentor_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        task = Task(
            intern_id=data["intern_id"],
            title=data["title"],
            description=data.get("description"),
            type=TaskType(data["type"]),
            priority=TaskPriority(data.get("priority", "medium")),
            due_date=date.fromisoformat(data["due_date"]) if data.get("due_date") else None,
            creator_id=mentor_id,
            approval_status=ApprovalStatus.pending,
        )
        db.add(task)
        db.commit()
        return {"id": task.id, "title": task.title, "status": task.status.value}
    finally:
        db.close()


def review_task(task_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"error": "Task not found"}

        task.approval_status = ApprovalStatus(data["approval"])
        task.score = data.get("score")
        task.annotation_json = data.get("annotations")
        if data["approval"] == "rejected":
            task.rejection_reason = data.get("rejection_reason")
            task.status = TaskStatus.in_progress
        else:
            task.status = TaskStatus.completed

        db.commit()
        return {"id": task.id, "approval_status": task.approval_status.value if task.approval_status else "pending"}
    finally:
        db.close()


def get_pending_reviews(mentor_id: str) -> dict:
    db = SessionLocal()
    try:
        intern_ids = [i.id for i in db.query(Intern).filter(Intern.mentor_id == mentor_id).all()]
        tasks = (
            db.query(Task)
            .filter(Task.intern_id.in_(intern_ids), Task.approval_status == ApprovalStatus.pending, Task.report_md.isnot(None))
            .all()
        )
        return {
            "tasks": [
                {
                    "id": t.id, "title": t.title, "intern_id": t.intern_id,
                    "intern_name": t.intern.name if t.intern else "",
                    "report_md": t.report_md,
                    "report_submitted_at": t.report_submitted_at.isoformat() if t.report_submitted_at else None,
                }
                for t in tasks
            ]
        }
    finally:
        db.close()
