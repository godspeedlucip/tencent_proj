"""HR business logic: dashboard aggregation, risk detection, weekly report."""
import datetime
from ..models import SessionLocal
from ..models.intern import Intern, InternStatus
from ..models.checkin import CheckIn, EmotionCapsule
from ..models.task import Task, TaskStatus
from ..models.risk_signal import RiskSignal, RiskLevel, ReviewStatus
from .ai_service import generate_weekly_report_actions


def get_dashboard() -> dict:
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        summary = {"total": 0, "normal": 0, "potential": 0, "watch": 0, "risk": 0}
        for intern in interns:
            summary[intern.status.value] += 1
        summary["total"] = len(interns)

        risk_list = []
        signals = (
            db.query(RiskSignal).order_by(RiskSignal.created_at.desc()).limit(20).all()
        )
        for s in signals:
            risk_list.append({
                "intern_id": s.intern_id,
                "intern_name": s.intern.name if s.intern else "",
                "level": s.level.value,
                "triggers": s.triggers,
                "ai_confidence": s.ai_confidence,
                "review_status": s.review_status.value,
                "review_note": s.review_note,
                "created_at": s.created_at.isoformat(),
            })

        return {"summary": summary, "risk_list": risk_list}
    finally:
        db.close()


def get_weekly_report() -> dict:
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        total = len(interns)
        if total == 0:
            return {"week": 0, "summary_stats": {}, "risk_details": [], "recommended_actions": [], "source": "fallback"}

        risk_count = sum(1 for i in interns if i.status == InternStatus.risk)
        checkins = db.query(CheckIn).filter(CheckIn.week >= 1).all()
        checkin_rate = len(set(c.intern_id for c in checkins)) / total if total > 0 else 0

        tasks = db.query(Task).all()
        completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
        avg_task = round(completed / len(tasks), 2) if tasks else 0

        ai_result = generate_weekly_report_actions()

        return {
            "week": max((c.week for c in checkins), default=0),
            "generated_at": datetime.datetime.now().isoformat(),
            "source": ai_result.get("source", "fallback"),
            "summary_stats": {
                "checkin_rate": round(checkin_rate, 2),
                "avg_task_completion": avg_task,
                "risk_count": risk_count,
                "new_risks_this_week": risk_count,
                "resolved_risks_this_week": 0,
            },
            "risk_details": [],
            "recommended_actions": ai_result.get("actions", []),
        }
    finally:
        db.close()


def detect_risk_signals(intern_id: str) -> list[dict]:
    """Simple rule-based risk detection complementing AI."""
    db = SessionLocal()
    try:
        checkins = (
            db.query(CheckIn).filter(CheckIn.intern_id == intern_id)
            .order_by(CheckIn.submitted_at.desc()).limit(3).all()
        )
        triggers = []
        if len(checkins) >= 2:
            blocked_count = sum(1 for c in checkins if c.emotion_capsule == EmotionCapsule.blocked)
            if blocked_count >= 2:
                triggers.append("连续两周情绪胶囊为blocked")

        tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
        if tasks:
            completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
            if completed / len(tasks) < 0.4:
                triggers.append("任务完成率低于40%")

        return triggers
    finally:
        db.close()


def set_proxy_mentor(intern_id: str, proxy_mentor_id: str, reason: str) -> None:
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if intern:
            intern.mentor_id = proxy_mentor_id
            db.commit()
    finally:
        db.close()
