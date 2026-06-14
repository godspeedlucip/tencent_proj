# Login External Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub code and Aliyun OSS demo video links below the login card with icon+text style.

**Architecture:** Two link constants at the top of Login.tsx, rendered below the login card using Ant Design icons. No new files, no new dependencies.

**Tech Stack:** React + TypeScript, Ant Design, @ant-design/icons

---

### Task 1: Add external links to Login page

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 1: Add link constants and icon imports**

Add two imports (`GithubOutlined`, `PlayCircleOutlined`) and two URL constants at the top of the component file.

Open `frontend/src/pages/Login.tsx`:

- Add to the icons import line on line 2:
  - Add `GithubOutlined, PlayCircleOutlined` alongside existing `UserOutlined, LockOutlined`
- Add two constants after the imports:

```ts
const GITHUB_URL = 'https://github.com/your-repo'
const DEMO_VIDEO_URL = 'https://your-oss.aliyuncs.com/demo.mp4'
```

The imports line should become:
```ts
import { UserOutlined, LockOutlined, GithubOutlined, PlayCircleOutlined } from '@ant-design/icons'
```

- [ ] **Step 2: Add link rendering below the login card**

Add the link section between the closing `</div>` of the card wrapper (line 88) and the closing `</div>` of `.login-page` (line 89). Insert this block:

```tsx
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        justifyContent: 'center',
        gap: 32,
        marginTop: 24,
      }}>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#334155',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f59e0b')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#334155')}
        >
          <GithubOutlined />
          GitHub 代码
        </a>
        <a
          href={DEMO_VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#334155',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f59e0b')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#334155')}
        >
          <PlayCircleOutlined />
          演示视频
        </a>
      </div>
```

- [ ] **Step 3: Verify the page compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 4: Verify visually in dev server**

```bash
cd frontend && npx vite --host 0.0.0.0
```

Open the login page in browser. Confirm:
- GitHub 代码 and 演示视频 links appear below the login card
- Links are centered horizontally
- Hover color changes to orange
- Links open in a new tab

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat: add GitHub and demo video links to login page"
```
