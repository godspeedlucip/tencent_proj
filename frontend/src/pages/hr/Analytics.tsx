import { useState, useEffect } from 'react'
import { Card, Row, Col, Skeleton, Result, Button } from 'antd'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { hr } from '../../services/api'
import type { AnalyticsData } from '../../types'

const EMOTION_COLORS: Record<string, string> = {
  energetic: '#52c41a', steady: '#1890ff', motivated: '#722ed1',
  blocked: '#cf1322', overloaded: '#faad14',
}
const EMOTION_LABELS: Record<string, string> = {
  energetic: '干劲十足', steady: '稳步前进', motivated: '充满动力',
  blocked: '遇到瓶颈', overloaded: '信息过载',
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hr.getAnalytics()
      .then(setData)
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Card><Skeleton active paragraph={{ rows: 12 }} /></Card>
  if (error) return <Result status="error" title="加载失败" subTitle={error} extra={<Button onClick={() => window.location.reload()}>重试</Button>} />
  if (!data) return null

  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>能力成长曲线</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.growth_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avg_business_understanding" stroke="#1890ff" name="业务理解" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_requirement_analysis" stroke="#52c41a" name="需求分析" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_collaboration" stroke="#faad14" name="协作沟通" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_delivery" stroke="#722ed1" name="交付质量" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col span={12}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>情绪分布</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.emotion_distribution} dataKey="count" nameKey="emotion" cx="50%" cy="50%" outerRadius={100}
                  label={({ emotion, count }) => `${EMOTION_LABELS[emotion] || emotion}: ${count}`}>
                  {data.emotion_distribution.map(e => (
                    <Cell key={e.emotion} fill={EMOTION_COLORS[e.emotion] || '#ddd'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>任务完成趋势</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.task_completion_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#52c41a" name="已完成" />
                <Bar dataKey="in_progress" stackId="a" fill="#1890ff" name="进行中" />
                <Bar dataKey="blocked" stackId="a" fill="#cf1322" name="已阻塞" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col span={12}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>导师反馈覆盖率</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.mentor_feedback_coverage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="mentor_name" width={60} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="coverage_pct" fill="#1890ff" name="反馈覆盖率" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>
    </>
  )
}
