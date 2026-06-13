# HR Intern & Mentor Management Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable HR to add interns with auto-generated credentials, add mentors, and view intern task/check-in details.

**Architecture:** Backend extends `hr.py` API with credential generation, mentor creation, and an intern detail endpoint. Frontend adds a credentials-reveal modal, a mentor-add form, and a new intern detail page with tabs for tasks and check-ins. All follow existing FastAPI + React + Ant Design patterns.

**Tech Stack:** FastAPI, SQLAlchemy, bcrypt, React 18, TypeScript, Ant Design 5, Vite

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/app/api/hr.py` | All HR endpoints (intern CRUD, mentor CRUD, detail, analytics) |
| `frontend/src/pages/hr/InternManage.tsx` | Intern table, add form, credentials modal, "详情" button |
| `frontend/src/pages/hr/MentorManage.tsx` | Mentor table, add form, credentials modal |
| `frontend/src/pages/hr/InternDetail.tsx` | **New** — Detail page with task + check-in tabs |
| `frontend/src/services/api.ts` | API functions: `createMentor`, `getInternDetail` |
| `frontend/src/types/index.ts` | Response types |
| `frontend/src/App.tsx` | Route for `/hr/interns/:id` |

---

### Task 1: Backend — credential generation helper

**Files:**
- Modify: `backend/app/api/hr.py` (add imports and helper functions at top)

- [ ] **Step 1: Add imports and helpers to hr.py**

Add the following imports at the top of the file (below the existing imports):

```python
import random
import string
from ..models.user import User, RoleType
from .auth import hash_password
```

Add these two helper functions after the router definition (`router = APIRouter()`):

```python
def _generate_username(name: str) -> str:
    base = name.lower().replace(" ", "")
    suffix = str(random.randint(1000, 9999))
    return f"{base}{suffix}"


def _generate_password() -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=8))
```

- [ ] **Step 2: Verify imports resolve**

Run: `cd backend && python -c "from app.api.hr import _generate_username, _generate_password; print(_generate_username('小明'), _generate_password())"`
Expected: prints a username like `xiaoming3847` and an 8-char password

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/hr.py
git commit -m "feat: add credential generation helpers to hr module"
```

---

### Task 2: Backend — modify POST /hr/interns to create User account

**Files:**
- Modify: `backend/app/api/hr.py` (the `create_intern` function, lines 187-208)

- [ ] **Step 1: Replace `create_intern` function**

Replace the existing `create_intern` function (from the `@router.post("/interns")` decorator to the end of the function, currently lines 187-208) with:

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

        username = _generate_username(req.name)
        password = _generate_password()

        # Retry on username collision
        for _ in range(5):
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                break
            username = _generate_username(req.name)
        else:
            raise HTTPException(500, "Failed to generate unique username")

        user = User(
            username=username,
            hashed_password=hash_password(password),
            role=RoleType.intern,
        )
        db.add(user)
        db.flush()

        intern = Intern(
            name=req.name, role=req.role, department=req.department,
            mentor_id=req.mentor_id, user_id=user.id,
            onboard_week=1, status=InternStatus.normal,
        )
        db.add(intern)
        db.commit()
        db.refresh(intern)
        return {
            "id": intern.id, "name": intern.name, "role": intern.role,
            "department": intern.department, "mentor_id": intern.mentor_id,
            "mentor_name": intern.mentor.name if intern.mentor else "",
            "onboard_week": intern.onboard_week, "status": intern.status.value,
            "credentials": {"username": username, "password": password},
        }
    finally:
        db.close()
```

- [ ] **Step 2: Verify the endpoint works**

Start the backend server, then test with curl:

```bash
curl -s -X POST http://localhost:8000/api/v1/hr/interns \
  -H "Content-Type: application/json" \
  -d '{"name":"测试实习生","role":"测试岗","department":"技术部","mentor_id":"mentor-1"}' | python -m json.tool
```

Expected: response includes `"credentials": {"username": "...", "password": "..."}`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/hr.py
git commit -m "feat: auto-create User account when HR adds intern"
```

---

### Task 3: Backend — add POST /hr/mentors endpoint

**Files:**
- Modify: `backend/app/api/hr.py` (append new endpoint)

- [ ] **Step 1: Add `create_mentor` endpoint**

Add after the `list_mentors` function (after line ~264):

```python
class CreateMentorRequest(BaseModel):
    name: str
    department: str


@router.post("/mentors")
def create_mentor(req: CreateMentorRequest):
    db = SessionLocal()
    try:
        username = _generate_username(req.name)
        password = _generate_password()

        for _ in range(5):
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                break
            username = _generate_username(req.name)
        else:
            raise HTTPException(500, "Failed to generate unique username")

        user = User(
            username=username,
            hashed_password=hash_password(password),
            role=RoleType.mentor,
        )
        db.add(user)
        db.flush()

        mentor = Mentor(
            name=req.name,
            department=req.department,
            user_id=user.id,
        )
        db.add(mentor)
        db.commit()
        db.refresh(mentor)
        return {
            "id": mentor.id, "name": mentor.name, "department": mentor.department,
            "credentials": {"username": username, "password": password},
        }
    finally:
        db.close()
```

- [ ] **Step 2: Verify the endpoint works**

```bash
curl -s -X POST http://localhost:8000/api/v1/hr/mentors \
  -H "Content-Type: application/json" \
  -d '{"name":"李导师","department":"技术部"}' | python -m json.tool
```

Expected: response includes mentor id, name, department, and credentials

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/hr.py
git commit -m "feat: add POST /hr/mentors endpoint"
```

---

### Task 4: Backend — add GET /hr/interns/:id/detail endpoint

**Files:**
- Modify: `backend/app/api/hr.py` (append new endpoint)

- [ ] **Step 1: Add `get_intern_detail` endpoint**

Add after the `create_mentor` function:

```python
@router.get("/interns/{intern_id}/detail")
def get_intern_detail(intern_id: str):
    from ..models.checkin import CheckIn
    from ..services.mentor_service import compute_is_late

    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")

        tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
        checkins = db.query(CheckIn).filter(CheckIn.intern_id == intern_id).order_by(CheckIn.submitted_at.desc()).all()

        return {
            "intern": {
                "id": intern.id, "name": intern.name, "role": intern.role,
                "department": intern.department,
                "mentor_name": intern.mentor.name if intern.mentor else "",
                "mentor_id": intern.mentor_id,
                "onboard_week": intern.onboard_week, "status": intern.status.value,
            },
            "tasks": [
                {
                    "id": t.id, "title": t.title, "type": t.type.value,
                    "priority": t.priority.value, "status": t.status.value,
                    "score": t.score,
                    "approval_status": t.approval_status.value if t.approval_status else "pending",
                    "rejection_reason": t.rejection_reason,
                    "report_md": t.report_md,
                    "report_submitted_at": t.report_submitted_at.isoformat() if t.report_submitted_at else None,
                }
                for t in tasks
            ],
            "checkins": [
                {
                    "id": c.id, "week": c.week, "progress": c.progress,
                    "blockers": c.blockers, "emotion_capsule": c.emotion_capsule.value,
                    "next_plan": c.next_plan, "weekly_report_md": c.weekly_report_md,
                    "mentor_score": c.mentor_score, "mentor_comment": c.mentor_comment,
                    "submitted_at": c.submitted_at.isoformat(),
                    "is_late": compute_is_late(c.submitted_at, intern.mentor_id) if intern.mentor_id else False,
                }
                for c in checkins
            ],
        }
    finally:
        db.close()
```

- [ ] **Step 2: Verify the endpoint works**

```bash
curl -s http://localhost:8000/api/v1/hr/interns/intern-1/detail | python -m json.tool
```

Expected: response with intern, tasks[], and checkins[] arrays

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/hr.py
git commit -m "feat: add GET /hr/interns/:id/detail endpoint"
```

---

### Task 5: Frontend — add response types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add new types**

Append before the final line of the file:

```typescript
export interface Credentials {
  username: string
  password: string
}

export interface HRCreateInternResponse extends HRIntern {
  credentials: Credentials
}

export interface HRCreateMentorResponse {
  id: string
  name: string
  department: string
  credentials: Credentials
}

export interface HRInternDetail {
  intern: HRIntern
  tasks: MentorInternTask[]
  checkins: MentorInternCheckin[]
}
```

- [ ] **Step 2: Type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add HR types for credentials and intern detail"
```

---

### Task 6: Frontend — add API functions

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add `createMentor` and `getInternDetail` to the `hr` object**

In the `hr` export object (after `listMentors`, around line 120), add:

```typescript
  createMentor: (data: { name: string; department: string }) =>
    request<import('../types').HRCreateMentorResponse>('/hr/mentors', { method: 'POST', body: JSON.stringify(data) }),
  getInternDetail: (internId: string) =>
    request<import('../types').HRInternDetail>(`/hr/interns/${internId}/detail`),
```

Also update the return type of `createIntern` to use the new response type. Change line 111 from:

```typescript
    request<HRIntern>('/hr/interns', { method: 'POST', body: JSON.stringify(data) }),
```

to:

```typescript
    request<import('../types').HRCreateInternResponse>('/hr/interns', { method: 'POST', body: JSON.stringify(data) }),
```

- [ ] **Step 2: Verify the full `hr` object looks correct**

The full `hr` export should now be:

```typescript
export const hr = {
  getDashboard: () => request<HRDashboard>('/hr/dashboard'),
  getWeeklyReport: () => request<WeeklyReport>('/hr/weekly-report'),
  getAnalytics: () => request<AnalyticsData>('/hr/analytics'),
  setProxyMentor: (internId: string, proxyMentorId: string, reason: string) =>
    request<{ status: string }>(`/hr/interns/${internId}/proxy-mentor`, { method: 'POST', body: JSON.stringify({ proxy_mentor_id: proxyMentorId, reason }) }),
  reviewRisk: (riskId: string, reviewStatus: string, reviewNote: string) =>
    request<{ status: string }>(`/hr/risks/${riskId}/review`, { method: 'POST', body: JSON.stringify({ review_status: reviewStatus, review_note: reviewNote }) }),
  getMentorPerformance: () => request<MentorPerformance[]>('/hr/mentor-performance'),
  exportData: (format: string) => request<Blob>(`/hr/export?format=${format}`),
  createIntern: (data: { name: string; role: string; department: string; mentor_id: string }) =>
    request<import('../types').HRCreateInternResponse>('/hr/interns', { method: 'POST', body: JSON.stringify(data) }),
  deleteIntern: (internId: string) =>
    request<{ deleted: boolean }>(`/hr/interns/${internId}`, { method: 'DELETE' }),
  assignMentor: (internId: string, mentorId: string) =>
    request<{ intern_id: string; mentor_id: string }>(`/hr/interns/${internId}/mentor`, { method: 'PUT', body: JSON.stringify({ mentor_id: mentorId }) }),
  listAllInterns: () =>
    request<{ interns: HRIntern[] }>('/hr/interns-all'),
  listMentors: () =>
    request<{ mentors: MentorSummary[] }>('/hr/mentors'),
  createMentor: (data: { name: string; department: string }) =>
    request<import('../types').HRCreateMentorResponse>('/hr/mentors', { method: 'POST', body: JSON.stringify(data) }),
  getInternDetail: (internId: string) =>
    request<import('../types').HRInternDetail>(`/hr/interns/${internId}/detail`),
}
```

- [ ] **Step 3: Type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add createMentor and getInternDetail API functions"
```

---

### Task 7: Frontend — update InternManage with credentials modal and detail button

**Files:**
- Modify: `frontend/src/pages/hr/InternManage.tsx`

- [ ] **Step 1: Add imports and state for credentials modal**

Add `Typography` to the antd import (line 2):

```typescript
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Tag, Typography } from 'antd'
```

Add `useNavigate` import (line 1):

```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Tag, Typography } from 'antd'
```

Add state for credentials modal after the existing state declarations (after `const [addOpen, setAddOpen] = useState(false)`):

```typescript
  const [credOpen, setCredOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null)
  const navigate = useNavigate()
```

- [ ] **Step 2: Update `handleAdd` to show credentials modal**

Replace the `handleAdd` function (lines 34-44):

```typescript
  async function handleAdd(values: any) {
    try {
      const res = await hr.createIntern(values)
      message.success('实习生已添加')
      setAddOpen(false)
      form.resetFields()
      setCredentials(res.credentials)
      setCredOpen(true)
      loadData()
    } catch (err: any) {
      message.error(err.message || '添加失败')
    }
  }

  function handleCopyCred() {
    if (!credentials) return
    const text = `用户名: ${credentials.username}\n密码: ${credentials.password}`
    navigator.clipboard.writeText(text).then(() => message.success('已复制'))
  }
```

- [ ] **Step 3: Add "详情" button to the action column**

In the `cols` array, add a "详情" button before the mentor select in the action column render (replace the action column render, lines 80-96):

```typescript
    {
      title: '操作', key: 'action',
      render: (_: any, record: HRIntern) => (
        <Space>
          <Button size="small" type="link" onClick={() => navigate(`/hr/interns/${record.id}`)}>
            详情
          </Button>
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
```

- [ ] **Step 4: Add credentials modal JSX**

After the existing Add Modal (before `</>` at line 128), add:

```tsx
      <Modal
        title="实习生已添加"
        open={credOpen}
        onCancel={() => setCredOpen(false)}
        footer={[
          <Button key="copy" type="primary" onClick={handleCopyCred}>复制凭证</Button>,
          <Button key="close" onClick={() => setCredOpen(false)}>关闭</Button>,
        ]}
      >
        {credentials && (
          <div style={{ padding: '16px 0' }}>
            <Typography.Paragraph style={{ fontSize: '1.05rem', marginBottom: 8 }}>
              请将以下凭证发送给实习生：
            </Typography.Paragraph>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, fontFamily: 'monospace' }}>
              <div>用户名：<Typography.Text copyable strong>{credentials.username}</Typography.Text></div>
              <div style={{ marginTop: 4 }}>密码：<Typography.Text copyable strong>{credentials.password}</Typography.Text></div>
            </div>
          </div>
        )}
      </Modal>
```

- [ ] **Step 5: Verify the page compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/hr/InternManage.tsx
git commit -m "feat: add credentials modal and detail button to InternManage"
```

---

### Task 8: Frontend — update MentorManage with add form and credentials modal

**Files:**
- Modify: `frontend/src/pages/hr/MentorManage.tsx`

- [ ] **Step 1: Replace MentorManage.tsx entirely**

Replace the full file content:

```tsx
import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { MentorSummary } from '../../types'

export default function MentorManage() {
  const [mentors, setMentors] = useState<MentorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null)
  const [form] = Form.useForm()

  useEffect(() => { loadData() }, [])

  function loadData() {
    setLoading(true)
    hr.listMentors()
      .then(r => setMentors(r.mentors))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  async function handleAdd(values: { name: string; department: string }) {
    try {
      const res = await hr.createMentor(values)
      message.success('导师已添加')
      setAddOpen(false)
      form.resetFields()
      setCredentials(res.credentials)
      setCredOpen(true)
      loadData()
    } catch (err: any) {
      message.error(err.message || '添加失败')
    }
  }

  function handleCopyCred() {
    if (!credentials) return
    const text = `用户名: ${credentials.username}\n密码: ${credentials.password}`
    navigator.clipboard.writeText(text).then(() => message.success('已复制'))
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>导师管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加导师</Button>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={mentors} columns={cols} rowKey="id" loading={loading} pagination={false} size="middle" />
      </div>

      <Modal title="添加导师" open={addOpen} onCancel={() => setAddOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入导师姓名' }]}>
            <Input placeholder="如：张导师" />
          </Form.Item>
          <Form.Item name="department" label="部门" rules={[{ required: true, message: '请输入部门' }]}>
            <Input placeholder="如：技术研发部" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>确认添加</Button>
        </Form>
      </Modal>

      <Modal
        title="导师已添加"
        open={credOpen}
        onCancel={() => setCredOpen(false)}
        footer={[
          <Button key="copy" type="primary" onClick={handleCopyCred}>复制凭证</Button>,
          <Button key="close" onClick={() => setCredOpen(false)}>关闭</Button>,
        ]}
      >
        {credentials && (
          <div style={{ padding: '16px 0' }}>
            <Typography.Paragraph style={{ fontSize: '1.05rem', marginBottom: 8 }}>
              请将以下凭证发送给导师：
            </Typography.Paragraph>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, fontFamily: 'monospace' }}>
              <div>用户名：<Typography.Text copyable strong>{credentials.username}</Typography.Text></div>
              <div style={{ marginTop: 4 }}>密码：<Typography.Text copyable strong>{credentials.password}</Typography.Text></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/hr/MentorManage.tsx
git commit -m "feat: add mentor creation form and credentials modal"
```

---

### Task 9: Frontend — create InternDetail page

**Files:**
- Create: `frontend/src/pages/hr/InternDetail.tsx`

- [ ] **Step 1: Create InternDetail.tsx**

```tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Table, Tag, Spin, Alert, Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { HRInternDetail, MentorInternTask, MentorInternCheckin } from '../../types'

const typeLabels: Record<string, string> = { learning: '学习', practice: '实践', output: '产出', retrospective: '复盘' }
const statusLabels: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成', blocked: '阻塞' }
const approvalLabels: Record<string, string> = { pending: '待审', approved: '已通过', rejected: '已驳回' }
const approvalColors: Record<string, string> = { pending: 'default', approved: 'green', rejected: 'red' }
const statusColors: Record<string, string> = { normal: 'green', potential: 'blue', watch: 'orange', risk: 'red' }
const statusText: Record<string, string> = { normal: '正常', potential: '高潜', watch: '需关注', risk: '高风险' }
const emotionLabels: Record<string, string> = { energetic: '精力充沛', steady: '平稳', blocked: '受阻', overloaded: '超负荷', motivated: '有动力' }

export default function InternDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<HRInternDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    hr.getInternDetail(id)
      .then(setData)
      .catch((err: any) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />
  if (error) return <Alert message={error} type="error" showIcon />
  if (!data) return <Alert message="未找到实习生" type="warning" showIcon />

  const { intern, tasks, checkins } = data

  const taskCols = [
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
      title: '分数', dataIndex: 'score', key: 'score',
      render: (s: number | null) => s != null ? s : '-',
    },
    {
      title: '审批', dataIndex: 'approval_status', key: 'approval',
      render: (a: string) => <Tag color={approvalColors[a] || 'default'}>{approvalLabels[a] || a}</Tag>,
    },
    {
      title: '驳回原因', dataIndex: 'rejection_reason', key: 'rejection_reason',
      render: (r: string | null) => r ? <Typography.Text type="danger">{r}</Typography.Text> : '-',
    },
  ]

  const checkinCols = [
    {
      title: '周次', dataIndex: 'week', key: 'week',
      render: (w: number) => `第 ${w} 周`,
    },
    {
      title: '进度', dataIndex: 'progress', key: 'progress',
      render: (p: string) => <Typography.Text ellipsis style={{ maxWidth: 200 }}>{p}</Typography.Text>,
    },
    { title: '阻碍', dataIndex: 'blockers', key: 'blockers', render: (b: string | null) => b || '-' },
    {
      title: '情绪', dataIndex: 'emotion_capsule', key: 'emotion',
      render: (e: string) => emotionLabels[e] || e,
    },
    {
      title: '评分', dataIndex: 'mentor_score', key: 'score',
      render: (s: number | null) => s != null ? s : '-',
    },
    { title: '评语', dataIndex: 'mentor_comment', key: 'comment', render: (c: string | null) => c || '-' },
    {
      title: '提交时间', dataIndex: 'submitted_at', key: 'submitted_at',
      render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    },
    {
      title: '迟到', dataIndex: 'is_late', key: 'is_late',
      render: (l: boolean) => l ? <Tag color="red">迟到</Tag> : <Tag color="green">准时</Tag>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/interns')}>返回</Button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {intern.name} 的详情
        </h2>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div><Typography.Text type="secondary">岗位</Typography.Text> <strong>{intern.role}</strong></div>
          <div><Typography.Text type="secondary">部门</Typography.Text> <strong>{intern.department}</strong></div>
          <div><Typography.Text type="secondary">导师</Typography.Text> <strong>{intern.mentor_name}</strong></div>
          <div><Typography.Text type="secondary">入职周</Typography.Text> <strong>第 {intern.onboard_week} 周</strong></div>
          <div>
            <Typography.Text type="secondary">状态</Typography.Text>{' '}
            <Tag color={statusColors[intern.status] || 'default'}>{statusText[intern.status] || intern.status}</Tag>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <Tabs defaultActiveKey="tasks" items={[
          {
            key: 'tasks', label: `任务列表 (${tasks.length})`,
            children: tasks.length === 0
              ? <Alert message="暂无任务" type="info" />
              : <Table
                  dataSource={tasks} columns={taskCols} rowKey="id"
                  pagination={false} size="middle"
                  expandable={{
                    expandedRowRender: (t: MentorInternTask) => (
                      <div style={{ padding: '12px 24px' }}>
                        <Typography.Text strong>报告内容：</Typography.Text>
                        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#475569' }}>
                          {t.report_md || '暂无报告'}
                        </div>
                      </div>
                    ),
                    rowExpandable: (t: MentorInternTask) => !!t.report_md,
                  }}
                />,
          },
          {
            key: 'checkins', label: `Check-in 记录 (${checkins.length})`,
            children: checkins.length === 0
              ? <Alert message="暂无 Check-in" type="info" />
              : <Table
                  dataSource={checkins} columns={checkinCols} rowKey="id"
                  pagination={false} size="middle"
                  expandable={{
                    expandedRowRender: (c: MentorInternCheckin) => (
                      <div style={{ padding: '12px 24px' }}>
                        <Typography.Text strong>周报内容：</Typography.Text>
                        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#475569' }}>
                          {c.weekly_report_md || '暂无周报'}
                        </div>
                      </div>
                    ),
                    rowExpandable: (c: MentorInternCheckin) => !!c.weekly_report_md,
                  }}
                />,
          },
        ]} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/hr/InternDetail.tsx
git commit -m "feat: add HR InternDetail page with task and check-in tabs"
```

---

### Task 10: Frontend — add route in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add import**

Add after the MentorManage import (line 17):

```typescript
import InternDetail from './pages/hr/InternDetail'
```

- [ ] **Step 2: Add route inside HRLayout**

Add after `<Route path="mentors" element={<MentorManage />} />` (line 61):

```tsx
                <Route path="interns/:id" element={<InternDetail />} />
```

The HR routes block should now be:

```tsx
              <Route path="/hr" element={<HRLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<HRRiskBoard />} />
                <Route path="analytics" element={<HRAnalytics />} />
                <Route path="interns" element={<InternManage />} />
                <Route path="interns/:id" element={<InternDetail />} />
                <Route path="mentors" element={<MentorManage />} />
              </Route>
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add /hr/interns/:id route for InternDetail"
```

---

### Task 11: End-to-end verification

**Files:**
- None (manual testing)

- [ ] **Step 1: Start backend and test all three new/updated endpoints**

Start backend: `cd backend && uvicorn app.main:app --reload`

Test POST /hr/interns:
```bash
curl -s -X POST http://localhost:8000/api/v1/hr/interns \
  -H "Content-Type: application/json" \
  -d '{"name":"张测试","role":"测试开发","department":"质量部","mentor_id":"mentor-1"}'
```
Expected: response includes intern fields + credentials

Test POST /hr/mentors:
```bash
curl -s -X POST http://localhost:8000/api/v1/hr/mentors \
  -H "Content-Type: application/json" \
  -d '{"name":"赵导师","department":"后端部"}'
```
Expected: response includes mentor id, name, department + credentials

Test GET /hr/interns/:id/detail:
```bash
curl -s http://localhost:8000/api/v1/hr/interns/intern-1/detail
```
Expected: response with intern, tasks array, checkins array

- [ ] **Step 2: Verify frontend compiles and dev server starts**

```bash
cd frontend && npx vite --host 0.0.0.0
```

Navigate to:
1. `/hr/interns` — verify "添加实习生" flow shows credentials modal, "详情" button exists
2. Click "详情" on an intern — verify detail page loads with tasks and check-in tabs
3. `/hr/mentors` — verify "添加导师" button works and shows credentials

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification pass"
```
