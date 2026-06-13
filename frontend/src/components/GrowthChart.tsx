import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { GrowthTimelinePoint } from '../types'

interface Props { data: GrowthTimelinePoint[] }

export default function GrowthChart({ data }: Props) {
  const chartData = data.map(p => ({
    week: `W${p.week}`,
    '任务均分': p.task_scores_avg,
    '周报评分': p.checkin_score,
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis domain={[0, 5]} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="任务均分" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="周报评分" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
