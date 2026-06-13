import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Enum as SAEnum, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class EmotionCapsule(str, enum.Enum):
    energetic = "energetic"
    steady = "steady"
    blocked = "blocked"
    overloaded = "overloaded"
    motivated = "motivated"


class CheckIn(Base):
    __tablename__ = "checkins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey("interns.id"), nullable=False)
    week: Mapped[int] = mapped_column(Integer, nullable=False)
    progress: Mapped[str] = mapped_column(Text, nullable=False)
    blockers: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotion_capsule: Mapped[EmotionCapsule] = mapped_column(SAEnum(EmotionCapsule), nullable=False)
    mapped_stress_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    intern: Mapped["Intern"] = relationship(back_populates="checkins")
