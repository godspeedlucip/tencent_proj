import { useState } from 'react'
import { Modal, Form, Input, Select, Button, message } from 'antd'
import { interns } from '../../services/api'
import EmotionCapsule from '../../components/EmotionCapsule'

interface Props { internId: string; currentWeek: number; onClose: () => void }

export default function CheckIn({ internId, currentWeek, onClose }: Props) {
  const [form] = Form.useForm()
  const [emotion, setEmotion] = useState<string>('steady')
  const [submitting, setSubmitting] = useState(false)

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
        <Button type="primary" htmlType="submit" loading={submitting} block>提交 Check-in</Button>
      </Form>
    </Modal>
  )
}
