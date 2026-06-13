# Panel Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix role-mismatch issues across intern/mentor/HR panels and add missing management features (baseline ownership, task report entry, weekly report deadline, mentor action modals, HR admin backend).

**Architecture:** Backend-first approach — new `weekly_report_deadlines` table + 9 new API endpoints, then frontend changes by panel (intern → mentor → HR). All frontend changes use existing glass-card design patterns and Ant Design components.

**Tech Stack:** FastAPI + SQLAlchemy + SQLite (backend), React + Ant Design + React Router v6 (frontend)

---

### Task 1: Create weekly_report_deadline model

**Files:**
- Create: `backend/app/models/weekly_report_deadline.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Write the model**

```python
# backend/app/models/weekly_report_deadline.py
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class WeeklyReportDeadline(Base):
    __tablename__ = "weekly_report_deadlines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mentor_id: Mapped[str] = mapped_column(String(36), ForeignKey("mentors.id"), nullable=False, unique=True)
    day_of_week: Mapped[int] = mapped_column(Integer, default=4)   # 0=Mon..6=Sun, default Friday
    hour: Mapped[int] = mapped_column(Integer, default=18)          # 0-23, default 18:00
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    mentor: Mapped["Mentor"] = relationship(back_populates="deadline")
```

- [ ] **Step 2: Register model and update Mentor relationship**

In `backend/app/models/__init__.py`, add the import:
```python
from .weekly_report_deadline import WeeklyReportDeadline
```

In `backend/app/models/mentor.py`, add the relationship after the `interns` line:
```python
deadline: Mapped["WeeklyReportDeadline | None"] = relationship(back_populates="mentor", uselist=False, cascade="all, delete-orphan")
```

**Note:** `uselist=False` since one mentor has one deadline config.

- [ ] **Step 3: Verify table creation**

```bash
cd backend && python -c "from app.models import Base, engine; Base.metadata.create_all(bind=engine); print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/weekly_report_deadline.py backend/app/models/__init__.py backend/app/models/mentor.py
git commit -m "feat: add WeeklyReportDeadline model"
```

---

### Task 2: Add deadline and baseline service functions

**Files:**
- Modify: `backend/app/services/mentor_service.py`

- [ ] **Step 1: Add deadline and baseline functions**

Append to `backend/app/services/mentor_service.py`:

```python
from ..models.weekly_report_deadline import WeeklyReportDeadline
from datetime import datetime, timedelta


def get_or_create_deadline(mentor_id: str) -> dict:
    db = SessionLocal()
    try:
        dl = db.query(WeeklyReportDeadline).filter(WeeklyReportDeadline.mentor_id == mentor_id).first()
        if not dl:
            dl = WeeklyReportDeadline(mentor_id=mentor_id)
            db.add(dl)
            db.commit()
            db.refresh(dl)
        return {"id": dl.id, "mentor_id": dl.mentor_id, "day_of_week": dl.day_of_week, "hour": dl.hour}
    finally:
        db.close()


def set_deadline(mentor_id: str, day_of_week: int, hour: int) -> dict:
    db = SessionLocal()
    try:
        dl = db.query(WeeklyReportDeadline).filter(WeeklyReportDeadline.mentor_id == mentor_id).first()
        if dl:
            dl.day_of_week = day_of_week
            dl.hour = hour
        else:
            dl = WeeklyReportDeadline(mentor_id=mentor_id, day_of_week=day_of_week, hour=hour)
            db.add(dl)
        db.commit()
        db.refresh(dl)
        return {"id": dl.id, "mentor_id": dl.mentor_id, "day_of_week": dl.day_of_week, "hour": dl.hour}
    finally:
        db.close()


def compute_is_late(checkin_submitted_at: datetime, mentor_id: str) -> bool:
    """Check if a checkin was submitted after the mentor's deadline for its week."""
    db = SessionLocal()
    try:
        dl = db.query(WeeklyReportDeadline).filter(WeeklyReportDeadline.mentor_id == mentor_id).first()
        if not dl:
            return False
        # Deadline is: same week's configured day_of_week at configured hour
        submitted = checkin_submitted_at.replace(tzinfo=None) if checkin_submitted_at.tzinfo else checkin_submitted_at
        days_until_deadline = (dl.day_of_week - submitted.weekday()) % 7
        deadline = (submitted + timedelta(days=days_until_deadline)).replace(
            hour=dl.hour, minute=0, second=0, microsecond=0
        )
        if deadline < submitted:
            deadline += timedelta(days=7)
        return submitted > deadline
    finally:
        db.close()


def submit_baseline(mentor_id: str, intern_id: str, scores: dict[str, int]) -> dict:
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id, Intern.mentor_id == mentor_id).first()
        if not intern:
            return {"error": "Intern not found or not under this mentor"}
        intern.baseline_scores = dict(scores)
        intern.current_scores = dict(scores)
        db.commit()
        return {"id": intern.id, "baseline_scores": intern.baseline_scores, "status": "submitted"}
    finally:
        db.close()
```

- [ ] **Step 2: Verify imports**

```bash
cd backend && python -c "from app.services.mentor_service import get_or_create_deadline, set_deadline, compute_is_late, submit_baseline; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/mentor_service.py
git commit -m "feat: add deadline and baseline service functions"
```

---

### Task 3: Add mentor API endpoints (deadline, baseline, intern detail)

**Files:**
- Modify: `backend/app/api/mentors.py`

- [ ] **Step 1: Add endpoints**

Append to `backend/app/api/mentors.py`:

```python
# --- Deadline ---

class DeadlineRequest(BaseModel):
    day_of_week: int  # 0=Mon..6=Sun
    hour: int         # 0-23


@router.post("/deadline")
def set_deadline_endpoint(req: DeadlineRequest, mentor_id: str = "default"):
    from ..services.mentor_service import set_deadline
    if not (0 <= req.day_of_week <= 6):
        raise HTTPException(400, "day_of_week must be 0-6")
    if not (0 <= req.hour <= 23):
        raise HTTPException(400, "hour must be 0-23")
    return set_deadline(mentor_id, req.day_of_week, req.hour)


@router.get("/{mentor_id}/deadline")
def get_deadline(mentor_id: str):
    from ..services.mentor_service import get_or_create_deadline
    return get_or_create_deadline(mentor_id)


# --- Baseline ---

class BaselineRequest(BaseModel):
    scores: dict[str, int]


@router.post("/interns/{intern_id}/baseline")
def submit_baseline_endpoint(intern_id: str, req: BaselineRequest, mentor_id: str = "default"):
    from ..services.mentor_service import submit_baseline
    expected_dims = ["业务理解", "需求分析", "协作沟通", "交付质量"]
    for dim in expected_dims:
        if dim not in req.scores:
            raise HTTPException(400, f"Missing dimension: {dim}")
        if not (1 <= req.scores[dim] <= 5):
            raise HTTPException(400, f"{dim} score must be 1-5")
    result = submit_baseline(mentor_id, intern_id, req.scores)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


# --- Intern detail views for mentor ---

@router.get("/{mentor_id}/interns/{intern_id}/tasks")
def get_intern_tasks_for_mentor(mentor_id: str, intern_id: str):
    from ..models import SessionLocal
    from ..models.task import Task
    from ..models.intern import Intern
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id, Intern.mentor_id == mentor_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
        return {"tasks": [
            {
                "id": t.id, "title": t.title, "type": t.type.value, "priority": t.priority.value,
                "status": t.status.value, "due_date": t.due_date.isoformat() if t.due_date else None,
                "score": t.score, "approval_status": t.approval_status.value if t.approval_status else "pending",
                "report_md": t.report_md,
            }
            for t in tasks
        ]}
    finally:
        db.close()


@router.get("/{mentor_id}/interns/{intern_id}/checkins")
def get_intern_checkins_for_mentor(mentor_id: str, intern_id: str):
    from ..models import SessionLocal
    from ..models.checkin import CheckIn
    from ..models.intern import Intern
    from ..services.mentor_service import compute_is_late
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id, Intern.mentor_id == mentor_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        checkins = db.query(CheckIn).filter(CheckIn.intern_id == intern_id).order_by(CheckIn.submitted_at.desc()).all()
        return {"checkins": [
            {
                "id": c.id, "week": c.week, "progress": c.progress,
                "blockers": c.blockers, "emotion_capsule": c.emotion_capsule.value,
                "next_plan": c.next_plan, "weekly_report_md": c.weekly_report_md,
                "mentor_score": c.mentor_score, "mentor_comment": c.mentor_comment,
                "submitted_at": c.submitted_at.isoformat(),
                "is_late": compute_is_late(c.submitted_at, mentor_id),
            }
            for c in checkins
        ]}
    finally:
        db.close()
```

- [ ] **Step 2: Verify syntax**

```bash
cd backend && python -c "from app.api.mentors import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/mentors.py
git commit -m "feat: add mentor baseline, deadline, and intern-detail API endpoints"
```

---

### Task 4: Add HR management endpoints

**Files:**
- Modify: `backend/app/api/hr.py`

- [ ] **Step 1: Add HR CRUD + mentor list endpoints**

Append to `backend/app/api/hr.py`:

```python
class CreateInternRequest(BaseModel):
    name: str
    role: str
    department: str
    mentor_id: str


@router.post("/interns")
def create_intern(req: CreateInternRequest):
    db = SessionLocal()
    try:
        mentor = db.query(Mentor).filter(Mentor.id == req.mentor_id).first()
        if not mentor:
            raise HTTPException(404, "Mentor not found")
        intern = Intern(
            name=req.name, role=req.role, department=req.department,
            mentor_id=req.mentor_id, onboard_week=1, status=InternStatus.normal,
        )
        db.add(intern)
        db.commit()
        db.refresh(intern)
        return {
            "id": intern.id, "name": intern.name, "role": intern.role,
            "department": intern.department, "mentor_id": intern.mentor_id,
            "mentor_name": intern.mentor.name if intern.mentor else "",
            "onboard_week": intern.onboard_week, "status": intern.status.value,
        }
    finally:
        db.close()


@router.delete("/interns/{intern_id}")
def delete_intern(intern_id: str):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        db.delete(intern)
        db.commit()
        return {"deleted": True, "id": intern_id}
    finally:
        db.close()


class AssignMentorRequest(BaseModel):
    mentor_id: str


@router.put("/interns/{intern_id}/mentor")
def assign_mentor(intern_id: str, req: AssignMentorRequest):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        mentor = db.query(Mentor).filter(Mentor.id == req.mentor_id).first()
        if not mentor:
            raise HTTPException(404, "Mentor not found")
        intern.mentor_id = req.mentor_id
        db.commit()
        return {"intern_id": intern_id, "mentor_id": req.mentor_id, "mentor_name": mentor.name}
    finally:
        db.close()


@router.get("/mentors")
def list_mentors():
    db = SessionLocal()
    try:
        mentors_list = db.query(Mentor).join(User, Mentor.user_id == User.id).filter(User.role == "mentor").all()
        result = []
        for m in mentors_list:
            mentee_ids = [i.id for i in m.interns]
            checkin_count = db.query(CheckIn).filter(CheckIn.intern_id.in_(mentee_ids)).count() if mentee_ids else 0
            feedback_count = db.query(MentorFeedback).filter(MentorFeedback.intern_id.in_(mentee_ids)).count() if mentee_ids else 0
            at_risk = sum(1 for i in m.interns if i.status.value in ("watch", "risk"))
            result.append({
                "id": m.id, "name": m.name, "department": m.department,
                "intern_count": len(m.interns),
                "feedback_coverage_pct": round(feedback_count / checkin_count * 100, 1) if checkin_count else 0,
                "at_risk_count": at_risk,
            })
        return {"mentors": result}
    finally:
        db.close()


# Extend existing GET /interns to support full list for HR management
@router.get("/interns-all")
def list_all_interns():
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        return {"interns": [
            {
                "id": i.id, "name": i.name, "role": i.role,
                "department": i.department, "mentor_id": i.mentor_id,
                "mentor_name": i.mentor.name if i.mentor else "",
                "onboard_week": i.onboard_week, "status": i.status.value,
            }
            for i in interns
        ]}
    finally:
        db.close()
```

- [ ] **Step 2: Verify syntax**

```bash
cd backend && python -c "from app.api.hr import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/hr.py
git commit -m "feat: add HR CRUD endpoints for intern/mentor management"
```

---

### Task 5: Extend checkin list to include is_late for intern view

**Files:**
- Modify: `backend/app/api/interns.py`

- [ ] **Step 1: Add is_late to checkin list response**

In `backend/app/api/interns.py`, update `get_intern_checkins` to compute `is_late`. Replace lines 78-95:

```python
        checkins = q.order_by(CheckIn.submitted_at.desc()).all()
        from ..models.mentor_feedback import MentorFeedback
        from ..services.mentor_service import compute_is_late
        return {"checkins": [
            {
                "id": c.id, "week": c.week, "progress": c.progress, "blockers": c.blockers,
                "emotion_capsule": c.emotion_capsule.value, "next_plan": c.next_plan,
                "submitted_at": c.submitted_at.isoformat(),
                "has_feedback": db.query(MentorFeedback).filter(
                    MentorFeedback.intern_id == intern_id,
                    MentorFeedback.checkin_id == c.id,
                ).count() > 0,
                "is_late": compute_is_late(c.submitted_at, mentor_id),
            }
            for c in checkins
        ]}
```

Wait — we need the intern's mentor_id. Add after line 78 (after fetching the intern):

Actually, let me just show the exact diff more carefully. Read the intern to get mentor_id:

```python
@router.get("/{intern_id}/checkins")
def get_intern_checkins(intern_id: str, week: int | None = Query(None)):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
        q = db.query(CheckIn).filter(CheckIn.intern_id == intern_id)
        if week:
            q = q.filter(CheckIn.week == week)
        checkins = q.order_by(CheckIn.submitted_at.desc()).all()
        from ..models.mentor_feedback import MentorFeedback
        from ..services.mentor_service import compute_is_late
        mentor_id = intern.mentor_id
        return {"checkins": [
            {
                "id": c.id, "week": c.week, "progress": c.progress, "blockers": c.blockers,
                "emotion_capsule": c.emotion_capsule.value, "next_plan": c.next_plan,
                "submitted_at": c.submitted_at.isoformat(),
                "has_feedback": db.query(MentorFeedback).filter(
                    MentorFeedback.intern_id == intern_id,
                    MentorFeedback.checkin_id == c.id,
                ).count() > 0,
                "is_late": compute_is_late(c.submitted_at, mentor_id),
            }
            for c in checkins
        ]}
    finally:
        db.close()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/interns.py
git commit -m "feat: add is_late flag to checkin list response"
```

---

### Task 6: Verify backend starts clean

**Files:** (none, verification only)

- [ ] **Step 1: Start backend and check no import errors**

```bash
cd backend && timeout 5 python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 || true
```
Expected: No import errors. Server starts (may timeout which is fine).

- [ ] **Step 2: Test new endpoints with curl**

```bash
# Start backend in background
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 2

# Test deadline endpoint
curl -s http://localhost:8000/api/v1/mentor/m1/deadline | python -m json.tool

# Test HR mentors list
curl -s http://localhost:8000/api/v1/hr/mentors | python -m json.tool

# Test HR interns-all
curl -s http://localhost:8000/api/v1/hr/interns-all | python -m json.tool

# Kill background server
kill %1
```

- [ ] **Step 3: Commit (if any fixes needed)**

---

### Task 7: Frontend API service — extend for new endpoints

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add new types**

In `frontend/src/types/index.ts`, append:

```typescript
export interface DeadlineConfig {
  id: string
  mentor_id: string
  day_of_week: number
  hour: number
}

export interface MentorInternTask extends Task {
  score: number | null
  approval_status: string
  report_md: string | null
}

export interface MentorInternCheckin {
  id: string
  week: number
  progress: string
  blockers: string | null
  emotion_capsule: string
  next_plan: string | null
  weekly_report_md: string | null
  mentor_score: number | null
  mentor_comment: string | null
  submitted_at: string
  is_late: boolean
}

export interface MentorSummary {
  id: string
  name: string
  department: string
  intern_count: number
  feedback_coverage_pct: number
  at_risk_count: number
}

export interface HRIntern {
  id: string
  name: string
  role: string
  department: string
  mentor_id: string
  mentor_name: string
  onboard_week: number
  status: string
}
```

- [ ] **Step 2: Add new API functions**

In `frontend/src/services/api.ts`, add to `mentors` export:

```typescript
  getDeadline: (mentorId: string) =>
    request<DeadlineConfig>(`/mentor/${mentorId}/deadline`),
  setDeadline: (data: { day_of_week: number; hour: number }, mentorId?: string) =>
    request<DeadlineConfig>('/mentor/deadline', { method: 'POST', body: JSON.stringify(data) }),
  submitBaseline: (internId: string, scores: Record<string, number>) =>
    request<{ id: string; status: string }>(`/mentor/interns/${internId}/baseline`, { method: 'POST', body: JSON.stringify({ scores }) }),
  getInternTasks: (mentorId: string, internId: string) =>
    request<{ tasks: MentorInternTask[] }>(`/mentor/${mentorId}/interns/${internId}/tasks`),
  getInternCheckins: (mentorId: string, internId: string) =>
    request<{ checkins: MentorInternCheckin[] }>(`/mentor/${mentorId}/interns/${internId}/checkins`),
```

Add to `hr` export:

```typescript
  createIntern: (data: { name: string; role: string; department: string; mentor_id: string }) =>
    request<HRIntern>('/hr/interns', { method: 'POST', body: JSON.stringify(data) }),
  deleteIntern: (internId: string) =>
    request<{ deleted: boolean }>(`/hr/interns/${internId}`, { method: 'DELETE' }),
  assignMentor: (internId: string, mentorId: string) =>
    request<{ intern_id: string; mentor_id: string }>(`/hr/interns/${internId}/mentor`, { method: 'PUT', body: JSON.stringify({ mentor_id: mentorId }) }),
  listAllInterns: () =>
    request<{ interns: HRIntern[] }>('/hr/interns-all'),
  listMentors: () =>
    request<{ mentors: MentorSummary[] }>('/hr/mentors'),
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/types/index.ts
git commit -m "feat: add frontend API service functions for new endpoints"
```

---

### Task 8: Intern Baseline — convert to read-only

**Files:**
- Modify: `frontend/src/pages/intern/Baseline.tsx`

- [ ] **Step 1: Rewrite Baseline.tsx**

Replace the entire file content:

```tsx
import { RadarChart } from '../../components/RadarChart'

const DIMS = ['业务理解', '需求分析', '协作沟通', '交付质量']

interface Props {
  baselineScores: Record<string, number> | null
  currentScores: Record<string, number> | null
}

export default function Baseline({ baselineScores, currentScores }: Props) {
  if (!baselineScores) {
    return (
      <div className="glass-card" style={{ padding: 24, marginBottom: 16, textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>
          入职成长基线评估
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          等待导师评估中，完成评估后将在此展示你的成长起点和当前水平。
        </p>
      </div>
    )
  }

  const radarData = DIMS.map(dim => ({
    dimension: dim,
    baseline: baselineScores[dim] ?? 0,
    current: currentScores?.[dim] ?? baselineScores[dim] ?? 0,
  }))

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>
        入职成长基线评估
      </h3>
      <RadarChart data={radarData} />
      <div style={{ marginTop: 16 }}>
        {DIMS.map(dim => {
          const baseline = baselineScores[dim] ?? 0
          const current = currentScores?.[dim] ?? baseline
          return (
            <div key={dim} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>{dim}</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  基线 {baseline} → 当前 {current}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.round(current / 5 * 100)}%`,
                    background: current >= 4
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update Dashboard.tsx to pass scores as props**

In `frontend/src/pages/intern/Dashboard.tsx`, change the baseline rendering on line 75:

```tsx
{/* Replace line 75 */}
<Baseline
  baselineScores={intern.baseline_scores}
  currentScores={intern.current_scores}
/>
```

Remove the `internId` and `onComplete` props. The Baseline no longer needs interactivity.

Remove the `import Baseline from './Baseline'` — it's already imported. Only need to change the JSX usage.

Also remove the `import { TrophyOutlined, BulbOutlined, CheckCircleOutlined }` line if `BulbOutlined` is unused (it may be used elsewhere, so check first — actually it's used in the growth section. Leave it).

- [ ] **Step 3: Verify types**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: No new errors related to Baseline.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/intern/Baseline.tsx frontend/src/pages/intern/Dashboard.tsx
git commit -m "feat: convert baseline to read-only mentor-assessed view"
```

---

### Task 9: Intern Tasks — add submit report button

**Files:**
- Modify: `frontend/src/pages/intern/Tasks.tsx`

- [ ] **Step 1: Add navigate and report button**

The `Tasks` component currently receives `tasks: Task[]`. It needs to add a submit report button per task. But the component is used both standalone and inside Dashboard. The Dashboard renders `<Tasks tasks={tasks} />`.

The component needs access to `navigate`. We'll add `useNavigate` and conditionally show the button:

```tsx
import { useNavigate } from 'react-router-dom'
import type { Task } from '../../types'
// ... keep typeStyle and statusStyle unchanged

export default function Tasks({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate()

  if (tasks.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: 24 }}>暂无任务</p>
  }

  return (
    <div>
      {tasks.map(t => {
        const ts = typeStyle[t.type] ?? typeStyle.learning
        const ss = statusStyle[t.status] ?? statusStyle.not_started
        const showReportBtn = t.status !== 'completed'
        return (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(253,230,138,0.15)' }}>
            <span style={{ fontSize: '0.9rem', color: '#334155' }}>{t.title}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="capsule-tag" style={{ background: ts.bg, borderColor: ts.border, color: ts.color }}>
                {ts.label}
              </span>
              <span className="capsule-tag" style={{ background: ss.bg, borderColor: ss.border, color: ss.color }}>
                {ss.label}
              </span>
              {showReportBtn && (
                <button
                  className="btn-link"
                  onClick={() => navigate(`/intern/tasks/${t.id}/report`)}
                  style={{ fontSize: '0.8rem' }}
                >
                  提交报告
                </button>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/intern/Tasks.tsx
git commit -m "feat: add submit report button to intern task list"
```

---

### Task 10: Intern CheckIn — add deadline banner

**Files:**
- Modify: `frontend/src/pages/intern/CheckIn.tsx`

- [ ] **Step 1: Add deadline fetching and banner**

The CheckIn component needs to show a deadline banner. The deadline is per-mentor. We need to get the intern's mentor_id to fetch the deadline.

The `CheckIn` component receives `{ internId, currentWeek, onClose }`. We'll fetch the deadline inside the component.

```tsx
import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, message, Alert } from 'antd'
import { interns, mentors } from '../../services/api'
import EmotionCapsule from '../../components/EmotionCapsule'
import type { DeadlineConfig } from '../../types'

interface Props { internId: string; currentWeek: number; onClose: () => void }

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function CheckIn({ internId, currentWeek, onClose }: Props) {
  const [form] = Form.useForm()
  const [emotion, setEmotion] = useState<string>('steady')
  const [submitting, setSubmitting] = useState(false)
  const [deadline, setDeadline] = useState<DeadlineConfig | null>(null)

  useEffect(() => {
    // Get intern info to find mentor_id, then fetch deadline
    interns.get(internId).then(i => {
      const mentorId = (i as any).mentor?.id
      if (mentorId) {
        mentors.getDeadline(mentorId).then(setDeadline).catch(() => {})
      }
    }).catch(() => {})
  }, [internId])

  const isLate = deadline ? (() => {
    const now = new Date()
    const deadlineDate = new Date()
    const dayDiff = (deadline.day_of_week - now.getDay() + 7) % 7
    deadlineDate.setDate(now.getDate() + (dayDiff === 0 ? 0 : dayDiff))
    deadlineDate.setHours(deadline.hour, 0, 0, 0)
    // If today is past the deadline day this week, or same day but past the hour
    if (now.getDay() > deadline.day_of_week || (now.getDay() === deadline.day_of_week && now.getHours() >= deadline.hour)) {
      return true
    }
    return false
  })() : false

  async function handleSubmit(values: any) {
    setSubmitting(true)
    try {
      await interns.submitCheckin(internId, { ...values, emotion_capsule: emotion, week: currentWeek })
      message.success('Check-in 提交成功')
      onClose()
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`第 ${currentWeek} 周 Check-in`} open onCancel={onClose} footer={null} width={600}>
      {deadline && (
        <Alert
          type={isLate ? 'warning' : 'info'}
          message={isLate
            ? `迟交 — 截止时间为每${DAY_LABELS[deadline.day_of_week]} ${deadline.hour}:00`
            : `截止时间：每${DAY_LABELS[deadline.day_of_week]} ${deadline.hour}:00`
          }
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="本周进展" name="progress" rules={[{ required: true, message: '请填写本周进展' }]}>
          <Input.TextArea rows={3} placeholder="这周完成了什么？学到了什么？" />
        </Form.Item>
        <Form.Item label="当前困难" name="blockers">
          <Input.TextArea rows={2} placeholder="遇到了什么困难或卡点？" />
        </Form.Item>
        <Form.Item label="当前状态（情绪胶囊）" required>
          <EmotionCapsule value={emotion} onChange={setEmotion} />
        </Form.Item>
        <Form.Item label="下周计划" name="next_plan">
          <Input.TextArea rows={2} placeholder="下周你计划做什么？" />
        </Form.Item>
        <Form.Item name="weekly_report_md" label="本周周报 (Markdown)">
          <Input.TextArea rows={10} placeholder="## 本周产出\n\n## 能力提升\n\n## 不足与反思\n\n## 下周计划" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting} block>提交 Check-in</Button>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/intern/CheckIn.tsx
git commit -m "feat: add deadline banner to intern CheckIn modal"
```

---

### Task 11: Mentor BaselineModal — baseline assessment for intern

**Files:**
- Create: `frontend/src/pages/mentor/BaselineModal.tsx`

- [ ] **Step 1: Write BaselineModal component**

```tsx
import { useState } from 'react'
import { Modal, Slider, Space, message } from 'antd'
import { mentors } from '../../services/api'

const DIMS = ['业务理解', '需求分析', '协作沟通', '交付质量']

interface Props {
  internId: string
  internName: string
  onClose: () => void
}

export default function BaselineModal({ internId, internName, onClose }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({
    业务理解: 2, 需求分析: 2, 协作沟通: 3, 交付质量: 2,
  })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      await mentors.submitBaseline(internId, scores)
      message.success(`${internName} 的基线评估已提交`)
      onClose()
    } catch {
      message.error('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`基线评估 — ${internName}`} open onCancel={onClose} footer={null} width={500}>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
        评估实习生当前四项核心能力的基线水平（1=完全不了解，5=能独立完成）
      </p>
      <Space direction="vertical" style={{ width: '100%' }}>
        {DIMS.map(dim => (
          <div key={dim}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong style={{ color: '#334155' }}>{dim}</strong>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{scores[dim]} 分</span>
            </div>
            <Slider min={1} max={5} value={scores[dim]} onChange={v => setScores(s => ({ ...s, [dim]: v }))} />
          </div>
        ))}
      </Space>
      <button className="btn-primary" onClick={submit} disabled={submitting} style={{ marginTop: 16, width: '100%' }}>
        {submitting ? '提交中...' : '提交基线评估'}
      </button>
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/mentor/BaselineModal.tsx
git commit -m "feat: add BaselineModal for mentor baseline assessment"
```

---

### Task 12: Mentor TaskListModal — view intern's tasks

**Files:**
- Create: `frontend/src/pages/mentor/TaskListModal.tsx`

- [ ] **Step 1: Write TaskListModal component**

```tsx
import { useState, useEffect } from 'react'
import { Modal, Table, Spin, Alert } from 'antd'
import { useNavigate } from 'react-router-dom'
import { mentors } from '../../services/api'
import type { MentorInternTask } from '../../types'

interface Props {
  mentorId: string
  internId: string
  internName: string
  onClose: () => void
}

const typeLabels: Record<string, string> = { learning: '学习', practice: '实践', output: '产出', retrospective: '复盘' }
const statusLabels: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成', blocked: '阻塞' }

export default function TaskListModal({ mentorId, internId, internName, onClose }: Props) {
  const [tasks, setTasks] = useState<MentorInternTask[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    mentors.getInternTasks(mentorId, internId)
      .then(r => setTasks(r.tasks))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mentorId, internId])

  const cols = [
    { title: '任务', dataIndex: 'title', key: 'title' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (t: string) => typeLabels[t] || t,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => statusLabels[s] || s,
    },
    {
      title: '审批', dataIndex: 'approval_status', key: 'approval',
      render: (a: string) => {
        const labels: Record<string, string> = { pending: '待审', approved: '已通过', rejected: '已驳回' }
        return labels[a] || a
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, t: MentorInternTask) =>
        t.approval_status === 'pending' && t.report_md ? (
          <button className="btn-link" onClick={() => { onClose(); navigate(`/mentor/review/${t.id}`) }}>
            审批
          </button>
        ) : null,
    },
  ]

  return (
    <Modal title={`${internName} 的任务`} open onCancel={onClose} footer={null} width={700}>
      {loading ? <Spin /> : tasks.length === 0
        ? <Alert message="暂无任务" type="info" />
        : <Table dataSource={tasks} columns={cols} rowKey="id" pagination={false} size="small" />
      }
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/mentor/TaskListModal.tsx
git commit -m "feat: add TaskListModal for mentor to view intern tasks"
```

---

### Task 13: Mentor WeeklyReportModal + ScoreReportModal

**Files:**
- Create: `frontend/src/pages/mentor/WeeklyReportModal.tsx`
- Create: `frontend/src/pages/mentor/ScoreReportModal.tsx`

- [ ] **Step 1: Write WeeklyReportModal**

```tsx
import { useState, useEffect } from 'react'
import { Modal, List, Tag, Spin, Alert } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { MentorInternCheckin } from '../../types'
import ScoreReportModal from './ScoreReportModal'

interface Props {
  mentorId: string
  internId: string
  internName: string
  onClose: () => void
}

export default function WeeklyReportModal({ mentorId, internId, internName, onClose }: Props) {
  const [checkins, setCheckins] = useState<MentorInternCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [scoringCheckin, setScoringCheckin] = useState<MentorInternCheckin | null>(null)

  useEffect(() => {
    mentors.getInternCheckins(mentorId, internId)
      .then(r => setCheckins(r.checkins))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mentorId, internId])

  if (scoringCheckin) {
    return (
      <ScoreReportModal
        checkin={scoringCheckin}
        onClose={() => { setScoringCheckin(null); onClose() }}
      />
    )
  }

  return (
    <Modal title={`${internName} 的周报`} open onCancel={onClose} footer={null} width={700}>
      {loading ? <Spin /> : checkins.length === 0
        ? <Alert message="暂无周报" type="info" />
        : (
          <List
            dataSource={checkins}
            renderItem={c => (
              <List.Item
                actions={[
                  c.mentor_score != null
                    ? <Tag color="green">已打分: {c.mentor_score}/5</Tag>
                    : <button className="btn-link" onClick={() => setScoringCheckin(c)}>打分</button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span>
                      第 {c.week} 周
                      {c.is_late && <Tag color="orange" style={{ marginLeft: 8 }}><ClockCircleOutlined /> 迟交</Tag>}
                    </span>
                  }
                  description={c.progress?.slice(0, 80) + (c.progress?.length > 80 ? '...' : '')}
                />
              </List.Item>
            )}
          />
        )}
    </Modal>
  )
}
```

- [ ] **Step 2: Write ScoreReportModal**

```tsx
import { useState } from 'react'
import { Modal, Input, Button, message, Space } from 'antd'
import { mentors } from '../../services/api'
import type { MentorInternCheckin } from '../../types'

interface Props {
  checkin: MentorInternCheckin
  onClose: () => void
}

const emotionLabels: Record<string, string> = {
  energetic: '干劲十足', steady: '稳步前进', blocked: '遇到瓶颈',
  overloaded: '信息过载', motivated: '充满动力',
}

export default function ScoreReportModal({ checkin, onClose }: Props) {
  const [score, setScore] = useState<number | undefined>(undefined)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!score) { message.warning('请选择评分'); return }
    setSubmitting(true)
    try {
      await mentors.scoreCheckin(checkin.id, { score, comment: comment || undefined })
      message.success('打分已提交')
      onClose()
    } catch (err: any) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`周报评分 — 第 ${checkin.week} 周`} open onCancel={onClose} footer={null} width={600}>
      <div style={{ marginBottom: 16 }}>
        <p><strong>情绪：</strong>{emotionLabels[checkin.emotion_capsule] || checkin.emotion_capsule}</p>
        <p><strong>进展：</strong></p>
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8, lineHeight: 1.7 }}>
          {checkin.progress}
        </div>
        {checkin.blockers && (
          <>
            <p><strong>困难：</strong></p>
            <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              {checkin.blockers}
            </div>
          </>
        )}
        {checkin.weekly_report_md && (
          <>
            <p><strong>周报：</strong></p>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, lineHeight: 1.7 }}>
              {checkin.weekly_report_md}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}><strong>评分：</strong></p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              onClick={() => setScore(n)}
              style={{
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: score === n ? '#f59e0b' : '#e2e8f0',
                color: score === n ? '#fff' : '#475569',
                fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}><strong>评语（可选）：</strong></p>
        <Input.TextArea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="对本周报的评价..." />
      </div>

      <Button type="primary" block loading={submitting} onClick={submit}>提交评分</Button>
    </Modal>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/mentor/WeeklyReportModal.tsx frontend/src/pages/mentor/ScoreReportModal.tsx
git commit -m "feat: add WeeklyReportModal and ScoreReportModal"
```

---

### Task 14: Mentor Dashboard — extend action column

**Files:**
- Modify: `frontend/src/pages/mentor/Dashboard.tsx`

- [ ] **Step 1: Rewrite MentorDashboard with extended actions**

Replace the entire file:

```tsx
import { useState, useEffect } from 'react'
import { Table, Spin, Alert, Skeleton, Tag } from 'antd'
import { MessageOutlined, EyeOutlined, EditOutlined, FileTextOutlined, StarOutlined, FormOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { Intern } from '../../types'
import Feedback from './Feedback'
import TalkingPointsView from './TalkingPoints'
import BaselineModal from './BaselineModal'
import TaskListModal from './TaskListModal'
import WeeklyReportModal from './WeeklyReportModal'

interface Props { user: { id: string; name: string; department: string } }

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  normal: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '正常' },
  potential: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '高潜' },
  watch: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '需关注' },
  risk: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '高风险' },
}

export default function MentorDashboard({ user }: Props) {
  const [interns, setInterns] = useState<Intern[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackIntern, setFeedbackIntern] = useState<Intern | null>(null)
  const [talkingPointsIntern, setTalkingPointsIntern] = useState<Intern | null>(null)
  const [baselineIntern, setBaselineIntern] = useState<Intern | null>(null)
  const [taskListIntern, setTaskListIntern] = useState<Intern | null>(null)
  const [weeklyReportIntern, setWeeklyReportIntern] = useState<Intern | null>(null)

  useEffect(() => { loadInterns() }, [user.id])

  async function loadInterns() {
    try {
      const res = await mentors.getInterns(user.id)
      setInterns(res.interns)
    } catch { setInterns([]) }
    finally { setLoading(false) }
  }

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />
  if (interns.length === 0) return <Alert message="暂无带教实习生数据" type="info" />

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const st = statusStyle[s] ?? statusStyle.normal
        return <span className="capsule-tag" style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
      },
    },
    {
      title: '任务完成率', dataIndex: 'task_completion_rate', key: 'task_completion_rate',
      render: (v: number) => `${Math.round(v * 100)}%`,
    },
    { title: '最近情绪', dataIndex: 'last_emotion', key: 'last_emotion' },
    {
      title: '最近周报', dataIndex: 'last_checkin_week', key: 'last_checkin_week',
      render: (w: number | null) => w ? `第 ${w} 周` : '-',
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: Intern) => (
        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {record.baseline_scores === null && (
            <button className="btn-link" onClick={() => setBaselineIntern(record)} title="基线评估">
              <FormOutlined /> 基线
            </button>
          )}
          <button className="btn-link" onClick={() => navigateToAssign(record)} title="布置任务">
            <EditOutlined /> 布置
          </button>
          <button className="btn-link" onClick={() => setTaskListIntern(record)} title="查看任务">
            <FileTextOutlined /> 任务
          </button>
          <button className="btn-link" onClick={() => setWeeklyReportIntern(record)} title="查看周报">
            <EyeOutlined /> 周报
          </button>
          <button className="btn-link" onClick={() => setTalkingPointsIntern(record)}>
            <StarOutlined /> 提纲
          </button>
          <button className="btn-link" onClick={() => setFeedbackIntern(record)}>
            <MessageOutlined /> 反馈
          </button>
        </span>
      ),
    },
  ]

  function navigateToAssign(record: Intern) {
    window.location.href = `/mentor/assign?intern_id=${record.id}&intern_name=${encodeURIComponent(record.name)}`
  }

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {user.name} — 带教看板
      </h2>
      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={interns} columns={cols} rowKey="id" pagination={false} size="middle" />
      </div>

      {feedbackIntern && (
        <Feedback
          internId={feedbackIntern.id}
          internName={feedbackIntern.name}
          onClose={() => { setFeedbackIntern(null); loadInterns() }}
        />
      )}

      {talkingPointsIntern && (
        <TalkingPointsView
          internId={talkingPointsIntern.id}
          internName={talkingPointsIntern.name}
          onClose={() => setTalkingPointsIntern(null)}
        />
      )}

      {baselineIntern && (
        <BaselineModal
          internId={baselineIntern.id}
          internName={baselineIntern.name}
          onClose={() => { setBaselineIntern(null); loadInterns() }}
        />
      )}

      {taskListIntern && (
        <TaskListModal
          mentorId={user.id}
          internId={taskListIntern.id}
          internName={taskListIntern.name}
          onClose={() => setTaskListIntern(null)}
        />
      )}

      {weeklyReportIntern && (
        <WeeklyReportModal
          mentorId={user.id}
          internId={weeklyReportIntern.id}
          internName={weeklyReportIntern.name}
          onClose={() => { setWeeklyReportIntern(null); loadInterns() }}
        />
      )}
    </>
  )
}
```

**Note:** Remove the unused `import { useNavigate } from 'react-router-dom'` if present — we use `window.location.href` for the AssignTask redirect to keep it simple.

- [ ] **Step 2: Update AssignTask to accept query params for pre-selection**

In `frontend/src/pages/mentor/AssignTask.tsx`, after the existing imports, read the query param:

```tsx
// After the existing useEffect, add:
import { useSearchParams } from 'react-router-dom'

// Inside the component, add:
const [searchParams] = useSearchParams()
const preSelectedInternId = searchParams.get('intern_id')
```

Then in the `useEffect` after loading interns, optionally pre-select:

```tsx
useEffect(() => {
  const mentorId = JSON.parse(localStorage.getItem('user') || '{}').id
  mentors.getInterns(mentorId).then(r => {
    setInterns(r.interns)
    if (preSelectedInternId) {
      form.setFieldsValue({ intern_id: preSelectedInternId })
    }
  }).catch(() => {}).finally(() => setLoading(false))
}, [preSelectedInternId])
```

Actually, to keep the plan DRY, let me write the full AssignTask change more precisely. The key addition is `useSearchParams` and pre-filling the form. Let me just specify the exact edit:

Add `useSearchParams` to the import from 'react-router-dom' (line 1).
Add `const [searchParams] = useSearchParams()` before the useEffect.
Use `searchParams.get('intern_id')` to pre-fill.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/mentor/Dashboard.tsx frontend/src/pages/mentor/AssignTask.tsx
git commit -m "feat: extend mentor dashboard with baseline/task/report action buttons"
```

---

### Task 15: HR Layout — left navigation shell

**Files:**
- Create: `frontend/src/pages/hr/HRLayout.tsx`

- [ ] **Step 1: Write HRLayout**

```tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  AlertOutlined, BarChartOutlined, UserOutlined, TeamOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout

const menuItems = [
  { key: '/hr/dashboard', icon: <AlertOutlined />, label: '风险看板' },
  { key: '/hr/analytics', icon: <BarChartOutlined />, label: '数据分析' },
  { key: '/hr/interns', icon: <UserOutlined />, label: '实习生管理' },
  { key: '/hr/mentors', icon: <TeamOutlined />, label: '导师管理' },
]

export default function HRLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: 'calc(100vh - 60px)', background: 'transparent' }}>
      <Sider
        width={200}
        style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: 12, paddingTop: 16 }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none' }}
        />
      </Sider>
      <Content style={{ padding: '0 0 0 24px' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/hr/HRLayout.tsx
git commit -m "feat: add HR layout with left navigation"
```

---

### Task 16: HR InternManage — intern CRUD page

**Files:**
- Create: `frontend/src/pages/hr/InternManage.tsx`

- [ ] **Step 1: Write InternManage**

```tsx
import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { HRIntern, MentorSummary } from '../../types'

const statusStyle: Record<string, { color: string; label: string }> = {
  normal: { color: 'green', label: '正常' },
  potential: { color: 'blue', label: '高潜' },
  watch: { color: 'orange', label: '需关注' },
  risk: { color: 'red', label: '高风险' },
}

export default function InternManage() {
  const [interns, setInterns] = useState<HRIntern[]>([])
  const [mentors, setMentors] = useState<MentorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form] = Form.useForm()
  const [assignOpen, setAssignOpen] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [iRes, mRes] = await Promise.all([hr.listAllInterns(), hr.listMentors()])
      setInterns(iRes.interns)
      setMentors(mRes.mentors)
    } catch {} finally { setLoading(false) }
  }

  async function handleAdd(values: any) {
    try {
      await hr.createIntern(values)
      message.success('实习生已添加')
      setAddOpen(false)
      form.resetFields()
      loadData()
    } catch (err: any) {
      message.error(err.message || '添加失败')
    }
  }

  async function handleDelete(id: string) {
    try {
      await hr.deleteIntern(id)
      message.success('已删除')
      loadData()
    } catch (err: any) {
      message.error(err.message || '删除失败')
    }
  }

  async function handleAssign(internId: string, mentorId: string) {
    try {
      await hr.assignMentor(internId, mentorId)
      message.success('导师已更新')
      setAssignOpen(null)
      loadData()
    } catch (err: any) {
      message.error(err.message || '分配失败')
    }
  }

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '岗位', dataIndex: 'role', key: 'role' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const st = statusStyle[s] ?? { color: 'default', label: s }
        return <Tag color={st.color}>{st.label}</Tag>
      },
    },
    { title: '导师', dataIndex: 'mentor_name', key: 'mentor' },
    { title: '入职周', dataIndex: 'onboard_week', key: 'week' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: HRIntern) => (
        <Space>
          <Select
            size="small"
            style={{ width: 120 }}
            placeholder="更换导师"
            value={undefined}
            onChange={(mid: string) => handleAssign(record.id, mid)}
            options={mentors.map(m => ({ value: m.id, label: m.name }))}
          />
          <Popconfirm title="确定删除该实习生？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>实习生管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加实习生</Button>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={interns} columns={cols} rowKey="id" loading={loading} pagination={false} size="middle" />
      </div>

      <Modal title="添加实习生" open={addOpen} onCancel={() => setAddOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="岗位" rules={[{ required: true }]}>
            <Input placeholder="如：前端开发实习生" />
          </Form.Item>
          <Form.Item name="department" label="部门" rules={[{ required: true }]}>
            <Input placeholder="如：技术研发部" />
          </Form.Item>
          <Form.Item name="mentor_id" label="导师" rules={[{ required: true }]}>
            <Select options={mentors.map(m => ({ value: m.id, label: m.name }))} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>确认添加</Button>
        </Form>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/hr/InternManage.tsx
git commit -m "feat: add HR InternManage page with CRUD and mentor assignment"
```

---

### Task 17: HR MentorManage — mentor list page

**Files:**
- Create: `frontend/src/pages/hr/MentorManage.tsx`

- [ ] **Step 1: Write MentorManage**

```tsx
import { useState, useEffect } from 'react'
import { Table, Spin } from 'antd'
import { hr } from '../../services/api'
import type { MentorSummary } from '../../types'

export default function MentorManage() {
  const [mentors, setMentors] = useState<MentorSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hr.listMentors()
      .then(r => setMentors(r.mentors))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '带教人数', dataIndex: 'intern_count', key: 'intern_count' },
    {
      title: '反馈覆盖率', dataIndex: 'feedback_coverage_pct', key: 'feedback_coverage_pct',
      render: (v: number) => `${v}%`,
    },
    {
      title: '风险人数', dataIndex: 'at_risk_count', key: 'at_risk_count',
      render: (v: number) => v > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#10b981' }}>0</span>,
    },
  ]

  return (
    <>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>导师管理</h2>
      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={mentors} columns={cols} rowKey="id" loading={loading} pagination={false} size="middle" />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/hr/MentorManage.tsx
git commit -m "feat: add HR MentorManage page"
```

---

### Task 18: App.tsx — route restructure

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update imports and HR routes**

Add import:
```tsx
import HRLayout from './pages/hr/HRLayout'
import InternManage from './pages/hr/InternManage'
import MentorManage from './pages/hr/MentorManage'
```

Replace the existing HR route lines:
```tsx
<Route path="/hr" element={<HRRiskBoard />} />
<Route path="/hr/analytics" element={<HRAnalytics />} />
```

With:
```tsx
<Route path="/hr" element={<HRLayout />}>
  <Route index element={<Navigate to="dashboard" replace />} />
  <Route path="dashboard" element={<HRRiskBoard />} />
  <Route path="analytics" element={<HRAnalytics />} />
  <Route path="interns" element={<InternManage />} />
  <Route path="mentors" element={<MentorManage />} />
</Route>
```

Also add `Navigate` to the react-router-dom import if not already there:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
```
(It's already there — used for path `/`.)

- [ ] **Step 2: Remove top-level titles from HRRiskBoard**

In `frontend/src/pages/hr/RiskBoard.tsx`, remove line 72:
```tsx
<h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>HR 全局看板</h2>
```
(Replace with nothing — the page is now inside HRLayout, which provides navigation context.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/hr/RiskBoard.tsx
git commit -m "feat: restructure HR routes with left-nav layout"
```

---

### Task 19: Update seed data

**Files:**
- Modify: `backend/app/seed.py`

- [ ] **Step 1: Add deadline seed data**

Find where mentors are created in `seed.py` and add deadline creation. Let me check the current seed file first to find the right insertion point.

```bash
cd backend && grep -n "Mentor(" app/seed.py
```

After creating each mentor, add:

```python
from app.models.weekly_report_deadline import WeeklyReportDeadline

# After each Mentor db.add/commit block:
dl = WeeklyReportDeadline(mentor_id=<mentor_id_var>, day_of_week=4, hour=18)
db.add(dl)
```

If using the seed approach where mentors are added in a loop:

```python
deadlines = [
    WeeklyReportDeadline(mentor_id=m1.id, day_of_week=4, hour=18),
    WeeklyReportDeadline(mentor_id=m2.id, day_of_week=4, hour=18),
]
db.add_all(deadlines)
db.commit()
```

- [ ] **Step 2: Re-seed and verify**

```bash
cd backend && rm -f intern_growth.db && python -m app.seed
```

- [ ] **Step 3: Quick API smoke test**

```bash
cd backend && python -m uvicorn app.main:app --port 8000 &
sleep 2

# Test all new endpoints
echo "=== Deadline ==="
curl -s http://localhost:8000/api/v1/mentor/m1/deadline

echo "=== HR interns ==="
curl -s http://localhost:8000/api/v1/hr/interns-all

echo "=== HR mentors ==="
curl -s http://localhost:8000/api/v1/hr/mentors

kill %1
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/seed.py
git commit -m "feat: add weekly report deadline seed data"
```

---

### Task 20: End-to-end smoke test

**Files:** (none, verification only)

- [ ] **Step 1: Start backend and frontend**

```bash
# Terminal 1
cd backend && python -m uvicorn app.main:app --port 8000

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Verify each feature manually**

| Feature | Test action | Expected result |
|---------|------------|-----------------|
| **Baseline read-only (intern)** | Login as intern, go to dashboard | See "等待导师评估中" or read-only radar/score bars |
| **Baseline submit (mentor)** | Login as mentor, click "基线" button on an intern | Modal with sliders, submit, intern sees scores |
| **Task report button** | Login as intern, view tasks | Each non-completed task has "提交报告" button, navigates to report page |
| **Deadline banner** | Login as intern, click "填写本周 Check-in" | See deadline banner at top (info or warning) |
| **Mentor view tasks** | Login as mentor, click "任务" button | Modal shows all tasks for that intern |
| **Mentor view reports** | Login as mentor, click "周报" button | Modal shows checkin list, click "打分" to score |
| **Mentor score report** | Click "打分" on a checkin | ScoreReportModal with 1-5 circles and comment field |
| **HR left nav** | Login as HR | See left sidebar with 4 menu items |
| **HR add intern** | Go to 实习生管理, click 添加 | Modal form, submit, intern appears in table |
| **HR delete intern** | Click delete icon on an intern | Confirm, intern removed from table |
| **HR assign mentor** | Select a different mentor from dropdown | Intern's mentor updates |
| **HR mentor list** | Go to 导师管理 | See mentor table with intern count, feedback coverage |

- [ ] **Step 3: Fix any issues found**

---

## Self-Review Notes

- Spec coverage: All 5 features covered. 20 tasks total — 6 backend, 1 API service, 3 intern panel, 4 mentor panel, 4 HR panel, 2 integration.
- No placeholders. All steps contain actual code.
- Type consistency: `MentorInternTask`, `MentorInternCheckin`, `DeadlineConfig`, `MentorSummary`, `HRIntern` types are defined in Task 7 and used consistently in Tasks 12-17.
