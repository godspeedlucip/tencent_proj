import { ConfigProvider } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider, useRole } from './contexts/RoleContext'
import AuthGuard from './components/AuthGuard'
import LoginPage from './pages/Login'
import InternDashboard from './pages/intern/Dashboard'
import MentorDashboard from './pages/mentor/Dashboard'
import HRRiskBoard from './pages/hr/RiskBoard'
import HRAnalytics from './pages/hr/Analytics'
import RecruiterFitReportList from './pages/recruiter/FitReportList'
import TaskReport from './pages/intern/TaskReport'
import TaskReview from './pages/mentor/TaskReview'
import AssignTask from './pages/mentor/AssignTask'
import TaskTemplates from './pages/mentor/TaskTemplates'
import HRLayout from './pages/hr/HRLayout'
import InternManage from './pages/hr/InternManage'
import MentorManage from './pages/hr/MentorManage'
import InternDetail from './pages/hr/InternDetail'
import NotificationBell from './components/NotificationBell'

const antTheme = {
  token: {
    colorPrimary: '#f59e0b',
    borderRadius: 8,
    colorBgContainer: 'rgba(255,255,255,0.6)',
  },
}

function AppShell() {
  const { role, user, logout } = useRole()

  return (
    <ConfigProvider theme={antTheme}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav className="glass-nav" style={{ padding: '12px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="gradient-text" style={{ fontSize: '1.1rem', fontWeight: 800 }}>实习能量站</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <NotificationBell role={role!} userId={user?.id || ''} />
              <span style={{ color: '#475569', fontSize: '0.85rem' }}>{user?.name} · {role}</span>
              <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '4px 12px' }} onClick={logout}>
                退出
              </button>
            </div>
          </div>
        </nav>
        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/intern" replace />} />
              <Route path="/intern" element={<InternDashboard user={user!} />} />
              <Route path="/intern/tasks/:taskId/report" element={<TaskReport />} />
              <Route path="/mentor" element={<MentorDashboard user={user!} />} />
              <Route path="/mentor/review/:taskId" element={<TaskReview />} />
              <Route path="/mentor/assign" element={<AssignTask />} />
              <Route path="/mentor/templates" element={<TaskTemplates />} />
              <Route path="/hr" element={<HRLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<HRRiskBoard />} />
                <Route path="analytics" element={<HRAnalytics />} />
                <Route path="interns" element={<InternManage />} />
                <Route path="interns/:id" element={<InternDetail />} />
                <Route path="mentors" element={<MentorManage />} />
              </Route>
              <Route path="/recruiter" element={<RecruiterFitReportList />} />
            </Routes>
          </div>
        </main>
      </div>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/aihr">
      <RoleProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/*" element={<AppShell />} />
          </Route>
        </Routes>
      </RoleProvider>
    </BrowserRouter>
  )
}
