# File Upload for Task Submissions — Design Spec

## Overview

Add file upload capability so interns can attach files (images, PDFs) when submitting task reports and weekly check-ins. Files are uploaded via backend intermediary to Alibaba Cloud OSS.

## Constraints

- **File types**: Images (jpg, png, gif, webp) and PDF only
- **File size**: Max 5MB per file
- **Count**: 1 file per submission
- **Storage**: Backend intermediary → Alibaba Cloud OSS (`godspeedlucip` bucket)
- **Entry points**: TaskReport and Check-in (both intern submission flows)
- **Mentor access**: Direct OSS link download from review interfaces

## Database Changes

Add two columns to both `tasks` and `checkins` tables:

| Table | Column | Type | Nullable |
|---|---|---|---|
| tasks | attachment_url | TEXT | yes |
| tasks | attachment_name | TEXT | yes |
| checkins | attachment_url | TEXT | yes |
| checkins | attachment_name | TEXT | yes |

## API

### New: `POST /upload`

- Content-Type: `multipart/form-data`
- Request: single file in `file` field
- Validation:
  - MIME type must be `image/png`, `image/jpeg`, `image/gif`, `image/webp`, or `application/pdf`
  - File size must not exceed 5MB
- Behavior: Upload file to Alibaba Cloud OSS under `uploads/` prefix (UUID filename preserved extension), return the public OSS URL
- Response: `{ "url": "https://...oss.../uploads/uuid.pdf", "name": "original-name.pdf" }`
- Errors: 400 for invalid type, 413 for oversized

OSS credentials via environment variables (`OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_BUCKET`, `OSS_ENDPOINT`, `OSS_REGION`).

### Modified: `POST /interns/{id}/checkins`

`CheckInRequest` adds two optional fields:
- `attachment_url: str | None`
- `attachment_name: str | None`

Values are persisted directly to the checkin row.

### Modified: `POST /interns/{id}/tasks/{task_id}/report`

`TaskReportRequest` adds two optional fields:
- `attachment_url: str | None`
- `attachment_name: str | None`

Values are persisted directly to the task row.

### Download / access

No special download endpoint needed. OSS bucket is public-read; the stored URL is directly accessible. Mentor interfaces use `<a href={url} download>` for downloads.

## Frontend

### New: `services/api.ts` — `upload(file: File)`

```typescript
upload: (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request<{ url: string; name: string }>('/upload', {
    method: 'POST',
    headers: {},  // let browser set Content-Type for multipart
    body: formData,
  })
}
```

### Modified: `pages/intern/CheckIn.tsx`

- Add `<Upload>` component from Ant Design below `weekly_report_md` field, above submit button
- `beforeUpload` returns `false` to prevent auto-upload; instead calls `api.upload()` manually on file select
- Upload success: store `{ url, name }` in component state, display file card with delete option
- Submit: include `attachment_url` and `attachment_name` in the `handleSubmit` payload
- Upload area shows hint text: "支持 JPG/PNG/PDF，最大 5MB"

### Modified: `pages/intern/TaskReport.tsx`

Same pattern as CheckIn — `<Upload>` below markdown editor, above submit button. Same `beforeUpload` + manual upload + file card UI.

### Modified: `pages/mentor/TaskReview.tsx`

- After the report content area, conditionally render an attachment card when `task.attachment_url` is not empty
- Card shows: file icon (PDF vs image), file name, file size, download button
- Download uses `<a href={attachment_url} download={attachment_name}>`

### Modified: mentor Check-in detail view

The mentor interface that displays check-in details (if a dedicated component exists) should also render the attachment card. If check-in details are rendered inline in a list or modal, add the attachment display there.

## OSS Integration

Add `oss2` Python SDK to `requirements.txt`. Create a small utility module in `backend/app/services/oss_service.py`:

```python
import oss2
import os

def get_bucket():
    auth = oss2.Auth(os.environ['OSS_ACCESS_KEY_ID'], os.environ['OSS_ACCESS_KEY_SECRET'])
    return oss2.Bucket(auth, os.environ['OSS_ENDPOINT'], os.environ['OSS_BUCKET'])

def upload_file(file_content: bytes, object_name: str, content_type: str) -> str:
    bucket = get_bucket()
    bucket.put_object(object_name, file_content, headers={'Content-Type': content_type})
    return f"https://{os.environ['OSS_BUCKET']}.{os.environ['OSS_ENDPOINT']}/{object_name}"
```

## Files Changed

| File | Change | Description |
|---|---|---|
| `backend/app/api/upload.py` | new | Upload endpoint |
| `backend/app/services/oss_service.py` | new | OSS upload utility |
| `backend/app/api/interns.py` | edit | Add attachment fields to request models |
| `backend/app/models/task.py` | edit | Add attachment_url, attachment_name columns |
| `backend/app/models/checkin.py` | edit | Add attachment_url, attachment_name columns |
| `backend/requirements.txt` | edit | Add oss2 |
| `frontend/src/services/api.ts` | edit | Add upload method |
| `frontend/src/pages/intern/CheckIn.tsx` | edit | Add Upload component |
| `frontend/src/pages/intern/TaskReport.tsx` | edit | Add Upload component |
| `frontend/src/pages/mentor/TaskReview.tsx` | edit | Add attachment display + download |
