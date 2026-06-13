import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column
from . import Base
import enum


class NotificationType(str, enum.Enum):
    deadline_reminder = "deadline_reminder"
    mentor_nudge = "mentor_nudge"
    risk_alert = "risk_alert"
    positive_milestone = "positive_milestone"
    system = "system"


class NotificationPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_role: Mapped[str] = mapped_column(String(20), nullable=False)
    recipient_id: Mapped[str] = mapped_column(String(36), nullable=False)
    type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(String(500), nullable=False)
    priority: Mapped[NotificationPriority] = mapped_column(SAEnum(NotificationPriority), default=NotificationPriority.medium)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    action_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
