import { useState, useEffect } from 'react'
import { Spin, Alert, Tabs } from 'antd'
import { TrophyOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { interns, ai } from '../../services/api'
import type { Intern, Task, AIDailyTip as AIDailyTipType } from '../../types'
import CheckIn from './CheckIn'
import Tasks from './Tasks'
import Baseline from './Baseline'
import AIDailyTip from '../../components/AIDailyTip'
import CelebrationCard from '../../components/CelebrationCard'
import GrowthTimeline from './GrowthTimeline'

interface Props { user: { id: string; name: string; department: string } }

export default function InternDashboard({ user }: Props) {
  const [intern, setIntern] = useState<(Intern & { recent_checkins?: any[] }) | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [dailyTip, setDailyTip] = useState<AIDailyTipType | null>(null)
  const [tipLoading, setTipLoading] = useState(false)
  const [tipError, setTipError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckin, setShowCheckin] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    loadData()
  }, [user.id])

  useEffect(() => {
    if (intern && (intern.task_completion_rate ?? 0) >= 0.9 && intern.status === 'potential') {
      setShowCelebration(true)
    }
  }, [intern])

  async function loadData() {
    try {
      const [i, t] = await Promise.all([
        interns.get(user.id),
        interns.getTasks(user.id).then(r => r.tasks),
      ])
      setIntern(i)
      setTasks(t)
    } catch {
      setIntern(null)
    } finally {
      setLoading(false)
    }

    setTipLoading(true)
    setTipError(null)
    try {
      const tip = await ai.getDailyTip(user.id)
      setDailyTip(tip)
    } catch {
      setTipError('无法连接 AI 服务，请稍后刷新')
    } finally {
      setTipLoading(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (!intern) return <Alert message="请先确保后端已启动并执行 python -m app.seed 初始化数据" type="warning" />

  const scoreDiff = intern.baseline_scores && intern.current_scores
    ? Object.keys(intern.current_scores).filter(k => (intern.current_scores?.[k] ?? 0) - (intern.baseline_scores?.[k] ?? 0) >= 2).length
    : 0

  const dimCount = Object.keys(intern.current_scores ?? {}).length
  const avgScore = intern.current_scores
    ? Math.round(Object.values(intern.current_scores).reduce((a, b) => a + b, 0) / dimCount * 10) / 10
    : 0

  return (
    <div>
      <Baseline
              baselineScores={intern.baseline_scores}
              currentScores={intern.current_scores}
            />
      {showCheckin && <CheckIn internId={user.id} currentWeek={intern.onboard_week} onClose={() => { setShowCheckin(false); loadData() }} />}

      <Tabs items={[
        { key: 'overview', label: '概览', children: <>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
            欢迎回来，{intern.name}
            <span className="capsule-tag" style={{ marginLeft: 12, background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)', color: '#1e40af', fontSize: '0.8rem', fontWeight: 500 }}>
              第 {intern.onboard_week} 周
            </span>
          </h2>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>任务完成率</div>
              <div className="stat-value" style={{ color: '#f59e0b' }}>
                {Math.round((intern.task_completion_rate ?? 0) * 100)}<span style={{ fontSize: '1rem' }}>%</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>本周统计</div>
            </div>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>能力提升维度</div>
              <div className="stat-value" style={{ color: '#3b82f6' }}>
                {scoreDiff}<span style={{ fontSize: '1rem' }}>/{dimCount}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>较基线提升 ≥2 档</div>
            </div>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>核心能力评分</div>
              <div className="stat-value" style={{ color: '#10b981' }}>
                {avgScore || '-'}<span style={{ fontSize: '1rem' }}>/5</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>四维均值</div>
            </div>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>本周任务</div>
              <div className="stat-value" style={{ color: '#8b5cf6' }}>
                {tasks.length}<span style={{ fontSize: '1rem' }}>个</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                {tasks.filter(t => t.status === 'blocked').length > 0
                  ? `${tasks.filter(t => t.status === 'blocked').length} 个阻塞`
                  : '进行中'}
              </div>
            </div>
          </div>

          {/* Main + Sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Main Card */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  <TrophyOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
                  我的成长
                </h3>
              </div>
              {intern.baseline_scores && intern.current_scores ? (
                Object.keys(intern.current_scores).map(k => {
                  const current = intern.current_scores?.[k] ?? 0
                  const baseline = intern.baseline_scores?.[k] ?? 0
                  const pct = Math.round(current / 5 * 100)
                  return (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>{k}</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          基线 {baseline} → 当前 {current}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: current >= 4
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>完成首周基线评估后展示</p>
              )}
              <div style={{ marginTop: 16 }}>
                <button className="btn-primary" onClick={() => setShowCheckin(true)}>
                  <CheckCircleOutlined style={{ marginRight: 6 }} />
                  填写本周 Check-in
                </button>
              </div>
            </div>

            {/* AI Daily Tip */}
            <AIDailyTip tip={dailyTip} loading={tipLoading} error={tipError} />
          </div>

          {/* Tasks Card */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>本周任务</h3>
            <Tasks tasks={tasks} />
          </div>

          {showCelebration && (
            <CelebrationCard
              internName={intern.name}
              reason="你连续保持高任务完成率，展现出优秀的成长潜力！"
              onDismiss={() => setShowCelebration(false)}
            />
          )}
        </> },
        { key: 'growth', label: '成长轨迹', children: <GrowthTimeline internId={user?.id || ''} /> }
      ]} />
    </div>
  )
}
