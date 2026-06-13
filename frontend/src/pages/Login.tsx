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
