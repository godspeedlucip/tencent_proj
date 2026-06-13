import { useState, useEffect } from 'react'
import { Spin, Timeline, Empty, Card } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { interns } from '../../services/api'
import type { GrowthTimeline as GrowthTimelineType, GrowthMilestone } from '../../types'
import GrowthChart from '../../components/GrowthChart'

interface Props { internId: string }

export default function GrowthTimeline({ internId }: Props) {
  const [data, setData] = useState<GrowthTimelineType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    interns.getGrowthTimeline(internId).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [internId])

  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />
  if (!data || data.scores_over_time.length === 0) return <Empty description="暂无成长数据，完成更多任务和 Check-in 后会显示" />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card className="glass-card" title="评分趋势">
        <GrowthChart data={data.scores_over_time} />
      </Card>
      <Card className="glass-card" title="里程碑">
        <Timeline items={data.milestones.map((m: GrowthMilestone) => ({
          color: 'green',
          dot: <TrophyOutlined style={{ fontSize: 16 }} />,
          children: <span style={{ fontSize: '0.85rem' }}>{m.event}</span>,
        }))} />
      </Card>
    </div>
  )
}
