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
