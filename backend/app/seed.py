import bcrypt
from .models import Base, engine, SessionLocal
from .models.user import User, RoleType
from .models.mentor import Mentor
from .models.intern import Intern
from .models.task import Task, TaskType, TaskPriority, TaskStatus
from .models.weekly_report_deadline import WeeklyReportDeadline


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(User).count() > 0:
        print("Data already seeded.")
        db.close()
        return

    pw = bcrypt.hashpw(b"pass123", bcrypt.gensalt()).decode()
    mentor_user = User(id="user-mentor-1", username="mentor1", hashed_password=pw, role=RoleType.mentor)
    intern_user = User(id="user-intern-1", username="intern1", hashed_password=pw, role=RoleType.intern)
    hr_user = User(id="user-hr-1", username="hr1", hashed_password=pw, role=RoleType.hr)
    recruiter_user = User(id="user-recruiter-1", username="recruiter1", hashed_password=pw, role=RoleType.recruiter)
    db.add_all([mentor_user, intern_user, hr_user, recruiter_user])
    db.flush()

    mentor = Mentor(id="mentor-1", name="张哥", department="产品部", user_id=mentor_user.id)
    hr = Mentor(id="hr-1", name="李姐", department="HR部", user_id=hr_user.id)
    recruiter = Mentor(id="recruiter-1", name="王招", department="招聘部", user_id=recruiter_user.id)
    db.add_all([mentor, hr, recruiter])
    db.flush()

    # Create default Friday 18:00 deadline for the mentor
    db.add(WeeklyReportDeadline(mentor_id=mentor.id, day_of_week=4, hour=18))
    db.flush()

    intern = Intern(
        id="intern-1", name="小明", role="产品实习生",
        department="产品部", mentor_id=mentor.id, user_id=intern_user.id, onboard_week=3,
    )
    db.add(intern)
    db.flush()

    tasks = [
        Task(intern_id=intern.id, title="完成用户访谈纪要", type=TaskType.learning, priority=TaskPriority.high, status=TaskStatus.completed),
        Task(intern_id=intern.id, title="编写登录模块 PRD", type=TaskType.output, priority=TaskPriority.high, status=TaskStatus.in_progress),
        Task(intern_id=intern.id, title="学习 Figma 基础操作", type=TaskType.learning, priority=TaskPriority.medium, status=TaskStatus.in_progress),
        Task(intern_id=intern.id, title="参与需求评审会", type=TaskType.practice, priority=TaskPriority.medium, status=TaskStatus.not_started),
    ]
    db.add_all(tasks)
    db.commit()
    db.close()
    print("Seed complete.")


if __name__ == "__main__":
    seed()
