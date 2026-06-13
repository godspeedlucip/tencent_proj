import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Modal, Button, Spin, Alert, Typography } from 'antd'
import { WarningOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { HRDashboard, RiskSignal, WeeklyReport } from '../../types'
import RadarChart from '../../components/RadarChart'

const statusTag: Record<string, { color: string; label: string }> = {
  normal: { color: 'green', label: '正常' }, potential: { color: 'blue', label: '高潜' },
  watch: { color: 'orange', label: '需关注' }, risk: { color: 'red', label: '高风险' },
}

const reviewTag: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '未复核' }, confirmed: { color: 'green', label: '已确认' },
  overridden: { color: 'orange', label: '已否决' },
}

export default function HRDashboard() {
  const [dashboard, setDashboard] = useState<HRDashboard | null>(null)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRisk, setSelectedRisk] = useState<RiskSignal | null>(null)

  useEffect(() => {
    hr.getDashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function generateReport() {
    const r = await hr.getWeeklyReport()
    setReport(r)
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (!dashboard) return <Alert message="请先确保后端已启动" type="warning" />

  const riskCols = [
    { title: '实习生', dataIndex: 'intern_name', key: 'name' },
    { title: '风险等级', dataIndex: 'level', key: 'level', render: (l: string) => <Tag color={statusTag[l]?.color}>{statusTag[l]?.label}</Tag> },
    { title: '触发原因', dataIndex: 'triggers', key: 'triggers', render: (t: string[]) => t.join(', ') },
    { title: 'AI置信度', dataIndex: 'ai_confidence', key: 'confidence', render: (c: number) => `${Math.round(c * 100)}%` },
    { title: '复核状态', dataIndex: 'review_status', key: 'review', render: (s: string) => <Tag color={reviewTag[s]?.color}>{reviewTag[s]?.label}</Tag> },
    { title: '操作', key: 'action', render: (_: any, r: RiskSignal) => <Button type="link" onClick={() => setSelectedRisk(r)}>详情</Button> },
  ]

  return (
    <>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="总人数" value={dashboard.summary.total} /></Card></Col>
        <Col span={6}><Card><Statistic title="正常" value={dashboard.summary.normal} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="高潜" value={dashboard.summary.potential} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title={<><WarningOutlined /> 高风险</>} value={dashboard.summary.risk} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="风险看板" extra={<Button icon={<FileTextOutlined />} onClick={generateReport}>一键生成周报</Button>}>
            <Table dataSource={dashboard.risk_list} columns={riskCols} rowKey="id" pagination={false} size="small"
              locale={{ emptyText: '暂无风险信号，所有实习生状态正常' }} />
          </Card>
        </Col>
        <Col span={8}>
          {report ? (
            <Card title={`第 ${report.week} 周周报摘要`}>
              <Tag color={report.source === 'ai' ? 'blue' : 'orange'}>{report.source === 'ai' ? 'AI生成' : '本地模板'}</Tag>
              <Typography.Paragraph>
                <Statistic title="周报提交率" value={`${Math.round((report.summary_stats.checkin_rate ?? 0) * 100)}%`} />
                <Statistic title="任务完成率" value={`${Math.round((report.summary_stats.avg_task_completion ?? 0) * 100)}%`} />
              </Typography.Paragraph>
              <Typography.Title level={5}>行动建议</Typography.Title>
              <ul>{report.recommended_actions?.map((a, i) => <li key={i} style={{ marginBottom: 8 }}>{a}</li>)}</ul>
            </Card>
          ) : (
            <Card><Alert message="点击'一键生成周报'查看本周摘要" type="info" /></Card>
          )}
        </Col>
      </Row>

      {selectedRisk && (
        <Modal title="风险详情" open onCancel={() => setSelectedRisk(null)} footer={null}>
          <p><strong>实习生：</strong>{selectedRisk.intern_name}</p>
          <p><strong>等级：</strong><Tag color={statusTag[selectedRisk.level]?.color}>{statusTag[selectedRisk.level]?.label}</Tag></p>
          <p><strong>触发原因：</strong>{selectedRisk.triggers?.join(', ')}</p>
          <p><strong>AI置信度：</strong>{Math.round(selectedRisk.ai_confidence * 100)}%</p>
          <p><strong>复核状态：</strong><Tag color={reviewTag[selectedRisk.review_status]?.color}>{reviewTag[selectedRisk.review_status]?.label}</Tag></p>
          {selectedRisk.review_note && <p><strong>复核备注：</strong>{selectedRisk.review_note}</p>}
          {selectedRisk.review_status === 'pending' && (
            <Alert message="该风险信号尚未经过人工复核，请提醒导师或HR进行复核。" type="warning" style={{ marginTop: 12 }} />
          )}
        </Modal>
      )}
    </>
  )
}
