import { useState, useEffect } from 'react'
import { Modal, Input, Select, Button, Spin, Space, message } from 'antd'
import { LikeOutlined, DislikeOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'

interface Props { internId: string; internName: string; onClose: () => void }

export default function Feedback({ internId, internName, onClose }: Props) {
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState<string>('meets')
  const [vote, setVote] = useState<string>('none')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    mentors.getFeedbackDraft(internId)
      .then(res => { setDraft(res.ai_draft); setFeedback(res.ai_draft) })
      .catch(() => setDraft(''))
      .finally(() => setLoading(false))
  }, [internId])

  async function submit() {
    setSubmitting(true)
    try {
      await mentors.submitFeedback(internId, { final_feedback: feedback, rating, ai_suggestion_vote: vote })
      message.success('反馈已提交')
      onClose()
    } catch { message.error('提交失败') }
    finally { setSubmitting(false) }
  }

  return (
    <Modal title={`反馈 — ${internName}`} open onCancel={onClose} footer={null} width={600}>
      {loading ? <Spin /> : (
        <>
          <p style={{ color: '#888', marginBottom: 8 }}>AI 草稿（可编辑）：</p>
          <Input.TextArea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} />
          <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
            <span>评价：</span>
            <Select value={rating} onChange={setRating} style={{ width: 160 }}
              options={[
                { value: 'exceeds', label: '超出预期' },
                { value: 'meets', label: '符合预期' },
                { value: 'needs_improvement', label: '需改进' },
              ]} />
            <Space>
              <Button icon={<LikeOutlined />} type={vote === 'upvote' ? 'primary' : 'default'} onClick={() => setVote('upvote')}>有用</Button>
              <Button icon={<DislikeOutlined />} type={vote === 'downvote' ? 'primary' : 'default'} onClick={() => setVote('downvote')}>待改进</Button>
            </Space>
          </div>
          <Button type="primary" block style={{ marginTop: 16 }} loading={submitting} onClick={submit}>确认反馈（约 30 秒）</Button>
        </>
      )}
    </Modal>
  )
}
