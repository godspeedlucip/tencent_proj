import { useState, useEffect } from 'react'
import { Table, Spin, Alert, Skeleton } from 'antd'
import { MessageOutlined, EyeOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { Intern } from '../../types'
import Feedback from './Feedback'
import TalkingPointsView from './TalkingPoints'

interface Props { user: { id: string; name: string; department: string } }

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  normal: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '正常' },
  potential: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '高潜' },
  watch: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '需关注' },
  risk: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '高风险' },
}

export default function MentorDashboard({ user }: Props) {
  const [interns, setInterns] = useState<Intern[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackIntern, setFeedbackIntern] = useState<Intern | null>(null)
  const [talkingPointsIntern, setTalkingPointsIntern] = useState<Intern | null>(null)

  useEffect(() => { loadInterns() }, [user.id])

  async function loadInterns() {
    try {
      const res = await mentors.getInterns(user.id)
      setInterns(res.interns)
    } catch { setInterns([]) }
    finally { setLoading(false) }
  }

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />
  if (interns.length === 0) return <Alert message="暂无带教实习生数据" type="info" />

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const st = statusStyle[s] ?? statusStyle.normal
        return <span className="capsule-tag" style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
      },
    },
    {
      title: '任务完成率', dataIndex: 'task_completion_rate', key: 'task_completion_rate',
      render: (v: number) => `${Math.round(v * 100)}%`,
    },
    { title: '最近情绪', dataIndex: 'last_emotion', key: 'last_emotion' },
    {
      title: '最近周报', dataIndex: 'last_checkin_week', key: 'last_checkin_week',
      render: (w: number | null) => w ? `第 ${w} 周` : '-',
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: Intern) => (
        <span style={{ display: 'flex', gap: 8 }}>
          <button className="btn-link" onClick={() => setTalkingPointsIntern(record)}>
            <EyeOutlined /> 沟通提纲
          </button>
          <button className="btn-link" onClick={() => setFeedbackIntern(record)}>
            <MessageOutlined /> 反馈
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {user.name} — 带教看板
      </h2>
      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={interns} columns={cols} rowKey="id" pagination={false} size="middle" />
      </div>

      {feedbackIntern && (
        <Feedback
          internId={feedbackIntern.id}
          internName={feedbackIntern.name}
          onClose={() => { setFeedbackIntern(null); loadInterns() }}
        />
      )}

      {talkingPointsIntern && (
        <TalkingPointsView
          internId={talkingPointsIntern.id}
          internName={talkingPointsIntern.name}
          onClose={() => setTalkingPointsIntern(null)}
        />
      )}
    </>
  )
}
