# Enhancement Design: 实习能量站 Comprehensive Upgrade

**Date**: 2026-06-13
**Status**: Approved
**Approach**: A — Deep AI Integration + Smart Features

---

## Overview

Upgrade the 「实习能量站」Demo from a stub/fake-AI prototype to a genuinely AI-driven system with real LLM integration, in-app notifications, analytics dashboards, and mentor performance tracking. Fix all identified bugs and complete missing features from the original PRD/spec.

---

## Section 1: Real AI Pipeline

### 1.1 LLM Provider Configuration

Support OpenAI-compatible APIs via environment variables:

```
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.deepseek.com/v1  (or https://api.openai.com/v1)
LLM_MODEL=deepseek-chat                     (or gpt-4o-mini)
LLM_REPORT_MODEL=deepseek-reasoner          (for complex reports, optional)
```

Provider-agnostic: any OpenAI-compatible endpoint works.

### 1.2 Async AI Processing

Post-Check-in analysis must not block the HTTP response:

1. Intern submits Check-in → API returns `202 Accepted` + `{"status": "processing"}`
2. FastAPI `BackgroundTasks` launches AI analysis pipeline
3. Frontend polls `GET /api/ai/analysis-status/{checkin_id}` until `status: "done"`
4. Results cached on the Check-in record for subsequent reads

### 1.3 Context-Rich Prompts

Every AI call passes actual data, not just intern names:

| Function | Context Passed |
|----------|---------------|
| `generate_daily_tip` | Intern role, week, recent 3 checkins, task completion %, last mentor feedback |
| `generate_talking_points` | Intern tasks, last 3 checkins (progress+blockers), emotion trend, mentor feedback history |
| `analyze_checkin` (NEW) | Check-in text, historical checkins for trend, task completion data |
| `generate_weekly_report` | All interns summary stats, risk signal list, mentor feedback stats |
| `generate_fit_report` | Capability scores, task history, check-in summaries, mentor feedback tags |

### 1.4 Model Tiering

| Task | Model | Timeout | Fallback |
|------|-------|---------|----------|
| Daily Tip | Cheap (`LLM_MODEL`) | 3s | Role+week-aware pre-baked tips |
| Check-in Analysis | Cheap | 8s | Keyword extraction rules |
| Talking Points | Balanced (`LLM_MODEL`) | 5s | Status-aware template outlines |
| Fit Report | Balanced | 8s | Score-based tier assignment |
| HR Weekly Report | Best (`LLM_REPORT_MODEL` or `LLM_MODEL`) | 10s | Statistical summary + rules |

### 1.5 AI Output Metadata

Every AI response includes:

```json
{
  "data": { ... },
  "source": "ai" | "fallback",
  "confidence": 0.85,
  "model": "deepseek-chat",
  "generated_at": "2026-06-13T10:30:00Z",
  "processing_ms": 1200
}
```

### 1.6 New Function: analyze_checkin

```python
def analyze_checkin(checkin_text: str, intern_context: dict) -> dict:
    """
    Returns:
      - growth_keywords: list[str] (3-5 tags)
      - risk_signals: list[{type, severity, evidence}]
      - sentiment_summary: str (1-2 sentences)
      - suggested_actions: list[str] (for intern)
    """
```

Triggers after every Check-in submission. Results stored on the Check-in record. Risk signals auto-create `RiskSignal` rows if severity >= threshold.

---

## Section 2: Bug Fixes (P0 — Demo Blockers)

| # | Issue | File | Fix |
|---|-------|------|-----|
| B1 | Task completion rate hardcoded to `0.8` | `backend/app/api/interns.py:28` | Calculate from actual Task records |
| B2 | PrivacyModal shows every page load | `PrivacyModal.tsx:5` | Check `localStorage` key; only show on first visit |
| B3 | HR weekly report `risk_details` always `[]` | `hr_service.py:70` | Query actual RiskSignal records for current week |
| B4 | Intern list `last_emotion` always `null` | `interns.py:28` | Join latest Check-In emotion |
| B5 | `has_feedback` always `false` in checkin list | `interns.py:71` | Check MentorFeedback table |

## Section 3: Missing Features (P1 — Spec Compliance)

| # | Feature | Spec Ref | Implementation |
|---|---------|----------|---------------|
| F1 | Positive affirmation card + celebration animation | FR-006 | Detect trigger (2 weeks >90% OR "exceeds" rating), render confetti + AI-generated praise card on Dashboard |
| F2 | Risk signal review API | FR-015 | `POST /api/hr/risks/{id}/review` — update review_status + review_note |
| F3 | Risk detection integrated into flow | — | Call `detect_risk_signals()` after every Check-in submission; also on HR dashboard load |
| F4 | Mentor override enforcement | FR-011 | If mentor overrides AI recommendation, `override_reason` required; store in MentorFeedback |
| F5 | AIDailyTip as independent component | — | Extract from Dashboard inline; add loading/empty/error states |
| F6 | Loading skeleton states (T058) | — | Ant Design `<Skeleton>` on all list/data pages |
| F7 | Error/empty states (T059) | — | Ant Design `<Result>` or `<Empty>` on all data-dependent pages |

## Section 4: Notification Center (New Module)

### 4.1 Data Model

```python
class Notification(Base):
    __tablename__ = "notifications"
    id: str (UUID)
    recipient_role: str  # intern | mentor | hr
    recipient_id: str
    type: str  # deadline_reminder | mentor_nudge | risk_alert | positive_milestone | system
    title: str
    body: str
    priority: str  # high | medium | low
    read: bool
    action_link: str | None
    created_at: datetime
```

### 4.2 API

- `GET /api/notifications?role=X&user_id=Y` — list unread + recent
- `POST /api/notifications/{id}/read` — mark read
- `POST /api/notifications/read-all` — mark all read

### 4.3 UI

- Bell icon in App header with unread count badge
- Dropdown: last 10 notifications, "View All" link
- Full notifications page with read/unread filtering

### 4.4 Triggers (Auto-Create)

| Trigger | Recipient | Priority |
|---------|-----------|----------|
| Check-in deadline in 24h, not submitted | intern | medium |
| Mentor hasn't fed back 48h after Check-in | mentor | medium |
| New risk signal created (high) | hr | high |
| Intern hits milestone (2 weeks >90% completion) | intern | medium |
| Risk signal escalated (watch → risk) | hr | high |
| Mentor overrides AI >50% of time | hr | low |

---

## Section 5: Analytics Dashboard (New Module)

### 5.1 HR Sub-Pages

New tabbed layout within HR view:

1. **Risk Board** (existing — `RiskBoard.tsx`)
2. **Analytics** (new — `Analytics.tsx`)
3. **Weekly Report** (extracted from RiskBoard — `WeeklyReport.tsx`)

### 5.2 Analytics Charts

| Chart | Type | Data Source |
|-------|------|------------|
| Average capability growth curve | Line (multi-series: 4 dimensions) | Intern.current_scores over time |
| Emotion trend heatmap | Heatmap grid (week × intern) | CheckIn.emotion_capsule |
| Task completion by week | Stacked bar (completed/in-progress/blocked) | Task.status grouped by week |
| Risk signal timeline | Timeline/scatter | RiskSignal.created_at by intern |
| Mentor feedback coverage | Bar chart | MentorFeedback per mentor per week |

### 5.3 Export

- CSV: Intern list with metrics
- Implemented as a `GET /api/hr/export?format=csv` endpoint

### 5.4 Tech

Use Recharts (`recharts` npm package) — already listed as an option in the PRD tech suggestions, lightweight, React-native.

---

## Section 6: Mentor Performance Dashboard (New Module)

### 6.1 HR Sub-Page

New tab in HR view: "Mentor Performance"

### 6.2 Metrics Per Mentor

| Metric | Calculation |
|--------|------------|
| Feedback Timeliness | Avg hours from Check-in.submitted_at to MentorFeedback.created_at |
| Feedback Coverage | % of mentee Check-ins that received feedback |
| Mentee Growth | Avg improvement in current_scores vs baseline_scores across mentees |
| AI Override Rate | % of feedbacks where final differs from AI draft |
| At-Risk Mentee Count | Number of mentees with status=watch/risk |

### 6.3 API

`GET /api/hr/mentor-performance` — returns array of mentor metrics

---

## Section 7: Frontend Architecture Improvements

### 7.1 React Context for Role/User

Replace prop-drilling with `RoleContext`:

```tsx
// New file: frontend/src/contexts/RoleContext.tsx
const RoleContext = createContext<{
  role: Role
  user: { id: string; name: string; department: string }
  setRole: (r: Role) => void
}>(...)
```

Wrap `<App />` in `<RoleProvider>`, all pages consume via `useContext(RoleContext)`.

### 7.2 React Router

Replace switch-case rendering with `react-router-dom` v6:

```
/               → redirect to /intern
/intern         → InternDashboard
/intern/checkin → CheckIn
/mentor         → MentorDashboard
/hr             → HRDashboard (RiskBoard)
/hr/analytics   → Analytics
/hr/report      → WeeklyReport
/hr/mentors     → MentorPerformance
/recruiter      → FitReportList
/recruiter/:id  → FitReportDetail
/notifications  → NotificationList
```

### 7.3 Loading/Error States

- Every data-fetching page: `<Skeleton>` during load, `<Result status="error">` on failure
- Empty states: `<Empty description="...">` with actionable CTA

---

## Section 8: Implementation Order

| Phase | Content | Depends On |
|-------|---------|------------|
| **Phase 1: Foundation** | B1-B5 bug fixes, F6-F7 loading/error states, F5 AIDailyTip component, B2 PrivacyModal | Nothing |
| **Phase 2: Real AI** | LLM config, async pipeline, context-rich prompts, `analyze_checkin`, model tiering, F3 risk detection | Phase 1 |
| **Phase 3: Missing Features** | F1 celebration cards, F2 risk review API, F4 mentor override enforcement | Phase 2 |
| **Phase 4: Notifications** | Notification model, API, bell icon, triggers | Phase 2 |
| **Phase 5: Analytics** | Recharts integration, 5 chart types, CSV export, tabbed HR layout | Phase 2 |
| **Phase 6: Mentor Perf** | Mentor performance API + dashboard page | Phase 5 |
| **Phase 7: Architecture** | React Context, React Router, extract WeeklyReport page | Phase 1 |

Phases 4, 5, 6 can run in parallel after Phase 2.

---

## Section 9: Scope Boundaries

### In Scope
- Everything listed above
- 20 virtual interns (seed data stays)
- SQLite (no database migration needed)
- Desktop web only

### Out of Scope
- PostgreSQL/Redis migration (overkill for Demo)
- Push/email/Slack notifications
- Mobile responsiveness
- SSO / real auth system
- Real enterprise system integration
- Historical cohort comparison (no past data)

---

## Section 10: New Files

```
backend/app/models/notification.py       (NEW)
backend/app/api/notifications.py         (NEW)
backend/app/services/notification_service.py (NEW)
frontend/src/contexts/RoleContext.tsx     (NEW)
frontend/src/components/AIDailyTip.tsx    (NEW — extracted)
frontend/src/components/NotificationBell.tsx (NEW)
frontend/src/pages/hr/Analytics.tsx       (NEW)
frontend/src/pages/hr/WeeklyReport.tsx    (NEW — extracted from RiskBoard)
frontend/src/pages/hr/MentorPerformance.tsx (NEW)
frontend/src/pages/Notifications.tsx      (NEW)
frontend/src/components/CelebrationCard.tsx (NEW)
```

## Modified Files

```
backend/app/services/ai_service.py        (major rewrite)
backend/app/services/hr_service.py        (add risk detection, real data)
backend/app/services/intern_service.py    (post-checkin AI trigger)
backend/app/api/interns.py                (real task completion, last_emotion)
backend/app/api/hr.py                     (risk review, mentor perf endpoints)
backend/app/main.py                       (notification router)
backend/app/seed.py                       (notification seed data)
frontend/src/App.tsx                      (Router + Context + NotificationBell)
frontend/src/pages/intern/Dashboard.tsx   (Context, celebration, AIDailyTip)
frontend/src/pages/mentor/Dashboard.tsx   (Context, skeleton)
frontend/src/pages/hr/RiskBoard.tsx       (tabs, extract report)
frontend/src/components/PrivacyModal.tsx  (localStorage persistence)
frontend/package.json                     (add recharts, react-router-dom)
frontend/src/types/index.ts              (new types)
frontend/src/services/api.ts             (new endpoints)
```
