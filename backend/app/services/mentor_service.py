"""Mentor business logic: intern list, talking points, feedback."""
from ..models import SessionLocal
from ..models.intern import Intern
from ..models.task import Task, TaskStatus
from ..models.checkin import CheckIn
from ..models.mentor_feedback import MentorFeedback
from ..models.task_template import TaskTemplate
from ..models.weekly_report_deadline import WeeklyReportDeadline
from datetime import datetime, timedelta


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


def score_checkin(checkin_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
        if not checkin:
            return {"error": "CheckIn not found"}
        checkin.mentor_score = data["score"]
        checkin.mentor_comment = data.get("comment")
        db.commit()
        return {"id": checkin.id, "score": checkin.mentor_score}
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


def list_templates(mentor_id: str) -> dict:
    db = SessionLocal()
    try:
        templates = db.query(TaskTemplate).filter(TaskTemplate.mentor_id == mentor_id).all()
        return {"templates": [
            {"id": t.id, "title": t.title, "description": t.description, "type": t.type.value, "priority": t.priority.value, "created_at": t.created_at.isoformat()}
            for t in templates
        ]}
    finally:
        db.close()


def create_template(mentor_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        tmpl = TaskTemplate(mentor_id=mentor_id, title=data["title"], description=data.get("description"),
                           type=TaskType(data["type"]), priority=TaskPriority(data.get("priority", "medium")))
        db.add(tmpl)
        db.commit()
        return {"id": tmpl.id, "title": tmpl.title}
    finally:
        db.close()


def apply_template(mentor_id: str, template_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        tmpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id, TaskTemplate.mentor_id == mentor_id).first()
        if not tmpl:
            return {"error": "Template not found"}
        due_date = date.fromisoformat(data["due_date"]) if data.get("due_date") else None
        task = Task(intern_id=data["intern_id"], title=tmpl.title, description=tmpl.description,
                    type=tmpl.type, priority=tmpl.priority, due_date=due_date, creator_id=mentor_id,
                    approval_status=ApprovalStatus.pending)
        db.add(task)
        db.commit()
        return {"id": task.id, "title": task.title}
    finally:
        db.close()


def delete_template(mentor_id: str, template_id: str) -> dict:
    db = SessionLocal()
    try:
        tmpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id, TaskTemplate.mentor_id == mentor_id).first()
        if not tmpl:
            return {"error": "Template not found"}
        db.delete(tmpl)
        db.commit()
        return {"id": template_id, "deleted": True}
    finally:
        db.close()


def get_or_create_deadline(mentor_id: str) -> dict:
    db = SessionLocal()
    try:
        dl = db.query(WeeklyReportDeadline).filter(WeeklyReportDeadline.mentor_id == mentor_id).first()
        if not dl:
            dl = WeeklyReportDeadline(mentor_id=mentor_id)
            db.add(dl)
            db.commit()
            db.refresh(dl)
        return {"id": dl.id, "mentor_id": dl.mentor_id, "day_of_week": dl.day_of_week, "hour": dl.hour}
    finally:
        db.close()


def set_deadline(mentor_id: str, day_of_week: int, hour: int) -> dict:
    db = SessionLocal()
    try:
        dl = db.query(WeeklyReportDeadline).filter(WeeklyReportDeadline.mentor_id == mentor_id).first()
        if dl:
            dl.day_of_week = day_of_week
            dl.hour = hour
        else:
            dl = WeeklyReportDeadline(mentor_id=mentor_id, day_of_week=day_of_week, hour=hour)
            db.add(dl)
        db.commit()
        db.refresh(dl)
        return {"id": dl.id, "mentor_id": dl.mentor_id, "day_of_week": dl.day_of_week, "hour": dl.hour}
    finally:
        db.close()


def compute_is_late(checkin_submitted_at: datetime, mentor_id: str) -> bool:
    """Check if a checkin was submitted after the mentor's deadline for its week."""
    db = SessionLocal()
    try:
        dl = db.query(WeeklyReportDeadline).filter(WeeklyReportDeadline.mentor_id == mentor_id).first()
        if not dl:
            return False
        submitted = checkin_submitted_at.replace(tzinfo=None) if checkin_submitted_at.tzinfo else checkin_submitted_at
        days_until_deadline = (dl.day_of_week - submitted.weekday()) % 7
        deadline = (submitted + timedelta(days=days_until_deadline)).replace(
            hour=dl.hour, minute=0, second=0, microsecond=0
        )
        if deadline < submitted:
            deadline += timedelta(days=7)
        return submitted > deadline
    finally:
        db.close()


def submit_baseline(mentor_id: str, intern_id: str, scores: dict[str, int]) -> dict:
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id, Intern.mentor_id == mentor_id).first()
        if not intern:
            return {"error": "Intern not found or not under this mentor"}
        intern.baseline_scores = dict(scores)
        intern.current_scores = dict(scores)
        db.commit()
        return {"id": intern.id, "baseline_scores": intern.baseline_scores, "status": "submitted"}
    finally:
        db.close()
