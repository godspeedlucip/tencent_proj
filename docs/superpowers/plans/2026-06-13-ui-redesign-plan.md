# UI Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply index.html's glassmorphism design language to the 实习能量站 frontend — warm amber gradient background, glass cards, custom stats/tags/buttons, CSS animations.

**Architecture:** Hybrid approach — replace Ant Design visual components (Card, Statistic, Progress, Tag, Button) with custom Tailwind+CSS, keep complex interactive components (Table, Modal, Select, Form) via Ant Design ConfigProvider theme override. All new styles live in Tailwind config + index.css utility classes. No new npm dependencies.

**Tech Stack:** React 18, TypeScript, Ant Design 5, Tailwind CSS 3, Vite

---

## File Structure

```
frontend/
├── tailwind.config.js          # MODIFY: extend brand/surface colors, glass shadows
├── src/
│   ├── index.css               # MODIFY: glass utilities, animations, page bg
│   ├── App.tsx                 # MODIFY: remove Layout, glass nav, gradient bg
│   ├── components/
│   │   └── RoleSwitcher.tsx    # MODIFY: capsule Tag, rounded Select
│   └── pages/
│       ├── intern/
│       │   ├── Dashboard.tsx   # MODIFY: stat cards, progress bars, buttons
│       │   ├── CheckIn.tsx     # MODIFY: minor glass style on Modal (ConfigProvider)
│       │   ├── Tasks.tsx       # MODIFY: glass-card wrapper, capsule tags
│       │   └── Baseline.tsx    # MODIFY: glass-card container
│       ├── mentor/
│       │   ├── Dashboard.tsx   # MODIFY: glass-card wrapper, capsule tags/buttons
│       │   ├── Feedback.tsx    # MODIFY: minor — ConfigProvider handles Modal
│       │   └── TalkingPoints.tsx # MODIFY: minor — ConfigProvider handles Modal
│       ├── hr/
│       │   └── RiskBoard.tsx   # MODIFY: stat cards, capsule tags
│       └── recruiter/
│           ├── FitReportList.tsx # MODIFY: glass-card wrapper, capsule tags
│           └── FitReportDetail.tsx # MODIFY: glass-card wrapper, capsule tags
```

---

### Task 1: Tailwind Config — Design Tokens

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Extend Tailwind theme with brand colors and glass tokens**

Replace the current empty `extend: {}` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        surface: {
          glass: 'rgba(255, 255, 255, 0.6)',
          border: 'rgba(253, 230, 138, 0.3)',
        },
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(245, 158, 11, 0.08)',
        'glass-hover': '0 12px 32px rgba(245, 158, 11, 0.12)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'bounce-arrow': 'bounce 2s infinite',
        'progress-fill': 'progressFill 0.6s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        progressFill: {
          '0%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify Tailwind config is valid**

Run: `cd frontend && npx tailwindcss --help > /dev/null 2>&1 && echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "feat: extend Tailwind config with brand colors, glass tokens, and animations"
```

---

### Task 2: CSS Foundation — Utilities, Background, Animations

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Replace index.css with glassmorphism utilities and page styles**

Replace the current file content with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Page background — warm gradient from index.html */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #fffbeb 0%, #f0f9ff 100%);
  min-height: 100vh;
  color: #334155;
  line-height: 1.6;
}

/* Glass card — the core visual signature */
.glass-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(253, 230, 138, 0.3);
  box-shadow: 0 4px 24px rgba(245, 158, 11, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(245, 158, 11, 0.12);
}

/* Glass nav — sticky header */
.glass-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(253, 230, 138, 0.3);
}

/* Gradient text — for logo */
.gradient-text {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Stat value — large centered number */
.stat-value {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
}

/* Custom progress bar */
.progress-track {
  height: 6px;
  background: rgba(253, 230, 138, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease-out;
}

/* Capsule tag — replaces Ant Design Tag */
.capsule-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 12px;
  border-radius: 14px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid;
}

/* Button variants */
.btn-primary {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  transition: opacity 0.2s, transform 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(253, 230, 138, 0.4);
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
}

.btn-link {
  background: transparent;
  border: none;
  padding: 8px 16px;
  font-size: 0.85rem;
  color: #f59e0b;
  font-weight: 600;
  cursor: pointer;
}

/* Page entrance animation — stagger children */
.stagger-in > * {
  opacity: 0;
  animation: fadeInUp 0.4s ease-out forwards;
}

.stagger-in > *:nth-child(1) { animation-delay: 0s; }
.stagger-in > *:nth-child(2) { animation-delay: 0.05s; }
.stagger-in > *:nth-child(3) { animation-delay: 0.1s; }
.stagger-in > *:nth-child(4) { animation-delay: 0.15s; }
.stagger-in > *:nth-child(5) { animation-delay: 0.2s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ant Design override: transparent table header */
.ant-table-thead > tr > th {
  background: transparent !important;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .glass-card,
  .btn-primary,
  .progress-fill,
  .stagger-in > * {
    transition: none !important;
    animation: none !important;
  }
}

/* Focus visible — accessibility */
:focus-visible {
  outline: 2px solid #f59e0b;
  outline-offset: 2px;
}
```

- [ ] **Step 2: Verify CSS compiles**

Run: `cd frontend && npx tailwindcss -i src/index.css -o /dev/null --dry-run 2>&1 | head -5 || echo "checking direct..." && npx vite build --emptyOutDir 2>&1 | tail -3`
Expected: Build succeeds with no CSS errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add glassmorphism CSS utilities, animations, and page background"
```

---

### Task 3: App Shell — Glass Nav + Gradient Background

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace Ant Design Layout with custom shell**

Replace the file content with:

```tsx
import { useState, useEffect } from 'react'
import { ConfigProvider, Spin, message } from 'antd'
import type { Role } from './types'
import { auth, setRole as setApiRole } from './services/api'
import RoleSwitcher from './components/RoleSwitcher'
import PrivacyModal from './components/PrivacyModal'
import InternDashboard from './pages/intern/Dashboard'
import MentorDashboard from './pages/mentor/Dashboard'
import HRDashboard from './pages/hr/RiskBoard'
import RecruiterFitReportList from './pages/recruiter/FitReportList'

const antTheme = {
  token: {
    colorPrimary: '#f59e0b',
    borderRadius: 8,
    colorBgContainer: 'rgba(255,255,255,0.6)',
  },
}

export default function App() {
  const [role, setRole] = useState<Role>('intern')
  const [user, setUser] = useState<{ id: string; name: string; department: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    handleRoleSwitch('intern')
  }, [])

  async function handleRoleSwitch(newRole: Role) {
    setLoading(true)
    try {
      const res = await auth.switchRole(newRole)
      setRole(newRole)
      setUser(res.user)
      setApiRole(newRole, res.user.id)
    } catch {
      message.warning('后端未连接，使用本地模式')
      setRole(newRole)
      setUser({ id: 'local', name: '本地用户', department: 'Demo' })
      setApiRole(newRole)
    } finally {
      setLoading(false)
    }
  }

  function renderPage() {
    if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
    switch (role) {
      case 'intern': return <InternDashboard user={user!} />
      case 'mentor': return <MentorDashboard user={user!} />
      case 'hr': return <HRDashboard />
      case 'recruiter': return <RecruiterFitReportList />
    }
  }

  return (
    <ConfigProvider theme={antTheme}>
      <PrivacyModal />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav className="glass-nav" style={{ padding: '12px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="gradient-text" style={{ fontSize: '1.1rem', fontWeight: 800 }}>实习能量站</span>
            <RoleSwitcher currentRole={role} onSwitch={handleRoleSwitch} />
          </div>
        </nav>
        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {renderPage()}
          </div>
        </main>
      </div>
    </ConfigProvider>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only pre-existing errors unrelated to our changes)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: replace Ant Design Layout with glass nav, gradient background, and ConfigProvider theme"
```

---

### Task 4: RoleSwitcher — Capsule Style

**Files:**
- Modify: `frontend/src/components/RoleSwitcher.tsx`

- [ ] **Step 1: Update Tag and Select to glass-compatible styles**

Replace the file content with:

```tsx
import { Select, Space } from 'antd'
import { UserOutlined, SolutionOutlined, DashboardOutlined, IdcardOutlined } from '@ant-design/icons'
import type { Role } from '../types'

const roleOptions: { value: Role; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'intern', label: '实习生', icon: <UserOutlined />, color: '#3b82f6' },
  { value: 'mentor', label: '导师', icon: <SolutionOutlined />, color: '#10b981' },
  { value: 'hr', label: 'HR', icon: <DashboardOutlined />, color: '#8b5cf6' },
  { value: 'recruiter', label: '招聘', icon: <IdcardOutlined />, color: '#f59e0b' },
]

interface Props {
  currentRole: Role
  onSwitch: (role: Role) => void
}

export default function RoleSwitcher({ currentRole, onSwitch }: Props) {
  const current = roleOptions.find((r) => r.value === currentRole)!

  return (
    <Space size={12}>
      <span
        className="capsule-tag"
        style={{
          background: `${current.color}15`,
          borderColor: `${current.color}30`,
          color: current.color,
          fontWeight: 600,
        }}
      >
        {current.icon}
        <span style={{ marginLeft: 6 }}>{current.label}视角</span>
      </span>
      <Select
        value={currentRole}
        onChange={onSwitch}
        style={{ width: 110 }}
        size="small"
        options={roleOptions.map((r) => ({
          value: r.value,
          label: (
            <Space size={6}>
              {r.icon}
              {r.label}
            </Space>
          ),
        }))}
      />
    </Space>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/RoleSwitcher.tsx
git commit -m "feat: update RoleSwitcher with capsule tag and glass-compatible styles"
```

---

### Task 5: Intern Dashboard — Full Visual Rewrite

**Files:**
- Modify: `frontend/src/pages/intern/Dashboard.tsx`

- [ ] **Step 1: Rewrite with glass cards, custom stats, gradient progress bars**

Replace the file content with:

```tsx
import { useState, useEffect } from 'react'
import { Spin, Alert, Button } from 'antd'
import { TrophyOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { interns, ai } from '../../services/api'
import type { Intern, Task, AIDailyTip } from '../../types'
import CheckIn from './CheckIn'
import Tasks from './Tasks'
import Baseline from './Baseline'

interface Props { user: { id: string; name: string; department: string } }

export default function InternDashboard({ user }: Props) {
  const [intern, setIntern] = useState<(Intern & { recent_checkins?: any[] }) | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [dailyTip, setDailyTip] = useState<AIDailyTip | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckin, setShowCheckin] = useState(false)

  useEffect(() => {
    loadData()
  }, [user.id])

  async function loadData() {
    try {
      const [i, t, tip] = await Promise.all([
        interns.get(user.id),
        interns.getTasks(user.id).then(r => r.tasks),
        ai.getDailyTip(user.id).catch(() => ({ tip: '加载AI建议...', source: 'fallback', generated_at: '' })),
      ])
      setIntern(i)
      setTasks(t)
      setDailyTip(tip)
    } catch {
      setIntern(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (!intern) return <Alert message="请先确保后端已启动并执行 python -m app.seed 初始化数据" type="warning" />

  const scoreDiff = intern.baseline_scores && intern.current_scores
    ? Object.keys(intern.current_scores).filter(k => (intern.current_scores?.[k] ?? 0) - (intern.baseline_scores?.[k] ?? 0) >= 2).length
    : 0

  const dimCount = Object.keys(intern.current_scores ?? {}).length
  const avgScore = intern.current_scores
    ? Math.round(Object.values(intern.current_scores).reduce((a, b) => a + b, 0) / dimCount * 10) / 10
    : 0

  return (
    <div>
      {intern.baseline_scores === null && <Baseline internId={user.id} onComplete={loadData} />}
      {showCheckin && <CheckIn internId={user.id} currentWeek={intern.onboard_week} onClose={() => { setShowCheckin(false); loadData() }} />}

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        欢迎回来，{intern.name}
        <span className="capsule-tag" style={{ marginLeft: 12, background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)', color: '#1e40af', fontSize: '0.8rem', fontWeight: 500 }}>
          第 {intern.onboard_week} 周
        </span>
      </h2>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>任务完成率</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {Math.round((intern.task_completion_rate ?? 0) * 100)}<span style={{ fontSize: '1rem' }}>%</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>本周统计</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>能力提升维度</div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>
            {scoreDiff}<span style={{ fontSize: '1rem' }}>/{dimCount}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>较基线提升 ≥2 档</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>核心能力评分</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {avgScore || '-'}<span style={{ fontSize: '1rem' }}>/5</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>四维均值</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>本周任务</div>
          <div className="stat-value" style={{ color: '#8b5cf6' }}>
            {tasks.length}<span style={{ fontSize: '1rem' }}>个</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
            {tasks.filter(t => t.status === 'blocked').length > 0
              ? `${tasks.filter(t => t.status === 'blocked').length} 个阻塞`
              : '进行中'}
          </div>
        </div>
      </div>

      {/* Main + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Main Card */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              <TrophyOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
              我的成长
            </h3>
          </div>
          {intern.baseline_scores && intern.current_scores ? (
            Object.keys(intern.current_scores).map(k => {
              const current = intern.current_scores?.[k] ?? 0
              const baseline = intern.baseline_scores?.[k] ?? 0
              const pct = Math.round(current / 5 * 100)
              return (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>{k}</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      基线 {baseline} → 当前 {current}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: current >= 4
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      }}
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>完成首周基线评估后展示</p>
          )}
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={() => setShowCheckin(true)}>
              <CheckCircleOutlined style={{ marginRight: 6 }} />
              填写本周 Check-in
            </button>
          </div>
        </div>

        {/* AI Daily Tip */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BulbOutlined style={{ color: '#f59e0b', fontSize: 20 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>今日AI成长建议</h3>
          </div>
          <span className="capsule-tag" style={{
            background: dailyTip?.source === 'ai' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            borderColor: dailyTip?.source === 'ai' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
            color: dailyTip?.source === 'ai' ? '#065f46' : '#92400e',
            marginBottom: 12,
          }}>
            {dailyTip?.source === 'ai' ? 'AI' : '本地'}
          </span>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {dailyTip?.tip || '加载中...'}
          </p>
        </div>
      </div>

      {/* Tasks Card */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>本周任务</h3>
        <Tasks tasks={tasks} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/intern/Dashboard.tsx
git commit -m "feat: rewrite Intern Dashboard with glass cards, custom stats, and gradient progress bars"
```

---

### Task 6: Tasks Component — Capsule Tags

**Files:**
- Modify: `frontend/src/pages/intern/Tasks.tsx`

- [ ] **Step 1: Replace Ant Design Tag with capsule-tag, List with custom rendering**

Replace the file content with:

```tsx
import type { Task } from '../../types'

const typeStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  learning: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '学习' },
  practice: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '实践' },
  output: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '产出' },
  retrospective: { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', color: '#5b21b6', label: '复盘' },
}

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  not_started: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', color: '#475569', label: '未开始' },
  in_progress: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '进行中' },
  completed: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '已完成' },
  blocked: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '阻塞' },
}

export default function Tasks({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: 24 }}>暂无任务</p>
  }

  return (
    <div>
      {tasks.map(t => {
        const ts = typeStyle[t.type] ?? typeStyle.learning
        const ss = statusStyle[t.status] ?? statusStyle.not_started
        return (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(253,230,138,0.15)' }}>
            <span style={{ fontSize: '0.9rem', color: '#334155' }}>{t.title}</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <span className="capsule-tag" style={{ background: ts.bg, borderColor: ts.border, color: ts.color }}>
                {ts.label}
              </span>
              <span className="capsule-tag" style={{ background: ss.bg, borderColor: ss.border, color: ss.color }}>
                {ss.label}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/intern/Tasks.tsx
git commit -m "feat: replace Ant Design Tag/List in Tasks with glass-compatible capsule tags"
```

---

### Task 7: Baseline Component — Glass Card Container

**Files:**
- Modify: `frontend/src/pages/intern/Baseline.tsx`

- [ ] **Step 1: Replace Ant Design Card with glass-card, update button to btn-primary**

Replace the file content with:

```tsx
import { useState } from 'react'
import { Slider, message, Space } from 'antd'
import { interns } from '../../services/api'

const DIMS = ['业务理解', '需求分析', '协作沟通', '交付质量']

export default function Baseline({ internId, onComplete }: { internId: string; onComplete: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>({ 业务理解: 2, 需求分析: 2, 协作沟通: 3, 交付质量: 2 })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      await interns.submitBaseline(internId, scores)
      message.success('基线评估已提交，等待导师复核')
      onComplete()
    } catch {
      message.error('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 16, borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(239,246,255,0.7)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>入职成长基线评估</h3>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16 }}>
        欢迎加入！请诚实地评估自己在以下四个维度的当前水平（1=完全不了解，5=能独立完成）。导师会对你的自评进行复核，这是你成长路径的起点。
      </p>
      <Space direction="vertical" style={{ width: '100%' }}>
        {DIMS.map(dim => (
          <div key={dim}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong style={{ color: '#334155' }}>{dim}</strong>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{scores[dim]} 分</span>
            </div>
            <Slider min={1} max={5} value={scores[dim]} onChange={v => setScores(s => ({ ...s, [dim]: v }))} />
          </div>
        ))}
      </Space>
      <button className="btn-primary" onClick={submit} disabled={submitting} style={{ marginTop: 16 }}>
        {submitting ? '提交中...' : '提交基线评估'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/intern/Baseline.tsx
git commit -m "feat: replace Ant Design Card in Baseline with glass-card container"
```

---

### Task 8: Mentor Dashboard — Glass Card + Capsule Tags

**Files:**
- Modify: `frontend/src/pages/mentor/Dashboard.tsx`

- [ ] **Step 1: Wrap Table in glass-card, replace Ant Design Tag/Button with capsule styles**

Replace the file content with:

```tsx
import { useState, useEffect } from 'react'
import { Table, Spin, Alert } from 'antd'
import { MessageOutlined, EyeOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { Intern } from '../../types'
import Feedback from './Feedback'
import TalkingPointsView from './TalkingPoints'

interface Props { user: { id: string; name: string; department: string } }

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  normal: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '正常' },
  potential: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '高潜' },
  watch: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '需关注' },
  risk: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '高风险' },
}

export default function MentorDashboard({ user }: Props) {
  const [interns, setInterns] = useState<Intern[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackIntern, setFeedbackIntern] = useState<Intern | null>(null)
  const [talkingPointsIntern, setTalkingPointsIntern] = useState<Intern | null>(null)

  useEffect(() => { loadInterns() }, [user.id])

  async function loadInterns() {
    try {
      const res = await mentors.getInterns(user.id)
      setInterns(res.interns)
    } catch { setInterns([]) }
    finally { setLoading(false) }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (interns.length === 0) return <Alert message="暂无带教实习生数据" type="info" />

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const st = statusStyle[s] ?? statusStyle.normal
        return <span className="capsule-tag" style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
      },
    },
    {
      title: '任务完成率', dataIndex: 'task_completion_rate', key: 'task_completion_rate',
      render: (v: number) => `${Math.round(v * 100)}%`,
    },
    { title: '最近情绪', dataIndex: 'last_emotion', key: 'last_emotion' },
    {
      title: '最近周报', dataIndex: 'last_checkin_week', key: 'last_checkin_week',
      render: (w: number | null) => w ? `第 ${w} 周` : '-',
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: Intern) => (
        <span style={{ display: 'flex', gap: 8 }}>
          <button className="btn-link" onClick={() => setTalkingPointsIntern(record)}>
            <EyeOutlined /> 沟通提纲
          </button>
          <button className="btn-link" onClick={() => setFeedbackIntern(record)}>
            <MessageOutlined /> 反馈
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {user.name} — 带教看板
      </h2>
      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={interns} columns={cols} rowKey="id" pagination={false} size="middle" />
      </div>

      {feedbackIntern && (
        <Feedback
          internId={feedbackIntern.id}
          internName={feedbackIntern.name}
          onClose={() => { setFeedbackIntern(null); loadInterns() }}
        />
      )}

      {talkingPointsIntern && (
        <TalkingPointsView
          internId={talkingPointsIntern.id}
          internName={talkingPointsIntern.name}
          onClose={() => setTalkingPointsIntern(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/mentor/Dashboard.tsx
git commit -m "feat: update Mentor Dashboard with glass-card wrapper and capsule tags"
```

---

### Task 9: HR Risk Board — Stat Cards + Capsule Tags

**Files:**
- Modify: `frontend/src/pages/hr/RiskBoard.tsx`

- [ ] **Step 1: Replace Ant Design Statistic/Card with glass stat cards, update Tag to capsule-tag**

Replace the file content with:

```tsx
import { useState, useEffect } from 'react'
import { Table, Modal, Button, Spin, Alert, Typography } from 'antd'
import { WarningOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { HRDashboard, RiskSignal, WeeklyReport } from '../../types'
import RadarChart from '../../components/RadarChart'

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  normal: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '正常' },
  potential: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '高潜' },
  watch: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '需关注' },
  risk: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '高风险' },
}

const reviewStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  pending: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', color: '#475569', label: '未复核' },
  confirmed: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '已确认' },
  overridden: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '已否决' },
}

const statCards = [
  { key: 'total', label: '总人数', color: '#475569' },
  { key: 'normal', label: '正常', color: '#10b981' },
  { key: 'potential', label: '高潜', color: '#3b82f6' },
  { key: 'risk', label: '高风险', color: '#ef4444', icon: true },
]

export default function HRDashboard() {
  const [dashboard, setDashboard] = useState<HRDashboard | null>(null)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRisk, setSelectedRisk] = useState<RiskSignal | null>(null)

  useEffect(() => {
    hr.getDashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function generateReport() {
    const r = await hr.getWeeklyReport()
    setReport(r)
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (!dashboard) return <Alert message="请先确保后端已启动" type="warning" />

  const riskCols = [
    { title: '实习生', dataIndex: 'intern_name', key: 'name' },
    {
      title: '风险等级', dataIndex: 'level', key: 'level',
      render: (l: string) => {
        const st = statusStyle[l] ?? statusStyle.normal
        return <span className="capsule-tag" style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
      },
    },
    { title: '触发原因', dataIndex: 'triggers', key: 'triggers', render: (t: string[]) => t.join(', ') },
    { title: 'AI置信度', dataIndex: 'ai_confidence', key: 'confidence', render: (c: number) => `${Math.round(c * 100)}%` },
    {
      title: '复核状态', dataIndex: 'review_status', key: 'review',
      render: (s: string) => {
        const rs = reviewStyle[s] ?? reviewStyle.pending
        return <span className="capsule-tag" style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>{rs.label}</span>
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: RiskSignal) => <button className="btn-link" onClick={() => setSelectedRisk(r)}>详情</button>,
    },
  ]

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>HR 全局看板</h2>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {statCards.map(s => (
          <div key={s.key} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
              {s.icon && <WarningOutlined style={{ color: '#ef4444', marginRight: 4 }} />}
              {s.label}
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {dashboard.summary[s.key as keyof typeof dashboard.summary] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Risk Table + Weekly Report */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>风险看板</h3>
            <button className="btn-primary" onClick={generateReport}>
              <FileTextOutlined style={{ marginRight: 6 }} />
              一键生成周报
            </button>
          </div>
          <Table dataSource={dashboard.risk_list} columns={riskCols} rowKey="id" pagination={false} size="small"
            locale={{ emptyText: '暂无风险信号，所有实习生状态正常' }} />
        </div>

        <div>
          {report ? (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>
                第 {report.week} 周周报摘要
              </h3>
              <span className="capsule-tag" style={{
                background: report.source === 'ai' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                borderColor: report.source === 'ai' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                color: report.source === 'ai' ? '#065f46' : '#92400e',
                marginBottom: 16,
              }}>
                {report.source === 'ai' ? 'AI生成' : '本地模板'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>周报提交率</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                    {Math.round((report.summary_stats.checkin_rate ?? 0) * 100)}%
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>任务完成率</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
                    {Math.round((report.summary_stats.avg_task_completion ?? 0) * 100)}%
                  </div>
                </div>
              </div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>行动建议</h4>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {report.recommended_actions?.map((a, i) => (
                  <li key={i} style={{ marginBottom: 8, fontSize: '0.85rem', color: '#475569' }}>{a}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 24 }}>
              <Alert message="点击'一键生成周报'查看本周摘要" type="info" />
            </div>
          )}
        </div>
      </div>

      {selectedRisk && (
        <Modal title="风险详情" open onCancel={() => setSelectedRisk(null)} footer={null}>
          <p><strong>实习生：</strong>{selectedRisk.intern_name}</p>
          <p>
            <strong>等级：</strong>
            {(() => {
              const st = statusStyle[selectedRisk.level] ?? statusStyle.normal
              return <span className="capsule-tag" style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
            })()}
          </p>
          <p><strong>触发原因：</strong>{selectedRisk.triggers?.join(', ')}</p>
          <p><strong>AI置信度：</strong>{Math.round(selectedRisk.ai_confidence * 100)}%</p>
          <p>
            <strong>复核状态：</strong>
            {(() => {
              const rs = reviewStyle[selectedRisk.review_status] ?? reviewStyle.pending
              return <span className="capsule-tag" style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>{rs.label}</span>
            })()}
          </p>
          {selectedRisk.review_note && <p><strong>复核备注：</strong>{selectedRisk.review_note}</p>}
          {selectedRisk.review_status === 'pending' && (
            <Alert message="该风险信号尚未经过人工复核，请提醒导师或HR进行复核。" type="warning" style={{ marginTop: 12 }} />
          )}
        </Modal>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/hr/RiskBoard.tsx
git commit -m "feat: rewrite HR RiskBoard with glass stat cards and capsule tags"
```

---

### Task 10: Recruiter FitReportList — Glass Card + Capsule Tags

**Files:**
- Modify: `frontend/src/pages/recruiter/FitReportList.tsx`

- [ ] **Step 1: Wrap Table in glass-card, replace Ant Design Tag with capsule-tag**

Replace the file content with:

```tsx
import { useState, useEffect } from 'react'
import { Table, Spin, Alert } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { recruiters } from '../../services/api'
import type { FitReport } from '../../types'
import FitReportDetail from './FitReportDetail'

const recStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  high_potential: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '高潜' },
  observe: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '观察' },
  not_suitable: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '暂不适配' },
}

export default function FitReportList() {
  const [reports, setReports] = useState<FitReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FitReport | null>(null)

  useEffect(() => {
    recruiters.getFitReports()
      .then(res => setReports(res.reports))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (reports.length === 0) return <Alert message="暂无适岗报告数据" type="info" />

  const cols = [
    { title: '实习生', dataIndex: 'intern_name', key: 'name' },
    {
      title: 'AI建议', dataIndex: 'ai_recommendation', key: 'rec',
      render: (v: string) => {
        const rs = recStyle[v] ?? recStyle.observe
        return <span className="capsule-tag" style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>{rs.label}</span>
      },
    },
    {
      title: '人工复核', dataIndex: 'has_human_review', key: 'reviewed',
      render: (v: boolean) => v
        ? <span className="capsule-tag" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: '#065f46' }}>已复核</span>
        : <span className="capsule-tag" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#991b1b' }}>未复核</span>,
    },
    {
      title: '生成时间', dataIndex: 'generated_at', key: 'time',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-',
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: FitReport) => (
        <button className="btn-link" onClick={() => setSelected(r)}>
          <EyeOutlined /> 查看详情
        </button>
      ),
    },
  ]

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>适岗分析报告</h2>
      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={reports} columns={cols} rowKey="id" pagination={false} />
      </div>
      {selected && <FitReportDetail report={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/recruiter/FitReportList.tsx
git commit -m "feat: update Recruiter FitReportList with glass-card wrapper and capsule tags"
```

---

### Task 11: Recruiter FitReportDetail — Capsule Tags

**Files:**
- Modify: `frontend/src/pages/recruiter/FitReportDetail.tsx`

- [ ] **Step 1: Replace Ant Design Tag with capsule-tag in the detail modal**

Replace the file content with:

```tsx
import { useState, useEffect } from 'react'
import { Modal, Spin, Alert, Typography, Descriptions } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { recruiters } from '../../services/api'
import type { FitReport } from '../../types'
import RadarChart from '../../components/RadarChart'

interface Props { report: FitReport; onClose: () => void }

const recStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  high_potential: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '高潜' },
  observe: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '观察' },
  not_suitable: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '暂不适配' },
}

export default function FitReportDetail({ report: initial, onClose }: Props) {
  const [report, setReport] = useState<FitReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    recruiters.getFitReport(initial.id)
      .then(setReport)
      .catch(() => setReport(initial))
      .finally(() => setLoading(false))
  }, [initial.id])

  const data = report || initial
  const rec = recStyle[data.ai_recommendation] ?? recStyle.observe

  return (
    <Modal title={`适岗报告 — ${data.intern_name}`} open onCancel={onClose} footer={null} width={700}>
      {loading ? <Spin /> : (
        <>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="AI建议">
              <span className="capsule-tag" style={{ background: rec.bg, borderColor: rec.border, color: rec.color }}>{rec.label}</span>
            </Descriptions.Item>
            <Descriptions.Item label="人工复核">
              {data.has_human_review
                ? <span className="capsule-tag" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: '#065f46' }}>已复核</span>
                : <span className="capsule-tag" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#991b1b' }}>未复核</span>}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 16 }}>
            <Typography.Title level={5}>能力雷达</Typography.Title>
            <RadarChart scores={data.score_dimensions} />
          </div>

          <div style={{ marginTop: 16 }}>
            <Typography.Title level={5}>成长证据</Typography.Title>
            <p>{data.growth_evidence}</p>
          </div>

          {data.human_review_note && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
              <strong>导师/HR复核备注：</strong>{data.human_review_note}
            </div>
          )}

          {data.ai_recommendation === 'not_suitable' && !data.has_human_review && (
            <Alert
              style={{ marginTop: 12 }}
              type="error"
              icon={<WarningOutlined />}
              message="强制要求：AI判定为'暂不适配'，必须完成导师/HR人工复核后才能作为决策依据。"
            />
          )}
        </>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/recruiter/FitReportDetail.tsx
git commit -m "feat: update Recruiter FitReportDetail with capsule tags"
```

---

### Task 12: Verification — Full Build and Visual Check

**Files:**
- None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 2: Production build**

Run: `cd frontend && npx vite build 2>&1 | tail -10`
Expected: Build succeeds, no CSS or JS errors

- [ ] **Step 3: Start dev server and verify all 4 roles visually**

Run: `cd frontend && npx vite --host 0.0.0.0 &`
Then open in browser and switch through all 4 roles:
- **Intern**: Check stat cards, progress bars, AI tip card, Check-in button, task list
- **Mentor**: Check table in glass-card, capsule status tags, link buttons
- **HR**: Check 4 stat cards, risk table, weekly report card, modal detail
- **Recruiter**: Check fit report table, capsule tags, detail modal

Expected: All pages render with glassmorphism styling, no visual regressions

- [ ] **Step 4: Commit final verification**

```bash
git add -A
git commit -m "chore: final verification — all 4 roles render correctly with new design"
```
