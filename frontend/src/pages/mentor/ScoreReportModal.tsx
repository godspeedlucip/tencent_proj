import { useState } from 'react'
import { Modal, Input, Button, message } from 'antd'
import { mentors } from '../../services/api'
import type { MentorInternCheckin } from '../../types'

interface Props {
  checkin: MentorInternCheckin
  onClose: () => void
}

const emotionLabels: Record<string, string> = {
  energetic: '干劲十足', steady: '稳步前进', blocked: '遇到瓶颈',
  overloaded: '信息过载', motivated: '充满动力',
}

export default function ScoreReportModal({ checkin, onClose }: Props) {
  const [score, setScore] = useState<number | undefined>(undefined)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!score) { message.warning('请选择评分'); return }
    setSubmitting(true)
    try {
      await mentors.scoreCheckin(checkin.id, { score, comment: comment || undefined })
      message.success('打分已提交')
      onClose()
    } catch (err: any) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`周报评分 — 第 ${checkin.week} 周`} open onCancel={onClose} footer={null} width={600}>
      <div style={{ marginBottom: 16 }}>
        <p><strong>情绪：</strong>{emotionLabels[checkin.emotion_capsule] || checkin.emotion_capsule}</p>
        <p><strong>进展：</strong></p>
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8, lineHeight: 1.7 }}>
          {checkin.progress}
        </div>
        {checkin.blockers && (
          <>
            <p><strong>困难：</strong></p>
            <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              {checkin.blockers}
            </div>
          </>
        )}
        {checkin.weekly_report_md && (
          <>
            <p><strong>周报：</strong></p>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, lineHeight: 1.7 }}>
              {checkin.weekly_report_md}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}><strong>评分：</strong></p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              onClick={() => setScore(n)}
              style={{
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: score === n ? '#f59e0b' : '#e2e8f0',
                color: score === n ? '#fff' : '#475569',
                fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}><strong>评语（可选）：</strong></p>
        <Input.TextArea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="对本周报的评价..." />
      </div>

      <Button type="primary" block loading={submitting} onClick={submit}>提交评分</Button>
    </Modal>
  )
}
