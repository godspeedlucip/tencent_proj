import random
import string
from collections import Counter
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..models import SessionLocal
from ..models.intern import Intern, InternStatus
from ..models.task import Task, TaskStatus
from ..models.checkin import CheckIn
from ..models.risk_signal import RiskSignal, ReviewStatus
from ..models.mentor import Mentor
from ..models.user import User, RoleType
from ..models.mentor_feedback import MentorFeedback, VoteType
from ..services.hr_service import get_dashboard, get_weekly_report, set_proxy_mentor
from .auth import hash_password

router = APIRouter()


def _generate_username(name: str) -> str:
    base = name.lower().replace(" ", "")
    suffix = str(random.randint(1000, 9999))
    return f"{base}{suffix}"


def _generate_password() -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=8))


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

        mentors_list = db.query(Mentor).join(User, Mentor.user_id == User.id).filter(User.role == "mentor").all()
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


@router.get("/mentor-performance")
def get_mentor_performance():
    db = SessionLocal()
    try:
        mentors_list = db.query(Mentor).join(User, Mentor.user_id == User.id).filter(User.role == "mentor").all()
        result = []
        for m in mentors_list:
            mentee_ids = [i.id for i in m.interns]
            if not mentee_ids:
                continue

            feedbacks = db.query(MentorFeedback).filter(MentorFeedback.intern_id.in_(mentee_ids)).all()
            checkins_m = db.query(CheckIn).filter(CheckIn.intern_id.in_(mentee_ids)).all()

            growth_vals = []
            for i in m.interns:
                if i.baseline_scores and i.current_scores:
                    diffs = [i.current_scores[k] - i.baseline_scores.get(k, 0) for k in i.current_scores]
                    growth_vals.append(sum(diffs) / len(diffs) if diffs else 0)

            overrides = sum(1 for f in feedbacks if f.ai_suggestion_vote == VoteType.downvote)
            override_rate = round(overrides / len(feedbacks) * 100, 1) if feedbacks else 0

            result.append({
                "mentor_name": m.name,
                "intern_count": len(m.interns),
                "feedback_coverage_pct": round(len(feedbacks) / len(checkins_m) * 100, 1) if checkins_m else 0,
                "avg_mentee_growth": round(sum(growth_vals) / len(growth_vals), 1) if growth_vals else 0,
                "ai_override_rate": override_rate,
                "at_risk_count": sum(1 for i in m.interns if i.status.value in ("watch", "risk")),
            })
        return result
    finally:
        db.close()


class CreateInternRequest(BaseModel):
    name: str
    role: str
    department: str
    mentor_id: str


@router.post("/interns")
def create_intern(req: CreateInternRequest):
    db = SessionLocal()
    try:
        mentor = db.query(Mentor).filter(Mentor.id == req.mentor_id).first()
        if not mentor:
            raise HTTPException(404, "Mentor not found")

        username = _generate_username(req.name)
        password = _generate_password()

        # Retry on username collision
        for _ in range(5):
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                break
            username = _generate_username(req.name)
        else:
            raise HTTPException(500, "Failed to generate unique username")

        user = User(
            username=username,
            hashed_password=hash_password(password),
            role=RoleType.intern,
        )
        db.add(user)
        db.flush()

        intern = Intern(
            name=req.name, role=req.role, department=req.department,
            mentor_id=req.mentor_id, user_id=user.id,
            onboard_week=1, status=InternStatus.normal,
        )
        db.add(intern)
        db.commit()
        db.refresh(intern)
        return {
            "id": intern.id, "name": intern.name, "role": intern.role,
            "department": intern.department, "mentor_id": intern.mentor_id,
            "mentor_name": intern.mentor.name if intern.mentor else "",
            "onboard_week": intern.onboard_week, "status": intern.status.value,
            "credentials": {"username": username, "password": password},
        }
    finally:
        db.close()


@router.delete("/interns/{intern_id}")
def delete_intern(intern_id: str):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        db.delete(intern)
        db.commit()
        return {"deleted": True, "id": intern_id}
    finally:
        db.close()


class AssignMentorRequest(BaseModel):
    mentor_id: str


@router.put("/interns/{intern_id}/mentor")
def assign_mentor(intern_id: str, req: AssignMentorRequest):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        mentor = db.query(Mentor).filter(Mentor.id == req.mentor_id).first()
        if not mentor:
            raise HTTPException(404, "Mentor not found")
        intern.mentor_id = req.mentor_id
        db.commit()
        return {"intern_id": intern_id, "mentor_id": req.mentor_id, "mentor_name": mentor.name}
    finally:
        db.close()


@router.get("/mentors")
def list_mentors():
    db = SessionLocal()
    try:
        mentors_list = db.query(Mentor).join(User, Mentor.user_id == User.id).filter(User.role == "mentor").all()
        result = []
        for m in mentors_list:
            mentee_ids = [i.id for i in m.interns]
            checkin_count = db.query(CheckIn).filter(CheckIn.intern_id.in_(mentee_ids)).count() if mentee_ids else 0
            feedback_count = db.query(MentorFeedback).filter(MentorFeedback.intern_id.in_(mentee_ids)).count() if mentee_ids else 0
            at_risk = sum(1 for i in m.interns if i.status.value in ("watch", "risk"))
            result.append({
                "id": m.id, "name": m.name, "department": m.department,
                "intern_count": len(m.interns),
                "feedback_coverage_pct": round(feedback_count / checkin_count * 100, 1) if checkin_count else 0,
                "at_risk_count": at_risk,
            })
        return {"mentors": result}
    finally:
        db.close()


class CreateMentorRequest(BaseModel):
    name: str
    department: str


@router.post("/mentors")
def create_mentor(req: CreateMentorRequest):
    db = SessionLocal()
    try:
        username = _generate_username(req.name)
        password = _generate_password()

        for _ in range(5):
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                break
            username = _generate_username(req.name)
        else:
            raise HTTPException(500, "Failed to generate unique username")

        user = User(
            username=username,
            hashed_password=hash_password(password),
            role=RoleType.mentor,
        )
        db.add(user)
        db.flush()

        mentor = Mentor(
            name=req.name,
            department=req.department,
            user_id=user.id,
        )
        db.add(mentor)
        db.commit()
        db.refresh(mentor)
        return {
            "id": mentor.id, "name": mentor.name, "department": mentor.department,
            "credentials": {"username": username, "password": password},
        }
    finally:
        db.close()


@router.get("/interns-all")
def list_all_interns():
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        return {"interns": [
            {
                "id": i.id, "name": i.name, "role": i.role,
                "department": i.department, "mentor_id": i.mentor_id,
                "mentor_name": i.mentor.name if i.mentor else "",
                "onboard_week": i.onboard_week, "status": i.status.value,
            }
            for i in interns
        ]}
    finally:
        db.close()
