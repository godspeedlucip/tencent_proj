from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..models import SessionLocal
from ..models.mentor import Mentor, RoleType

router = APIRouter()


class SwitchRoleRequest(BaseModel):
    role: str
    user_id: str | None = None


@router.post("/switch-role")
def switch_role(req: SwitchRoleRequest):
    db = SessionLocal()
    try:
        if req.role not in ("intern", "mentor", "hr", "recruiter"):
            raise HTTPException(400, "Invalid role")

        if req.role == "intern":
            from ..models.intern import Intern
            user = db.query(Intern).first()
            if not user:
                raise HTTPException(404, "No intern found")
            return {
                "role": "intern",
                "user": {"id": user.id, "name": user.name, "department": user.department},
                "permissions": ["view_own_tasks", "submit_checkin", "view_own_baseline", "receive_ai_tips"],
            }
        else:
            role_map = {"mentor": RoleType.mentor, "hr": RoleType.hr, "recruiter": RoleType.recruiter}
            role_type = role_map[req.role]
            user = db.query(Mentor).filter(Mentor.role_type == role_type).first()
            if not user:
                raise HTTPException(404, f"No {req.role} found")
            permissions = {
                "mentor": ["view_assigned_interns", "submit_feedback", "view_ai_outline", "vote_ai"],
                "hr": ["view_dashboard", "generate_report", "set_proxy_mentor"],
                "recruiter": ["view_fit_reports"],
            }
            return {
                "role": req.role,
                "user": {"id": user.id, "name": user.name, "department": user.department},
                "permissions": permissions.get(req.role, []),
            }
    finally:
        db.close()
