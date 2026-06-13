# Intern Growth Station — Auth & Mentoring Enhancement Design

2026-06-13 | Status: Approved

## Overview

Add unified login, task report + approval workflow, upgraded weekly report with mentor scoring, mentor task assignment, AI review drafts, task templates, and intern growth timeline.

## Architecture Decision

**Option B — Unified Identity Layer**: Add a new `User` table as the single identity/authentication layer. `Intern` and `Mentor` become profile sub-tables linked by `user_id` FK.

Rationale: Current `Mentor` table conflates three roles (mentor/hr/recruiter) and lacks login credentials. Adding auth on top of this would be messy. The system is early-stage (SQLite, seed data), so the refactor cost is low now.

---

## Data Model Changes

### New: User

```
id              String(36) PK
username        String(50) unique, not null
hashed_password String(255) not null
role            Enum(intern, mentor, hr, recruiter) not null
is_active       Boolean default true
created_at      DateTime
```

### Changed: Mentor

- Remove `role_type` (delegated to User.role)
- Add `user_id` FK → User (unique, not null after migration)

### Changed: Intern

- Add `user_id` FK → User (unique, not null after migration)

### Changed: Task — add task lifecycle fields

```
description         Text              — task details from mentor
creator_id          FK → Mentor       — who assigned this task
report_md           Text nullable     — intern's completion report
report_submitted_at DateTime nullable
score               Integer 1-5 nullable  — mentor's score
annotation_json     JSON nullable     — [{line, text}, ...] inline annotations
approval_status     Enum(pending, approved, rejected) default pending
rejection_reason    Text nullable
```

### Changed: CheckIn — upgrade to weekly report + mood

```
weekly_report_md    Text nullable     — formal weekly report (MD)
mentor_score        Integer 1-5 nullable
mentor_comment      Text nullable
```

### New: TaskTemplate

```
id          String(36) PK
mentor_id   FK → Mentor
title       String(200)
description Text
type        Enum(learning, practice, output, retrospective)
priority    Enum(high, medium, low)
created_at  DateTime
```

### Relationships

```
User ──1:1── Intern (profile)
User ──1:1── Mentor (profile)
Intern ──1:N── Task
Intern ──1:N── CheckIn
Mentor ──1:N── Task (as creator)
Mentor ──1:N── Intern (as mentor)
Mentor ──1:N── TaskTemplate
```

---

## API Design

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | `{username, password}` → `{token, user}` |
| POST | `/api/v1/auth/register` | Admin creates account (HR only) |
| GET | `/api/v1/auth/me` | Current user from token |

### Task Assignment & Review

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/mentor/tasks` | Mentor creates task for intern: `{intern_id, title, description, type, priority, due_date}` |
| POST | `/api/v1/interns/{id}/tasks/{task_id}/report` | Intern submits MD report |
| POST | `/api/v1/mentor/tasks/{task_id}/review` | Mentor approves/rejects: `{approval, score, annotations, rejection_reason?}` |
| GET | `/api/v1/mentor/pending-reviews` | Pending review list for a mentor |

### CheckIn (Weekly Report) Extension

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/interns/{id}/checkins` | Extended: adds `weekly_report_md` field |
| POST | `/api/v1/mentor/checkins/{id}/score` | Mentor scores: `{score, comment}` |

### Task Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/mentor/task-templates` | List mentor's templates |
| POST | `/api/v1/mentor/task-templates` | Create template |
| POST | `/api/v1/mentor/task-templates/{id}/apply` | Create task from template: `{intern_id, due_date}` |
| DELETE | `/api/v1/mentor/task-templates/{id}` | Delete template |

### AI Review Drafts

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ai/review-draft/{task_id}` | Generate review draft for task report |
| POST | `/api/v1/ai/review-draft/checkin/{id}` | Generate review draft for weekly report |

### Growth Timeline

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/interns/{id}/growth-timeline` | Scores over time + milestones |

---

## Frontend Design

### New/Changed Routes

| Route | Role | Description |
|-------|------|-------------|
| `/login` | All | Login page, unified entry |
| `/intern` | Intern | Dashboard — add Growth Timeline tab |
| `/intern/tasks/:id/report` | Intern | Task report page with MD editor |
| `/intern/checkin/new` | Intern | Upgraded checkin with weekly report MD section |
| `/mentor` | Mentor | Dashboard — add pending review card, assign task entry |
| `/mentor/review/:taskId` | Mentor | Review panel (MD render + score + annotations) |
| `/mentor/templates` | Mentor | Task template management |
| `/mentor/assign` | Mentor | Assign task (create or pick from template) |

### New Components

- `LoginPage` — login form
- `MarkdownEditor` — MD edit/preview component
- `ReviewPanel` — mentor review panel (report rendering + scoring + per-line annotation)
- `ScoreBadge` — 1-5 score badge (reusable across pages)
- `GrowthTimeline` — radar chart + line chart for intern growth
- `TaskTemplatePicker` — template selector modal
- `AuthGuard` — route guard, redirects to `/login` if not authenticated

### Auth State

- Extend `RoleContext` to store token + username, persist across refresh
- API layer: add `Authorization: Bearer <token>` header to all requests
- Backend middleware: token validation + role-based permission check

---

## Security

- Password hashing: `passlib` bcrypt
- JWT token expiry: 24 hours
- API middleware: token verification + role authorization
- Markdown rendering: sanitize with DOMPurify (frontend) to prevent XSS

---

## Implementation Phases

| Phase | What | Priority |
|-------|------|----------|
| 1 | User model + login/page + auth middleware + migration | P0 |
| 2 | Task lifecycle (assign → submit report → review with score/annotations) | P0 |
| 3 | CheckIn upgrade (weekly_report_md + mentor scoring) | P0 |
| 4 | Task templates CRUD + apply | P2 |
| 5 | AI review draft endpoints | P1 |
| 6 | Growth timeline endpoint + frontend | P2 |
