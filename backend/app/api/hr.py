from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..models import SessionLocal
from ..models.risk_signal import RiskSignal, ReviewStatus
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
