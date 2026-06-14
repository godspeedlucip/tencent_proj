# File Upload for Task Submissions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let interns attach one image/PDF file (≤5MB) when submitting task reports or check-ins, via backend intermediary upload to Alibaba Cloud OSS, with download available to mentors.

**Architecture:** Backend adds `oss2` SDK, a new `/upload` endpoint, and two columns per model (`attachment_url`, `attachment_name`). Frontend adds Ant Design `<Upload>` with manual upload in CheckIn and TaskReport forms, plus a download card in the mentor TaskReview page. Existing API responses that return task/checkin data are updated to include attachment fields.

**Tech Stack:** Python FastAPI + oss2 SDK, React + Ant Design 5 Upload, Alibaba Cloud OSS public bucket

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/requirements.txt` | Modify | Add `oss2` |
| `backend/app/services/oss_service.py` | Create | OSS upload helper (`upload_file`) |
| `backend/app/api/upload.py` | Create | `POST /upload` endpoint |
| `backend/app/main.py` | Modify | Register upload router |
| `backend/app/models/task.py` | Modify | Add `attachment_url`, `attachment_name` |
| `backend/app/models/checkin.py` | Modify | Add `attachment_url`, `attachment_name` |
| `backend/app/api/interns.py` | Modify | Update request models + response serialization |
| `backend/app/services/intern_service.py` | Modify | Persist attachment fields in `submit_checkin`, `submit_task_report`, `get_intern` |
| `backend/app/services/mentor_service.py` | Modify | Include attachment fields in `get_pending_reviews` |
| `backend/app/api/mentors.py` | Modify | Include attachment fields in checkin + task responses |
| `frontend/src/services/api.ts` | Modify | Add `upload()` method + update `submitTaskReport` |
| `frontend/src/types/index.ts` | Modify | Add attachment fields to Task and CheckIn interfaces |
| `frontend/src/pages/intern/CheckIn.tsx` | Modify | Add Upload component |
| `frontend/src/pages/intern/TaskReport.tsx` | Modify | Add Upload component |
| `frontend/src/pages/mentor/TaskReview.tsx` | Modify | Add attachment download card |

---

### Task 1: Add oss2 dependency

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add oss2 to requirements.txt**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
alembic==1.14.0
pydantic==2.10.3
openai==1.57.0
python-dotenv==1.0.1
httpx==0.28.1
bcrypt==4.2.1
PyJWT==2.10.1
oss2==2.19.0
```

- [ ] **Step 2: Install the dependency**

Run: `pip install oss2==2.19.0`
Expected: Successfully installed oss2

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: add oss2 SDK for Alibaba Cloud OSS upload"
```

---

### Task 2: Create OSS upload service

**Files:**
- Create: `backend/app/services/oss_service.py`

- [ ] **Step 1: Write oss_service.py**

```python
import os
import uuid
import oss2


def _get_bucket():
    auth = oss2.Auth(
        os.environ["OSS_ACCESS_KEY_ID"],
        os.environ["OSS_ACCESS_KEY_SECRET"],
    )
    return oss2.Bucket(auth, os.environ["OSS_ENDPOINT"], os.environ["OSS_BUCKET"])


def upload_file(file_content: bytes, original_filename: str, content_type: str) -> tuple[str, str]:
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    object_name = f"uploads/{uuid.uuid4()}.{ext}"
    bucket = _get_bucket()
    bucket.put_object(object_name, file_content, headers={"Content-Type": content_type})
    url = f"https://{os.environ['OSS_BUCKET']}.{os.environ['OSS_ENDPOINT']}/{object_name}"
    return url, original_filename
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/oss_service.py
git commit -m "feat: add OSS upload service utility"
```

---

### Task 3: Create upload API endpoint

**Files:**
- Create: `backend/app/api/upload.py`

- [ ] **Step 1: Write upload.py**

```python
from fastapi import APIRouter, HTTPException, UploadFile, File

router = APIRouter()

ALLOWED_TYPES = {
    "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"
}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("")
async def upload_file_endpoint(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "不支持的文件类型，仅允许 JPG/PNG/GIF/WebP/PDF")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "文件超过 5MB 限制")

    from ..services.oss_service import upload_file
    url, name = upload_file(content, file.filename or "file", file.content_type)
    return {"url": url, "name": name}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/upload.py
git commit -m "feat: add POST /upload endpoint with type/size validation"
```

---

### Task 4: Register upload router in main.py

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add import and router registration**

Add the import line after the existing api imports (line 4):
```python
from .api import auth, interns, mentors, hr, recruiters, ai, notifications, upload
```

Remove the JWT middleware requirement for the upload route. Since the upload endpoint doesn't need auth (the file URL is just a temporary upload; auth is enforced when the checkin/report is actually submitted), we should make it accessible. But actually, the upload should require auth too - the intern must be logged in to upload. Let me check how the JWT middleware works...

The JWT middleware is applied globally via `app.add_middleware(JWTMiddleware)`. Let me check what paths it protects.

Actually, looking at the middleware more carefully:

Let me check if there's a way to skip JWT for specific routes. The safest approach is to keep JWT on upload (the intern must be logged in to upload files).

But the file is uploaded BEFORE the form is submitted - the upload happens when the user selects a file in the Upload component. So the JWT token should be in the request. Let me check the frontend `request` function - it sends `Authorization: Bearer <token>` header. But the upload call is a separate fetch with FormData... 

Looking at the api.ts `request` function, it always sets `Content-Type: application/json` and `Authorization: Bearer <token>`. For the upload endpoint, we need multipart/form-data instead. So the upload function in api.ts needs to NOT set Content-Type (let the browser set it with boundary). Let me handle this in the frontend task.

For now, let's register the router. The upload should use the JWT middleware just like other endpoints.

Add the router registration after the notifications line (line 31):
```python
app.include_router(upload.router, prefix="/api/v1/upload", tags=["Upload"])
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register upload router at /api/v1/upload"
```

---

### Task 5: Add attachment columns to Task model

**Files:**
- Modify: `backend/app/models/task.py`

- [ ] **Step 1: Add columns to Task class**

Add after the `rejection_reason` field (line 52), before `created_at`:
```python
    attachment_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/task.py
git commit -m "feat: add attachment columns to Task model"
```

---

### Task 6: Add attachment columns to CheckIn model

**Files:**
- Modify: `backend/app/models/checkin.py`

- [ ] **Step 1: Add columns to CheckIn class**

Add after the `next_plan` field (line 30), before `submitted_at`:
```python
    attachment_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/checkin.py
git commit -m "feat: add attachment columns to CheckIn model"
```

---

### Task 7: Update request models and service for checkin submission

**Files:**
- Modify: `backend/app/api/interns.py:108-127`
- Modify: `backend/app/services/intern_service.py:58-77`

- [ ] **Step 1: Update CheckInRequest in interns.py**

Add two optional fields to `CheckInRequest` (lines 108-113):
```python
class CheckInRequest(BaseModel):
    week: int
    progress: str
    blockers: str | None = None
    emotion_capsule: str
    next_plan: str | None = None
    attachment_url: str | None = None
    attachment_name: str | None = None
```

- [ ] **Step 2: Update submit_checkin in intern_service.py**

Add attachment fields to the CheckIn constructor (lines 63-72):
```python
        checkin = CheckIn(
            intern_id=intern_id,
            week=data["week"],
            progress=data["progress"],
            blockers=data.get("blockers"),
            emotion_capsule=emotion,
            mapped_stress_score=stress,
            weekly_report_md=data.get("weekly_report_md"),
            next_plan=data.get("next_plan"),
            attachment_url=data.get("attachment_url"),
            attachment_name=data.get("attachment_name"),
        )
```

- [ ] **Step 3: Run a quick smoke test**

Run: `cd backend && python -c "from app.models.checkin import CheckIn; print('OK')"`
Expected: OK (no import errors)

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/interns.py backend/app/services/intern_service.py
git commit -m "feat: accept attachment fields in checkin submission"
```

---

### Task 8: Update request model and service for task report submission

**Files:**
- Modify: `backend/app/api/interns.py:151-167`
- Modify: `backend/app/services/intern_service.py:180-206`

- [ ] **Step 1: Update TaskReportRequest in interns.py**

Expand `TaskReportRequest` (lines 151-152):
```python
class TaskReportRequest(BaseModel):
    report_md: str
    attachment_url: str | None = None
    attachment_name: str | None = None
```

- [ ] **Step 2: Update submit_task_report in intern_service.py**

Change the function signature and body to accept attachment fields (line 180):
```python
def submit_task_report(intern_id: str, task_id: str, report_md: str, attachment_url: str | None = None, attachment_name: str | None = None) -> dict:
```

And in the body (lines 186-188), add attachment assignment:
```python
        task.report_md = report_md
        task.report_submitted_at = datetime.utcnow()
        task.approval_status = ApprovalStatus.pending
        task.attachment_url = attachment_url
        task.attachment_name = attachment_name
```

- [ ] **Step 3: Update the API endpoint to pass attachment fields**

In `interns.py`, update the `submit_task_report` endpoint (lines 161-167):
```python
@router.post("/{intern_id}/tasks/{task_id}/report")
def submit_task_report(intern_id: str, task_id: str, req: TaskReportRequest):
    from ..services.intern_service import submit_task_report
    result = submit_task_report(intern_id, task_id, req.report_md, req.attachment_url, req.attachment_name)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result
```

- [ ] **Step 4: Run a quick smoke test**

Run: `cd backend && python -c "from app.api.interns import TaskReportRequest; r = TaskReportRequest(report_md='test'); print(r.attachment_url)"`
Expected: None

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/interns.py backend/app/services/intern_service.py
git commit -m "feat: accept attachment fields in task report submission"
```

---

### Task 9: Include attachment fields in all task API responses

**Files:**
- Modify: `backend/app/api/interns.py:59-73`
- Modify: `backend/app/services/mentor_service.py:147-166`
- Modify: `backend/app/api/mentors.py:220-230`

Three endpoints return task data and need `attachment_url` + `attachment_name` in their responses.

- [ ] **Step 1: Update GET /interns/{id}/tasks in interns.py**

In the response dict at line 68, add attachment fields:
```python
             "report_md": t.report_md,
             "attachment_url": t.attachment_url,
             "attachment_name": t.attachment_name,
             "score": t.score}
```

- [ ] **Step 2: Update get_pending_reviews in mentor_service.py**

In the response dict at lines 159-164, add attachment fields:
```python
                    "report_md": t.report_md,
                    "report_submitted_at": t.report_submitted_at.isoformat() if t.report_submitted_at else None,
                    "attachment_url": t.attachment_url,
                    "attachment_name": t.attachment_name,
```

- [ ] **Step 3: Update GET /{mentor_id}/interns/{intern_id}/tasks in mentors.py**

In the response dict at lines 222-227, add attachment fields:
```python
                "report_md": t.report_md,
                "attachment_url": t.attachment_url,
                "attachment_name": t.attachment_name,
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/interns.py backend/app/services/mentor_service.py backend/app/api/mentors.py
git commit -m "feat: include attachment fields in task API responses"
```

---

### Task 10: Include attachment fields in all checkin API responses

**Files:**
- Modify: `backend/app/api/interns.py:90-103`
- Modify: `backend/app/services/intern_service.py:45-52`
- Modify: `backend/app/api/mentors.py:245-255`

Three endpoints/helpers return checkin data and need attachment fields.

- [ ] **Step 1: Update GET /interns/{id}/checkins in interns.py**

In the response dict at lines 93-100, add attachment fields:
```python
                "weekly_report_md": c.weekly_report_md,
                "is_late": compute_is_late(c.submitted_at, mentor_id),
                "attachment_url": c.attachment_url,
                "attachment_name": c.attachment_name,
```

- [ ] **Step 2: Update get_intern in intern_service.py**

In the recent_checkins list at lines 46-52, add attachment fields:
```python
                    "next_plan": c.next_plan, "submitted_at": c.submitted_at.isoformat(),
                    "attachment_url": c.attachment_url,
                    "attachment_name": c.attachment_name,
```

- [ ] **Step 3: Update GET /{mentor_id}/interns/{intern_id}/checkins in mentors.py**

In the response dict at lines 247-253, add attachment fields:
```python
                "submitted_at": c.submitted_at.isoformat(),
                "is_late": compute_is_late(c.submitted_at, mentor_id),
                "attachment_url": c.attachment_url,
                "attachment_name": c.attachment_name,
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/interns.py backend/app/services/intern_service.py backend/app/api/mentors.py
git commit -m "feat: include attachment fields in checkin API responses"
```

---

### Task 11: Add upload method to frontend API service

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add upload function**

Add a new `upload` export. The `request` helper sets `Content-Type: application/json`, but file upload needs `multipart/form-data`. Write a separate fetch for this:

Add a helper function before the `upload` export (around line 32, after the `request` function):

```typescript
async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('role')
      sessionStorage.removeItem('user')
      window.location.href = `${BASE_PATH}/login`
      throw new Error('Session expired')
    }
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail || `HTTP ${res.status}`)
  }
  return res.json()
}
```

Then add to the existing export block — add a new `upload` object after the `ai` export block (after line 146):

```typescript
// Upload
export const upload = {
  file: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadRequest<{ url: string; name: string }>('/upload', formData)
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add file upload method to frontend API service"
```

---

### Task 12: Add attachment fields to TypeScript types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add attachment fields to Task interface**

In the `Task` interface (around line 41), add after `report_md`:
```typescript
  attachment_url?: string | null
  attachment_name?: string | null
```

- [ ] **Step 2: Add attachment fields to CheckIn interface**

In the `CheckIn` interface (around line 56), add after `has_feedback`:
```typescript
  attachment_url?: string | null
  attachment_name?: string | null
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add attachment fields to Task and CheckIn types"
```

---

### Task 14: Add file upload to CheckIn form

**Files:**
- Modify: `frontend/src/pages/intern/CheckIn.tsx`

- [ ] **Step 1: Add imports and state**

Add Upload import from antd and the upload service (lines 1-3):
```typescript
import { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, message, Alert, Upload } from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { interns } from '../../services/api'
import { upload } from '../../services/api'
```

Add attachment state (after `const [submitting, setSubmitting] = useState(false)` on line 14):
```typescript
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
```

- [ ] **Step 2: Update handleSubmit**

Modify `handleSubmit` (line 36) to include attachment fields:
```typescript
  async function handleSubmit(values: any) {
    setSubmitting(true)
    try {
      await interns.submitCheckin(internId, {
        ...values,
        emotion_capsule: emotion,
        week: currentWeek,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
      })
      message.success('Check-in 提交成功')
      onClose()
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 3: Add Upload component in JSX**

Add the upload area between the `weekly_report_md` Form.Item and the submit Button. Insert after line 76 (`</Form.Item>` for weekly_report_md), before line 78 (`<Button type="primary"...`):

```tsx
        <Form.Item label="附件（可选）">
          {attachment ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <span style={{ flex: 1, fontSize: 13 }}>{attachment.name}</span>
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => setAttachment(null)} />
            </div>
          ) : (
            <Upload
              beforeUpload={(file) => {
                const isAllowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'].includes(file.type)
                if (!isAllowed) { message.error('仅支持 JPG/PNG/GIF/WebP/PDF'); return Upload.LIST_IGNORE }
                if (file.size > 5 * 1024 * 1024) { message.error('文件不能超过 5MB'); return Upload.LIST_IGNORE }
                setUploading(true)
                upload.file(file)
                  .then((res) => setAttachment({ url: res.url, name: res.name }))
                  .catch((err) => message.error(err.message || '上传失败'))
                  .finally(() => setUploading(false))
                return false
              }}
              showUploadList={false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>选择文件</Button>
              <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>支持 JPG/PNG/PDF，最大 5MB</span>
            </Upload>
          )}
        </Form.Item>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/intern/CheckIn.tsx
git commit -m "feat: add file upload to CheckIn form"
```

---

### Task 15: Add file upload to TaskReport form

**Files:**
- Modify: `frontend/src/pages/intern/TaskReport.tsx`

- [ ] **Step 1: Add imports and state**

Update imports (lines 1-6):
```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, message, Spin, Alert, Upload } from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { interns } from '../../services/api'
import { upload } from '../../services/api'
import type { TaskDetail } from '../../types'
import MarkdownEditor from '../../components/MarkdownEditor'
```

Add attachment state (after `const [submitting, setSubmitting] = useState(false)` on line 14):
```typescript
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
```

When loading existing task data, also load existing attachment (add after line 23):
```typescript
      if (t && (t as any).attachment_url) {
        setAttachment({ url: (t as any).attachment_url, name: (t as any).attachment_name || '附件' })
      }
```

- [ ] **Step 2: Update handleSubmit**

Modify `handleSubmit` (lines 26-38) to pass attachment fields. The updated `submitTaskReport` in api.ts (changed in Step 3 below) now accepts optional attachment params:
```typescript
  const handleSubmit = async () => {
    if (!reportMd.trim()) { message.warning('请输入报告内容'); return }
    setSubmitting(true)
    try {
      await interns.submitTaskReport(user.id, taskId!, reportMd, attachment?.url, attachment?.name)
      message.success('报告已提交，等待导师审批')
      navigate('/intern')
    } catch (err: any) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 3: Update submitTaskReport in api.ts for optional attachment params**

In `frontend/src/services/api.ts`, change the `submitTaskReport` method (line 61-62):
```typescript
  submitTaskReport: (internId: string, taskId: string, reportMd: string, attachmentUrl?: string | null, attachmentName?: string | null) =>
    request<{ id: string; status: string }>(`/interns/${internId}/tasks/${taskId}/report`, {
      method: 'POST',
      body: JSON.stringify({
        report_md: reportMd,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
      }),
    }),
```

- [ ] **Step 4: Add Upload component in TaskReport JSX**

Insert the upload area between the MarkdownEditor and the button row. After line 54 (`</MarkdownEditor>`), before line 55 (`<div style={{ marginTop: 16, display: 'flex', gap: 12 }}>`):

```tsx
        <div style={{ marginTop: 16 }}>
          {attachment ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <span style={{ flex: 1, fontSize: 13 }}>{attachment.name}</span>
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => setAttachment(null)} />
            </div>
          ) : (
            <Upload
              beforeUpload={(file) => {
                const isAllowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'].includes(file.type)
                if (!isAllowed) { message.error('仅支持 JPG/PNG/GIF/WebP/PDF'); return Upload.LIST_IGNORE }
                if (file.size > 5 * 1024 * 1024) { message.error('文件不能超过 5MB'); return Upload.LIST_IGNORE }
                setUploading(true)
                upload.file(file)
                  .then((res) => setAttachment({ url: res.url, name: res.name }))
                  .catch((err) => message.error(err.message || '上传失败'))
                  .finally(() => setUploading(false))
                return false
              }}
              showUploadList={false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>选择文件</Button>
              <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>支持 JPG/PNG/PDF，最大 5MB</span>
            </Upload>
          )}
        </div>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/intern/TaskReport.tsx frontend/src/services/api.ts
git commit -m "feat: add file upload to TaskReport form"
```

---

### Task 16: Add attachment download to mentor TaskReview page

**Files:**
- Modify: `frontend/src/pages/mentor/TaskReview.tsx`

- [ ] **Step 1: Add attachment card after the report card**

Insert the attachment card after the report Card (after line 71 `</Card>`), before the AI draft Card:

```tsx
      {task.attachment_url && (
        <Card className="glass-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>附件</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 20 }}>{/\.pdf$/i.test(task.attachment_url) ? '📄' : '🖼️'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{task.attachment_name || '附件'}</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{/\.pdf$/i.test(task.attachment_url) ? 'PDF' : '图片'}</div>
            </div>
            <a href={task.attachment_url} target="_blank" rel="noopener noreferrer" download={task.attachment_name}>
              <Button type="primary" size="small">下载</Button>
            </a>
          </div>
        </Card>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/mentor/TaskReview.tsx
git commit -m "feat: add attachment download card to mentor TaskReview"
```

---

### Task 17: Integration verification

**Files:** None (verification only)

- [ ] **Step 1: Start backend and verify the upload endpoint**

Run: `cd backend && python -m uvicorn app.main:app --reload --port 8000`

Test the upload endpoint:
```bash
curl -X POST http://localhost:8000/api/v1/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf"
```

Expected: `{"url": "https://...", "name": "test.pdf"}`

- [ ] **Step 2: Verify checkin submission with attachment**

```bash
curl -X POST http://localhost:8000/api/v1/interns/<id>/checkins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"week":1,"progress":"test","emotion_capsule":"steady","attachment_url":"https://...","attachment_name":"test.pdf"}'
```

Expected: checkin created with attachment fields persisted

- [ ] **Step 3: Verify task report submission with attachment**

```bash
curl -X POST http://localhost:8000/api/v1/interns/<id>/tasks/<tid>/report \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"report_md":"done","attachment_url":"https://...","attachment_name":"test.pdf"}'
```

Expected: task report created with attachment fields persisted

- [ ] **Step 4: Verify frontend builds without errors**

Run: `cd frontend && npm run build`
Expected: Build completes without TypeScript errors

- [ ] **Step 5: Commit if any fixes were needed, then mark complete**

If no fixes needed, no commit required for this task.
