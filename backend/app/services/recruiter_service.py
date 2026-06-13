"""Recruiter business logic: fit report list & detail with human review enforcement."""
from ..models import SessionLocal
from ..models.fit_report import FitReport, AIRecommendation


def get_fit_reports() -> list[dict]:
    db = SessionLocal()
    try:
        reports = db.query(FitReport).order_by(FitReport.generated_at.desc()).all()
        return [
            {
                "id": r.id,
                "intern_id": r.intern_id,
                "intern_name": r.intern.name if r.intern else "",
                "ai_recommendation": r.ai_recommendation.value,
                "has_human_review": bool(r.human_review_note),
                "generated_at": r.generated_at.isoformat(),
            }
            for r in reports
        ]
    finally:
        db.close()


def get_fit_report(report_id: str) -> dict | None:
    db = SessionLocal()
    try:
        r = db.query(FitReport).filter(FitReport.id == report_id).first()
        if not r:
            return None
        # Enforce: if not_suitable, human_review_note must exist
        if r.ai_recommendation == AIRecommendation.not_suitable and not r.human_review_note:
            return {
                **r.__dict__,
                "intern_name": r.intern.name if r.intern else "",
                "human_review_note": "[需要人工复核 — 未完成]",
                "has_human_review": False,
            }
        return {
            "id": r.id,
            "intern_id": r.intern_id,
            "intern_name": r.intern.name if r.intern else "",
            "score_dimensions": r.score_dimensions,
            "growth_evidence": r.growth_evidence,
            "ai_recommendation": r.ai_recommendation.value,
            "human_review_note": r.human_review_note,
            "generated_at": r.generated_at.isoformat(),
            "has_human_review": bool(r.human_review_note),
        }
    finally:
        db.close()
