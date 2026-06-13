import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class Mentor(Base):
    __tablename__ = "mentors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    user: Mapped["User"] = relationship()
    interns: Mapped[list["Intern"]] = relationship(back_populates="mentor")
    feedbacks: Mapped[list["MentorFeedback"]] = relationship(back_populates="mentor")
    deadline: Mapped["WeeklyReportDeadline | None"] = relationship(back_populates="mentor", uselist=False, cascade="all, delete-orphan")
