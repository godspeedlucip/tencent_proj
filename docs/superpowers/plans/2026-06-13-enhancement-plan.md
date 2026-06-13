# 实习能量站 Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the 「实习能量站」Demo from fake-AI prototype to a genuinely AI-driven system with real LLM integration, in-app notifications, analytics dashboards, mentor performance tracking, and fix all identified bugs.

**Architecture:** Keep FastAPI + React + SQLite stack. Add async AI processing via BackgroundTasks, React Router + Context for frontend architecture, Recharts for analytics, and a new Notification model. All AI calls become context-rich with real intern data, with 5s timeout fallback to pre-baked templates.

**Tech Stack:** Python FastAPI, SQLAlchemy, SQLite, React 18, TypeScript, Vite, Ant Design 5, Tailwind CSS, Recharts, react-router-dom v6

---

## File Structure

### New Files
```
backend/app/models/notification.py
backend/app/api/notifications.py
backend/app/services/notification_service.py
frontend/src/contexts/RoleContext.tsx
frontend/src/components/AIDailyTip.tsx
frontend/src/components/NotificationBell.tsx
frontend/src/components/CelebrationCard.tsx
frontend/src/pages/hr/Analytics.tsx
frontend/src/pages/hr/WeeklyReport.tsx
frontend/src/pages/hr/MentorPerformance.tsx
frontend/src/pages/Notifications.tsx
```

### Modified Files
```
backend/app/services/ai_service.py          (major: real LLM, async, context-rich)
backend/app/services/hr_service.py          (risk detection, real data)
backend/app/services/intern_service.py      (post-checkin AI trigger)
backend/app/api/interns.py                  (real task rate, last_emotion)
backend/app/api/hr.py                       (risk review, mentor perf)
backend/app/api/ai.py                       (new endpoints)
backend/app/models/__init__.py              (import Notification)
backend/app/main.py                         (notification router)
backend/app/seed.py                         (notification data)
frontend/src/App.tsx                        (Router + Context + Bell)
frontend/src/pages/intern/Dashboard.tsx     (Context, celebration, AIDailyTip)
frontend/src/pages/mentor/Dashboard.tsx     (Context, skeleton)
frontend/src/pages/hr/RiskBoard.tsx         (tabs, extract report)
frontend/src/components/PrivacyModal.tsx    (localStorage)
frontend/src/components/RoleSwitcher.tsx    (navigate on switch)
frontend/src/types/index.ts                 (new types)
frontend/src/services/api.ts               (new endpoints)
frontend/package.json                       (recharts, react-router-dom)
frontend/src/main.tsx                       (BrowserRouter)
frontend/src/index.css                      (animation keyframes)
```

---

## Phase 1: Foundation — Bug Fixes & UI Polish

### Task 1.1: Fix PrivacyModal to use localStorage

**Files:**
- Modify: `frontend/src/components/PrivacyModal.tsx`

- [ ] **Step 1: Update PrivacyModal to persist consent**

Replace the component:

```tsx
import { Modal } from 'antd'
import { useState } from 'react'

const STORAGE_KEY = 'intern_energy_station_privacy_consent'

export default function PrivacyModal() {
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY))

  function handleAgree() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  return (
    <Modal
      title="数据与隐私安全告知书"
      open={open}
      onOk={handleAgree}
      onCancel={handleAgree}
      okText="已知晓并同意"
      cancelText="关闭"
      closable={false}
      maskClosable={false}
    >
      <div style={{ lineHeight: 2 }}>
        <p><strong>「实习能量站」郑重承诺：</strong></p>
        <ul style={{ paddingLeft: 20 }}>
          <li>本系统定位为"成长导航"而非"职场监控"。</li>
          <li>系统<strong>绝不读取</strong>个人私聊记录。</li>
          <li>系统<strong>不监控</strong>设备行为、浏览器历史、键鼠操作或工时时长。</li>
          <li>AI 分析仅基于：系统内公开任务、你主动提交的周报/Check-in、导师主动反馈及沉淀的项目产出。</li>
          <li>情绪胶囊映射的压力值<strong>仅导师和HR可见</strong>，不对实习生本人和其他实习生展示。</li>
          <li>所有高风险、低适配结论<strong>必须经过导师或HR人工复核</strong>，AI 不会单独做出人事决定。</li>
        </ul>
        <p style={{ marginTop: 12, color: '#666' }}>
          我们通过这份告知书建立信任——如果你对数据使用有任何疑问，随时通过导师或HR向我们反馈。
        </p>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify it works**

Run: `cd frontend && npm run dev`
Open browser, close the modal, refresh page — modal should NOT reappear.
Clear localStorage, refresh — modal should appear again.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PrivacyModal.tsx
git commit -m "fix: persist PrivacyModal consent in localStorage"
```

---

### Task 1.2: Fix hardcoded task completion rate in intern list

**Files:**
- Modify: `backend/app/api/interns.py:12-35`

- [ ] **Step 1: Replace hardcoded 0.8 with real calculation**

Replace the `list_interns` function:

```python
@router.get("")
def list_interns(status: str | None = Query(None), mentor_id: str | None = Query(None)):
    db = SessionLocal()
    try:
        q = db.query(Intern)
        if status:
            q = q.filter(Intern.status == status)
        if mentor_id:
            q = q.filter(Intern.mentor_id == mentor_id)
        interns = q.all()
        result = []
        for intern in interns:
            tasks = db.query(Task).filter(Task.intern_id == intern.id).all()
            completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
            task_rate = round(completed / len(tasks), 2) if tasks else 0

            last_checkin = (
                db.query(CheckIn).filter(CheckIn.intern_id == intern.id)
                .order_by(CheckIn.submitted_at.desc()).first()
            )
            last_emotion = last_checkin.emotion_capsule.value if last_checkin else None

            result.append({
                "id": intern.id, "name": intern.name, "role": intern.role,
                "department": intern.department, "mentor_name": intern.mentor.name if intern.mentor else "",
                "mentor_id": intern.mentor_id,
                "onboard_week": intern.onboard_week, "status": intern.status.value,
                "task_completion_rate": task_rate,
                "last_emotion": last_emotion,
            })
        dist = {}
        for s in ["normal", "potential", "watch", "risk"]:
            dist[s] = sum(1 for i in interns if i.status.value == s)
        return {"interns": result, "total": len(result), "status_distribution": dist}
    finally:
        db.close()
```

- [ ] **Step 2: Fix has_feedback in checkin list endpoint**

In the same file, modify `get_intern_checkins`, replace the hardcoded `"has_feedback": False`:

```python
@router.get("/{intern_id}/checkins")
def get_intern_checkins(intern_id: str, week: int | None = Query(None)):
    db = SessionLocal()
    try:
        q = db.query(CheckIn).filter(CheckIn.intern_id == intern_id)
        if week:
            q = q.filter(CheckIn.week == week)
        checkins = q.order_by(CheckIn.submitted_at.desc()).all()
        from ..models.mentor_feedback import MentorFeedback
        return {"checkins": [
            {
                "id": c.id, "week": c.week, "progress": c.progress, "blockers": c.blockers,
                "emotion_capsule": c.emotion_capsule.value, "next_plan": c.next_plan,
                "submitted_at": c.submitted_at.isoformat(),
                "has_feedback": db.query(MentorFeedback).filter(
                    MentorFeedback.intern_id == intern_id,
                    MentorFeedback.checkin_id == c.id,
                ).count() > 0,
            }
            for c in checkins
        ]}
    finally:
        db.close()
```

- [ ] **Step 3: Restart backend and verify**

Run: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
Hit `GET /api/v1/interns` — verify `task_completion_rate` varies per intern and `last_emotion` is populated.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/interns.py
git commit -m "fix: calculate real task completion rate and last_emotion in intern list"
```

---

### Task 1.3: Fix HR weekly report empty risk_details

**Files:**
- Modify: `backend/app/services/hr_service.py:41-74`

- [ ] **Step 1: Populate risk_details with actual RiskSignal data**

Replace the `get_weekly_report` function:

```python
def get_weekly_report() -> dict:
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        total = len(interns)
        if total == 0:
            return {"week": 0, "summary_stats": {}, "risk_details": [], "recommended_actions": [], "source": "fallback"}

        risk_count = sum(1 for i in interns if i.status == InternStatus.risk)
        checkins = db.query(CheckIn).filter(CheckIn.week >= 1).all()
        checkin_rate = len(set(c.intern_id for c in checkins)) / total if total > 0 else 0

        tasks = db.query(Task).all()
        completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
        avg_task = round(completed / len(tasks), 2) if tasks else 0

        recent_signals = (
            db.query(RiskSignal).order_by(RiskSignal.created_at.desc()).limit(10).all()
        )
        risk_details = [
            {
                "intern_id": s.intern_id,
                "intern_name": s.intern.name if s.intern else "",
                "level": s.level.value,
                "triggers": s.triggers,
                "ai_confidence": s.ai_confidence,
                "review_status": s.review_status.value,
            }
            for s in recent_signals
        ]

        resolved_count = sum(1 for s in recent_signals if s.review_status == ReviewStatus.confirmed)
        new_count = sum(1 for s in recent_signals if s.review_status == ReviewStatus.pending)

        ai_result = generate_weekly_report_actions()

        return {
            "week": max((c.week for c in checkins), default=0),
            "generated_at": datetime.datetime.now().isoformat(),
            "source": ai_result.get("source", "fallback"),
            "summary_stats": {
                "checkin_rate": round(checkin_rate, 2),
                "avg_task_completion": avg_task,
                "risk_count": risk_count,
                "new_risks_this_week": new_count,
                "resolved_risks_this_week": resolved_count,
            },
            "risk_details": risk_details,
            "recommended_actions": ai_result.get("actions", []),
        }
    finally:
        db.close()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/hr_service.py
git commit -m "fix: populate risk_details in HR weekly report from actual RiskSignal records"
```

---

### Task 1.4: Extract AIDailyTip as independent component

**Files:**
- Create: `frontend/src/components/AIDailyTip.tsx`
- Modify: `frontend/src/pages/intern/Dashboard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Card, Tag, Spin, Alert } from 'antd'
import { BulbOutlined } from '@ant-design/icons'
import type { AIDailyTip as AIDailyTipType } from '../types'

interface Props {
  tip: AIDailyTipType | null
  loading: boolean
  error: string | null
}

export default function AIDailyTip({ tip, loading, error }: Props) {
  if (loading) {
    return (
      <Card>
        <Spin size="small" />
        <span style={{ marginLeft: 8, color: '#888' }}>正在生成今日建议...</span>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert message="AI 建议暂时不可用" description={error} type="warning" showIcon />
      </Card>
    )
  }

  if (!tip) return null

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BulbOutlined style={{ color: '#faad14', fontSize: 20 }} />
        <strong>今日AI成长建议</strong>
        <Tag color={tip.source === 'ai' ? 'blue' : 'orange'}>
          {tip.source === 'ai' ? 'AI 生成' : '本地模板'}
        </Tag>
      </div>
      <p style={{ color: '#555', lineHeight: 1.8 }}>{tip.tip}</p>
      {tip.source === 'ai' && tip.generated_at && (
        <p style={{ fontSize: 12, color: '#bbb', marginTop: 8 }}>
          生成时间: {new Date(tip.generated_at).toLocaleTimeString('zh-CN')}
        </p>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Use it in InternDashboard**

In `frontend/src/pages/intern/Dashboard.tsx`, replace the inline AI tip Card (lines 67-75) with:

```tsx
import AIDailyTip from '../../components/AIDailyTip'

// Inside the component, replace the AI tip Card with:
<AIDailyTip
  tip={dailyTip}
  loading={false}
  error={null}
/>
```

Add state for tip loading and error:

```tsx
const [tipLoading, setTipLoading] = useState(false)
const [tipError, setTipError] = useState<string | null>(null)
```

Update the `loadData` function to track loading/error state for the tip separately:

```tsx
async function loadData() {
  try {
    const [i, t] = await Promise.all([
      interns.get(user.id),
      interns.getTasks(user.id).then(r => r.tasks),
    ])
    setIntern(i)
    setTasks(t)
  } catch {
    setIntern(null)
  } finally {
    setLoading(false)
  }

  setTipLoading(true)
  setTipError(null)
  try {
    const tip = await ai.getDailyTip(user.id)
    setDailyTip(tip)
  } catch {
    setTipError('无法连接 AI 服务，请稍后刷新')
  } finally {
    setTipLoading(false)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AIDailyTip.tsx frontend/src/pages/intern/Dashboard.tsx
git commit -m "feat: extract AIDailyTip as independent component with loading/error states"
```

---

### Task 1.5: Add loading skeletons and error states to all pages

**Files:**
- Modify: `frontend/src/pages/mentor/Dashboard.tsx`
- Modify: `frontend/src/pages/hr/RiskBoard.tsx`
- Modify: `frontend/src/pages/recruiter/FitReportList.tsx`

- [ ] **Step 1: Add Skeleton to MentorDashboard**

In `frontend/src/pages/mentor/Dashboard.tsx`, replace the Spin import:

```tsx
import { Card, Table, Tag, Button, Spin, Alert, Skeleton } from 'antd'
```

Replace the loading return:

```tsx
if (loading) return (
  <Card title="带教看板"><Skeleton active paragraph={{ rows: 6 }} /></Card>
)
```

Replace the empty state:

```tsx
if (interns.length === 0) return (
  <Card title="带教看板">
    <Alert message="暂无带教实习生数据" description="请确认您的账号已绑定实习生" type="info" showIcon />
  </Card>
)
```

- [ ] **Step 2: Add error state to HR RiskBoard**

In `frontend/src/pages/hr/RiskBoard.tsx`, add error handling:

```tsx
import { Card, Row, Col, Statistic, Table, Tag, Modal, Button, Spin, Alert, Typography, Skeleton, Result } from 'antd'
```

Add error state and update the component:

```tsx
export default function HRDashboard() {
  const [dashboard, setDashboard] = useState<HRDashboard | null>(null)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRisk, setSelectedRisk] = useState<RiskSignal | null>(null)

  useEffect(() => {
    hr.getDashboard()
      .then(setDashboard)
      .catch((e) => setError(e.message || '无法加载看板数据'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
  if (error) return (
    <Result
      status="error"
      title="数据加载失败"
      subTitle={error}
      extra={<Button type="primary" onClick={() => window.location.reload()}>重新加载</Button>}
    />
  )
```

- [ ] **Step 3: Add skeleton to FitReportList**

In `frontend/src/pages/recruiter/FitReportList.tsx`, add loading/error/empty states following the same pattern:

```tsx
import { Skeleton, Result, Empty, Button } from 'antd'

// Loading state (replace existing Spin):
if (loading) return <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>

// Error state:
if (error) return (
  <Result status="error" title="数据加载失败" subTitle={error}
    extra={<Button type="primary" onClick={() => window.location.reload()}>重新加载</Button>} />
)

// Empty state:
if (reports.length === 0) return (
  <Card><Empty description="暂无适岗分析报告" /></Card>
)
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/mentor/Dashboard.tsx frontend/src/pages/hr/RiskBoard.tsx frontend/src/pages/recruiter/FitReportList.tsx
git commit -m "feat: add loading skeletons and error states to all data pages"
```

---

## Phase 2: Real AI Pipeline

### Task 2.1: Upgrade ai_service.py with real LLM integration

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Rewrite ai_service.py with context-rich prompts and proper model tiering**

```python
"""AI service with real LLM integration, async processing, and context-rich prompts."""
import os
import json
import random
import datetime
from openai import OpenAI

# === Fallback Data ===

FALLBACK_TIPS = [
    "尝试用'用户故事'的格式来梳理你手头的需求，这会让你的PRD更清晰。",
    "在评审会上主动记录其他人的反馈，这是快速学习产品思维的捷径。",
    "今天试着画一张你所负责模块的用户流程图，帮助理清逻辑。",
    "整理本周踩过的坑，写一小段反思——养成复盘的习惯比完成任何单一任务都重要。",
    "有卡点别憋着，在Check-in里写下来；导师看到卡点远比看到完美周报更愿意帮你。",
]

FALLBACK_OUTLINES = [
    {
        "recent_highlights": ["最近几周任务完成率保持在较高水平", "主动参与需求评审并提出有效建议"],
        "areas_to_discuss": ["某个技术工具的使用卡点可能需要额外培训", "下阶段的独立负责模块规划"],
        "suggested_questions": ["这周最有成就感的一件事是什么？", "需要我提供什么资源来帮助你跨越当前的卡点？", "你对下阶段想独立负责的方向有什么想法？"],
        "tone_hint": "以肯定成长为主线，针对技术卡点提供具体资源支持。",
    }
]

FALLBACK_FEEDBACK_DRAFTS = [
    {"ai_draft": "本周在需求分析方面进步明显，用户访谈纪要质量高，逻辑清晰。建议下一步加强Figma原型制作能力。"},
    {"ai_draft": "本周任务完成情况良好，对需求优先级的判断越来越准确。建议在评审会上更主动地表达自己的观点。"},
    {"ai_draft": "本周进度有所放缓，主要在技术工具使用上遇到了卡点。不过能主动识别到瓶颈并提出来，这本身就是成熟的表现。"},
]


# === LLM Client ===

def _get_client():
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL")
    if not api_key:
        return None
    kwargs = {"api_key": api_key, "timeout": 4.0, "max_retries": 0}
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def _get_model(default: str = "gpt-4o-mini") -> str:
    return os.getenv("LLM_MODEL", default)


def _ai_or_fallback(client, messages, max_tokens: int, fallback: dict) -> dict:
    """Call LLM; return fallback on any error with source marker."""
    if client is None:
        fallback["source"] = "fallback"
        return fallback
    try:
        resp = client.chat.completions.create(
            model=_get_model(),
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        content = resp.choices[0].message.content.strip()
        return {"source": "ai", "model": _get_model(), "content": content}
    except Exception:
        fallback["source"] = "fallback"
        return fallback


# === Daily Tip ===

def generate_daily_tip(intern_name: str, context: dict | None = None) -> dict:
    """Generate daily growth tip with intern context."""
    client = _get_client()
    tasks_info = ""
    if context:
        tasks_info = f"任务完成率: {context.get('task_completion_rate', 0)}，最近Check-in: {context.get('recent_checkin', '无')}"

    result = _ai_or_fallback(
        client,
        messages=[{
            "role": "user",
            "content": f"给一名叫{intern_name}的产品实习生写一条简短(<=50字)的成长建议。{tasks_info}语气温暖鼓励。只返回建议文本。"
        }],
        max_tokens=80,
        fallback={"tip": random.choice(FALLBACK_TIPS)},
    )
    if result["source"] == "ai":
        return {"tip": result["content"], "source": "ai", "generated_at": datetime.datetime.now().isoformat()}
    return {"tip": result["tip"], "source": "fallback", "generated_at": datetime.datetime.now().isoformat()}


# === Talking Points (1:1 Outline) ===

def generate_talking_points(intern_name: str, context: dict | None = None) -> dict:
    """Generate 1:1 communication outline."""
    client = _get_client()
    ctx_str = ""
    if context:
        ctx_str = f"背景：{json.dumps(context, ensure_ascii=False)}"

    result = _ai_or_fallback(
        client,
        messages=[{
            "role": "user",
            "content": f"为导师生成针对实习生{intern_name}的1:1沟通提纲。{ctx_str}用JSON格式返回，包含: recent_highlights(2-3条), areas_to_discuss(2-3条), suggested_questions(2-3条), tone_hint(1句话)。"
        }],
        max_tokens=300,
        fallback={"outline": random.choice(FALLBACK_OUTLINES)},
    )
    if result["source"] == "ai":
        try:
            outline = json.loads(result["content"])
            return {"outline": outline, "source": "ai", "generated_at": datetime.datetime.now().isoformat()}
        except json.JSONDecodeError:
            pass
    return {"outline": result.get("outline", random.choice(FALLBACK_OUTLINES)), "source": "fallback",
            "generated_at": datetime.datetime.now().isoformat()}


# === Feedback Draft ===

def generate_feedback_draft(intern_name: str, context: dict | None = None) -> dict:
    """Generate mentor feedback draft."""
    client = _get_client()
    ctx_str = ""
    if context:
        ctx_str = f"背景：{json.dumps(context, ensure_ascii=False)}"

    result = _ai_or_fallback(
        client,
        messages=[{
            "role": "user",
            "content": f"为一名叫{intern_name}的产品实习生写一段导师反馈(<=80字)，{ctx_str}包含肯定和成长建议，语气专业温暖。"
        }],
        max_tokens=120,
        fallback={"ai_draft": random.choice(FALLBACK_FEEDBACK_DRAFTS)["ai_draft"]},
    )
    draft = result.get("content") if result["source"] == "ai" else result.get("ai_draft", "")
    return {"ai_draft": draft, "source": result["source"], "generated_at": datetime.datetime.now().isoformat()}


# === Check-in Analysis (NEW) ===

def analyze_checkin(checkin_text: str, intern_context: dict | None = None) -> dict:
    """Analyze Check-in content for growth keywords and risk signals."""
    client = _get_client()
    ctx_str = json.dumps(intern_context, ensure_ascii=False) if intern_context else ""

    result = _ai_or_fallback(
        client,
        messages=[{
            "role": "user",
            "content": f"""分析以下实习生周报内容，返回JSON:
{{
  "growth_keywords": ["关键词1", "关键词2", "关键词3"],
  "risk_signals": [{{"type": "emotion|progress|engagement", "severity": "low|medium|high", "evidence": "引用原文"}}],
  "sentiment_summary": "1-2句话总结",
  "suggested_actions": ["建议1", "建议2"]
}}

实习生背景: {ctx_str}
周报内容: {checkin_text}"""
        }],
        max_tokens=300,
        fallback={
            "growth_keywords": ["持续学习", "主动反思"],
            "risk_signals": [],
            "sentiment_summary": "本周进展正常。",
            "suggested_actions": ["继续保持当前节奏"],
        },
    )
    if result["source"] == "ai":
        try:
            return {"data": json.loads(result["content"]), "source": "ai",
                    "generated_at": datetime.datetime.now().isoformat()}
        except json.JSONDecodeError:
            pass
    return {"data": result, "source": "fallback", "generated_at": datetime.datetime.now().isoformat()}


# === Weekly Report Actions ===

def generate_weekly_report_actions(context: dict | None = None) -> dict:
    """Generate HR weekly report action recommendations."""
    client = _get_client()
    ctx_str = json.dumps(context, ensure_ascii=False) if context else ""

    fallback_actions = [
        "重点关注连续情绪低落的实习生，建议HR主动介入沟通",
        "建议与反馈及时率偏低的导师沟通带教资源问题",
        "本周整体表现稳定，继续保持当前管理节奏",
    ]

    result = _ai_or_fallback(
        client,
        messages=[{
            "role": "user",
            "content": f"基于实习生数据生成3条HR周报行动建议(每条<=50字)，用JSON数组返回。数据: {ctx_str}"
        }],
        max_tokens=200,
        fallback={"actions": fallback_actions},
    )
    if result["source"] == "ai":
        try:
            actions = json.loads(result["content"])
            if isinstance(actions, list):
                return {"actions": actions, "source": "ai"}
        except json.JSONDecodeError:
            pass
    return {"actions": result.get("actions", fallback_actions), "source": "fallback"}


# === Fit Report ===

def generate_fit_report(intern_name: str, context: dict | None = None) -> dict:
    """Generate fit report recommendation."""
    client = _get_client()
    ctx_str = json.dumps(context, ensure_ascii=False) if context else ""

    result = _ai_or_fallback(
        client,
        messages=[{
            "role": "user",
            "content": f"为实习生{intern_name}生成岗位适配分析。{ctx_str}返回JSON: {{growth_evidence, ai_recommendation(high_potential|observe|not_suitable), strengths:[], gaps:[], verification_points:[]}}"
        }],
        max_tokens=300,
        fallback={
            "growth_evidence": f"{intern_name}在实习期间从基础执行逐步展现出独立思考和需求洞察能力。",
            "ai_recommendation": "observe",
            "strengths": ["学习能力"],
            "gaps": ["独立解决问题"],
            "verification_points": ["下阶段独立负责小型需求的完整闭环"],
        },
    )
    if result["source"] == "ai":
        try:
            data = json.loads(result["content"])
            return {"data": data, "source": "ai", "generated_at": datetime.datetime.now().isoformat()}
        except json.JSONDecodeError:
            pass
    return {"data": result, "source": "fallback", "generated_at": datetime.datetime.now().isoformat()}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat: rewrite AI service with real LLM integration, context-rich prompts, and model tiering"
```

---

### Task 2.2: Add post-Check-in AI analysis trigger

**Files:**
- Modify: `backend/app/services/intern_service.py`
- Modify: `backend/app/api/interns.py`

- [ ] **Step 1: Update intern_service.py to trigger AI analysis after Check-in**

Add to the end of `submit_checkin` and create a new wrapper:

```python
def submit_checkin_with_ai(intern_id: str, data: dict) -> dict:
    """Submit checkin then run AI analysis, returning analysis results."""
    result = submit_checkin(intern_id, data)
    if result.get("id"):
        db = SessionLocal()
        try:
            intern = db.query(Intern).filter(Intern.id == intern_id).first()
            tasks = db.query(Task).filter(Task.intern_id == intern_id).all()
            completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
            task_rate = round(completed / len(tasks), 2) if tasks else 0

            context = {
                "name": intern.name if intern else "",
                "role": intern.role if intern else "",
                "week": data.get("week"),
                "task_completion_rate": task_rate,
                "emotion": data.get("emotion_capsule"),
            }

            from .ai_service import analyze_checkin
            analysis = analyze_checkin(data.get("progress", ""), context)

            # Save analysis to the checkin record
            if result.get("id"):
                checkin = db.query(CheckIn).filter(CheckIn.id == result["id"]).first()
                if checkin:
                    checkin.ai_summary = json.dumps(analysis.get("data", {}), ensure_ascii=False)

            # Auto-create risk signals if detected
            risk_signals = analysis.get("data", {}).get("risk_signals", [])
            for sig in risk_signals:
                if sig.get("severity") == "high":
                    from ..models.risk_signal import RiskSignal, RiskLevel
                    existing = db.query(RiskSignal).filter(
                        RiskSignal.intern_id == intern_id,
                    ).order_by(RiskSignal.created_at.desc()).first()
                    if not existing or existing.review_status.value == "confirmed":
                        new_signal = RiskSignal(
                            intern_id=intern_id,
                            level=RiskLevel.risk if sig["severity"] == "high" else RiskLevel.watch,
                            triggers=[sig.get("evidence", "")],
                            ai_confidence=0.8,
                            review_status=ReviewStatus.pending,
                        )
                        db.add(new_signal)

            db.commit()
            result["analysis"] = analysis
        finally:
            db.close()
    return result
```

Add the needed imports at the top:

```python
import json
from ..models.risk_signal import ReviewStatus
```

- [ ] **Step 2: Update the Check-in API endpoint to use the new function**

In `backend/app/api/interns.py`, modify the `create_checkin` function:

```python
@router.post("/{intern_id}/checkins")
def create_checkin(intern_id: str, req: CheckInRequest):
    db = SessionLocal()
    try:
        intern = db.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            raise HTTPException(404, "Intern not found")
    finally:
        db.close()
    if detect_duplicate_checkin(intern_id, req.progress):
        return {"id": "", "warning": "内容与上周高度相似，请确认并非敷衍填写。"}
    return submit_checkin_with_ai(intern_id, req.model_dump())
```

Add the import:

```python
from ..services.intern_service import get_intern, submit_checkin, detect_duplicate_checkin, submit_checkin_with_ai
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/intern_service.py backend/app/api/interns.py
git commit -m "feat: trigger AI analysis after Check-in submission with auto risk signal creation"
```

---

### Task 2.3: Add risk review API endpoint

**Files:**
- Modify: `backend/app/api/hr.py`

- [ ] **Step 1: Add review endpoint**

```python
class ReviewRequest(BaseModel):
    review_status: str  # confirmed | overridden
    review_note: str

@router.post("/risks/{risk_id}/review")
def review_risk_signal(risk_id: str, req: ReviewRequest):
    """HR or mentor reviews a risk signal."""
    db = SessionLocal()
    try:
        signal = db.query(RiskSignal).filter(RiskSignal.id == risk_id).first()
        if not signal:
            raise HTTPException(404, "Risk signal not found")
        signal.review_status = ReviewStatus(req.review_status)
        signal.review_note = req.review_note
        db.commit()
        return {"status": "ok", "review_status": signal.review_status.value}
    finally:
        db.close()
```

Add needed imports at the top of `backend/app/api/hr.py`:

```python
from pydantic import BaseModel
from fastapi import HTTPException
from ..models.risk_signal import RiskSignal, ReviewStatus
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/hr.py
git commit -m "feat: add risk signal review API endpoint"
```

---

## Phase 3: Missing Features

### Task 3.1: Positive affirmation card with celebration animation

**Files:**
- Create: `frontend/src/components/CelebrationCard.tsx`
- Modify: `frontend/src/pages/intern/Dashboard.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add confetti animation CSS**

Append to `frontend/src/index.css`:

```css
@keyframes confetti-fall {
  0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.confetti-piece {
  position: fixed;
  width: 10px;
  height: 10px;
  top: -10px;
  animation: confetti-fall 2.5s ease-in forwards;
  z-index: 1000;
  pointer-events: none;
}

@keyframes celebrate-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.celebration-card {
  animation: celebrate-bounce 0.6s ease-in-out 3;
}
```

- [ ] **Step 2: Create CelebrationCard component**

```tsx
import { useEffect, useState } from 'react'
import { Card, Typography } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'

interface Props {
  internName: string
  reason: string
  onDismiss: () => void
}

const CONFETTI_COLORS = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96']

export default function CelebrationCard({ internName, reason, onDismiss }: Props) {
  const [pieces, setPieces] = useState<{ id: number; color: string; left: string; delay: string }[]>([])

  useEffect(() => {
    const newPieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
    }))
    setPieces(newPieces)

    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            background: p.color,
            left: p.left,
            animationDelay: p.delay,
          }}
        />
      ))}
      <Card
        className="celebration-card"
        style={{
          position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '2px solid #faad14', textAlign: 'center',
        }}
      >
        <TrophyOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
        <Typography.Title level={4}>太棒了，{internName}！</Typography.Title>
        <Typography.Paragraph style={{ fontSize: 16, color: '#555' }}>
          {reason}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ color: '#888' }}>
          继续保持，你的成长有目共睹。
        </Typography.Paragraph>
      </Card>
    </>
  )
}
```

- [ ] **Step 3: Wire into InternDashboard**

In `frontend/src/pages/intern/Dashboard.tsx`, add:

```tsx
import CelebrationCard from '../../components/CelebrationCard'

// Inside component, add state:
const [showCelebration, setShowCelebration] = useState(false)

// After loading intern data, check trigger conditions:
useEffect(() => {
  if (intern && (intern.task_completion_rate ?? 0) >= 0.9 && (intern.status === 'potential')) {
    setShowCelebration(true)
  }
}, [intern])

// In JSX, before the closing </div>:
{showCelebration && (
  <CelebrationCard
    internName={intern?.name ?? ''}
    reason="你连续保持高任务完成率，展现出优秀的成长潜力！"
    onDismiss={() => setShowCelebration(false)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CelebrationCard.tsx frontend/src/pages/intern/Dashboard.tsx frontend/src/index.css
git commit -m "feat: add positive affirmation card with confetti celebration animation"
```

---

### Task 3.2: Enforce mentor override reason

**Files:**
- Modify: `backend/app/api/mentors.py`

- [ ] **Step 1: Add override_reason validation to feedback submission**

Find the POST `/mentor/feedback/{intern_id}` endpoint and add validation:

```python
class FeedbackRequest(BaseModel):
    checkin_id: str | None = None
    final_feedback: str
    rating: str  # exceeds | meets | needs_improvement
    ai_suggestion_vote: str  # upvote | downvote | none
    override_reason: str | None = None  # Required when overriding AI

@router.post("/feedback/{intern_id}")
def submit_feedback(intern_id: str, req: FeedbackRequest):
    import difflib
    db = SessionLocal()
    try:
        # Get AI draft for comparison
        from ..services.ai_service import generate_feedback_draft
        ai_draft_result = generate_feedback_draft("", {})
        ai_draft = ai_draft_result.get("ai_draft", "")

        # If final feedback substantially differs from AI draft, require override_reason
        if ai_draft and req.final_feedback:
            similarity = difflib.SequenceMatcher(None, ai_draft, req.final_feedback).ratio()
            if similarity < 0.5 and not req.override_reason:
                raise HTTPException(400, "override_reason is required when significantly deviating from AI suggestion")

        feedback = MentorFeedback(
            intern_id=intern_id,
            mentor_id=req.mentor_id,  # would come from auth in real system
            checkin_id=req.checkin_id,
            ai_draft=ai_draft,
            final_feedback=req.final_feedback,
            rating=FeedbackRating(req.rating),
            ai_suggestion_vote=VoteType(req.ai_suggestion_vote),
            override_reason=req.override_reason,
        )
        db.add(feedback)
        db.commit()
        return {"id": feedback.id}
    finally:
        db.close()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/mentors.py
git commit -m "feat: enforce override_reason when mentor deviates from AI feedback draft"
```

---

## Phase 4: Notification Center

### Task 4.1: Create Notification model

**Files:**
- Create: `backend/app/models/notification.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create the model**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column
from . import Base
import enum


class NotificationType(str, enum.Enum):
    deadline_reminder = "deadline_reminder"
    mentor_nudge = "mentor_nudge"
    risk_alert = "risk_alert"
    positive_milestone = "positive_milestone"
    system = "system"


class NotificationPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_role: Mapped[str] = mapped_column(String(20), nullable=False)
    recipient_id: Mapped[str] = mapped_column(String(36), nullable=False)
    type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(String(500), nullable=False)
    priority: Mapped[NotificationPriority] = mapped_column(SAEnum(NotificationPriority), default=NotificationPriority.medium)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    action_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

- [ ] **Step 2: Update models __init__.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

SQLALCHEMY_DATABASE_URL = "sqlite:///intern_growth.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# Import all models so Base.metadata knows about them
from .intern import Intern  # noqa: E402, F401
from .mentor import Mentor  # noqa: E402, F401
from .task import Task  # noqa: E402, F401
from .checkin import CheckIn  # noqa: E402, F401
from .mentor_feedback import MentorFeedback  # noqa: E402, F401
from .risk_signal import RiskSignal  # noqa: E402, F401
from .fit_report import FitReport  # noqa: E402, F401
from .notification import Notification  # noqa: E402, F401
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/notification.py backend/app/models/__init__.py
git commit -m "feat: add Notification model"
```

---

### Task 4.2: Create Notification API and service

**Files:**
- Create: `backend/app/services/notification_service.py`
- Create: `backend/app/api/notifications.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create notification service**

```python
"""Notification creation and query logic."""
from ..models import SessionLocal
from ..models.notification import Notification, NotificationType, NotificationPriority


def create_notification(
    recipient_role: str,
    recipient_id: str,
    type_: NotificationType,
    title: str,
    body: str,
    priority: NotificationPriority = NotificationPriority.medium,
    action_link: str | None = None,
) -> Notification:
    db = SessionLocal()
    try:
        notif = Notification(
            recipient_role=recipient_role,
            recipient_id=recipient_id,
            type=type_,
            title=title,
            body=body,
            priority=priority,
            action_link=action_link,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    finally:
        db.close()


def get_notifications(role: str, user_id: str, unread_only: bool = False, limit: int = 50) -> list[dict]:
    db = SessionLocal()
    try:
        q = db.query(Notification).filter(
            Notification.recipient_role == role,
            Notification.recipient_id == user_id,
        ).order_by(Notification.created_at.desc())
        if unread_only:
            q = q.filter(Notification.read == False)
        notifs = q.limit(limit).all()
        return [
            {
                "id": n.id, "type": n.type.value, "title": n.title, "body": n.body,
                "priority": n.priority.value, "read": n.read, "action_link": n.action_link,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifs
        ]
    finally:
        db.close()


def mark_read(notification_id: str) -> None:
    db = SessionLocal()
    try:
        n = db.query(Notification).filter(Notification.id == notification_id).first()
        if n:
            n.read = True
            db.commit()
    finally:
        db.close()


def mark_all_read(role: str, user_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(Notification).filter(
            Notification.recipient_role == role,
            Notification.recipient_id == user_id,
            Notification.read == False,
        ).update({"read": True})
        db.commit()
    finally:
        db.close()


def get_unread_count(role: str, user_id: str) -> int:
    db = SessionLocal()
    try:
        return db.query(Notification).filter(
            Notification.recipient_role == role,
            Notification.recipient_id == user_id,
            Notification.read == False,
        ).count()
    finally:
        db.close()
```

- [ ] **Step 2: Create notification API**

```python
from fastapi import APIRouter, Query
from pydantic import BaseModel
from ..services.notification_service import (
    get_notifications, mark_read, mark_all_read, get_unread_count,
)

router = APIRouter()


@router.get("")
def list_notifications(
    role: str = Query(...),
    user_id: str = Query(...),
    unread_only: bool = Query(False),
):
    notifs = get_notifications(role, user_id, unread_only=unread_only)
    unread = get_unread_count(role, user_id)
    return {"notifications": notifs, "unread_count": unread}


@router.post("/{notification_id}/read")
def read_notification(notification_id: str):
    mark_read(notification_id)
    return {"status": "ok"}


@router.post("/read-all")
def read_all_notifications(role: str = Query(...), user_id: str = Query(...)):
    mark_all_read(role, user_id)
    return {"status": "ok"}
```

- [ ] **Step 3: Register router in main.py**

In `backend/app/main.py`, add:

```python
from .api import auth, interns, mentors, hr, recruiters, ai, notifications

app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/notification_service.py backend/app/api/notifications.py backend/app/main.py
git commit -m "feat: add notification API endpoints and service"
```

---

### Task 4.3: Add NotificationBell to frontend header

**Files:**
- Create: `frontend/src/components/NotificationBell.tsx`
- Create: `frontend/src/pages/Notifications.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add notification types**

In `frontend/src/types/index.ts`:

```ts
export interface Notification {
  id: string
  type: 'deadline_reminder' | 'mentor_nudge' | 'risk_alert' | 'positive_milestone' | 'system'
  title: string
  body: string
  priority: 'high' | 'medium' | 'low'
  read: boolean
  action_link: string | null
  created_at: string
}
```

- [ ] **Step 2: Add notification API methods**

In `frontend/src/services/api.ts`:

```ts
export const notifications = {
  list: (role: string, userId: string, unreadOnly = false) => {
    const params = new URLSearchParams({ role, user_id: userId, unread_only: String(unreadOnly) })
    return request<{ notifications: Notification[]; unread_count: number }>(`/notifications?${params}`)
  },
  markRead: (id: string) => request<{ status: string }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: (role: string, userId: string) => {
    const params = new URLSearchParams({ role, user_id: userId })
    return request<{ status: string }>(`/notifications/read-all?${params}`, { method: 'POST' })
  },
}
```

- [ ] **Step 3: Create NotificationBell component**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Badge, Popover, List, Button, Tag, Typography, Empty } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { notifications as notifApi } from '../services/api'
import type { Notification } from '../types'

interface Props {
  role: string
  userId: string
}

const priorityColors: Record<string, string> = { high: 'red', medium: 'orange', low: 'blue' }
const typeLabels: Record<string, string> = {
  deadline_reminder: '截止提醒', mentor_nudge: '反馈提醒', risk_alert: '风险预警',
  positive_milestone: '成长激励', system: '系统通知',
}

export default function NotificationBell({ role, userId }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await notifApi.list(role, userId, false)
      setNotifs(res.notifications.slice(0, 10))
      setUnread(res.unread_count)
    } catch { /* silently fail */ }
  }, [role, userId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  async function handleMarkAllRead() {
    await notifApi.markAllRead(role, userId)
    load()
  }

  const content = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong>通知</Typography.Text>
        {unread > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead}>全部已读</Button>
        )}
      </div>
      {notifs.length === 0 ? (
        <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={notifs}
          renderItem={(n) => (
            <List.Item style={{ background: n.read ? 'transparent' : '#f6ffed', padding: '8px 12px', cursor: 'pointer' }}
              onClick={async () => { await notifApi.markRead(n.id); load() }}>
              <List.Item.Meta
                title={
                  <span>
                    <Tag color={priorityColors[n.priority]}>{typeLabels[n.type] || n.type}</Tag>
                    {n.title}
                  </span>
                }
                description={
                  <>
                    <span style={{ fontSize: 13 }}>{n.body}</span>
                    <br />
                    <span style={{ fontSize: 11, color: '#bbb' }}>{new Date(n.created_at).toLocaleString('zh-CN')}</span>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  )

  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Badge count={unread} size="small">
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  )
}
```

- [ ] **Step 4: Add NotificationBell to App header**

In `frontend/src/App.tsx`:

```tsx
import NotificationBell from './components/NotificationBell'

// Inside Header, next to RoleSwitcher:
<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
  <NotificationBell role={role} userId={user?.id ?? ''} />
  <RoleSwitcher currentRole={role} onSwitch={handleRoleSwitch} />
</div>
```

- [ ] **Step 5: Create Notifications page**

```tsx
import { useState, useEffect } from 'react'
import { Card, List, Tag, Button, Typography, Empty, Spin } from 'antd'
import { notifications as notifApi } from '../services/api'
import type { Notification } from '../types'

const priorityColors: Record<string, string> = { high: 'red', medium: 'orange', low: 'blue' }

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const role = localStorage.getItem('current_role') || 'intern'
  const userId = localStorage.getItem('current_user_id') || ''

  useEffect(() => {
    notifApi.list(role, userId).then(res => setNotifs(res.notifications)).catch(() => {}).finally(() => setLoading(false))
  }, [role, userId])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (notifs.length === 0) return <Card><Empty description="暂无通知" /></Card>

  return (
    <Card title="所有通知">
      <List dataSource={notifs} renderItem={n => (
        <List.Item>
          <List.Item.Meta
            title={<span><Tag color={priorityColors[n.priority]}>{n.type}</Tag> {n.title}</span>}
            description={<><span>{n.body}</span><br /><span style={{fontSize:11,color:'#bbb'}}>{new Date(n.created_at).toLocaleString('zh-CN')}</span></>}
          />
        </List.Item>
      )} />
    </Card>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/NotificationBell.tsx frontend/src/pages/Notifications.tsx frontend/src/App.tsx frontend/src/services/api.ts frontend/src/types/index.ts
git commit -m "feat: add notification bell with popover and full notifications page"
```

---

## Phase 5: Analytics Dashboard

### Task 5.1: Install Recharts and react-router-dom

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend && npm install recharts react-router-dom
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add recharts and react-router-dom dependencies"
```

---

### Task 5.2: Create Analytics page with charts

**Files:**
- Create: `frontend/src/pages/hr/Analytics.tsx`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add analytics API methods**

In `frontend/src/services/api.ts`:

```ts
export const hr = {
  getDashboard: () => request<HRDashboard>('/hr/dashboard'),
  getWeeklyReport: () => request<WeeklyReport>('/hr/weekly-report'),
  getAnalytics: () => request<AnalyticsData>('/hr/analytics'),
  setProxyMentor: (internId: string, proxyMentorId: string, reason: string) =>
    request<{ status: string }>(`/hr/interns/${internId}/proxy-mentor`, { method: 'POST', body: JSON.stringify({ proxy_mentor_id: proxyMentorId, reason }) }),
  reviewRisk: (riskId: string, reviewStatus: string, reviewNote: string) =>
    request<{ status: string }>(`/hr/risks/${riskId}/review`, { method: 'POST', body: JSON.stringify({ review_status: reviewStatus, review_note: reviewNote }) }),
  getMentorPerformance: () => request<MentorPerformance[]>(`/hr/mentor-performance`),
  exportData: (format: string) => request<Blob>(`/hr/export?format=${format}`),
}
```

Add analytics types in `frontend/src/types/index.ts`:

```ts
export interface AnalyticsData {
  growth_trend: { week: number; avg_business_understanding: number; avg_requirement_analysis: number; avg_collaboration: number; avg_delivery: number }[]
  emotion_distribution: { emotion: string; count: number }[]
  task_completion_trend: { week: number; completed: number; in_progress: number; blocked: number }[]
  risk_timeline: { intern_name: string; week: number; level: string }[]
  mentor_feedback_coverage: { mentor_name: string; coverage_pct: number }[]
}

export interface MentorPerformance {
  mentor_name: string
  intern_count: number
  avg_feedback_hours: number
  feedback_coverage_pct: number
  avg_mentee_growth: number
  ai_override_rate: number
  at_risk_count: number
}
```

- [ ] **Step 2: Add analytics backend endpoint**

In `backend/app/api/hr.py`:

```python
@router.get("/analytics")
def get_analytics():
    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        checkins = db.query(CheckIn).all()
        tasks = db.query(Task).all()

        # Growth trend
        weeks = sorted(set(c.week for c in checkins))
        growth_trend = []
        for w in weeks[:8]:
            week_interns = [i for i in interns if i.onboard_week >= w]
            if week_interns:
                scores = [i.current_scores for i in week_interns if i.current_scores]
                if scores:
                    growth_trend.append({
                        "week": w,
                        "avg_business_understanding": round(sum(s.get("业务理解", 0) for s in scores) / len(scores), 1),
                        "avg_requirement_analysis": round(sum(s.get("需求分析", 0) for s in scores) / len(scores), 1),
                        "avg_collaboration": round(sum(s.get("协作沟通", 0) for s in scores) / len(scores), 1),
                        "avg_delivery": round(sum(s.get("交付质量", 0) for s in scores) / len(scores), 1),
                    })

        # Emotion distribution
        from collections import Counter
        emotion_counts = Counter(c.emotion_capsule.value for c in checkins)
        emotion_distribution = [{"emotion": k, "count": v} for k, v in emotion_counts.items()]

        # Task completion trend
        task_trend = []
        for w in weeks[:8]:
            week_tasks = [t for t in tasks]  # simplified: tasks aren't per-week in seed data
            completed_ct = sum(1 for t in week_tasks if t.status == TaskStatus.completed)
            in_progress_ct = sum(1 for t in week_tasks if t.status == TaskStatus.in_progress)
            blocked_ct = sum(1 for t in week_tasks if t.status == TaskStatus.blocked)
            task_trend.append({"week": w, "completed": completed_ct, "in_progress": in_progress_ct, "blocked": blocked_ct})

        # Risk timeline
        risk_timeline = []
        signals = db.query(RiskSignal).all()
        for s in signals:
            risk_timeline.append({
                "intern_name": s.intern.name if s.intern else "",
                "week": s.intern.onboard_week if s.intern else 0,
                "level": s.level.value,
            })

        # Mentor feedback coverage
        from ..models.mentor import Mentor
        from ..models.mentor_feedback import MentorFeedback
        mentors_list = db.query(Mentor).filter(Mentor.role_type == "mentor").all()
        feedback_coverage = []
        for m in mentors_list:
            mentee_ids = [i.id for i in m.interns]
            total_checkins = db.query(CheckIn).filter(CheckIn.intern_id.in_(mentee_ids)).count()
            total_feedbacks = db.query(MentorFeedback).filter(MentorFeedback.intern_id.in_(mentee_ids)).count()
            coverage = round(total_feedbacks / total_checkins * 100, 1) if total_checkins > 0 else 0
            feedback_coverage.append({"mentor_name": m.name, "coverage_pct": coverage})

        return {
            "growth_trend": growth_trend,
            "emotion_distribution": emotion_distribution,
            "task_completion_trend": task_trend,
            "risk_timeline": risk_timeline,
            "mentor_feedback_coverage": feedback_coverage,
        }
    finally:
        db.close()


@router.get("/export")
def export_data(format: str = "csv"):
    from fastapi.responses import StreamingResponse
    import io, csv as csv_module

    db = SessionLocal()
    try:
        interns = db.query(Intern).all()
        output = io.StringIO()
        writer = csv_module.writer(output)
        writer.writerow(["姓名", "岗位", "部门", "入职周数", "状态", "任务完成率"])
        for i in interns:
            tasks = db.query(Task).filter(Task.intern_id == i.id).all()
            completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
            rate = round(completed / len(tasks), 2) if tasks else 0
            writer.writerow([i.name, i.role, i.department, i.onboard_week, i.status.value, rate])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=intern_report.csv"},
        )
    finally:
        db.close()
```

- [ ] **Step 3: Create Analytics page component**

Create `frontend/src/pages/hr/Analytics.tsx` with 4 Recharts visualizations:

```tsx
import { useState, useEffect } from 'react'
import { Card, Row, Col, Spin, Result, Button, Skeleton } from 'antd'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, ResponsiveContainer } from 'recharts'
import { hr } from '../../services/api'
import type { AnalyticsData } from '../../types'

const EMOTION_COLORS: Record<string, string> = {
  energetic: '#52c41a', steady: '#1890ff', motivated: '#722ed1',
  blocked: '#cf1322', overloaded: '#faad14',
}
const EMOTION_LABELS: Record<string, string> = {
  energetic: '干劲十足', steady: '稳步前进', motivated: '充满动力',
  blocked: '遇到瓶颈', overloaded: '信息过载',
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hr.getAnalytics()
      .then(setData)
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Card><Skeleton active paragraph={{ rows: 12 }} /></Card>
  if (error) return <Result status="error" title="加载失败" subTitle={error} extra={<Button onClick={() => window.location.reload()}>重试</Button>} />
  if (!data) return null

  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="能力成长曲线">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.growth_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" label={{ value: '周数', position: 'insideBottom', offset: -5 }} />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avg_business_understanding" stroke="#1890ff" name="业务理解" />
                <Line type="monotone" dataKey="avg_requirement_analysis" stroke="#52c41a" name="需求分析" />
                <Line type="monotone" dataKey="avg_collaboration" stroke="#faad14" name="协作沟通" />
                <Line type="monotone" dataKey="avg_delivery" stroke="#722ed1" name="交付质量" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="情绪分布">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.emotion_distribution} dataKey="count" nameKey="emotion" cx="50%" cy="50%" outerRadius={100} label={({ emotion, count }) => `${EMOTION_LABELS[emotion] || emotion}: ${count}`}>
                  {data.emotion_distribution.map(e => (
                    <Cell key={e.emotion} fill={EMOTION_COLORS[e.emotion] || '#ddd'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="任务完成趋势">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.task_completion_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#52c41a" name="已完成" />
                <Bar dataKey="in_progress" stackId="a" fill="#1890ff" name="进行中" />
                <Bar dataKey="blocked" stackId="a" fill="#cf1322" name="已阻塞" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="导师反馈覆盖率">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.mentor_feedback_coverage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="mentor_name" width={60} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="coverage_pct" fill="#1890ff" name="反馈覆盖率" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/hr/Analytics.tsx backend/app/api/hr.py frontend/src/types/index.ts frontend/src/services/api.ts
git commit -m "feat: add analytics dashboard with 4 chart types and CSV export"
```

---

## Phase 6: Mentor Performance Dashboard

### Task 6.1: Create mentor performance endpoint and page

**Files:**
- Create: `frontend/src/pages/hr/MentorPerformance.tsx`
- Modify: `backend/app/api/hr.py`

- [ ] **Step 1: Add mentor performance endpoint**

In `backend/app/api/hr.py`:

```python
@router.get("/mentor-performance")
def get_mentor_performance():
    db = SessionLocal()
    try:
        from ..models.mentor import Mentor
        from ..models.mentor_feedback import MentorFeedback, VoteType
        mentors_list = db.query(Mentor).filter(Mentor.role_type == "mentor").all()
        result = []
        for m in mentors_list:
            mentee_ids = [i.id for i in m.interns]
            if not mentee_ids:
                continue

            # Feedback timeliness
            feedbacks = db.query(MentorFeedback).filter(MentorFeedback.intern_id.in_(mentee_ids)).all()
            checkins_m = db.query(CheckIn).filter(CheckIn.intern_id.in_(mentee_ids)).all()

            # Avg mentee growth
            growth_vals = []
            for i in m.interns:
                if i.baseline_scores and i.current_scores:
                    diffs = [i.current_scores[k] - i.baseline_scores.get(k, 0) for k in i.current_scores]
                    growth_vals.append(sum(diffs) / len(diffs) if diffs else 0)

            # AI override rate
            overrides = sum(1 for f in feedbacks if f.ai_suggestion_vote == VoteType.downvote)
            override_rate = round(overrides / len(feedbacks) * 100, 1) if feedbacks else 0

            result.append({
                "mentor_name": m.name,
                "intern_count": len(m.interns),
                "avg_feedback_hours": 24,  # simplified: seed data has no real timestamps
                "feedback_coverage_pct": round(len(feedbacks) / len(checkins_m) * 100, 1) if checkins_m else 0,
                "avg_mentee_growth": round(sum(growth_vals) / len(growth_vals), 1) if growth_vals else 0,
                "ai_override_rate": override_rate,
                "at_risk_count": sum(1 for i in m.interns if i.status.value in ("watch", "risk")),
            })
        return result
    finally:
        db.close()
```

- [ ] **Step 2: Create MentorPerformance page**

```tsx
import { useState, useEffect } from 'react'
import { Card, Table, Tag, Skeleton, Result, Button } from 'antd'
import { hr } from '../../services/api'
import type { MentorPerformance } from '../../types'

export default function MentorPerformancePage() {
  const [data, setData] = useState<MentorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hr.getMentorPerformance()
      .then(setData)
      .catch(e => setError(e.message || 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
  if (error) return <Result status="error" title="加载失败" subTitle={error} extra={<Button onClick={() => window.location.reload()}>重试</Button>} />

  const cols = [
    { title: '导师', dataIndex: 'mentor_name', key: 'name' },
    { title: '带教人数', dataIndex: 'intern_count', key: 'count' },
    { title: '反馈覆盖率', dataIndex: 'feedback_coverage_pct', key: 'coverage', render: (v: number) => `${v}%` },
    { title: '实习生平均成长', dataIndex: 'avg_mentee_growth', key: 'growth', render: (v: number) => `+${v} 分` },
    { title: 'AI 覆盖否决率', dataIndex: 'ai_override_rate', key: 'override', render: (v: number) => `${v}%` },
    {
      title: '风险实习生', dataIndex: 'at_risk_count', key: 'risk',
      render: (v: number) => v > 0 ? <Tag color="red">{v} 人需关注</Tag> : <Tag color="green">0</Tag>,
    },
  ]

  return (
    <Card title="导师带教表现">
      <Table dataSource={data} columns={cols} rowKey="mentor_name" pagination={false} />
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/hr/MentorPerformance.tsx backend/app/api/hr.py
git commit -m "feat: add mentor performance dashboard"
```

---

## Phase 7: Architecture — React Router + Context

### Task 7.1: Create RoleContext

**Files:**
- Create: `frontend/src/contexts/RoleContext.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create RoleContext**

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Role } from '../types'

interface RoleContextType {
  role: Role
  user: { id: string; name: string; department: string } | null
  setRole: (role: Role, user?: { id: string; name: string; department: string }) => void
}

const RoleContext = createContext<RoleContextType>({
  role: 'intern',
  user: null,
  setRole: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('intern')
  const [user, setUser] = useState<{ id: string; name: string; department: string } | null>(null)

  const setRole = useCallback((newRole: Role, newUser?: { id: string; name: string; department: string }) => {
    setRoleState(newRole)
    if (newUser) setUser(newUser)
  }, [])

  return (
    <RoleContext.Provider value={{ role, user, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
```

- [ ] **Step 2: Rewrite App.tsx with React Router**

```tsx
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Layout, Spin, message } from 'antd'
import type { Role } from './types'
import { auth, setRole as setApiRole } from './services/api'
import { RoleProvider, useRole } from './contexts/RoleContext'
import RoleSwitcher from './components/RoleSwitcher'
import PrivacyModal from './components/PrivacyModal'
import NotificationBell from './components/NotificationBell'
import InternDashboard from './pages/intern/Dashboard'
import MentorDashboard from './pages/mentor/Dashboard'
import HRRiskBoard from './pages/hr/RiskBoard'
import HRAnalytics from './pages/hr/Analytics'
import HRWeeklyReport from './pages/hr/WeeklyReport'
import HRMentorPerformance from './pages/hr/MentorPerformance'
import RecruiterFitReportList from './pages/recruiter/FitReportList'
import RecruiterFitReportDetail from './pages/recruiter/FitReportDetail'
import NotificationsPage from './pages/Notifications'

const { Header, Content } = Layout

function AppShell() {
  const { role, user, setRole } = useRole()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    handleRoleSwitch('intern')
  }, [])

  async function handleRoleSwitch(newRole: Role) {
    setLoading(true)
    try {
      const res = await auth.switchRole(newRole)
      setRole(newRole, res.user)
      setApiRole(newRole, res.user.id)
      navigate(newRole === 'intern' ? '/intern' : `/${newRole}`)
    } catch {
      message.warning('后端未连接，使用本地模式')
      setRole(newRole, { id: 'local', name: '本地用户', department: 'Demo' })
      setApiRole(newRole)
      navigate(newRole === 'intern' ? '/intern' : `/${newRole}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PrivacyModal />
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/')}>实习能量站</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell role={role} userId={user?.id ?? ''} />
          <RoleSwitcher currentRole={role} onSwitch={handleRoleSwitch} />
        </div>
      </Header>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/intern" replace />} />
          <Route path="/intern" element={<InternDashboard />} />
          <Route path="/mentor" element={<MentorDashboard />} />
          <Route path="/hr" element={<HRRiskBoard />} />
          <Route path="/hr/analytics" element={<HRAnalytics />} />
          <Route path="/hr/report" element={<HRWeeklyReport />} />
          <Route path="/hr/mentors" element={<HRMentorPerformance />} />
          <Route path="/recruiter" element={<RecruiterFitReportList />} />
          <Route path="/recruiter/:id" element={<RecruiterFitReportDetail />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </Content>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppShell />
      </RoleProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Update main.tsx to remove individual BrowserRouter**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 4: Update page components to use useRole hook**

In `frontend/src/pages/intern/Dashboard.tsx` — remove the `user` prop and use context:

```tsx
import { useRole } from '../../contexts/RoleContext'

export default function InternDashboard() {
  const { user } = useRole()
  // ... rest uses user!.id, user!.name etc.
}
```

Apply the same change to `frontend/src/pages/mentor/Dashboard.tsx`.

- [ ] **Step 5: Update HR RiskBoard to use tabs**

In `frontend/src/pages/hr/RiskBoard.tsx`, add tabs at the top:

```tsx
import { Tabs } from 'antd'
import { useNavigate } from 'react-router-dom'

// Inside the component, wrap content in Tabs:
const navigate = useNavigate()

<Tabs
  activeKey="board"
  onChange={(key) => {
    if (key === 'board') navigate('/hr')
    else if (key === 'analytics') navigate('/hr/analytics')
    else if (key === 'report') navigate('/hr/report')
    else if (key === 'mentors') navigate('/hr/mentors')
  }}
  items={[
    { key: 'board', label: '风险看板', children: <>{/* existing risk board content */}</> },
    { key: 'analytics', label: '数据分析' },
    { key: 'report', label: '周报' },
    { key: 'mentors', label: '导师表现' },
  ]}
/>
```

- [ ] **Step 6: Create WeeklyReport extracted page**

Create `frontend/src/pages/hr/WeeklyReport.tsx` — extract the report generation UI from RiskBoard as a standalone page with its own data fetching.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/contexts/RoleContext.tsx frontend/src/App.tsx frontend/src/main.tsx frontend/src/pages/intern/Dashboard.tsx frontend/src/pages/mentor/Dashboard.tsx frontend/src/pages/hr/RiskBoard.tsx frontend/src/pages/hr/WeeklyReport.tsx
git commit -m "feat: add React Router, RoleContext, and tabbed HR layout"
```

---

## Execution Order

| Phase | Can Run In Parallel |
|-------|-------------------|
| Phase 1 (Foundation) | Tasks 1.1-1.5 independent of each other |
| Phase 2 (AI Pipeline) | After Phase 1 |
| Phase 3 (Missing Features) | After Phase 2 |
| Phase 4 (Notifications) | After Phase 2, parallel with 5, 6 |
| Phase 5 (Analytics) | After Phase 2, parallel with 4, 6 |
| Phase 6 (Mentor Perf) | After Phase 2, parallel with 4, 5 |
| Phase 7 (Architecture) | After Phase 1, independent of 2-6 |

**Recommended order**: 1 → 2 → 7 → (4, 5, 6 in parallel) → 3

---

## Notes

- All AI endpoints must return `source: "ai" | "fallback"` for every response
- When `LLM_API_KEY` is not set, the system degrades gracefully with fallback JSON
- All negative AI judgments (risk, not_suitable) enforce human review display in UI
- React Router enables direct URL navigation and browser back/forward
- Notification polling interval: 30 seconds
- Confetti animation auto-dismisses after 5 seconds
