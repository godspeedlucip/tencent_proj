import { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Modal, Spin, Alert } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { recruiters } from '../../services/api'
import type { FitReport } from '../../types'
import FitReportDetail from './FitReportDetail'
import RadarChart from '../../components/RadarChart'

const recTag: Record<string, { color: string; label: string }> = {
  high_potential: { color: 'green', label: '高潜' },
  observe: { color: 'orange', label: '观察' },
  not_suitable: { color: 'red', label: '暂不适配' },
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
    { title: 'AI建议', dataIndex: 'ai_recommendation', key: 'rec', render: (v: string) => <Tag color={recTag[v]?.color}>{recTag[v]?.label}</Tag> },
    { title: '人工复核', dataIndex: 'has_human_review', key: 'reviewed', render: (v: boolean) => v ? <Tag color="green">已复核</Tag> : <Tag color="red">未复核</Tag> },
    { title: '生成时间', dataIndex: 'generated_at', key: 'time', render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: '操作', key: 'action', render: (_: any, r: FitReport) => <Button type="link" icon={<EyeOutlined />} onClick={() => setSelected(r)}>查看详情</Button> },
  ]

  return (
    <>
      <Card title="适岗分析报告">
        <Table dataSource={reports} columns={cols} rowKey="id" pagination={false} />
      </Card>
      {selected && <FitReportDetail report={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
