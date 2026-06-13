# Tasks: 实习能量站 — 业务部新人成长导航智能看板

**Input**: Design documents from `/specs/001-intern-growth-dashboard/`

**Prerequisites**: plan.md (done), spec.md (done), research.md (done), data-model.md (done), contracts/api-spec.md (done)

**Tests**: Not explicitly requested — test tasks omitted. Focus on implementation.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/app/`, `frontend/src/` at repository root per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project directory structure per plan.md (`backend/`, `frontend/`, `backend/app/`, `backend/tests/`, `frontend/src/`, etc.)
- [ ] T002 [P] Initialize backend Python project with `requirements.txt` (FastAPI, SQLAlchemy, Alembic, uvicorn, openai, pydantic)
- [ ] T003 [P] Initialize frontend React+TS project with Vite (`package.json`, `vite.config.ts`, `tsconfig.json`)
- [ ] T004 [P] Install Ant Design 5 and Tailwind CSS in frontend
- [ ] T005 Configure Alembic and create initial migration environment in `backend/alembic/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on

**CRITICAL**: No user story work begins until this phase is complete

- [ ] T006 Create all 7 SQLAlchemy models in `backend/app/models/` (Intern, Mentor, Task, CheckIn, MentorFeedback, RiskSignal, FitReport per data-model.md)
- [ ] T007 Create Alembic initial migration and run `alembic upgrade head`
- [ ] T008 [P] Create seed data script with 20 virtual interns + tasks + checkins in `backend/app/seed.py`
- [ ] T009 [P] Implement FastAPI app entry with CORS, error handlers, and router mounting in `backend/app/main.py`
- [ ] T010 [P] TypeScript type definitions for all 7 entities in `frontend/src/types/index.ts`
- [ ] T011 [P] API client base service with role header injection in `frontend/src/services/api.ts`
- [ ] T012 [P] AI fallback JSON data for all 4 roles in `frontend/src/data/fallback/`
- [ ] T013 Implement role-switch endpoint POST /api/v1/auth/switch-role in `backend/app/api/auth.py`
- [ ] T014 [P] Create RoleSwitcher component with PrivacyModal in `frontend/src/components/RoleSwitcher.tsx`
- [ ] T015 [P] Create PrivacyModal component (first-login consent) in `frontend/src/components/PrivacyModal.tsx`
- [ ] T016 Wire up App.tsx with role state management and page routing in `frontend/src/App.tsx`

**Checkpoint**: Role switching works. Database seeded. API and frontend can talk.

---

## Phase 3: User Story 1 - 实习生入职基线确立与成长导航 (Priority: P1)

**Goal**: 实习生完成首周基线评估，查看任务、提交 Check-in（含情绪胶囊）、接收 AI 成长建议和正向激励

**Independent Test**: 创建虚拟实习生账号，走通"首周基线 → 查看任务 → 提交含情绪胶囊的周报 → 收到 AI 建议/肯定卡片"完整闭环

### Implementation for User Story 1

- [ ] T017 [US1] Implement InternService: baseline, tasks, checkins in `backend/app/services/intern_service.py`
- [ ] T018 [P] [US1] Implement GET/POST /api/v1/interns/{id}/baseline in `backend/app/api/interns.py`
- [ ] T019 [P] [US1] Implement GET /api/v1/interns/{id}/tasks in `backend/app/api/interns.py`
- [ ] T020 [P] [US1] Implement GET/POST /api/v1/interns/{id}/checkins in `backend/app/api/interns.py`
- [ ] T021 [US1] Implement AIService daily-tip generator with fallback in `backend/app/services/ai_service.py`
- [ ] T022 [US1] Implement GET /api/ai/daily-tip/{intern_id} in `backend/app/api/ai.py`
- [ ] T023 [P] [US1] Create InternDashboard page in `frontend/src/pages/intern/Dashboard.tsx`
- [ ] T024 [P] [US1] Create CheckIn form with EmotionCapsule picker in `frontend/src/pages/intern/CheckIn.tsx`
- [ ] T025 [P] [US1] Create EmotionCapsule component in `frontend/src/components/EmotionCapsule.tsx`
- [ ] T026 [US1] Create TaskList component for intern tasks in `frontend/src/pages/intern/Tasks.tsx`
- [ ] T027 [US1] Create BaselineAssessment form (self-assessment + mentor review trigger) in `frontend/src/pages/intern/Baseline.tsx`
- [ ] T028 [US1] Implement positive affirmation card + celebration animation in `frontend/src/pages/intern/Dashboard.tsx`
- [ ] T029 [US1] Create AI daily tip display component in `frontend/src/components/AIDailyTip.tsx`

**Checkpoint**: 实习生视角可完整走通基线确立 → Check-in → AI 建议闭环

---

## Phase 4: User Story 2 - 导师带教管理 (Priority: P1)

**Goal**: 导师查看看板（任务完成率、情绪、周报摘要）、获取 AI 沟通提纲、1 分钟内完成反馈确认

**Independent Test**: 导师看板展示 2 名虚拟实习生 → 情绪预警触发 → 生成 AI 沟通提纲 → 快速确认/修改反馈 → 点赞/点踩 AI 建议

### Implementation for User Story 2

- [ ] T030 [US2] Implement MentorService: intern list, talking points, feedback in `backend/app/services/mentor_service.py`
- [ ] T031 [P] [US2] Implement GET /api/mentor/{mentor_id}/interns in `backend/app/api/mentors.py`
- [ ] T032 [P] [US2] Implement GET /api/mentor/feedback-draft/{intern_id} in `backend/app/api/mentors.py`
- [ ] T033 [P] [US2] Implement POST /api/mentor/feedback/{intern_id} in `backend/app/api/mentors.py`
- [ ] T034 [US2] Implement AI talking-points generator (1:1 outline) in `backend/app/services/ai_service.py`
- [ ] T035 [US2] Implement GET /api/mentor/talking-points/{intern_id} in `backend/app/api/mentors.py`
- [ ] T036 [P] [US2] Create MentorDashboard page in `frontend/src/pages/mentor/Dashboard.tsx`
- [ ] T037 [P] [US2] Create MentorFeedback editor (AI draft → edit → submit, <1min UX) in `frontend/src/pages/mentor/Feedback.tsx`
- [ ] T038 [P] [US2] Create TalkingPoints display (1:1 communication outline) in `frontend/src/pages/mentor/TalkingPoints.tsx`
- [ ] T039 [US2] Add AI vote (upvote/downvote) to feedback editor in `frontend/src/pages/mentor/Feedback.tsx`

**Checkpoint**: 导师视角可完整走通看板 → 沟通提纲 → 快速反馈 → 评价 AI 闭环

---

## Phase 5: User Story 3 - HR 全局风险看板与周报 (Priority: P1)

**Goal**: HR 查看全局看板（状态分布、风险列表、触发原因）、一键生成周报摘要、异常 push 通知

**Independent Test**: HR 看板展示 20 名虚拟实习生四类样本 → 点开预警详情 → 30s 内生成周报 → 正常状态不打扰

### Implementation for User Story 3

- [ ] T040 [US3] Implement HRService: dashboard, risk detection, weekly report in `backend/app/services/hr_service.py`
- [ ] T041 [P] [US3] Implement GET /api/hr/dashboard in `backend/app/api/hr.py`
- [ ] T042 [P] [US3] Implement GET /api/hr/weekly-report in `backend/app/api/hr.py`
- [ ] T043 [P] [US3] Implement POST /api/hr/interns/{id}/proxy-mentor in `backend/app/api/hr.py`
- [ ] T044 [US3] Implement risk signal detection logic (emotion trend + checkin rate + task completion) in `backend/app/services/hr_service.py`
- [ ] T045 [US3] Implement weekly report AI summary generator in `backend/app/services/ai_service.py`
- [ ] T046 [P] [US3] Create HRDashboard/RiskBoard page in `frontend/src/pages/hr/RiskBoard.tsx`
- [ ] T047 [P] [US3] Create RiskSignal detail panel (triggers + AI confidence + review status) in `frontend/src/pages/hr/RiskDetail.tsx`
- [ ] T048 [US3] Create WeeklyReport page with export in `frontend/src/pages/hr/WeeklyReport.tsx`
- [ ] T049 [US3] Implement proxy-mentor assignment UI in `frontend/src/pages/hr/RiskBoard.tsx`
- [ ] T050 [US3] Create RadarChart component for intern capability display in `frontend/src/components/RadarChart.tsx`

**Checkpoint**: HR 视角可完整走通全局看板 → 风险预警详情 → 周报生成 → 代理导师设置闭环

---

## Phase 6: User Story 4 - 招聘同学适岗分析 (Priority: P2)

**Goal**: 招聘查看多维度适岗报告（能力雷达、成长证据、AI 建议 + 人工复核备注）

**Independent Test**: 适岗报告列表 → 点开雷达图 → 查看成长证据 + AI 建议 + 人工复核签名

### Implementation for User Story 4

- [ ] T051 [US4] Implement RecruiterService: fit report list & detail in `backend/app/services/recruiter_service.py`
- [ ] T052 [P] [US4] Implement GET /api/recruiter/fit-reports in `backend/app/api/recruiters.py`
- [ ] T053 [P] [US4] Implement GET /api/recruiter/fit-reports/{id} in `backend/app/api/recruiters.py`
- [ ] T054 [US4] Implement fit report generation (AI summary + human review enforcement) in `backend/app/services/ai_service.py`
- [ ] T055 [US4] Enforce human_review_note required when ai_recommendation = "not_suitable" in `backend/app/services/recruiter_service.py`
- [ ] T056 [P] [US4] Create RecruiterFitReportList page in `frontend/src/pages/recruiter/FitReportList.tsx`
- [ ] T057 [P] [US4] Create FitReportDetail page with radar chart, evidence, AI+human dual review display in `frontend/src/pages/recruiter/FitReportDetail.tsx`

**Checkpoint**: 招聘视角可完整走通报告列表 → 详情（雷达图 + 成长证据 + 双审核）闭环

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements across all user stories

- [ ] T058 [P] Add loading states (Skeleton) to all list pages in frontend
- [ ] T059 [P] Add error state (Empty/Error) to all data-dependent pages in frontend
- [ ] T060 Implement AI timeout (5s) → fallback JSON switch in `backend/app/services/ai_service.py`
- [ ] T061 Make all AI endpoints return `source: "ai" | "fallback"` per contracts/api-spec.md
- [ ] T062 [P] Add checkin duplicate detection (text similarity > 80%) in `backend/app/services/intern_service.py`
- [ ] T063 [P] Integration test: 4-role complete flow per quickstart.md
- [ ] T064 Run quickstart.md verification checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2)
- **US2 (Phase 4)**: Depends on Foundational (Phase 2) — may re-use US1 models
- **US3 (Phase 5)**: Depends on Foundational (Phase 2) — independent of US1/US2
- **US4 (Phase 6)**: Depends on Foundational (Phase 2) — independent of US1-3
- **Polish (Phase 7)**: Depends on all desired user stories

### User Story Dependencies

- US1, US2, US3, US4 can proceed **in parallel** after Foundational phase (different files)
- US5 (角色权限) is embedded in Foundational (T013-T016)

### Within Each User Story

- Backend models + services before API endpoints
- Backend API endpoints before frontend pages
- Frontend components within same page marked [P] can run parallel

### Parallel Opportunities

- Phase 1: T002, T003, T004 can run in parallel
- Phase 2: T008, T009, T010, T011, T012, T014, T015 can run in parallel
- Phase 3: T018, T019, T020, T023, T024, T025 can run in parallel
- Phase 4: T031, T032, T033, T036, T037, T038 can run in parallel
- Phase 5: T041, T042, T043, T046, T047 can run in parallel
- Phase 6: T052, T053, T056, T057 can run in parallel
- US1-US4 can run in parallel once Foundational completes

---

## Implementation Strategy

### MVP First (Minimum Demo)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all)
3. Complete Phase 3: US1 (Intern) — already demonstrable
4. Complete Phase 4: US2 (Mentor) — 2 roles working
5. Complete Phase 5: US3 (HR) — 3 roles working
6. **At this point Demo is viable**: 3 P1 roles + role switching + risk board
7. Add Phase 6: US4 (Recruiter) — full 4-role Demo

### Incremental Delivery

1. Setup + Foundational → Backend serves API, frontend renders role switcher
2. + US1 → Intern demo: baseline + check-in + AI tips
3. + US2 → Mentor demo: dashboard + feedback + talking points
4. + US3 → HR demo: risk board + weekly report (**Minimum Viable Demo**)
5. + US4 → Full 4-role demo with fit reports
6. + Polish → Production-quality error/loading states + AI fallback

---

## Notes

- Tests not explicitly requested — omitted from task list
- All AI endpoints must work with fallback JSON when LLM unavailable
- Every negative AI judgment (risk, not_suitable) must enforce human review display
- Task count: 64 tasks across 7 phases
- MVP scope (Phase 1-5): 50 tasks — deliverable as minimum Demo
