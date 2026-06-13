import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Enum as SAEnum, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class FeedbackRating(str, enum.Enum):
    exceeds = "exceeds"
    meets = "meets"
    needs_improvement = "needs_improvement"


class VoteType(str, enum.Enum):
    upvote = "upvote"
    downvote = "downvote"
    none = "none"


class MentorFeedback(Base):
    __tablename__ = "mentor_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey("interns.id"), nullable=False)
    mentor_id: Mapped[str] = mapped_column(String(36), ForeignKey("mentors.id"), nullable=False)
    checkin_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("checkins.id"), nullable=True)
    ai_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[FeedbackRating | None] = mapped_column(SAEnum(FeedbackRating), nullable=True)
    ai_suggestion_vote: Mapped[VoteType] = mapped_column(SAEnum(VoteType), default=VoteType.none)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    intern: Mapped["Intern"] = relationship(back_populates="feedbacks")
    mentor: Mapped["Mentor"] = relationship(back_populates="feedbacks")
