# Panel Enhancement Design

**Date:** 2026-06-13
**Status:** Approved

## Overview

Enhance intern, mentor, and HR panels to fix role-mismatch issues and add missing management capabilities.

### Decisions Summary

| # | Feature | Decision |
|---|---------|----------|
| 1 | Baseline assessment | Mentor fills it in mentor panel; intern sees read-only results |
| 2 | Task report entry | "Submit report" button on each task row in intern task list |
| 3 | Weekly report deadline | CheckIn = weekly report; mentor sets deadline (default Friday 18:00); late submissions flagged, not blocked |
| 4 | Mentor panel | Keep list layout; add action buttons per intern row (assign task, view tasks, view reports, score reports) via Modals |
| 5 | HR panel | Unified admin backend with left-side navigation (risk board, analytics, intern management, mentor management) |

---

## Architecture

```
Frontend (React)
├── Intern Panel
│   ├── Dashboard (overview + growth)
│   ├── Tasks (+ report button per row)
│   ├── CheckIn (+ deadline banner)
│   └── Baseline (read-only)
├── Mentor Panel
│   ├── Dashboard (intern list + action buttons)
│   ├── Modals: AssignTask, TaskList, WeeklyReport, ScoreReport, Baseline
│   └── Existing: Feedback, TalkingPoints
├── HR Panel
│   └── HRLayout (left nav)
│       ├── RiskBoard (existing)
│       ├── Analytics (existing)
│       ├── InternManage (new)
│       └── MentorManage (new)
└── Recruiter Panel (unchanged)

Backend (FastAPI + SQLite)
├── New table: weekly_report_deadlines
├── New endpoints: HR CRUD, mentor baseline, deadline management
└── Extended responses: is_late on checkins
```

---

## Data Model Changes

### New Table: `weekly_report_deadlines`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| mentor_id | FK → mentors.id | One deadline config per mentor |
| day_of_week | int | 0=Mon..6=Sun, default 4 (Friday) |
| hour | int | 0-23, default 18 |
| created_at | datetime | |
| updated_at | datetime | |

### Existing Tables (no schema changes needed)

- `checkins.weekly_report_md` — already exists, now treated as the primary weekly report content
- `checkins.mentor_score` / `checkins.mentor_comment` — already exist for mentor scoring
- `tasks.report_md` / `tasks.report_submitted_at` — already exist for task reports
- `interns.baseline_scores` / `interns.current_scores` — already exist

---

## API Changes

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/mentor/deadline` | Set/update weekly report deadline |
| `GET` | `/mentor/:id/deadline` | Get mentor's deadline config |
| `POST` | `/mentor/interns/:iid/baseline` | Mentor submits baseline assessment for intern |
| `GET` | `/mentor/:id/interns/:iid/tasks` | Mentor views one intern's tasks |
| `GET` | `/mentor/:id/interns/:iid/checkins` | Mentor views one intern's weekly reports |
| `POST` | `/hr/interns` | HR adds intern (name, role, dept, mentor_id) |
| `DELETE` | `/hr/interns/:id` | HR deletes intern (cascades) |
| `PUT` | `/hr/interns/:id/mentor` | HR assigns/reassigns mentor |
| `GET` | `/hr/mentors` | HR views mentor list with performance stats |

### Extended Responses

- `GET /interns/:id/checkins` — add `is_late: boolean` per checkin
- `GET /hr/interns` — already exists, used in InternManage

### Existing Reusable Endpoints

- `POST /mentor/tasks` — create task (already used by AssignTask)
- `POST /mentor/checkins/:cid/score` — score a checkin (already exists)
- `GET /mentor/:id/interns` — list mentor's interns (already used)

---

## Frontend Component Changes

### Intern Panel

| File | Change |
|------|--------|
| `Baseline.tsx` | Read-only display (radar or score bars); show mentor-assigned scores; "Awaiting mentor assessment" when null |
| `Tasks.tsx` | Add "Submit report" button per task row; hidden when completed/approved; navigates to `/intern/tasks/:id/report` |
| `CheckIn.tsx` | Add deadline banner at top ("Due: Friday 18:00" / "Late submission"); form unchanged |
| `Dashboard.tsx` | Remove auto-popup of Baseline when `baseline_scores === null`; show placeholder text instead |

### Mentor Panel

| File | Change |
|------|--------|
| `Dashboard.tsx` | Extend action column: assign task, view tasks, view reports, score report, baseline (when intern has no baseline) |
| **New** `BaselineModal.tsx` | Sliders for 4 dimensions (业务理解/需求分析/协作沟通/交付质量), 1-5 scale, submit |
| **New** `TaskListModal.tsx` | Table: task title, type, status, approval status; link to review if pending |
| **New** `WeeklyReportModal.tsx` | List of checkins with late tags; click to read full report |
| **New** `ScoreReportModal.tsx` | Read full weekly report markdown; score (1-5) + comment; submit |

### HR Panel

| File | Change |
|------|--------|
| **New** `HRLayout.tsx` | Left Sider + `<Outlet>`; menu: 风险看板, 数据分析, 实习生管理, 导师管理 |
| **New** `InternManage.tsx` | Table (name/role/dept/mentor/status/onboard_week) + Add button (Modal form) + Delete button (confirm) + mentor reassign dropdown |
| **New** `MentorManage.tsx` | Table (name/dept/intern_count/feedback_coverage/at_risk_count) |
| `HRRiskBoard.tsx` | Remove top-level title; works as child of HRLayout |
| `Analytics.tsx` | Unchanged, works as child of HRLayout |

### Route Changes (App.tsx)

```tsx
<Route path="/hr" element={<HRLayout />}>
  <Route index element={<Navigate to="dashboard" replace />} />
  <Route path="dashboard" element={<HRRiskBoard />} />
  <Route path="analytics" element={<HRAnalytics />} />
  <Route path="interns" element={<InternManage />} />
  <Route path="mentors" element={<MentorManage />} />
</Route>
```

---

## Error Handling & Edge Cases

### Frontend
- Network errors: handled by `api.ts` `request<T>` (401 → login redirect, others → `message.error`)
- Empty states: "暂无数据" / "等待导师评估中" / "暂无实习生，请先添加"
- Permission: intern cannot call baseline API (backend role check); mentor scoped to own interns; HR delete requires confirm modal
- Duplicate submission prevention: loading state on all submit buttons

### Backend
- `POST /hr/interns`: validate required fields, mentor existence
- `DELETE /hr/interns/:id`: cascade delete (tasks, checkins, feedbacks — already configured via `cascade="all, delete-orphan"`)
- `POST /mentor/interns/:iid/baseline`: validate role=mentor, 4 dimensions with values 1-5
- `POST /mentor/deadline`: validate day_of_week 0-6, hour 0-23
- `is_late` computation: compare checkin `submitted_at` against deadline derived from `weekly_report_deadlines`

---

## Implementation Order

1. **Backend** — new table + API endpoints + seed data
2. **Intern panel** — Baseline (read-only), Tasks (+report button), CheckIn (+deadline banner)
3. **Mentor panel** — 4 new Modals + extend action column
4. **HR panel** — HRLayout + InternManage + MentorManage
5. **Routes & integration** — App.tsx route restructure + end-to-end smoke test

---

## Test Scenarios

| Scenario | Verify |
|----------|--------|
| Mentor submits baseline → intern sees radar | Data consistency |
| Checkin after deadline → `is_late: true` | Timezone-correct comparison |
| HR deletes intern → mentor list refreshes | Cascade delete |
| Intern clicks "Submit report" → correct page | Route params |
| Mentor action buttons only show own interns | Permission scoping |
