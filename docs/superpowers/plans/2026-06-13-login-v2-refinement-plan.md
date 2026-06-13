# Login Page v2 Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine login page to vertical centered layout, blurred background image, and glowing login card.

**Architecture:** Add CSS class with `::before` pseudo-element for blurred cover.png background layer. Modify Login.tsx to use vertical flex layout and add multi-layer glow box-shadow to the card.

**Tech Stack:** React 18 + TypeScript + Ant Design 5 + CSS pseudo-elements

---

### Task 1: Add blurred background CSS

**Files:**
- Modify: `frontend/src/index.css` (append new class after existing rules)

- [ ] **Step 1: Append `.login-page` class to index.css**

Add the following at the end of `frontend/src/index.css` (before the closing is already handled, just append):

```css
/* Login page — blurred cover background */
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  inset: -10px;
  background-image: url('/cover.png');
  background-size: cover;
  background-position: center;
  filter: blur(8px);
  z-index: 0;
}

.login-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(102,126,234,0.85) 0%, rgba(118,75,162,0.85) 100%);
  z-index: 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add login page blurred background CSS"
```

---

### Task 2: Refactor Login.tsx to vertical layout with glow card

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 1: Replace Login.tsx**

```tsx
import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import { useRole } from '../contexts/RoleContext'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { login } = useRole()
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await auth.login(values.username, values.password)
      login(res.token, res.user)
      message.success(`欢迎，${res.user.profile.name}`)
      const homeMap: Record<string, string> = { intern: '/intern', mentor: '/mentor', hr: '/hr', recruiter: '/recruiter' }
      navigate(homeMap[res.user.role] || '/intern')
    } catch (err: any) {
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* 品牌区 */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          color: '#fff',
          fontSize: '2.2rem',
          fontWeight: 700,
          textShadow: '0 2px 12px rgba(0,0,0,0.3)',
          margin: 0,
        }}>
          实习能量站
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '1rem',
          marginTop: 12,
          textShadow: '0 1px 8px rgba(0,0,0,0.3)',
        }}>
          AI 驱动的实习生成长导航系统
        </p>
      </div>

      {/* 登录卡片 */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: 400,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 12,
        padding: '36px 32px',
        boxShadow: '0 0 24px rgba(255,255,255,0.15), 0 0 48px rgba(147,112,219,0.25), 0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: 32,
          fontSize: '1.3rem',
          fontWeight: 700,
          color: '#fff',
        }}>
          登录
        </h2>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.8rem',
        }}>
          测试账号：intern1 / mentor1 / hr1 / recruiter1 / 密码均 pass123
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat: vertical login layout with blurred background and glow card"
```
