# Implementation Plan: 实习能量站 — 业务部新人成长导航智能看板

**Branch**: `001-intern-growth-dashboard` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-intern-growth-dashboard/spec.md`

## Summary

构建一个全栈 Web 应用——AI 驱动的实习生成长导航智能看板。系统覆盖实习生、导师、HR、招聘四个角色视角，提供成长路径可视化、带教动作标准化、过程管理数据化、人才判断智能化四大核心能力。Demo 阶段使用 20 名虚拟实习生数据和预置 AI fallback JSON。

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy, React 18, Ant Design 5, Vite

**Storage**: SQLite via SQLAlchemy ORM (Alembic migrations)

**Testing**: pytest + pytest-cov (backend), Vitest + React Testing Library (frontend)

**Target Platform**: Desktop web browser (Chrome/Edge), localhost single-machine deployment

**Project Type**: Web application (SPA frontend + REST API backend)

**Performance Goals**: API response < 200ms p95 (non-AI endpoints), AI endpoints < 5s timeout with fallback

**Constraints**: Zero external dependencies for Demo (SQLite + bundled mock data), must function when LLM API unavailable

**Scale/Scope**: 20 virtual interns, 4 roles, ~15 API endpoints, ~10 frontend pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

本项目无预置 constitution 文件。基于 spec 中的核心原则确定以下门禁规则：

| Gate | Status | Notes |
|------|--------|-------|
| AI 不可直接给出淘汰结论 | PASS | 所有高风险/不适配结论强制人工复核（FR-018, RiskSignal/FitReport 模型 enforce） |
| 隐私红线：不读私聊、不监控设备 | PASS | 数据仅来自主动提交的 Check-in、任务和反馈（FR-022） |
| 角色权限隔离 | PASS | 四角色数据可见性由后端 enforce（FR-020），前端 UI 差异化渲染 |
| AI 超时降级 | PASS | 5s timeout → fallback JSON，非阻塞（FR-021） |
| Human-in-the-loop | PASS | 风险信号和适岗报告均有人工复核状态机 |

## Project Structure

### Documentation (this feature)

```text
specs/001-intern-growth-dashboard/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Entity definitions & relationships
├── quickstart.md        # Demo setup & verification
├── contracts/
│   └── api-spec.md      # REST API contract
└── tasks.md             # Phase 2 output (NOT created by plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/          # SQLAlchemy models (7 entities)
│   ├── services/        # Business logic layer
│   │   ├── intern_service.py
│   │   ├── mentor_service.py
│   │   ├── hr_service.py
│   │   ├── recruiter_service.py
│   │   └── ai_service.py
│   ├── api/             # FastAPI route handlers
│   │   ├── auth.py
│   │   ├── interns.py
│   │   ├── mentors.py
│   │   ├── hr.py
│   │   ├── recruiters.py
│   │   └── ai.py
│   ├── seed.py          # 20 virtual interns seed data
│   └── main.py          # FastAPI app entry
├── tests/
│   ├── unit/
│   └── integration/
├── alembic/             # DB migrations
├── requirements.txt
└── alembic.ini

frontend/
├── src/
│   ├── components/      # Shared UI components
│   │   ├── RoleSwitcher.tsx
│   │   ├── PrivacyModal.tsx
│   │   ├── RadarChart.tsx
│   │   └── EmotionCapsule.tsx
│   ├── pages/           # Role-specific pages
│   │   ├── intern/      # Dashboard, CheckIn, Tasks
│   │   ├── mentor/      # Dashboard, Feedback, TalkingPoints
│   │   ├── hr/          # RiskBoard, WeeklyReport
│   │   └── recruiter/   # FitReport list & detail
│   ├── services/        # API client layer
│   │   └── api.ts
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── data/            # Fallback JSON (pre-baked AI responses)
│   ├── App.tsx
│   └── main.tsx
├── tests/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

**Structure Decision**: Option 2 (Web application) — the full-stack architecture decision from clarify phase drives the `backend/` and `frontend/` split. Each role has dedicated pages directory, services follow role-based domain boundaries on backend.

## Complexity Tracking

> No violations to justify — all gates pass.
