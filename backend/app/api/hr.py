from collections import Counter
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..models import SessionLocal
from ..models.intern import Intern
from ..models.task import Task, TaskStatus
from ..models.checkin import CheckIn
from ..models.risk_signal import RiskSignal, ReviewStatus
from ..models.mentor import Mentor
from ..models.mentor_feedback import MentorFeedback
from ..services.hr_service import get_dashboard, get_weekly_report, set_proxy_mentor

router = APIRouter()


@router.get("/dashboard")
def dashboard():
    return get_dashboard()


@router.get("/weekly-report")
def weekly_report():
    return get_weekly_report()


class ProxyMentorRequest(BaseModel):
    proxy_mentor_id: str
    reason: str


@router.post("/interns/{intern_id}/proxy-mentor")
def proxy_mentor(intern_id: str, req: ProxyMentorRequest):
    set_proxy_mentor(intern_id, req.proxy_mentor_id, req.reason)
    return {"status": "ok"}


class ReviewRiskRequest(BaseModel):
    review_status: str  # confirmed | overridden
    review_note: str


@router.post("/risks/{risk_id}/review")
def review_risk_signal(risk_id: str, req: ReviewRiskRequest):
    db = SessionLocal()
    try:
        signal = db.query(RiskSignal).filter(RiskSignal.id == risk_id).first()
        if not signal:
            raise HTTPException(404, "Risk signal not found")
        signal.review_status = ReviewStatus(req.review_status)
        signal.review_note = req.review_note
        db.commit()
        return {"status": "ok", "review_status": signal.review_status.value}
    finally:
        db.close()


@router.get("/analytics")
def get_analytics():
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        checkins = db.query(CheckIn).all()
        tasks = db.query(Task).all()

        weeks = sorted(set(c.week for c in checkins))
        growth_trend = []
        for w in weeks[:8]:
            week_interns = [i for i in interns if i.onboard_week >= w and i.current_scores]
            if week_interns:
                scores = [i.current_scores for i in week_interns]
                growth_trend.append({
                    "week": w,
                    "avg_business_understanding": round(sum(s.get("业务理解", 0) for s in scores) / len(scores), 1),
                    "avg_requirement_analysis": round(sum(s.get("需求分析", 0) for s in scores) / len(scores), 1),
                    "avg_collaboration": round(sum(s.get("协作沟通", 0) for s in scores) / len(scores), 1),
                    "avg_delivery": round(sum(s.get("交付质量", 0) for s in scores) / len(scores), 1),
                })

        emotion_counts = Counter(c.emotion_capsule.value for c in checkins)
        emotion_distribution = [{"emotion": k, "count": v} for k, v in emotion_counts.items()]

        task_trend = []
        for w in weeks[:8]:
            completed_ct = sum(1 for t in tasks if t.status == TaskStatus.completed)
            in_progress_ct = sum(1 for t in tasks if t.status == TaskStatus.in_progress)
            blocked_ct = sum(1 for t in tasks if t.status == TaskStatus.blocked)
            task_trend.append({"week": w, "completed": completed_ct, "in_progress": in_progress_ct, "blocked": blocked_ct})

        risk_timeline = []
        signals = db.query(RiskSignal).all()
        for s in signals:
            risk_timeline.append({
                "intern_name": s.intern.name if s.intern else "",
                "week": s.intern.onboard_week if s.intern else 0,
                "level": s.level.value,
            })

        mentors_list = db.query(Mentor).filter(Mentor.role_type == "mentor").all()
        feedback_coverage = []
        for m in mentors_list:
            mentee_ids = [i.id for i in m.interns]
            total_checkins = db.query(CheckIn).filter(CheckIn.intern_id.in_(mentee_ids)).count() if mentee_ids else 0
            total_feedbacks = db.query(MentorFeedback).filter(MentorFeedback.intern_id.in_(mentee_ids)).count() if mentee_ids else 0
            coverage = round(total_feedbacks / total_checkins * 100, 1) if total_checkins > 0 else 0
            feedback_coverage.append({"mentor_name": m.name, "coverage_pct": coverage})

        return {
            "growth_trend": growth_trend,
            "emotion_distribution": emotion_distribution,
            "task_completion_trend": task_trend,
            "risk_timeline": risk_timeline,
            "mentor_feedback_coverage": feedback_coverage,
        }
    finally:
        db.close()


@router.get("/export")
def export_data(format: str = "csv"):
    import io, csv as csv_module
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        output = io.StringIO()
        writer = csv_module.writer(output)
        writer.writerow(["姓名", "岗位", "部门", "入职周数", "状态", "任务完成率"])
        for i in interns:
            tasks = db.query(Task).filter(Task.intern_id == i.id).all()
            completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
            rate = round(completed / len(tasks), 2) if tasks else 0
            writer.writerow([i.name, i.role, i.department, i.onboard_week, i.status.value, rate])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=intern_report.csv"},
        )
    finally:
        db.close()
