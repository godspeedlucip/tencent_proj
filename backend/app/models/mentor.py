import uuid
import enum
from sqlalchemy import String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class RoleType(str, enum.Enum):
    mentor = "mentor"
    hr = "hr"
    recruiter = "recruiter"


class Mentor(Base):
    __tablename__ = "mentors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    role_type: Mapped[RoleType] = mapped_column(SAEnum(RoleType), default=RoleType.mentor)

    interns: Mapped[list["Intern"]] = relationship(back_populates="mentor")
    feedbacks: Mapped[list["MentorFeedback"]] = relationship(back_populates="mentor")
