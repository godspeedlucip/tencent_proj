import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, Integer, Enum as SAEnum, Date, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class TaskType(str, enum.Enum):
    learning = "learning"
    practice = "practice"
    output = "output"
    retrospective = "retrospective"


class TaskPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class TaskStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey("interns.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[TaskType] = mapped_column(SAEnum(TaskType), nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(SAEnum(TaskPriority), default=TaskPriority.medium)
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.not_started)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    creator_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("mentors.id"), nullable=True)
    report_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    annotation_json: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    approval_status: Mapped[ApprovalStatus | None] = mapped_column(SAEnum(ApprovalStatus), default=ApprovalStatus.pending, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    intern: Mapped["Intern"] = relationship(back_populates="tasks")
    creator: Mapped["Mentor"] = relationship(foreign_keys=[creator_id])
