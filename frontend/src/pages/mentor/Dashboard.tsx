import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Tag, Button, Modal, Spin, Alert } from 'antd'
import { MessageOutlined, EyeOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { Intern, TalkingPoints } from '../../types'
import Feedback from './Feedback'
import TalkingPointsView from './TalkingPoints'

interface Props { user: { id: string; name: string; department: string } }

const statusTag: Record<string, { color: string; label: string }> = {
  normal: { color: 'green', label: '正常' },
  potential: { color: 'blue', label: '高潜' },
  watch: { color: 'orange', label: '需关注' },
  risk: { color: 'red', label: '高风险' },
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

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (interns.length === 0) return <Alert message="暂无带教实习生数据" type="info" />

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusTag[s]?.color}>{statusTag[s]?.label}</Tag> },
    { title: '任务完成率', dataIndex: 'task_completion_rate', key: 'task_completion_rate', render: (v: number) => `${Math.round(v * 100)}%` },
    { title: '最近情绪', dataIndex: 'last_emotion', key: 'last_emotion' },
    { title: '最近周报', dataIndex: 'last_checkin_week', key: 'last_checkin_week', render: (w: number | null) => w ? `第 ${w} 周` : '-' },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: Intern) => (
        <>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setTalkingPointsIntern(record)}>沟通提纲</Button>
          <Button type="link" icon={<MessageOutlined />} onClick={() => setFeedbackIntern(record)}>反馈</Button>
        </>
      ),
    },
  ]

  return (
    <>
      <Card title={`${user.name} — 带教看板`}>
        <Table dataSource={interns} columns={cols} rowKey="id" pagination={false} size="middle" />
      </Card>

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
