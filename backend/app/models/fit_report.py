import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Enum as SAEnum, JSON, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class AIRecommendation(str, enum.Enum):
    high_potential = "high_potential"
    observe = "observe"
    not_suitable = "not_suitable"


class FitReport(Base):
    __tablename__ = "fit_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey("interns.id"), nullable=False)
    score_dimensions: Mapped[dict] = mapped_column(JSON, nullable=False)
    growth_evidence: Mapped[str] = mapped_column(Text, nullable=False)
    ai_recommendation: Mapped[AIRecommendation] = mapped_column(SAEnum(AIRecommendation), nullable=False)
    human_review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    intern: Mapped["Intern"] = relationship(back_populates="fit_reports")
