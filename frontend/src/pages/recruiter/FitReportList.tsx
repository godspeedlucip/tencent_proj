import { useState, useEffect } from 'react'
import { Table, Spin, Alert } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { recruiters } from '../../services/api'
import type { FitReport } from '../../types'
import FitReportDetail from './FitReportDetail'

const recStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  high_potential: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '高潜' },
  observe: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '观察' },
  not_suitable: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '暂不适配' },
}

export default function FitReportList() {
  const [reports, setReports] = useState<FitReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FitReport | null>(null)

  useEffect(() => {
    recruiters.getFitReports()
      .then(res => setReports(res.reports))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (reports.length === 0) return <Alert message="暂无适岗报告数据" type="info" />

  const cols = [
    { title: '实习生', dataIndex: 'intern_name', key: 'name' },
    {
      title: 'AI建议', dataIndex: 'ai_recommendation', key: 'rec',
      render: (v: string) => {
        const rs = recStyle[v] ?? recStyle.observe
        return <span className="capsule-tag" style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>{rs.label}</span>
      },
    },
    {
      title: '人工复核', dataIndex: 'has_human_review', key: 'reviewed',
      render: (v: boolean) => v
        ? <span className="capsule-tag" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: '#065f46' }}>已复核</span>
        : <span className="capsule-tag" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#991b1b' }}>未复核</span>,
    },
    {
      title: '生成时间', dataIndex: 'generated_at', key: 'time',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-',
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: FitReport) => (
        <button className="btn-link" onClick={() => setSelected(r)}>
          <EyeOutlined /> 查看详情
        </button>
      ),
    },
  ]

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>适岗分析报告</h2>
      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={reports} columns={cols} rowKey="id" pagination={false} />
      </div>
      {selected && <FitReportDetail report={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
