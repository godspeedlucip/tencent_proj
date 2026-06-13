import { Select, Space, Tag } from 'antd'
import { UserOutlined, SolutionOutlined, DashboardOutlined, IdcardOutlined } from '@ant-design/icons'
import type { Role } from '../types'

const roleOptions: { value: Role; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'intern', label: '实习生', icon: <UserOutlined />, color: 'blue' },
  { value: 'mentor', label: '导师', icon: <SolutionOutlined />, color: 'green' },
  { value: 'hr', label: 'HR', icon: <DashboardOutlined />, color: 'purple' },
  { value: 'recruiter', label: '招聘', icon: <IdcardOutlined />, color: 'orange' },
]

interface Props {
  currentRole: Role
  onSwitch: (role: Role) => void
}

export default function RoleSwitcher({ currentRole, onSwitch }: Props) {
  const current = roleOptions.find((r) => r.value === currentRole)!

  return (
    <Space>
      <Tag color={current.color} icon={current.icon} style={{ padding: '4px 12px', fontSize: 14 }}>
        {current.label}视角
      </Tag>
      <Select
        value={currentRole}
        onChange={onSwitch}
        style={{ width: 120 }}
        options={roleOptions.map((r) => ({
          value: r.value,
          label: (
            <Space>
              {r.icon}
              {r.label}
            </Space>
          ),
        }))}
      />
    </Space>
  )
}
