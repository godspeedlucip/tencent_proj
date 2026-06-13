import { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, message, Alert } from 'antd'
import { interns, mentors } from '../../services/api'
import EmotionCapsule from '../../components/EmotionCapsule'
import type { DeadlineConfig } from '../../types'

interface Props { internId: string; currentWeek: number; onClose: () => void }

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function CheckIn({ internId, currentWeek, onClose }: Props) {
  const [form] = Form.useForm()
  const [emotion, setEmotion] = useState<string>('steady')
  const [submitting, setSubmitting] = useState(false)
  const [deadline, setDeadline] = useState<DeadlineConfig | null>(null)

  useEffect(() => {
    interns.get(internId).then(i => {
      const mentorId = (i as any).mentor?.id
      if (mentorId) {
        mentors.getDeadline(mentorId).then(setDeadline).catch(() => {})
      }
    }).catch(() => {})
  }, [internId])

  const isLate = deadline ? (() => {
    const now = new Date()
    const currentDay = now.getDay()
    const currentHour = now.getHours()
    if (currentDay > deadline.day_of_week || (currentDay === deadline.day_of_week && currentHour >= deadline.hour)) {
      return true
    }
    return false
  })() : false

  async function handleSubmit(values: any) {
    setSubmitting(true)
    try {
      await interns.submitCheckin(internId, { ...values, emotion_capsule: emotion, week: currentWeek })
      message.success('Check-in 提交成功')
      onClose()
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`第 ${currentWeek} 周 Check-in`} open onCancel={onClose} footer={null} width={600}>
      {deadline && (
        <Alert
          type={isLate ? 'warning' : 'info'}
          message={isLate
            ? `迟交 — 截止时间为每${DAY_LABELS[deadline.day_of_week]} ${deadline.hour}:00`
            : `截止时间：每${DAY_LABELS[deadline.day_of_week]} ${deadline.hour}:00`
          }
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="本周进展" name="progress" rules={[{ required: true, message: '请填写本周进展' }]}>
          <Input.TextArea rows={3} placeholder="这周完成了什么？学到了什么？" />
        </Form.Item>
        <Form.Item label="当前困难" name="blockers">
          <Input.TextArea rows={2} placeholder="遇到了什么困难或卡点？" />
        </Form.Item>
        <Form.Item label="当前状态（情绪胶囊）" required>
          <EmotionCapsule value={emotion} onChange={setEmotion} />
        </Form.Item>
        <Form.Item label="下周计划" name="next_plan">
          <Input.TextArea rows={2} placeholder="下周你计划做什么？" />
        </Form.Item>
        <Form.Item name="weekly_report_md" label="本周周报 (Markdown)">
          <Input.TextArea rows={10} placeholder="## 本周产出\n\n## 能力提升\n\n## 不足与反思\n\n## 下周计划" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting} block>提交 Check-in</Button>
      </Form>
    </Modal>
  )
}
