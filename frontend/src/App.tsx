import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ConfigProvider, Spin, message } from 'antd'
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
import RecruiterFitReportList from './pages/recruiter/FitReportList'
import RecruiterFitReportDetail from './pages/recruiter/FitReportDetail'

const antTheme = {
  token: {
    colorPrimary: '#f59e0b',
    borderRadius: 8,
    colorBgContainer: 'rgba(255,255,255,0.6)',
  },
}

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
    <ConfigProvider theme={antTheme}>
      <PrivacyModal />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav className="glass-nav" style={{ padding: '12px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="gradient-text" style={{ fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/intern')}>实习能量站</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <NotificationBell role={role} userId={user?.id ?? ''} />
              <RoleSwitcher currentRole={role} onSwitch={handleRoleSwitch} />
            </div>
          </div>
        </nav>
        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/intern" replace />} />
              <Route path="/intern" element={<InternDashboard user={user!} />} />
              <Route path="/mentor" element={<MentorDashboard user={user!} />} />
              <Route path="/hr" element={<HRRiskBoard />} />
              <Route path="/hr/analytics" element={<HRAnalytics />} />
              <Route path="/recruiter" element={<RecruiterFitReportList />} />
              <Route path="/recruiter/:id" element={<RecruiterFitReportDetail />} />
            </Routes>
          </div>
        </main>
      </div>
    </ConfigProvider>
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
