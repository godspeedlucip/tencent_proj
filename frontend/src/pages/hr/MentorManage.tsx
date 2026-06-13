import { useState, useEffect } from 'react'
import { Table } from 'antd'
import { hr } from '../../services/api'
import type { MentorSummary } from '../../types'

export default function MentorManage() {
  const [mentors, setMentors] = useState<MentorSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hr.listMentors()
      .then(r => setMentors(r.mentors))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '带教人数', dataIndex: 'intern_count', key: 'intern_count' },
    {
      title: '反馈覆盖率', dataIndex: 'feedback_coverage_pct', key: 'feedback_coverage_pct',
      render: (v: number) => `${v}%`,
    },
    {
      title: '风险人数', dataIndex: 'at_risk_count', key: 'at_risk_count',
      render: (v: number) => v > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#10b981' }}>0</span>,
    },
  ]

  return (
    <>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>导师管理</h2>
      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={mentors} columns={cols} rowKey="id" loading={loading} pagination={false} size="middle" />
      </div>
    </>
  )
}
