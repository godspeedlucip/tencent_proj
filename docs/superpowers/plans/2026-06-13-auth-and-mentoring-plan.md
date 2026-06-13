# Auth & Mentoring Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unified login, task report/approval workflow, upgraded weekly report with mentor scoring, mentor task assignment, task templates, AI review drafts, and growth timeline.

**Architecture:** New `User` table as unified identity layer; `Intern`/`Mentor` become profile sub-tables. JWT-based auth middleware. All new features built on top of the clean identity model.

**Tech Stack:** FastAPI + SQLAlchemy + SQLite (backend), React + TypeScript + Ant Design (frontend), passlib + PyJWT (auth), DOMPurify (XSS protection)

---

## File Structure

```
# Backend — new files
backend/app/models/user.py                      # User model
backend/app/models/task_template.py             # TaskTemplate model
backend/app/api/auth.py                         # Login/register/me (rewrite)
backend/app/middleware/jwt.py                   # JWT auth middleware

# Backend — modified files
backend/app/models/__init__.py                  # Register User, TaskTemplate
backend/app/models/intern.py                    # Add user_id FK
backend/app/models/mentor.py                    # Remove role_type, add user_id FK
backend/app/models/task.py                      # Add description, report, approval fields
backend/app/models/checkin.py                   # Add weekly_report_md, mentor_score, mentor_comment
backend/app/main.py                             # Add JWT middleware
backend/app/api/interns.py                      # Add report submission endpoint
backend/app/api/mentors.py                      # Add task assignment, review, template, checkin scoring endpoints
backend/app/api/ai.py                           # Add review-draft endpoints
backend/app/services/intern_service.py          # Update submit_checkin for weekly_report_md
backend/app/services/mentor_service.py          # Add task creation, review, template, scoring functions
backend/app/services/ai_service.py              # Add generate_review_draft function
backend/app/seed.py                             # Add User records, update existing seed

# Frontend — new files
frontend/src/pages/Login.tsx                    # Login page
frontend/src/pages/intern/TaskReport.tsx        # Task report submission page
frontend/src/pages/intern/GrowthTimeline.tsx    # Growth timeline tab content
frontend/src/pages/mentor/TaskReview.tsx        # Task review panel
frontend/src/pages/mentor/AssignTask.tsx        # Assign task page
frontend/src/pages/mentor/TaskTemplates.tsx     # Template management page
frontend/src/components/AuthGuard.tsx           # Route guard
frontend/src/components/MarkdownEditor.tsx      # MD editor/preview
frontend/src/components/ReviewAnnotations.tsx   # Per-line annotation component
frontend/src/components/ScoreBadge.tsx          # 1-5 score badge
frontend/src/components/GrowthChart.tsx         # Line chart for growth data
frontend/src/components/TaskTemplatePicker.tsx  # Template selector modal

# Frontend — modified files
frontend/src/types/index.ts                     # Add new types
frontend/src/services/api.ts                    # Add new API functions, JWT header
frontend/src/contexts/RoleContext.tsx            # Add token/username persistence
frontend/src/App.tsx                            # Add /login route, AuthGuard, new routes
frontend/src/pages/intern/Dashboard.tsx         # Add Growth Timeline tab
frontend/src/pages/intern/CheckIn.tsx           # Add weekly report MD field
frontend/src/pages/mentor/Dashboard.tsx         # Add pending review card, assign button
```

---

## Phase 1: User Model + Login

### Task 1.1: Add passlib and PyJWT to backend

**Files:**
- Modify: `backend/requirements.txt` (create if not exists)

- [ ] **Step 1: Check requirements**

```bash
ls backend/requirements.txt 2>/dev/null && echo "EXISTS" || echo "Not found"
```

If not exists, create it. Add dependencies:

```txt
fastapi
uvicorn[standard]
sqlalchemy
passlib[bcrypt]
PyJWT
python-dotenv
httpx
openai
```

- [ ] **Step 2: Install dependencies**

```bash
cd backend && pip install passlib[bcrypt] PyJWT
```

### Task 1.2: Create User model

**Files:**
- Create: `backend/app/models/user.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/models/mentor.py`
- Modify: `backend/app/models/intern.py`

- [ ] **Step 1: Write User model**

```python
# backend/app/models/user.py
import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class RoleType(str, enum.Enum):
    intern = "intern"
    mentor = "mentor"
    hr = "hr"
    recruiter = "recruiter"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleType] = mapped_column(SAEnum(RoleType), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

- [ ] **Step 2: Update Mentor model — remove role_type, add user_id**

```python
# backend/app/models/mentor.py
# Replace the entire file:

import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class Mentor(Base):
    __tablename__ = "mentors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    user: Mapped["User"] = relationship()
    interns: Mapped[list["Intern"]] = relationship(back_populates="mentor")
    feedbacks: Mapped[list["MentorFeedback"]] = relationship(back_populates="mentor")
```

- [ ] **Step 3: Update Intern model — add user_id**

```python
# backend/app/models/intern.py
# Replace the entire file:

import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Enum as SAEnum, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base


class InternStatus(str, enum.Enum):
    normal = "normal"
    potential = "potential"
    watch = "watch"
    risk = "risk"


class Intern(Base):
    __tablename__ = "interns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    mentor_id: Mapped[str] = mapped_column(String(36), ForeignKey("mentors.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    onboard_week: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[InternStatus] = mapped_column(SAEnum(InternStatus), default=InternStatus.normal)
    baseline_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    current_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship()
    mentor: Mapped["Mentor"] = relationship(back_populates="interns")
    checkins: Mapped[list["CheckIn"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    feedbacks: Mapped[list["MentorFeedback"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    risk_signals: Mapped[list["RiskSignal"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
    fit_reports: Mapped[list["FitReport"]] = relationship(back_populates="intern", cascade="all, delete-orphan")
```

- [ ] **Step 4: Update __init__.py to register new models**

```python
# backend/app/models/__init__.py
# Replace the entire file:

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
from .checkin import CheckIn
from .mentor_feedback import MentorFeedback
from .risk_signal import RiskSignal
from .fit_report import FitReport
from .notification import Notification
```

- [ ] **Step 5: Delete old DB and verify models create clean**

```bash
cd backend && python -c "from app.models import Base, engine; Base.metadata.create_all(bind=engine); print('OK')"
```

Expected: `OK`

### Task 1.3: Create JWT middleware

**Files:**
- Create: `backend/app/middleware/__init__.py` (empty)
- Create: `backend/app/middleware/jwt.py`

- [ ] **Step 1: Write JWT middleware**

```python
# backend/app/middleware/__init__.py
```

```python
# backend/app/middleware/jwt.py
import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import jwt

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
ALGORITHM = "HS256"

PUBLIC_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/docs",
    "/openapi.json",
}


def create_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


class JWTMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/")
        if path in PUBLIC_PATHS or path.startswith("/docs") or path.startswith("/openapi"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid token")

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        request.state.user_id = payload.get("sub")
        request.state.role = payload.get("role")
        return await call_next(request)
```

- [ ] **Step 2: Wire middleware in main.py**

```python
# backend/app/main.py — add middleware after CORSMiddleware:
from .middleware.jwt import JWTMiddleware

app.add_middleware(JWTMiddleware)
```

### Task 1.4: Rewrite auth API with login/register/me

**Files:**
- Modify: `backend/app/api/auth.py`

- [ ] **Step 1: Write auth API**

```python
# backend/app/api/auth.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from passlib.context import CryptContext
from ..models import SessionLocal
from ..models.user import User, RoleType
from ..models.mentor import Mentor
from ..models.intern import Intern
from ..middleware.jwt import create_token

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str


@router.post("/login")
def login(req: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == req.username).first()
        if not user or not pwd_context.verify(req.password, user.hashed_password):
            raise HTTPException(401, "Invalid username or password")
        if not user.is_active:
            raise HTTPException(403, "Account is disabled")

        token = create_token(user.id, user.role.value)

        profile = {"id": user.id, "name": user.username}
        if user.role == RoleType.intern:
            intern = db.query(Intern).filter(Intern.user_id == user.id).first()
            if intern:
                profile = {"id": intern.id, "name": intern.name, "department": intern.department}
        else:
            mentor = db.query(Mentor).filter(Mentor.user_id == user.id).first()
            if mentor:
                profile = {"id": mentor.id, "name": mentor.name, "department": mentor.department}

        return {
            "token": token,
            "user": {"id": user.id, "username": user.username, "role": user.role.value, "profile": profile},
        }
    finally:
        db.close()


@router.post("/register")
def register(req: RegisterRequest):
    db = SessionLocal()
    try:
        if req.role not in ("intern", "mentor", "hr", "recruiter"):
            raise HTTPException(400, "Invalid role")

        existing = db.query(User).filter(User.username == req.username).first()
        if existing:
            raise HTTPException(409, "Username already exists")

        user = User(
            username=req.username,
            hashed_password=pwd_context.hash(req.password),
            role=RoleType(req.role),
        )
        db.add(user)
        db.flush()

        if req.role == "intern":
            # For intern registration, assign to first available mentor
            first_mentor = db.query(Mentor).first()
            db.add(Intern(name=req.username, role="实习生", department="待分配",
                         mentor_id=first_mentor.id if first_mentor else "seed-mentor",
                         user_id=user.id))
        else:
            db.add(Mentor(name=req.username, department="待分配", user_id=user.id))

        db.commit()
        return {"id": user.id, "username": user.username, "role": user.role.value}
    finally:
        db.close()


@router.get("/me")
def me(request: Request):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == request.state.user_id).first()
        if not user:
            raise HTTPException(404, "User not found")

        profile = {"id": user.id, "name": user.username}
        if user.role == RoleType.intern:
            intern = db.query(Intern).filter(Intern.user_id == user.id).first()
            if intern:
                profile = {"id": intern.id, "name": intern.name, "department": intern.department}
        else:
            mentor = db.query(Mentor).filter(Mentor.user_id == user.id).first()
            if mentor:
                profile = {"id": mentor.id, "name": mentor.name, "department": mentor.department}

        return {"id": user.id, "username": user.username, "role": user.role.value, "profile": profile}
    finally:
        db.close()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/user.py backend/app/models/__init__.py backend/app/models/mentor.py backend/app/models/intern.py backend/app/middleware/ backend/app/api/auth.py backend/app/main.py
git commit -m "feat: add User model, JWT middleware, and login API"
```

### Task 1.5: Update seed data

**Files:**
- Modify: `backend/app/seed.py`

- [ ] **Step 1: Read current seed**

Read `backend/app/seed.py` and rewrite with User record creation + passlib hashing. Seed accounts:

```
admin/intern1 — intern
admin/mentor1 — mentor
admin/hr1 — hr
admin/recruiter1 — recruiter
```

All passwords: `pass123`

- [ ] **Step 2: Write updated seed**

```python
# backend/app/seed.py
from passlib.context import CryptContext
from .models import Base, engine, SessionLocal
from .models.user import User, RoleType
from .models.mentor import Mentor
from .models.intern import Intern
from .models.task import Task, TaskType, TaskPriority, TaskStatus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(User).count() > 0:
        print("Data already seeded.")
        db.close()
        return

    # Create users
    mentor_user = User(id="user-mentor-1", username="mentor1", hashed_password=pwd_context.hash("pass123"), role=RoleType.mentor)
    intern_user = User(id="user-intern-1", username="intern1", hashed_password=pwd_context.hash("pass123"), role=RoleType.intern)
    hr_user = User(id="user-hr-1", username="hr1", hashed_password=pwd_context.hash("pass123"), role=RoleType.hr)
    recruiter_user = User(id="user-recruiter-1", username="recruiter1", hashed_password=pwd_context.hash("pass123"), role=RoleType.recruiter)
    db.add_all([mentor_user, intern_user, hr_user, recruiter_user])
    db.flush()

    # Create mentor profiles
    mentor = Mentor(id="mentor-1", name="张哥", department="产品部", user_id=mentor_user.id)
    hr = Mentor(id="hr-1", name="李姐", department="HR部", user_id=hr_user.id)
    recruiter = Mentor(id="recruiter-1", name="王招", department="招聘部", user_id=recruiter_user.id)
    db.add_all([mentor, hr, recruiter])
    db.flush()

    # Create intern
    intern = Intern(
        id="intern-1",
        name="小明",
        role="产品实习生",
        department="产品部",
        mentor_id=mentor.id,
        user_id=intern_user.id,
        onboard_week=3,
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
```

- [ ] **Step 3: Run seed**

```bash
cd backend && python -m app.seed
```

Expected: `Seed complete.`

- [ ] **Step 4: Commit**

```bash
git add backend/app/seed.py
git commit -m "feat: update seed data with User records and password hashing"
```

### Task 1.6: Frontend — update types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add new types**

Add at end of `frontend/src/types/index.ts`:

```typescript
export interface UserInfo {
  id: string
  username: string
  role: Role
  profile: {
    id: string
    name: string
    department: string
  }
}

export interface LoginResponse {
  token: string
  user: UserInfo
}

// Approval status for task reports
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

// Annotation on a report line
export interface Annotation {
  line: number
  text: string
}

// Extended Task (after Phase 2)
export interface TaskDetail extends Task {
  description: string | null
  creator_id: string
  report_md: string | null
  report_submitted_at: string | null
  score: number | null
  annotation_json: Annotation[] | null
  approval_status: ApprovalStatus
  rejection_reason: string | null
}

// Extended CheckIn (after Phase 3)
export interface CheckInDetail extends CheckIn {
  weekly_report_md: string | null
  mentor_score: number | null
  mentor_comment: string | null
}

// Task Template
export interface TaskTemplate {
  id: string
  mentor_id: string
  title: string
  description: string
  type: TaskType
  priority: TaskPriority
  created_at: string
}

// Growth timeline
export interface GrowthTimelinePoint {
  week: number
  task_scores_avg: number | null
  checkin_score: number | null
  radar_data: Record<string, number>
}

export interface GrowthMilestone {
  week: number
  event: string
}

export interface GrowthTimeline {
  scores_over_time: GrowthTimelinePoint[]
  milestones: GrowthMilestone[]
}
```

### Task 1.7: Frontend — Update RoleContext

**Files:**
- Modify: `frontend/src/contexts/RoleContext.tsx`

- [ ] **Step 1: Rewrite RoleContext with token persistence**

```typescript
// frontend/src/contexts/RoleContext.tsx
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Role, UserInfo } from '../types'

interface RoleContextType {
  role: Role | null
  user: { id: string; name: string; department: string } | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: UserInfo) => void
  logout: () => void
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem('role') as Role) || null)
  const [user, setUser] = useState<{ id: string; name: string; department: string } | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback((newToken: string, newUser: UserInfo) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('role', newUser.role)
    localStorage.setItem('user', JSON.stringify(newUser.profile))
    setToken(newToken)
    setRole(newUser.role)
    setUser(newUser.profile)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    setToken(null)
    setRole(null)
    setUser(null)
  }, [])

  return (
    <RoleContext.Provider value={{ role, user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
```

### Task 1.8: Frontend — Update API service with JWT

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Update request function to use JWT**

```typescript
// Replace the request function in frontend/src/services/api.ts

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('user')
      window.location.href = '/login'
      throw new Error('Session expired')
    }
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail || `HTTP ${res.status}`)
  }
  return res.json()
}
```

- [ ] **Step 2: Add auth login/me API functions**

```typescript
// Replace the auth block in frontend/src/services/api.ts

export const auth = {
  login: (username: string, password: string) =>
    request<import('../types').LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () =>
    request<import('../types').UserInfo>('/auth/me'),
}
```

- [ ] **Step 3: Remove setRole/x-role headers — no longer needed**

Remove the `currentRole`/`currentUserId`/`setRole` variables and references.

### Task 1.9: Frontend — LoginPage

**Files:**
- Create: `frontend/src/pages/Login.tsx`

- [ ] **Step 1: Write LoginPage**

```typescript
import { useState } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import { useRole } from '../contexts/RoleContext'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { login } = useRole()
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await auth.login(values.username, values.password)
      login(res.token, res.user)
      message.success(`欢迎，${res.user.profile.name}`)
      const homeMap: Record<string, string> = { intern: '/intern', mentor: '/mentor', hr: '/hr', recruiter: '/recruiter' }
      navigate(homeMap[res.user.role] || '/intern')
    } catch (err: any) {
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
          实习能量站
        </h2>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          测试账号：intern1 / mentor1 / hr1 / recruiter1 / 密码均 pass123
        </p>
      </Card>
    </div>
  )
}
```

### Task 1.10: Frontend — AuthGuard + App wiring

**Files:**
- Create: `frontend/src/components/AuthGuard.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write AuthGuard**

```typescript
// frontend/src/components/AuthGuard.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useRole } from '../contexts/RoleContext'

export default function AuthGuard() {
  const { isAuthenticated } = useRole()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
```

- [ ] **Step 2: Rewrite App.tsx**

```typescript
// frontend/src/App.tsx — replace entire file
import { ConfigProvider } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider, useRole } from './contexts/RoleContext'
import AuthGuard from './components/AuthGuard'
import LoginPage from './pages/Login'
import InternDashboard from './pages/intern/Dashboard'
import MentorDashboard from './pages/mentor/Dashboard'
import HRRiskBoard from './pages/hr/RiskBoard'
import HRAnalytics from './pages/hr/Analytics'
import RecruiterFitReportList from './pages/recruiter/FitReportList'
import RecruiterFitReportDetail from './pages/recruiter/FitReportDetail'

const antTheme = {
  token: {
    colorPrimary: '#f59e0b',
    borderRadius: 8,
    colorBgContainer: 'rgba(255,255,255,0.6)',
  },
}

function AppShell() {
  const { role, user, logout } = useRole()

  return (
    <ConfigProvider theme={antTheme}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav className="glass-nav" style={{ padding: '12px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="gradient-text" style={{ fontSize: '1.1rem', fontWeight: 800 }}>实习能量站</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#475569', fontSize: '0.85rem' }}>{user?.name} · {role}</span>
              <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '4px 12px' }} onClick={logout}>
                退出
              </button>
            </div>
          </div>
        </nav>
        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/intern" replace />} />
              <Route path="/intern" element={<InternDashboard user={user!} />} />
              <Route path="/mentor" element={<MentorDashboard user={user!} />} />
              <Route path="/hr" element={<HRRiskBoard />} />
              <Route path="/hr/analytics" element={<HRAnalytics />} />
              <Route path="/recruiter" element={<RecruiterFitReportList />} />
              <Route path="/recruiter/:id" element={<RecruiterFitReportDetail />} />
            </Routes>
          </div>
        </main>
      </div>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/*" element={<AppShell />} />
          </Route>
        </Routes>
      </RoleProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors (may show existing non-blocking issues)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/components/AuthGuard.tsx frontend/src/App.tsx frontend/src/contexts/RoleContext.tsx frontend/src/services/api.ts frontend/src/types/index.ts
git commit -m "feat: add login page, auth guard, JWT-based API requests"
```

---

## Phase 2: Task Lifecycle (Assign → Report → Review)

### Task 2.1: Update Task model

**Files:**
- Modify: `backend/app/models/task.py`

- [ ] **Step 1: Add new fields to Task**

```python
# backend/app/models/task.py — replace entire file

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
    approval_status: Mapped[ApprovalStatus] = mapped_column(SAEnum(ApprovalStatus), default=ApprovalStatus.pending)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    intern: Mapped["Intern"] = relationship(back_populates="tasks")
    creator: Mapped["Mentor"] = relationship(foreign_keys=[creator_id])
```

- [ ] **Step 2: Delete DB and recreate**

```bash
rm -f backend/intern_growth.db && cd backend && python -m app.seed
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/task.py
git commit -m "feat: extend Task model with report, approval, and annotation fields"
```

### Task 2.2: Mentor task assignment API

**Files:**
- Modify: `backend/app/services/mentor_service.py`
- Modify: `backend/app/api/mentors.py`

- [ ] **Step 1: Add create_task to mentor_service.py**

```python
# Add at end of backend/app/services/mentor_service.py

from ..models.task import Task, TaskType, TaskPriority, TaskStatus, ApprovalStatus
from datetime import date


def create_task(mentor_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        task = Task(
            intern_id=data["intern_id"],
            title=data["title"],
            description=data.get("description"),
            type=TaskType(data["type"]),
            priority=TaskPriority(data.get("priority", "medium")),
            due_date=date.fromisoformat(data["due_date"]) if data.get("due_date") else None,
            creator_id=mentor_id,
            approval_status=ApprovalStatus.pending,
        )
        db.add(task)
        db.commit()
        return {"id": task.id, "title": task.title, "status": task.status.value}
    finally:
        db.close()
```

- [ ] **Step 2: Add POST /mentor/tasks endpoint**

```python
# Add in backend/app/api/mentors.py after imports

class CreateTaskRequest(BaseModel):
    intern_id: str
    title: str
    description: str | None = None
    type: str
    priority: str = "medium"
    due_date: str | None = None


@router.post("/tasks")
def create_task_endpoint(req: CreateTaskRequest):
    from ..services.mentor_service import create_task
    return create_task("default", req.model_dump())
```

### Task 2.3: Intern submit report API

**Files:**
- Modify: `backend/app/api/interns.py`
- Modify: `backend/app/services/intern_service.py`

- [ ] **Step 1: Add submit_report to intern_service.py**

```python
# Add at end of backend/app/services/intern_service.py
from datetime import datetime


def submit_task_report(intern_id: str, task_id: str, report_md: str) -> dict:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id, Task.intern_id == intern_id).first()
        if not task:
            return {"error": "Task not found"}
        task.report_md = report_md
        task.report_submitted_at = datetime.utcnow()
        task.approval_status = ApprovalStatus.pending
        db.commit()
        return {"id": task.id, "status": "pending_review"}
    finally:
        db.close()
```

- [ ] **Step 2: Add endpoint**

```python
# Add in backend/app/api/interns.py

class TaskReportRequest(BaseModel):
    report_md: str


@router.post("/{intern_id}/tasks/{task_id}/report")
def submit_task_report(intern_id: str, task_id: str, req: TaskReportRequest):
    from ..services.intern_service import submit_task_report
    result = submit_task_report(intern_id, task_id, req.report_md)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result
```

### Task 2.4: Mentor review API

**Files:**
- Modify: `backend/app/services/mentor_service.py`
- Modify: `backend/app/api/mentors.py`

- [ ] **Step 1: Add review_task to mentor_service.py**

```python
# Add at end of backend/app/services/mentor_service.py

def review_task(task_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"error": "Task not found"}

        task.approval_status = ApprovalStatus(data["approval"])
        task.score = data.get("score")
        task.annotation_json = data.get("annotations")
        if data["approval"] == "rejected":
            task.rejection_reason = data.get("rejection_reason")
            task.status = TaskStatus.in_progress
        else:
            task.status = TaskStatus.completed

        db.commit()
        return {"id": task.id, "approval_status": task.approval_status.value}
    finally:
        db.close()


def get_pending_reviews(mentor_id: str) -> dict:
    db = SessionLocal()
    try:
        intern_ids = [i.id for i in db.query(Intern).filter(Intern.mentor_id == mentor_id).all()]
        tasks = (
            db.query(Task)
            .filter(Task.intern_id.in_(intern_ids), Task.approval_status == ApprovalStatus.pending, Task.report_md.isnot(None))
            .all()
        )
        return {
            "tasks": [
                {
                    "id": t.id, "title": t.title, "intern_id": t.intern_id,
                    "intern_name": t.intern.name if t.intern else "",
                    "report_md": t.report_md,
                    "report_submitted_at": t.report_submitted_at.isoformat() if t.report_submitted_at else None,
                }
                for t in tasks
            ]
        }
    finally:
        db.close()
```

- [ ] **Step 2: Add endpoints to mentors.py**

```python
# Add in backend/app/api/mentors.py

class ReviewTaskRequest(BaseModel):
    approval: str  # "approved" or "rejected"
    score: int | None = None
    annotations: list[dict] | None = None  # [{line, text}, ...]
    rejection_reason: str | None = None


@router.post("/tasks/{task_id}/review")
def review_task(task_id: str, req: ReviewTaskRequest):
    from ..services.mentor_service import review_task
    result = review_task(task_id, req.model_dump())
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


@router.get("/pending-reviews")
def pending_reviews(mentor_id: str):
    from ..services.mentor_service import get_pending_reviews
    return get_pending_reviews(mentor_id)
```

### Task 2.5: Frontend — Update API with task lifecycle functions

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add new API functions**

```typescript
// Add to the mentors export block in frontend/src/services/api.ts
  createTask: (data: { intern_id: string; title: string; description?: string; type: string; priority?: string; due_date?: string }) =>
    request<{ id: string; title: string; status: string }>('/mentor/tasks', { method: 'POST', body: JSON.stringify(data) }),
  getPendingReviews: (mentorId: string) =>
    request<{ tasks: Array<{ id: string; title: string; intern_id: string; intern_name: string; report_md: string | null; report_submitted_at: string | null }> }>(`/mentor/pending-reviews?mentor_id=${mentorId}`),
  reviewTask: (taskId: string, data: { approval: string; score?: number; annotations?: { line: number; text: string }[]; rejection_reason?: string }) =>
    request<{ id: string; approval_status: string }>(`/mentor/tasks/${taskId}/review`, { method: 'POST', body: JSON.stringify(data) }),
```

```typescript
// Add to the interns export block in frontend/src/services/api.ts
  submitTaskReport: (internId: string, taskId: string, reportMd: string) =>
    request<{ id: string; status: string }>(`/interns/${internId}/tasks/${taskId}/report`, { method: 'POST', body: JSON.stringify({ report_md: reportMd }) }),
```

### Task 2.6: Frontend — MarkdownEditor component

**Files:**
- Create: `frontend/src/components/MarkdownEditor.tsx`

- [ ] **Step 1: Write MarkdownEditor**

```typescript
import { useState } from 'react'
import { Tabs, Input } from 'antd'

// Simple MD → HTML renderer (inline; could swap for a proper library later)
function mdToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export default function MarkdownEditor({ value, onChange, placeholder, rows = 15 }: Props) {
  return (
    <Tabs
      items={[
        {
          key: 'edit',
          label: '编辑',
          children: (
            <Input.TextArea
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder || '请使用 Markdown 格式写作…'}
              rows={rows}
              style={{ fontFamily: 'monospace' }}
            />
          ),
        },
        {
          key: 'preview',
          label: '预览',
          children: (
            <div
              className="md-preview"
              style={{ minHeight: 200, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, lineHeight: 1.8, background: '#fafafa' }}
              dangerouslySetInnerHTML={{ __html: mdToHtml(value) || '<span style="color:#94a3b8">暂无内容</span>' }}
            />
          ),
        },
      ]}
    />
  )
}
```

### Task 2.7: Frontend — TaskReport page

**Files:**
- Create: `frontend/src/pages/intern/TaskReport.tsx`

- [ ] **Step 1: Write TaskReport page**

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, message, Spin, Alert } from 'antd'
import { interns } from '../../services/api'
import type { TaskDetail } from '../../types'
import MarkdownEditor from '../../components/MarkdownEditor'

export default function TaskReport() {
  const { id, taskId } = useParams<{ id: string; taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [reportMd, setReportMd] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Fetch task detail — reuse getTasks and find the one
    interns.getTasks(id!).then(r => {
      const t = r.tasks.find(t => t.id === taskId)
      setTask(t as TaskDetail)
      if ((t as TaskDetail).report_md) setReportMd((t as TaskDetail).report_md!)
    }).catch(() => { setTask(null) }).finally(() => setLoading(false))
  }, [id, taskId])

  const handleSubmit = async () => {
    if (!reportMd.trim()) { message.warning('请输入报告内容'); return }
    setSubmitting(true)
    try {
      await interns.submitTaskReport(id!, taskId!, reportMd)
      message.success('报告已提交，等待导师审批')
      navigate('/intern')
    } catch (err: any) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />
  if (!task) return <Alert message="任务未找到" type="warning" />

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>提交任务报告</h2>
      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <p><strong>任务：</strong>{task.title}</p>
        {task.description && <p style={{ color: '#475569', fontSize: '0.9rem' }}>{task.description}</p>}
      </Card>
      <Card className="glass-card">
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>完成报告 (Markdown)</h3>
        <MarkdownEditor value={reportMd} onChange={setReportMd} placeholder="## 完成情况\n\n## 关键收获\n\n## 遗留问题" />
        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={task.approval_status === 'approved'}>
            {task.approval_status === 'approved' ? '已通过' : task.approval_status === 'rejected' ? '重新提交' : '提交审批'}
          </Button>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </Card>
    </div>
  )
}
```

### Task 2.8: Frontend — ReviewAnnotations + ScoreBadge

**Files:**
- Create: `frontend/src/components/ScoreBadge.tsx`
- Create: `frontend/src/components/ReviewAnnotations.tsx`

- [ ] **Step 1: Write ScoreBadge**

```typescript
interface Props { score: number | null; size?: 'small' | 'default' }

export default function ScoreBadge({ score, size = 'default' }: Props) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
  const fontSize = size === 'small' ? '0.75rem' : '1rem'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size === 'small' ? 24 : 32, height: size === 'small' ? 24 : 32,
      borderRadius: '50%', backgroundColor: score ? colors[score - 1] : '#94a3b8',
      color: '#fff', fontWeight: 700, fontSize,
    }}>
      {score ?? '–'}
    </span>
  )
}
```

- [ ] **Step 2: Write ReviewAnnotations**

```typescript
import { Input, Button, Space } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Annotation } from '../types'

interface Props {
  annotations: Annotation[]
  onChange: (annotations: Annotation[]) => void
}

export default function ReviewAnnotations({ annotations, onChange }: Props) {
  const addAnnotation = () => {
    onChange([...annotations, { line: annotations.length + 1, text: '' }])
  }

  const updateAnnotation = (index: number, field: 'line' | 'text', value: string | number) => {
    const updated = [...annotations]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeAnnotation = (index: number) => {
    onChange(annotations.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>逐段批注</span>
        <Button size="small" icon={<PlusOutlined />} onClick={addAnnotation}>添加批注</Button>
      </div>
      {annotations.map((ann, i) => (
        <Space key={i} style={{ display: 'flex', marginBottom: 8 }} align="start">
          <Input
            size="small"
            type="number"
            min={1}
            value={ann.line}
            onChange={e => updateAnnotation(i, 'line', parseInt(e.target.value) || 1)}
            style={{ width: 60 }}
            placeholder="行号"
          />
          <Input
            size="small"
            value={ann.text}
            onChange={e => updateAnnotation(i, 'text', e.target.value)}
            style={{ width: 400 }}
            placeholder="批注内容"
          />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeAnnotation(i)} />
        </Space>
      ))}
    </div>
  )
}
```

### Task 2.9: Frontend — TaskReview page

**Files:**
- Create: `frontend/src/pages/mentor/TaskReview.tsx`

- [ ] **Step 1: Write TaskReview page**

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input, Select, message, Spin, Alert, Space } from 'antd'
import { mentors } from '../../services/api'
import type { Annotation } from '../../types'
import ScoreBadge from '../../components/ScoreBadge'
import ReviewAnnotations from '../../components/ReviewAnnotations'
import MarkdownEditor from '../../components/MarkdownEditor'

export default function TaskReview() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState<number | undefined>(undefined)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Fetch all pending reviews, find the matching one
    const mentorId = JSON.parse(localStorage.getItem('user') || '{}').id
    mentors.getPendingReviews(mentorId).then(r => {
      const t = r.tasks.find((t: any) => t.id === taskId)
      setTask(t || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [taskId])

  const handleAction = async (approval: 'approved' | 'rejected') => {
    setSubmitting(true)
    try {
      await mentors.reviewTask(taskId!, {
        approval,
        score,
        annotations: annotations.length > 0 ? annotations : undefined,
        rejection_reason: approval === 'rejected' ? rejectionReason : undefined,
      })
      message.success(approval === 'approved' ? '已通过' : '已驳回')
      navigate('/mentor')
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />
  if (!task) return <Alert message="任务未找到" type="warning" />

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>审批任务报告</h2>
      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <p><strong>实习生：</strong>{task.intern_name}</p>
        <p><strong>任务：</strong>{task.title}</p>
      </Card>

      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>实习生报告</h3>
        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', lineHeight: 1.8 }}>
          {task.report_md ? (
            <div dangerouslySetInnerHTML={{ __html: task.report_md.replace(/\n/g, '<br/>') }} />
          ) : (
            <span style={{ color: '#94a3b8' }}>无报告内容</span>
          )}
        </div>
      </Card>

      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>评分</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} onClick={() => setScore(n)} style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: score === n ? '#f59e0b' : '#e2e8f0',
              color: score === n ? '#fff' : '#475569',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
            }}>
              {n}
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <ReviewAnnotations annotations={annotations} onChange={setAnnotations} />
      </Card>

      <Card className="glass-card">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea
            rows={3}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="驳回理由（驳回时填写）"
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <Button type="primary" onClick={() => handleAction('approved')} loading={submitting}>
              通过
            </Button>
            <Button danger onClick={() => handleAction('rejected')} loading={submitting}>
              驳回
            </Button>
            <Button onClick={() => navigate(-1)}>返回</Button>
          </div>
        </Space>
      </Card>
    </div>
  )
}
```

### Task 2.10: Frontend — AssignTask page

**Files:**
- Create: `frontend/src/pages/mentor/AssignTask.tsx`

- [ ] **Step 1: Write AssignTask page**

```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, DatePicker, Button, message, Spin } from 'antd'
import { mentors } from '../../services/api'
import type { Intern } from '../../types'

export default function AssignTask() {
  const navigate = useNavigate()
  const [interns, setInterns] = useState<Intern[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const mentorId = JSON.parse(localStorage.getItem('user') || '{}').id
    mentors.getInterns(mentorId).then(r => {
      setInterns(r.interns)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const onFinish = async (values: any) => {
    setSubmitting(true)
    try {
      await mentors.createTask({
        intern_id: values.intern_id,
        title: values.title,
        description: values.description,
        type: values.type,
        priority: values.priority || 'medium',
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
      })
      message.success('任务已指派')
      navigate('/mentor')
    } catch (err: any) {
      message.error(err.message || '指派失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>指派任务</h2>
      <Card className="glass-card" style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="intern_id" label="选择实习生" rules={[{ required: true }]}>
            <Select placeholder="选择实习生">
              {interns.map(i => (
                <Select.Option key={i.id} value={i.id}>{i.name} · {i.role}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input placeholder="例如：完成首页 UI 优化方案" />
          </Form.Item>
          <Form.Item name="description" label="任务描述 (Markdown)">
            <Input.TextArea rows={6} placeholder="用 Markdown 写清楚任务要求和预期结果" />
          </Form.Item>
          <Form.Item name="type" label="任务类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="learning">学习</Select.Option>
              <Select.Option value="practice">实践</Select.Option>
              <Select.Option value="output">产出</Select.Option>
              <Select.Option value="retrospective">复盘</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="medium">
            <Select>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="low">低</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="due_date" label="截止日期">
            <DatePicker />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>确认指派</Button>
            <Button style={{ marginLeft: 12 }} onClick={() => navigate(-1)}>取消</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
```

### Task 2.11: Wire new routes in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add import and routes for task lifecycle pages**

Add imports:
```typescript
import TaskReport from './pages/intern/TaskReport'
import TaskReview from './pages/mentor/TaskReview'
import AssignTask from './pages/mentor/AssignTask'
```

Add routes inside `<Routes>` in AppShell:
```typescript
<Route path="/intern/tasks/:taskId/report" element={<TaskReport />} />
<Route path="/mentor/review/:taskId" element={<TaskReview />} />
<Route path="/mentor/assign" element={<AssignTask />} />
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/task.py backend/app/services/mentor_service.py backend/app/api/mentors.py backend/app/services/intern_service.py backend/app/api/interns.py
git add frontend/src/components/MarkdownEditor.tsx frontend/src/components/ScoreBadge.tsx frontend/src/components/ReviewAnnotations.tsx frontend/src/pages/intern/TaskReport.tsx frontend/src/pages/mentor/TaskReview.tsx frontend/src/pages/mentor/AssignTask.tsx frontend/src/App.tsx frontend/src/services/api.ts
git commit -m "feat: task lifecycle — assign, submit report, review with score/annotations"
```

---

## Phase 3: CheckIn Upgrade (Weekly Report + Scoring)

### Task 3.1: Update CheckIn model

**Files:**
- Modify: `backend/app/models/checkin.py`

- [ ] **Step 1: Add weekly_report fields**

```python
# Add after mapped_stress_score line in backend/app/models/checkin.py
weekly_report_md: Mapped[str | None] = mapped_column(Text, nullable=True)
mentor_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
mentor_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 2: Delete DB and reseed**

```bash
rm -f backend/intern_growth.db && cd backend && python -m app.seed
```

### Task 3.2: Update CheckIn service + API

**Files:**
- Modify: `backend/app/services/intern_service.py`
- Modify: `backend/app/api/interns.py`

- [ ] **Step 1: Update submit_checkin to accept weekly_report_md**

```python
# In submit_checkin function, change:
checkin = CheckIn(
    intern_id=intern_id,
    week=data["week"],
    progress=data["progress"],
    blockers=data.get("blockers"),
    emotion_capsule=emotion,
    mapped_stress_score=stress,
    next_plan=data.get("next_plan"),
    weekly_report_md=data.get("weekly_report_md"),  # NEW
)
```

### Task 3.3: Mentor score checkin API

**Files:**
- Modify: `backend/app/services/mentor_service.py`
- Modify: `backend/app/api/mentors.py`

- [ ] **Step 1: Add score_checkin to mentor_service.py**

```python
def score_checkin(checkin_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
        if not checkin:
            return {"error": "CheckIn not found"}
        checkin.mentor_score = data["score"]
        checkin.mentor_comment = data.get("comment")
        db.commit()
        return {"id": checkin.id, "score": checkin.mentor_score}
    finally:
        db.close()
```

- [ ] **Step 2: Add endpoint to mentors.py**

```python
class ScoreCheckinRequest(BaseModel):
    score: int
    comment: str | None = None


@router.post("/checkins/{checkin_id}/score")
def score_checkin(checkin_id: str, req: ScoreCheckinRequest):
    from ..services.mentor_service import score_checkin
    result = score_checkin(checkin_id, req.model_dump())
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result
```

### Task 3.4: Frontend — Update CheckIn form

**Files:**
- Modify: `frontend/src/pages/intern/CheckIn.tsx`

Add a `weekly_report_md` field:

```typescript
// Add after next_plan TextArea in the form
<Form.Item name="weekly_report_md" label="本周周报 (Markdown)">
  <Input.TextArea
    rows={10}
    placeholder="## 本周产出&#10;&#10;## 能力提升&#10;&#10;## 不足与反思&#10;&#10;## 下周计划"
  />
</Form.Item>
```

Update the submit payload to include `weekly_report_md` from form values.

### Task 3.5: Frontend — Update API for checkin week report

**Files:**
- Modify: `frontend/src/types/index.ts` (already has CheckInDetail)
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add scoreCheckin to mentors API**

```typescript
// Add to mentors export block
scoreCheckin: (checkinId: string, data: { score: number; comment?: string }) =>
  request<{ id: string; score: number }>(`/mentor/checkins/${checkinId}/score`, { method: 'POST', body: JSON.stringify(data) }),
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/checkin.py backend/app/services/intern_service.py backend/app/api/interns.py backend/app/services/mentor_service.py backend/app/api/mentors.py frontend/src/pages/intern/CheckIn.tsx frontend/src/services/api.ts
git commit -m "feat: upgrade CheckIn with weekly report MD and mentor scoring"
```

---

## Phase 4: Task Templates

### Task 4.1: TaskTemplate model

**Files:**
- Create: `backend/app/models/task_template.py`

- [ ] **Step 1: Write TaskTemplate model**

```python
# backend/app/models/task_template.py
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base
from .task import TaskType, TaskPriority


class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mentor_id: Mapped[str] = mapped_column(String(36), ForeignKey("mentors.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[TaskType] = mapped_column(SAEnum(TaskType), nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(SAEnum(TaskPriority), default=TaskPriority.medium)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

- [ ] **Step 2: Register in __init__.py**

```python
# Add after other imports in backend/app/models/__init__.py
from .task_template import TaskTemplate
```

### Task 4.2: Template CRUD + apply endpoints

**Files:**
- Modify: `backend/app/services/mentor_service.py`
- Modify: `backend/app/api/mentors.py`

- [ ] **Step 1: Add template functions to mentor_service.py**

```python
from ..models.task_template import TaskTemplate


def list_templates(mentor_id: str) -> dict:
    db = SessionLocal()
    try:
        templates = db.query(TaskTemplate).filter(TaskTemplate.mentor_id == mentor_id).all()
        return {"templates": [
            {"id": t.id, "title": t.title, "description": t.description, "type": t.type.value, "priority": t.priority.value, "created_at": t.created_at.isoformat()}
            for t in templates
        ]}
    finally:
        db.close()


def create_template(mentor_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        tmpl = TaskTemplate(
            mentor_id=mentor_id,
            title=data["title"],
            description=data.get("description"),
            type=TaskType(data["type"]),
            priority=TaskPriority(data.get("priority", "medium")),
        )
        db.add(tmpl)
        db.commit()
        return {"id": tmpl.id, "title": tmpl.title}
    finally:
        db.close()


def apply_template(mentor_id: str, template_id: str, data: dict) -> dict:
    db = SessionLocal()
    try:
        tmpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id, TaskTemplate.mentor_id == mentor_id).first()
        if not tmpl:
            return {"error": "Template not found"}
        due_date = date.fromisoformat(data["due_date"]) if data.get("due_date") else None
        task = Task(
            intern_id=data["intern_id"],
            title=tmpl.title,
            description=tmpl.description,
            type=tmpl.type,
            priority=tmpl.priority,
            due_date=due_date,
            creator_id=mentor_id,
            approval_status=ApprovalStatus.pending,
        )
        db.add(task)
        db.commit()
        return {"id": task.id, "title": task.title}
    finally:
        db.close()


def delete_template(mentor_id: str, template_id: str) -> dict:
    db = SessionLocal()
    try:
        tmpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id, TaskTemplate.mentor_id == mentor_id).first()
        if not tmpl:
            return {"error": "Template not found"}
        db.delete(tmpl)
        db.commit()
        return {"id": template_id, "deleted": True}
    finally:
        db.close()
```

- [ ] **Step 2: Add endpoints to mentors.py**

```python
class CreateTemplateRequest(BaseModel):
    title: str
    description: str | None = None
    type: str
    priority: str = "medium"


class ApplyTemplateRequest(BaseModel):
    intern_id: str
    due_date: str | None = None


@router.get("/task-templates")
def list_templates(mentor_id: str):
    from ..services.mentor_service import list_templates
    return list_templates(mentor_id)


@router.post("/task-templates")
def create_template(req: CreateTemplateRequest, mentor_id: str):
    from ..services.mentor_service import create_template
    return create_template(mentor_id, req.model_dump())


@router.post("/task-templates/{template_id}/apply")
def apply_template(template_id: str, req: ApplyTemplateRequest, mentor_id: str):
    from ..services.mentor_service import apply_template
    result = apply_template(mentor_id, template_id, req.model_dump())
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


@router.delete("/task-templates/{template_id}")
def delete_template(template_id: str, mentor_id: str):
    from ..services.mentor_service import delete_template
    result = delete_template(mentor_id, template_id)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result
```

### Task 4.3: Frontend — TaskTemplates page + TemplatePicker

**Files:**
- Create: `frontend/src/pages/mentor/TaskTemplates.tsx`
- Create: `frontend/src/components/TaskTemplatePicker.tsx`
- Modify: `frontend/src/pages/mentor/AssignTask.tsx` (add template picker)
- Modify: `frontend/src/App.tsx` (add route)

- [ ] **Step 1: Write TaskTemplates page**

```typescript
import { useState, useEffect } from 'react'
import { Card, Table, Button, Popconfirm, message, Spin, Alert } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { TaskTemplate } from '../../types'

export default function TaskTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const mentorId = JSON.parse(localStorage.getItem('user') || '{}').id

  useEffect(() => {
    mentors.getTemplates(mentorId).then(r => setTemplates(r.templates)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await mentors.deleteTemplate(mentorId, id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      message.success('已删除')
    } catch (err: any) { message.error(err.message) }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>任务模板</h2>
      <Card className="glass-card">
        <Table
          dataSource={templates}
          rowKey="id"
          columns={[
            { title: '标题', dataIndex: 'title', key: 'title' },
            { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
            { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
            { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180, render: (v: string) => new Date(v).toLocaleDateString() },
            {
              title: '操作', key: 'action', width: 80,
              render: (_: any, record: TaskTemplate) => (
                <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Write TaskTemplatePicker**

```typescript
import { useState, useEffect } from 'react'
import { Modal, List, Button, Spin, Empty } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { mentors } from '../services/api'
import type { TaskTemplate } from '../types'

interface Props {
  open: boolean
  onSelect: (template: TaskTemplate) => void
  onClose: () => void
  mentorId: string
}

export default function TaskTemplatePicker({ open, onSelect, onClose, mentorId }: Props) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      mentors.getTemplates(mentorId).then(r => setTemplates(r.templates)).catch(() => {}).finally(() => setLoading(false))
    }
  }, [open, mentorId])

  return (
    <Modal title="从模板创建" open={open} onCancel={onClose} footer={null}>
      {loading ? <Spin /> : templates.length === 0 ? <Empty description="暂无模板，请先创建" /> : (
        <List
          dataSource={templates}
          renderItem={t => (
            <List.Item actions={[<Button type="link" onClick={() => onSelect(t)}>使用</Button>]}>
              <List.Item.Meta avatar={<FileTextOutlined />} title={t.title} description={`${t.type} · ${t.priority}`} />
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
```

- [ ] **Step 3: Add route and API functions**

Add to `frontend/src/services/api.ts` — mentors export:
```typescript
  getTemplates: (mentorId: string) => request<{ templates: TaskTemplate[] }>(`/mentor/task-templates?mentor_id=${mentorId}`),
  deleteTemplate: (mentorId: string, templateId: string) => request<{ deleted: boolean }>(`/mentor/task-templates/${templateId}?mentor_id=${mentorId}`, { method: 'DELETE' }),
```

Add to `frontend/src/App.tsx`:
```typescript
import TaskTemplates from './pages/mentor/TaskTemplates'
// Add route:
<Route path="/mentor/templates" element={<TaskTemplates />} />
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/task_template.py backend/app/models/__init__.py backend/app/services/mentor_service.py backend/app/api/mentors.py frontend/src/pages/mentor/TaskTemplates.tsx frontend/src/components/TaskTemplatePicker.tsx frontend/src/App.tsx frontend/src/services/api.ts
git commit -m "feat: task template CRUD and apply from template"
```

---

## Phase 5: AI Review Drafts

### Task 5.1: Add generate_review_draft to ai_service.py

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Write generate_review_draft function**

```python
# Add at end of backend/app/services/ai_service.py

def generate_review_draft(content: str, content_type: str = "task_report", context: dict | None = None) -> dict:
    """Generate AI review draft for a task report or weekly report.

    Args:
        content: The MD report text
        content_type: "task_report" or "weekly_report"
        context: Optional dict with intern_name, task_title, week, etc.

    Returns:
        dict with keys: draft (str with highlights/suggestions), source, generated_at
    """
    client = _get_client()
    model = _get_model(for_report=False)

    system_lines = [
        "你是一位经验丰富的产品导师，正在审阅实习生的报告。",
        "请以JSON格式返回审阅草稿，包含以下字段：",
        '- highlights: 1-2条亮点（做得好的地方）',
        '- suggestions: 1-2条改进建议',
        '- suggested_score: 1-5的推荐评分',
        "只返回JSON，不要包含markdown代码块标记。",
    ]

    if context:
        if context.get("intern_name"):
            system_lines.insert(1, f"实习生：{context['intern_name']}")
        if context.get("task_title"):
            system_lines.insert(2, f"任务：{context['task_title']}")
        if context.get("week"):
            system_lines.insert(2, f"第{context['week']}周")

    system_prompt = "\n".join(system_lines)

    msg = f"请审阅以下{'周报' if content_type == 'weekly_report' else '任务报告'}：\n\n{content}"
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": msg},
    ]

    fallback = {"highlights": ["报告结构清晰"], "suggestions": ["可以补充更多数据支撑"], "suggested_score": 3}

    result, source = _ai_or_fallback(client, messages, max_tokens=250, model=model, fallback_data=fallback)

    if source == "fallback":
        draft = result if isinstance(result, dict) else fallback
    else:
        draft = result if isinstance(result, dict) else {"raw": result}

    return {"draft": draft, "source": source, "generated_at": _now_iso()}
```

### Task 5.2: Add AI review draft endpoints

**Files:**
- Modify: `backend/app/api/ai.py`

- [ ] **Step 1: Add endpoints**

```python
@router.post("/review-draft/{task_id}")
def task_review_draft(task_id: str):
    from ..models import SessionLocal
    from ..models.task import Task
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task or not task.report_md:
            raise HTTPException(404, "Task or report not found")
        context = {"task_title": task.title, "intern_name": task.intern.name if task.intern else ""}
        content = task.report_md
    finally:
        db.close()
    from ..services.ai_service import generate_review_draft
    return generate_review_draft(content, "task_report", context)


@router.post("/review-draft/checkin/{checkin_id}")
def checkin_review_draft(checkin_id: str):
    from ..models import SessionLocal
    from ..models.checkin import CheckIn
    db = SessionLocal()
    try:
        checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
        if not checkin or not checkin.weekly_report_md:
            raise HTTPException(404, "CheckIn or weekly report not found")
        context = {"intern_name": checkin.intern.name if checkin.intern else "", "week": str(checkin.week)}
        content = checkin.weekly_report_md
    finally:
        db.close()
    from ..services.ai_service import generate_review_draft
    return generate_review_draft(content, "weekly_report", context)
```

### Task 5.3: Frontend — Show AI draft in TaskReview page

**Files:**
- Modify: `frontend/src/pages/mentor/TaskReview.tsx`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add AI review draft API**

```typescript
// Add to ai export in frontend/src/services/api.ts
  getReviewDraft: (taskId: string) =>
    request<{ draft: { highlights: string[]; suggestions: string[]; suggested_score: number }; source: string }>(`/ai/review-draft/${taskId}`, { method: 'POST' }),
```

- [ ] **Step 2: Add AI draft section to TaskReview page**

```typescript
// Add state in TaskReview component:
const [aiDraft, setAiDraft] = useState<{ highlights: string[]; suggestions: string[]; suggested_score: number } | null>(null)

// Add useEffect to fetch AI draft:
useEffect(() => {
  if (taskId) {
    ai.getReviewDraft(taskId!).then(r => setAiDraft(r.draft)).catch(() => {})
  }
}, [taskId])

// Add UI section after the report card:
{aiDraft && (
  <Card className="glass-card" style={{ marginBottom: 16, border: '1px solid #f59e0b' }}>
    <h3 style={{ fontSize: '1rem', marginBottom: 8, color: '#f59e0b' }}>AI 审阅建议</h3>
    <p><strong>推荐评分：</strong>{aiDraft.suggested_score}/5</p>
    <p><strong>亮点：</strong></p>
    <ul>{aiDraft.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
    <p><strong>建议：</strong></p>
    <ul>{aiDraft.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
  </Card>
)}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/ai_service.py backend/app/api/ai.py frontend/src/pages/mentor/TaskReview.tsx frontend/src/services/api.ts
git commit -m "feat: AI review draft generation for task reports and weekly reports"
```

---

## Phase 6: Growth Timeline

### Task 6.1: Growth timeline API

**Files:**
- Modify: `backend/app/api/interns.py`
- Modify: `backend/app/services/intern_service.py`

- [ ] **Step 1: Add get_growth_timeline to intern_service.py**

```python
def get_growth_timeline(intern_id: str) -> dict:
    db = SessionLocal()
    try:
        checkins = (
            db.query(CheckIn)
            .filter(CheckIn.intern_id == intern_id)
            .order_by(CheckIn.week.asc())
            .all()
        )
        tasks = (
            db.query(Task)
            .filter(Task.intern_id == intern_id, Task.score.isnot(None))
            .all()
        )

        scores_by_week: dict[int, list[int]] = {}
        for t in tasks:
            if t.report_submitted_at and t.score:
                week = t.report_submitted_at.isocalendar()[1]
                scores_by_week.setdefault(week, []).append(t.score)

        points = [
            {
                "week": c.week,
                "task_scores_avg": round(sum(scores_by_week.get(c.week, [])) / len(scores_by_week.get(c.week, [1])), 1) if scores_by_week.get(c.week) else None,
                "checkin_score": c.mentor_score,
                "radar_data": c.intern.current_scores or {},
            }
            for c in checkins
        ]

        milestones = [
            {"week": c.week, "event": f"第{c.week}周完成Check-in"}
            for c in checkins if c.mentor_score and c.mentor_score >= 4
        ]

        return {"scores_over_time": points, "milestones": milestones}
    finally:
        db.close()
```

- [ ] **Step 2: Add endpoint to interns.py**

```python
@router.get("/{intern_id}/growth-timeline")
def growth_timeline(intern_id: str):
    from ..services.intern_service import get_growth_timeline
    return get_growth_timeline(intern_id)
```

### Task 6.2: Frontend — GrowthChart component

**Files:**
- Create: `frontend/src/components/GrowthChart.tsx`

- [ ] **Step 1: Write GrowthChart (line chart using recharts)**

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { GrowthTimelinePoint } from '../types'

interface Props {
  data: GrowthTimelinePoint[]
}

export default function GrowthChart({ data }: Props) {
  const chartData = data.map(p => ({
    week: `W${p.week}`,
    '任务均分': p.task_scores_avg,
    '周报评分': p.checkin_score,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis domain={[0, 5]} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="任务均分" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="周报评分" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Task 6.3: Frontend — GrowthTimeline tab in Intern Dashboard

**Files:**
- Create: `frontend/src/pages/intern/GrowthTimeline.tsx`
- Modify: `frontend/src/pages/intern/Dashboard.tsx`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add getGrowthTimeline to API**

```typescript
// Add to interns export
getGrowthTimeline: (id: string) => request<import('../types').GrowthTimeline>(`/interns/${id}/growth-timeline`),
```

- [ ] **Step 2: Write GrowthTimeline component**

```typescript
import { useState, useEffect } from 'react'
import { Spin, Timeline, Empty, Card } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { interns } from '../../services/api'
import type { GrowthTimeline as GrowthTimelineType, GrowthMilestone } from '../../types'
import GrowthChart from '../../components/GrowthChart'
import RadarChart from '../../components/RadarChart'

interface Props { internId: string; radarData?: Record<string, number> }

export default function GrowthTimeline({ internId, radarData }: Props) {
  const [data, setData] = useState<GrowthTimelineType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    interns.getGrowthTimeline(internId).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [internId])

  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />
  if (!data || data.scores_over_time.length === 0) return <Empty description="暂无成长数据，完成更多任务和 Check-in 后会显示" />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card className="glass-card" title="评分趋势">
        <GrowthChart data={data.scores_over_time} />
      </Card>
      <div>
        {radarData && (
          <Card className="glass-card" title="当前能力雷达" style={{ marginBottom: 16 }}>
            <RadarChart data={radarData} />
          </Card>
        )}
        <Card className="glass-card" title="里程碑">
          <Timeline items={data.milestones.map((m: GrowthMilestone) => ({
            color: 'green',
            dot: <TrophyOutlined style={{ fontSize: 16 }} />,
            children: <span style={{ fontSize: '0.85rem' }}>{m.event}</span>,
          }))} />
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add tab to InternDashboard**

```typescript
// In InternDashboard.tsx:
import { Tabs } from 'antd'
import GrowthTimeline from './GrowthTimeline'

// Wrap main content area in Tabs:
const tabItems = [
  { key: 'overview', label: '概览', children: <>...existing content...</> },
  { key: 'growth', label: '成长轨迹', children: <GrowthTimeline internId={user?.id || ''} radarData={intern?.current_scores ?? undefined} /> },
]

// Replace main content divs with <Tabs items={tabItems} />
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/intern_service.py backend/app/api/interns.py frontend/src/components/GrowthChart.tsx frontend/src/pages/intern/GrowthTimeline.tsx frontend/src/pages/intern/Dashboard.tsx frontend/src/services/api.ts
git commit -m "feat: growth timeline with score trends, radar chart, and milestones"
```

---

## Final Verification

- [ ] Start backend: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
- [ ] Start frontend: `cd frontend && npx vite --port 5173`
- [ ] Test login flow: intern1/pass123, mentor1/pass123
- [ ] Test mentor assign task → intern submit report → mentor review (approve/reject + score + annotations)
- [ ] Test CheckIn with weekly report → mentor score
- [ ] Test task templates CRUD + apply
- [ ] Test AI review draft (with/without LLM API key)
- [ ] Test growth timeline data rendering
