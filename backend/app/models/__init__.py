from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

engine = create_engine("sqlite:///./intern_growth.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


from .user import User
from .intern import Intern
from .mentor import Mentor
from .task import Task
from .task_template import TaskTemplate
from .checkin import CheckIn
from .mentor_feedback import MentorFeedback
from .risk_signal import RiskSignal
from .fit_report import FitReport
from .notification import Notification
