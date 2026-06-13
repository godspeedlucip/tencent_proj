import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, message, Spin, Alert } from 'antd'
import { interns } from '../../services/api'
import type { TaskDetail } from '../../types'
import MarkdownEditor from '../../components/MarkdownEditor'

export default function TaskReport() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [reportMd, setReportMd] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  useEffect(() => {
    const internId = user.id
    interns.getTasks(internId).then(r => {
      const t = r.tasks.find((t: any) => t.id === taskId)
      setTask(t as TaskDetail)
      if (t && (t as any).report_md) setReportMd((t as any).report_md)
    }).catch(() => { setTask(null) }).finally(() => setLoading(false))
  }, [taskId])

  const handleSubmit = async () => {
    if (!reportMd.trim()) { message.warning('请输入报告内容'); return }
    setSubmitting(true)
    try {
      await interns.submitTaskReport(user.id, taskId!, reportMd)
      message.success('报告已提交，等待导师审批')
      navigate('/intern')
    } catch (err: any) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />
  if (!task) return <Alert message="任务未找到" type="warning" />

  const approval = (task as any).approval_status || 'pending'

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>提交任务报告</h2>
      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <p><strong>任务：</strong>{task.title}</p>
        {task.description && <p style={{ color: '#475569', fontSize: '0.9rem' }}>{task.description}</p>}
      </Card>
      <Card className="glass-card">
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>完成报告 (Markdown)</h3>
        <MarkdownEditor value={reportMd} onChange={setReportMd} placeholder="## 完成情况\n\n## 关键收获\n\n## 遗留问题" />
        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={approval === 'approved'}>
            {approval === 'approved' ? '已通过' : approval === 'rejected' ? '重新提交' : '提交审批'}
          </Button>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </Card>
    </div>
  )
}
