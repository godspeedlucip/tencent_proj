import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  AlertOutlined, BarChartOutlined, UserOutlined, TeamOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout

const menuItems = [
  { key: '/hr/dashboard', icon: <AlertOutlined />, label: '风险看板' },
  { key: '/hr/analytics', icon: <BarChartOutlined />, label: '数据分析' },
  { key: '/hr/interns', icon: <UserOutlined />, label: '实习生管理' },
  { key: '/hr/mentors', icon: <TeamOutlined />, label: '导师管理' },
]

export default function HRLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: 'calc(100vh - 60px)', background: 'transparent' }}>
      <Sider
        width={200}
        style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: 12, paddingTop: 16 }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none' }}
        />
      </Sider>
      <Content style={{ padding: '0 0 0 24px' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
