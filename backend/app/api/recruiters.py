from fastapi import APIRouter, HTTPException
from ..services.recruiter_service import get_fit_reports, get_fit_report

router = APIRouter()


@router.get("/fit-reports")
def list_fit_reports():
    return {"reports": get_fit_reports()}


@router.get("/fit-reports/{report_id}")
def fit_report_detail(report_id: str):
    report = get_fit_report(report_id)
    if not report:
        raise HTTPException(404, "Fit report not found")
    return report
