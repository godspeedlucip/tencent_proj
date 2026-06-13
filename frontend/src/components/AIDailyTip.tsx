import { Spin, Alert } from 'antd'
import { BulbOutlined } from '@ant-design/icons'
import type { AIDailyTip as AIDailyTipType } from '../types'

interface Props {
  tip: AIDailyTipType | null
  loading: boolean
  error: string | null
}

export default function AIDailyTip({ tip, loading, error }: Props) {
  if (loading) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <Spin size="small" />
        <span style={{ marginLeft: 8, color: '#94a3b8' }}>正在生成今日建议...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <Alert message="AI 建议暂时不可用" description={error} type="warning" showIcon />
      </div>
    )
  }

  if (!tip) return null

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BulbOutlined style={{ color: '#f59e0b', fontSize: 20 }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>今日AI成长建议</h3>
      </div>
      <span className="capsule-tag" style={{
        background: tip.source === 'ai' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
        borderColor: tip.source === 'ai' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
        color: tip.source === 'ai' ? '#065f46' : '#92400e',
        marginBottom: 12,
      }}>
        {tip.source === 'ai' ? 'AI 生成' : '本地模板'}
      </span>
      <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{tip.tip}</p>
    </div>
  )
}
