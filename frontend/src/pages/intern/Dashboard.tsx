import { useState, useEffect } from 'react'
import { Row, Col, Card, Progress, Statistic, Alert, Button, Tag, Spin } from 'antd'
import { TrophyOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { interns, ai } from '../../services/api'
import type { Intern, Task, AIDailyTip } from '../../types'
import CheckIn from './CheckIn'
import Tasks from './Tasks'
import Baseline from './Baseline'

interface Props { user: { id: string; name: string; department: string } }

export default function InternDashboard({ user }: Props) {
  const [intern, setIntern] = useState<(Intern & { recent_checkins?: any[] }) | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [dailyTip, setDailyTip] = useState<AIDailyTip | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckin, setShowCheckin] = useState(false)

  useEffect(() => {
    loadData()
  }, [user.id])

  async function loadData() {
    try {
      const [i, t, tip] = await Promise.all([
        interns.get(user.id),
        interns.getTasks(user.id).then(r => r.tasks),
        ai.getDailyTip(user.id).catch(() => ({ tip: '加载AI建议...', source: 'fallback', generated_at: '' })),
      ])
      setIntern(i)
      setTasks(t)
      setDailyTip(tip)
    } catch {
      // Backend unavailable — use empty state
      setIntern(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (!intern) return <Alert message="请先确保后端已启动并执行 python -m app.seed 初始化数据" type="warning" />

  const scoreDiff = intern.baseline_scores && intern.current_scores
    ? Object.keys(intern.current_scores).filter(k => (intern.current_scores?.[k] ?? 0) - (intern.baseline_scores?.[k] ?? 0) >= 2).length
    : 0

  return (
    <div>
      {intern.baseline_scores === null && <Baseline internId={user.id} onComplete={loadData} />}
      {showCheckin && <CheckIn internId={user.id} currentWeek={intern.onboard_week} onClose={() => { setShowCheckin(false); loadData() }} />}

      <Row gutter={16}>
        <Col span={16}>
          <Card title={`欢迎回来，${intern.name}`} extra={<Tag color="blue">第 {intern.onboard_week} 周</Tag>}>
            <Row gutter={16}>
              <Col span={8}><Statistic title="任务完成率" value={Math.round((intern.task_completion_rate ?? 0) * 100)} suffix="%" /></Col>
              <Col span={8}><Statistic title="能力提升维度" value={scoreDiff} suffix={`/ ${Object.keys(intern.current_scores ?? {}).length}`} /></Col>
              <Col span={8}><Statistic title="核心能力评分" value={intern.current_scores ? Math.round(Object.values(intern.current_scores).reduce((a, b) => a + b, 0) / 4 * 10) / 10 : '-'} suffix="/5" /></Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setShowCheckin(true)}>填写本周 Check-in</Button>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BulbOutlined style={{ color: '#faad14', fontSize: 20 }} />
              <strong>今日AI成长建议</strong>
              <Tag>{dailyTip?.source === 'ai' ? 'AI' : '本地'}</Tag>
            </div>
            <p style={{ color: '#555' }}>{dailyTip?.tip || '加载中...'}</p>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title={<><TrophyOutlined /> 我的成长</>}>
            {intern.baseline_scores && intern.current_scores && Object.keys(intern.current_scores).map(k => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{k}</span>
                  <span style={{ color: '#888' }}>基线 {intern.baseline_scores?.[k]} → 当前 {intern.current_scores?.[k]}</span>
                </div>
                <Progress percent={Math.round((intern.current_scores?.[k] ?? 0) / 5 * 100)} size="small" />
              </div>
            ))}
            {(!intern.baseline_scores) && <p style={{ color: '#888' }}>完成首周基线评估后展示</p>}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="本周任务">
            <Tasks tasks={tasks} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
