"""Seed 20 virtual interns with tasks, checkins, and associated data."""
import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import SessionLocal, Base, engine
from app.models.mentor import Mentor, RoleType
from app.models.intern import Intern, InternStatus
from app.models.task import Task, TaskType, TaskPriority, TaskStatus
from app.models.checkin import CheckIn, EmotionCapsule
from app.models.mentor_feedback import MentorFeedback, FeedbackRating, VoteType
from app.models.risk_signal import RiskSignal, RiskLevel, ReviewStatus
from app.models.fit_report import FitReport, AIRecommendation

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Clear existing data
for tbl in reversed(Base.metadata.sorted_tables):
    db.execute(tbl.delete())
db.commit()

# Mentors
mentors = [
    Mentor(name="张哥", department="产品部", role_type=RoleType.mentor),
    Mentor(name="刘姐", department="产品部", role_type=RoleType.mentor),
    Mentor(name="老周", department="技术部", role_type=RoleType.mentor),
    Mentor(name="陈姐", department="HR", role_type=RoleType.hr),
    Mentor(name="王宇", department="招聘", role_type=RoleType.recruiter),
]
db.add_all(mentors)
db.flush()

# Interns — 20 virtual interns with 4 status types
intern_names = [
    ("小林", InternStatus.normal, mentors[0].id),
    ("小李", InternStatus.normal, mentors[0].id),
    ("小王", InternStatus.normal, mentors[0].id),
    ("小赵", InternStatus.normal, mentors[0].id),
    ("小周", InternStatus.normal, mentors[1].id),
    ("小吴", InternStatus.potential, mentors[1].id),
    ("小郑", InternStatus.potential, mentors[1].id),
    ("小钱", InternStatus.potential, mentors[1].id),
    ("小孙", InternStatus.potential, mentors[2].id),
    ("小陈", InternStatus.normal, mentors[2].id),
    ("小刘", InternStatus.normal, mentors[2].id),
    ("小黄", InternStatus.normal, mentors[2].id),
    ("小杨", InternStatus.watch, mentors[0].id),
    ("小马", InternStatus.watch, mentors[1].id),
    ("小朱", InternStatus.watch, mentors[2].id),
    ("小胡", InternStatus.risk, mentors[0].id),
    ("小郭", InternStatus.normal, mentors[1].id),
    ("小何", InternStatus.normal, mentors[2].id),
    ("小吕", InternStatus.potential, mentors[1].id),
    ("小施", InternStatus.normal, mentors[0].id),
]

interns = []
for i, (name, status, mentor_id) in enumerate(intern_names):
    baseline = {"业务理解": random.randint(1, 3), "需求分析": random.randint(1, 3),
                "协作沟通": random.randint(2, 4), "交付质量": random.randint(1, 3)}
    current = {k: min(5, v + random.randint(0, 3)) for k, v in baseline.items()}
    intern = Intern(
        name=name, role="产品实习生", department="产品部",
        mentor_id=mentor_id, onboard_week=random.randint(3, 8),
        status=status, baseline_scores=baseline, current_scores=current,
    )
    db.add(intern)
    db.flush()
    interns.append(intern)

# Tasks — 3-5 per intern
task_templates = [
    ("完成用户访谈纪要", TaskType.practice, TaskPriority.high),
    ("学习产品需求文档规范", TaskType.learning, TaskPriority.medium),
    ("绘制用户旅程地图", TaskType.practice, TaskPriority.medium),
    ("阅读竞品分析报告", TaskType.learning, TaskPriority.low),
    ("撰写本周学习复盘", TaskType.retrospective, TaskPriority.medium),
    ("提交需求分析初稿", TaskType.output, TaskPriority.high),
    ("学习Figma基础操作", TaskType.learning, TaskPriority.medium),
    ("参与需求评审会议", TaskType.practice, TaskPriority.high),
]

for intern in interns:
    for title, ttype, pri in random.sample(task_templates, random.randint(3, 5)):
        task = Task(
            intern_id=intern.id, title=title, type=ttype, priority=pri,
            status=random.choice([TaskStatus.completed, TaskStatus.in_progress, TaskStatus.not_started]),
            due_date=None,
        )
        db.add(task)

# Checkins — 2-4 per intern
emotions = list(EmotionCapsule)
stress_map = {EmotionCapsule.energetic: 2, EmotionCapsule.motivated: 3,
              EmotionCapsule.steady: 4, EmotionCapsule.overloaded: 7, EmotionCapsule.blocked: 8}

progress_texts = [
    "本周完成了{0}场用户访谈，整理了纪要并提炼了3个关键需求点。",
    "本周主要学习产品文档规范，阅读了2份历史PRD，对文档结构有了基本了解。",
    "本周协助导师整理了需求池，对需求优先级排序有了新的理解。",
    "本周独立完成了竞品分析初稿，得到了导师的肯定反馈。",
    "本周进度稍慢，在Figma原型制作上遇到了技术瓶颈。",
]

for intern in interns:
    for week in range(max(1, intern.onboard_week - 3), intern.onboard_week + 1):
        emotion = random.choice(emotions)
        checkin = CheckIn(
            intern_id=intern.id, week=week,
            progress=random.choice(progress_texts).format(random.randint(1, 5)),
            blockers="暂无" if random.random() > 0.3 else "技术工具使用遇到卡点",
            emotion_capsule=emotion,
            mapped_stress_score=stress_map[emotion],
            next_plan="下周继续推进当前任务并加强薄弱环节学习",
        )
        db.add(checkin)

# Risk Signals — for watch/risk interns
for intern in interns:
    if intern.status in (InternStatus.watch, InternStatus.risk):
        signal = RiskSignal(
            intern_id=intern.id,
            level=RiskLevel.risk if intern.status == InternStatus.risk else RiskLevel.watch,
            triggers=["连续两周情绪胶囊为blocked", "周报提交延迟"] if intern.status == InternStatus.risk else ["本周任务完成率低于50%"],
            ai_confidence=random.uniform(0.7, 0.95),
            review_status=ReviewStatus.pending,
        )
        db.add(signal)

# Fit Reports — for interns with 6+ weeks
for intern in interns:
    if intern.onboard_week >= 6:
        report = FitReport(
            intern_id=intern.id,
            score_dimensions={k: {"baseline": intern.baseline_scores.get(k, 1),
                                  "current": intern.current_scores.get(k, 1),
                                  "trend": "up"} for k in ["业务理解", "需求分析", "协作沟通", "交付质量"]},
            growth_evidence=f"{intern.name}在{intern.onboard_week}周内从被动接收任务成长到主动发现需求机会。",
            ai_recommendation=AIRecommendation.high_potential if intern.status == InternStatus.potential else AIRecommendation.observe,
            human_review_note="导师复核：同意AI判断。" if intern.status != InternStatus.risk else None,
        )
        db.add(report)

db.commit()
db.close()
print(f"Seeded {len(interns)} interns, {len(mentors)} mentors with tasks, checkins, and reports.")
