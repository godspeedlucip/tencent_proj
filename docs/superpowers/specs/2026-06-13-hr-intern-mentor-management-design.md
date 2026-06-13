# HR Intern & Mentor Management Enhancement Design

**Date:** 2026-06-13
**Status:** approved

## Overview

Three enhancements to the HR module:

1. Auto-create User account (username + password) when HR adds an intern
2. HR can add mentors (with auto-generated credentials)
3. HR can view intern task completion and approval details plus check-in records

## Backend Changes

### 1. Modify `POST /hr/interns`

**File:** `backend/app/api/hr.py`

When HR creates an intern, also create a `User` record (role=intern) with auto-generated credentials.

- Username: lowercase form of name (remove spaces) + 4 random digits (e.g., `小明` → `xiaoming3847`). Retry on unique constraint.
- Password: 8 random alphanumeric characters.
- Intern.user_id links to the new User.
- Same generation logic applies to mentor creation.

Request body unchanged; the auto-generation is internal. Response adds `credentials`:

```json
{
  "id": "...",
  "name": "小明",
  "role": "...",
  "department": "...",
  "mentor_id": "...",
  "mentor_name": "...",
  "onboard_week": 1,
  "status": "normal",
  "credentials": { "username": "xm3847", "password": "aB3xK9mP" }
}
```

### 2. New `POST /hr/mentors`

**File:** `backend/app/api/hr.py`

```python
class CreateMentorRequest(BaseModel):
    name: str
    department: str

@router.post("/mentors")
def create_mentor(req: CreateMentorRequest):
    # Create User(role=mentor) with auto-generated username/password
    # Create Mentor(name, department, user_id)
    # Return mentor + credentials
```

Response:

```json
{
  "id": "...",
  "name": "张三",
  "department": "技术部",
  "credentials": { "username": "zs5831", "password": "xK3mP9aB" }
}
```

### 3. New `GET /hr/interns/{intern_id}/detail`

**File:** `backend/app/api/hr.py`

Returns the intern's profile, all tasks, and all check-ins in a single response:

```json
{
  "intern": { "id, name, role, department, mentor_name, status, onboard_week" },
  "tasks": [
    { "id, title, type, priority, status, score, approval_status,
      rejection_reason, report_md, report_submitted_at" }
  ],
  "checkins": [
    { "id, week, progress, blockers, emotion_capsule, next_plan,
      weekly_report_md, mentor_score, mentor_comment, submitted_at, is_late" }
  ]
}
```

## Frontend Changes

### 1. InternManage.tsx — Credentials modal

After successful intern creation, show a result modal displaying the generated credentials:

- Title: "实习生已添加"
- Content: username and password in readable format
- "复制凭证" button: copies both to clipboard
- Closing redirects back to the list (already reloaded)

No new form fields are added; the Add Intern modal stays simple (name, role, department, mentor).

### 2. MentorManage.tsx — Add mentor

- Add "添加导师" button next to the page title
- Modal form: name (required), department (required)
- On success: show credentials result modal (same pattern as intern)
- Table refreshes after close

### 3. New `InternDetail.tsx` — Intern detail page

**Route:** `/hr/interns/:id`

**Entry:** "详情" button added to the action column in InternManage table.

**Layout:**

- Header: intern name, back button, summary row (role, department, mentor, onboard_week, status tag)
- Ant Design Tabs with two tabs:

**Tab 1: 任务列表**
| 列 | 说明 |
|---|---|
| 标题 | Task title |
| 类型 | learning/practice/output/retrospective (Chinese label) |
| 状态 | not_started/in_progress/completed/blocked |
| 分数 | score (integer) |
| 审批 | approval_status: pending/approved/rejected |
| 驳回原因 | rejection_reason (if rejected) |

Expandable rows show the submitted report Markdown content.

**Tab 2: Check-in 记录**
| 列 | 说明 |
|---|---|
| 周次 | Week number |
| 进度 | progress summary |
| 阻碍 | blockers |
| 情绪 | emotion capsule |
| 评分 | mentor_score |
| 评语 | mentor_comment |
| 提交时间 | submitted_at |
| 是否迟到 | is_late indicator |

Expandable rows show the full weekly_report_md content.

**API call:** On mount, calls `GET /hr/interns/{id}/detail` once to load both tabs' data.

## Files Affected

| File | Change |
|---|---|
| `backend/app/api/hr.py` | Modify POST /interns, add POST /mentors, add GET /interns/:id/detail |
| `frontend/src/pages/hr/InternManage.tsx` | Credentials modal, "详情" button in action column |
| `frontend/src/pages/hr/MentorManage.tsx` | Add mentor button, form modal, credentials modal |
| `frontend/src/pages/hr/InternDetail.tsx` | **New file** — detail page with tabs |
| `frontend/src/services/api.ts` | Add `hr.createMentor()`, `hr.getInternDetail()` |
| `frontend/src/App.tsx` | Add route `/hr/interns/:id` |
| `frontend/src/types/index.ts` | Add response types as needed |

## No New Dependencies

All changes use existing stack: FastAPI, SQLAlchemy, React 18, Ant Design 5, TypeScript.
