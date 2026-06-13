import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class WeeklyReportDeadline(Base):
    __tablename__ = "weekly_report_deadlines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mentor_id: Mapped[str] = mapped_column(String(36), ForeignKey("mentors.id"), nullable=False, unique=True)
    day_of_week: Mapped[int] = mapped_column(Integer, default=4, nullable=False)   # 0=Mon..6=Sun, default Friday
    hour: Mapped[int] = mapped_column(Integer, default=18, nullable=False)          # 0-23, default 18:00
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    mentor: Mapped["Mentor"] = relationship(back_populates="deadline")
