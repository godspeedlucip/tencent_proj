import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input, message, Spin, Alert, Space } from 'antd'
import { mentors, ai } from '../../services/api'
import type { Annotation } from '../../types'
import ReviewAnnotations from '../../components/ReviewAnnotations'

export default function TaskReview() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState<number | undefined>(undefined)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiDraft, setAiDraft] = useState<{ highlights: string[]; suggestions: string[]; suggested_score: number } | null>(null)

  useEffect(() => {
    const mentorId = JSON.parse(localStorage.getItem('user') || '{}').id
    mentors.getPendingReviews(mentorId).then(r => {
      const t = r.tasks.find((t: any) => t.id === taskId)
      setTask(t || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [taskId])

  useEffect(() => {
    if (taskId) {
      ai.getReviewDraft(taskId!).then(r => setAiDraft(r.draft)).catch(() => {})
    }
  }, [taskId])

  const handleAction = async (approval: 'approved' | 'rejected') => {
    setSubmitting(true)
    try {
      await mentors.reviewTask(taskId!, {
        approval,
        score,
        annotations: annotations.length > 0 ? annotations : undefined,
        rejection_reason: approval === 'rejected' ? rejectionReason : undefined,
      })
      message.success(approval === 'approved' ? '已通过' : '已驳回')
      navigate('/mentor')
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />
  if (!task) return <Alert message="任务未找到" type="warning" />

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>审批任务报告</h2>
      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <p><strong>实习生：</strong>{task.intern_name}</p>
        <p><strong>任务：</strong>{task.title}</p>
      </Card>

      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>实习生报告</h3>
        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', lineHeight: 1.8 }}>
          {task.report_md ? (
            <div dangerouslySetInnerHTML={{ __html: task.report_md.replace(/\n/g, '<br/>') }} />
          ) : (
            <span style={{ color: '#94a3b8' }}>无报告内容</span>
          )}
        </div>
      </Card>

      {aiDraft && (
        <Card className="glass-card" style={{ marginBottom: 16, border: '1px solid #f59e0b' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 8, color: '#f59e0b' }}>AI 审阅建议</h3>
          <p><strong>推荐评分：</strong>{aiDraft.suggested_score}/5</p>
          <p><strong>亮点：</strong></p>
          <ul>{aiDraft.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
          <p><strong>建议：</strong></p>
          <ul>{aiDraft.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Card>
      )}

      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>评分</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} onClick={() => setScore(n)} style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: score === n ? '#f59e0b' : '#e2e8f0',
              color: score === n ? '#fff' : '#475569',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
            }}>
              {n}
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <ReviewAnnotations annotations={annotations} onChange={setAnnotations} />
      </Card>

      <Card className="glass-card">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea
            rows={3}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="驳回理由（驳回时填写）"
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <Button type="primary" onClick={() => handleAction('approved')} loading={submitting}>
              通过
            </Button>
            <Button danger onClick={() => handleAction('rejected')} loading={submitting}>
              驳回
            </Button>
            <Button onClick={() => navigate(-1)}>返回</Button>
          </div>
        </Space>
      </Card>
    </div>
  )
}
