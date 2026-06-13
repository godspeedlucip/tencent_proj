import { useState, useEffect } from 'react'
import { Layout, Spin, message } from 'antd'
import type { Role } from './types'
import { auth, setRole as setApiRole } from './services/api'
import RoleSwitcher from './components/RoleSwitcher'
import PrivacyModal from './components/PrivacyModal'
import InternDashboard from './pages/intern/Dashboard'
import MentorDashboard from './pages/mentor/Dashboard'
import HRDashboard from './pages/hr/RiskBoard'
import RecruiterFitReportList from './pages/recruiter/FitReportList'

const { Header, Content } = Layout

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
    <Layout style={{ minHeight: '100vh' }}>
      <PrivacyModal />
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>实习能量站</h1>
        <RoleSwitcher currentRole={role} onSwitch={handleRoleSwitch} />
      </Header>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        {renderPage()}
      </Content>
    </Layout>
  )
}
