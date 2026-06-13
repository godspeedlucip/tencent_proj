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
