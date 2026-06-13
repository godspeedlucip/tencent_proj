from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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
