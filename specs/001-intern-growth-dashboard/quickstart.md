# Quickstart — 实习能量站 Demo

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git

## Quick Start

```bash
# 1. Clone & enter project
git clone <repo-url> && cd intern-growth-dashboard

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed  # Seed 20 virtual interns
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev  # → http://localhost:5173
```

## Demo Walkthrough

1. Open `http://localhost:5173` → auto-redirect to role switcher
2. Select **Intern** → see 小林's perspective (tasks, check-in, AI tips)
3. Select **Mentor** → see 张哥's dashboard (assigned interns, feedback queue)
4. Select **HR** → see 陈姐's risk dashboard, generate weekly report
5. Select **Recruiter** → see 王宇's fit reports with human review notes
6. Kill backend → verify AI fallback to pre-baked JSON (all core flows still work)

## Verify Success Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| SC-001 | 80% interns improve ≥ 2 tiers | Check any intern detail page: baseline vs current scores |
| SC-002 | Feedback in < 1 min | Mentor feedback flow: AI draft → edit → submit |
| SC-003 | Weekly report in < 30s | HR dashboard → "Generate Weekly Report" |
| SC-004 | 4-type classification ≥ 90% | HR dashboard shows correct classification of 20 interns |
| SC-005 | Not perceived as surveillance | Intern home: growth tasks + positive cards, NO risk labels |
| SC-007 | Works without AI API | Stop backend LLM config, verify fallback JSON works |
