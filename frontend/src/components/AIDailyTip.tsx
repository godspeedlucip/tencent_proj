import { Card, Tag, Spin, Alert } from 'antd'
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
      <Card>
        <Spin size="small" />
        <span style={{ marginLeft: 8, color: '#888' }}>正在生成今日建议...</span>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert message="AI 建议暂时不可用" description={error} type="warning" showIcon />
      </Card>
    )
  }

  if (!tip) return null

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BulbOutlined style={{ color: '#faad14', fontSize: 20 }} />
        <strong>今日AI成长建议</strong>
        <Tag color={tip.source === 'ai' ? 'blue' : 'orange'}>
          {tip.source === 'ai' ? 'AI 生成' : '本地模板'}
        </Tag>
      </div>
      <p style={{ color: '#555', lineHeight: 1.8 }}>{tip.tip}</p>
    </Card>
  )
}
