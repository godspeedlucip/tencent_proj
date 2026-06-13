import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Enum as SAEnum, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base
import enum


class InternStatus(str, enum.Enum):
    normal = "normal"
    potential = "potential"
    watch = "watch"
    risk = "risk"


class Intern(Base):
    __tablename__ = "interns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    mentor_id: Mapped[str] = mapped_column(String(36), ForeignKey("mentors.id"), nullable=False)
    onboard_week: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[InternStatus] = mapped_column(SAEnum(InternStatus), default=InternStatus.normal)
    baseline_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    current_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    mentor: Mapped["Mentor"] = relationship(back_populates="interns")
    checkins: Mapped[list["CheckIn"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    feedbacks: Mapped[list["MentorFeedback"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    risk_signals: Mapped[list["RiskSignal"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    fit_reports: Mapped[list["FitReport"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
