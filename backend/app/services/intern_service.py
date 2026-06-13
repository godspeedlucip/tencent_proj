"""Intern business logic: baseline, tasks, checkins, duplicate detection."""
from difflib import SequenceMatcher
from ..models import SessionLocal
from ..models.intern import Intern
from ..models.task import Task, TaskStatus
from ..models.checkin import CheckIn, EmotionCapsule

STRESS_MAP = {
    EmotionCapsule.energetic: 2,
    EmotionCapsule.motivated: 3,
    EmotionCapsule.steady: 4,
    EmotionCapsule.overloaded: 7,
    EmotionCapsule.blocked: 8,
}


def get_intern(intern_id: str) -> dict | None:
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            return None
        tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
        completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
        task_rate = completed / len(tasks) if tasks else 0
        recent_checkins = (
            db.query(CheckIn).filter(CheckIn.intern_id == intern_id)
            .order_by(CheckIn.submitted_at.desc()).limit(3).all()
        )
        return {
            "id": intern.id,
            "name": intern.name,
            "role": intern.role,
            "department": intern.department,
            "mentor": {"id": intern.mentor_id, "name": intern.mentor.name if intern.mentor else ""},
            "onboard_week": intern.onboard_week,
            "status": intern.status.value,
            "baseline_scores": intern.baseline_scores,
            "current_scores": intern.current_scores,
            "task_completion_rate": round(task_rate, 2),
            "recent_checkins": [
                {
                    "id": c.id, "week": c.week, "progress": c.progress,
                    "blockers": c.blockers, "emotion_capsule": c.emotion_capsule.value,
                    "next_plan": c.next_plan, "submitted_at": c.submitted_at.isoformat(),
                }
                for c in recent_checkins
            ],
        }
    finally:
        db.close()


def submit_checkin(intern_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        emotion = EmotionCapsule(data["emotion_capsule"])
        stress = STRESS_MAP[emotion]
        checkin = CheckIn(
            intern_id=intern_id,
            week=data["week"],
            progress=data["progress"],
            blockers=data.get("blockers"),
            emotion_capsule=emotion,
            mapped_stress_score=stress,
            next_plan=data.get("next_plan"),
        )
        db.add(checkin)
        db.commit()
        return {"id": checkin.id, "mapped_stress_score": stress}
    finally:
        db.close()


def detect_duplicate_checkin(intern_id: str, progress: str) -> bool:
    """Check if new progress text is >80% similar to last week's."""
    db = SessionLocal()
    try:
        last = (
            db.query(CheckIn).filter(CheckIn.intern_id == intern_id)
            .order_by(CheckIn.submitted_at.desc()).first()
        )
        if not last:
            return False
        return SequenceMatcher(None, last.progress, progress).ratio() > 0.8
    finally:
        db.close()
