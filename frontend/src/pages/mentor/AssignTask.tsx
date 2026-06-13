import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, DatePicker, Button, message, Spin } from 'antd'
import { mentors } from '../../services/api'
import type { Intern } from '../../types'

export default function AssignTask() {
  const navigate = useNavigate()
  const [interns, setInterns] = useState<Intern[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const mentorId = JSON.parse(sessionStorage.getItem('user') || '{}').id
    mentors.getInterns(mentorId).then(r => {
      setInterns(r.interns)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const onFinish = async (values: any) => {
    setSubmitting(true)
    try {
      await mentors.createTask({
        intern_id: values.intern_id,
        title: values.title,
        description: values.description,
        type: values.type,
        priority: values.priority || 'medium',
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
      })
      message.success('任务已指派')
      navigate('/mentor')
    } catch (err: any) {
      message.error(err.message || '指派失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>指派任务</h2>
      <Card className="glass-card" style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="intern_id" label="选择实习生" rules={[{ required: true }]}>
            <Select placeholder="选择实习生">
              {interns.map(i => (
                <Select.Option key={i.id} value={i.id}>{i.name} · {i.role}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input placeholder="例如：完成首页 UI 优化方案" />
          </Form.Item>
          <Form.Item name="description" label="任务描述 (Markdown)">
            <Input.TextArea rows={6} placeholder="用 Markdown 写清楚任务要求和预期结果" />
          </Form.Item>
          <Form.Item name="type" label="任务类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="learning">学习</Select.Option>
              <Select.Option value="practice">实践</Select.Option>
              <Select.Option value="output">产出</Select.Option>
              <Select.Option value="retrospective">复盘</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="medium">
            <Select>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="low">低</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="due_date" label="截止日期">
            <DatePicker />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>确认指派</Button>
            <Button style={{ marginLeft: 12 }} onClick={() => navigate(-1)}>取消</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
