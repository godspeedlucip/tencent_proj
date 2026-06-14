"""Intern business logic: baseline, tasks, checkins, duplicate detection."""
from datetime import datetime
from ..models.task import Task, ApprovalStatus
import json
from difflib import SequenceMatcher
from ..models import SessionLocal
from ..models.intern import Intern
from ..models.task import Task, TaskStatus
from ..models.checkin import CheckIn, EmotionCapsule
from ..models.risk_signal import RiskSignal, RiskLevel, ReviewStatus

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
            weekly_report_md=data.get("weekly_report_md"),
            next_plan=data.get("next_plan"),
            attachment_url=data.get("attachment_url"),
            attachment_name=data.get("attachment_name"),
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


def submit_checkin_with_ai(intern_id: str, data: dict) -> dict:
    """Submit checkin then run AI analysis, returning analysis results."""
    result = submit_checkin(intern_id, data)
    if not result.get("id"):
        return result

    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            return result

        tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
        completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
        task_rate = round(completed / len(tasks), 2) if tasks else 0

        context = {
            "name": intern.name,
            "role": intern.role,
            "week": data.get("week"),
            "task_completion_rate": task_rate,
            "emotion": data.get("emotion_capsule"),
        }

        from .ai_service import analyze_checkin
        analysis = analyze_checkin(data.get("progress", ""), context)

        risk_signals = analysis.get("data", {}).get("risk_signals", [])
        for sig in risk_signals:
            if sig.get("severity") == "high":
                existing = (
                    db.query(RiskSignal)
                    .filter(RiskSignal.intern_id == intern_id)
                    .order_by(RiskSignal.created_at.desc())
                    .first()
                )
                if not existing or existing.review_status != ReviewStatus.pending:
                    new_signal = RiskSignal(
                        intern_id=intern_id,
                        level=RiskLevel.risk,
                        triggers=[sig.get("evidence", "")],
                        ai_confidence=0.8,
                        review_status=ReviewStatus.pending,
                    )
                    db.add(new_signal)

        db.commit()
        result["analysis"] = {
            "growth_keywords": analysis.get("data", {}).get("growth_keywords", []),
            "sentiment_summary": analysis.get("data", {}).get("sentiment_summary", ""),
            "suggested_actions": analysis.get("data", {}).get("suggested_actions", []),
        }
        return result
    finally:
        db.close()


def get_growth_timeline(intern_id: str) -> dict:
    db = SessionLocal()
    try:
        checkins = db.query(CheckIn).filter(CheckIn.intern_id == intern_id).order_by(CheckIn.week.asc()).all()
        tasks = db.query(Task).filter(Task.intern_id == intern_id, Task.score.isnot(None)).all()
        scores_by_week: dict[int, list[int]] = {}
        for t in tasks:
            if t.report_submitted_at and t.score:
                week = t.report_submitted_at.isocalendar()[1]
                scores_by_week.setdefault(week, []).append(t.score)
        points = []
        for c in checkins:
            week_scores = scores_by_week.get(c.week)
            points.append({
                "week": c.week,
                "task_scores_avg": round(sum(week_scores) / len(week_scores), 1) if week_scores else None,
                "checkin_score": c.mentor_score,
                "radar_data": c.intern.current_scores or {},
            })
        milestones = [
            {"week": c.week, "event": f"第{c.week}周完成Check-in"}
            for c in checkins if c.mentor_score and c.mentor_score >= 4
        ]
        return {"scores_over_time": points, "milestones": milestones}
    finally:
        db.close()


def submit_task_report(intern_id: str, task_id: str, report_md: str, attachment_url: str | None = None, attachment_name: str | None = None) -> dict:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id, Task.intern_id == intern_id).first()
        if not task:
            return {"error": "Task not found"}
        task.report_md = report_md
        task.report_submitted_at = datetime.utcnow()
        task.approval_status = ApprovalStatus.pending
        task.attachment_url = attachment_url
        task.attachment_name = attachment_name
        db.commit()

        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if intern and intern.mentor_id:
            from .notification_service import create_notification
            from ..models.notification import NotificationType, NotificationPriority
            create_notification(
                recipient_role="mentor",
                recipient_id=intern.mentor_id,
                type_=NotificationType.mentor_nudge,
                title=f"{intern.name} 提交了任务报告",
                body=f"任务「{task.title}」报告已提交，请审批",
                priority=NotificationPriority.medium,
                action_link=f"/mentor/review/{task_id}",
            )
        return {"id": task.id, "status": "pending_review"}
    finally:
        db.close()
