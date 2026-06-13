import { useState, useEffect } from 'react'
import { Modal, Table, Spin, Alert } from 'antd'
import { useNavigate } from 'react-router-dom'
import { mentors } from '../../services/api'
import type { MentorInternTask } from '../../types'

interface Props {
  mentorId: string
  internId: string
  internName: string
  onClose: () => void
}

const typeLabels: Record<string, string> = { learning: '学习', practice: '实践', output: '产出', retrospective: '复盘' }
const statusLabels: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成', blocked: '阻塞' }

export default function TaskListModal({ mentorId, internId, internName, onClose }: Props) {
  const [tasks, setTasks] = useState<MentorInternTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    setError(null)
    mentors.getInternTasks(mentorId, internId)
      .then(r => setTasks(r.tasks))
      .catch((err: any) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [mentorId, internId])

  const cols = [
    { title: '任务', dataIndex: 'title', key: 'title' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (t: string) => typeLabels[t] || t,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => statusLabels[s] || s,
    },
    {
      title: '审批', dataIndex: 'approval_status', key: 'approval',
      render: (a: string) => {
        const labels: Record<string, string> = { pending: '待审', approved: '已通过', rejected: '已驳回' }
        return labels[a] || a
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, t: MentorInternTask) =>
        t.approval_status === 'pending' && t.report_md ? (
          <button className="btn-link" onClick={() => { onClose(); navigate(`/mentor/review/${t.id}`) }}>
            审批
          </button>
        ) : null,
    },
  ]

  return (
    <Modal title={`${internName} 的任务`} open onCancel={onClose} footer={null} width={700}>
      {loading ? <Spin /> :
        error ? <Alert message={error} type="error" /> :
        tasks.length === 0 ? <Alert message="暂无任务" type="info" /> :
        <Table dataSource={tasks} columns={cols} rowKey="id" pagination={false} size="small" />
      }
    </Modal>
  )
}
