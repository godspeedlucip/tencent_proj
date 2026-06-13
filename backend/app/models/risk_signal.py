import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, Enum as SAEnum, JSON, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class RiskLevel(str, enum.Enum):
    normal = "normal"
    watch = "watch"
    risk = "risk"


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    overridden = "overridden"


class RiskSignal(Base):
    __tablename__ = "risk_signals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey("interns.id"), nullable=False)
    level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel), nullable=False)
    triggers: Mapped[dict] = mapped_column(JSON, nullable=False)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    review_status: Mapped[ReviewStatus] = mapped_column(SAEnum(ReviewStatus), default=ReviewStatus.pending)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    intern: Mapped["Intern"] = relationship(back_populates="risk_signals")
