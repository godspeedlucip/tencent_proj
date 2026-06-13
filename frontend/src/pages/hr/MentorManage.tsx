import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { MentorSummary } from '../../types'

export default function MentorManage() {
  const [mentors, setMentors] = useState<MentorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null)
  const [form] = Form.useForm()

  useEffect(() => { loadData() }, [])

  function loadData() {
    setLoading(true)
    hr.listMentors()
      .then(r => setMentors(r.mentors))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  async function handleAdd(values: { name: string; department: string }) {
    try {
      const res = await hr.createMentor(values)
      message.success('导师已添加')
      setAddOpen(false)
      form.resetFields()
      setCredentials(res.credentials)
      setCredOpen(true)
      loadData()
    } catch (err: any) {
      message.error(err.message || '添加失败')
    }
  }

  function handleCopyCred() {
    if (!credentials) return
    const text = `用户名: ${credentials.username}\n密码: ${credentials.password}`
    navigator.clipboard.writeText(text).then(() => message.success('已复制'))
  }

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '带教人数', dataIndex: 'intern_count', key: 'intern_count' },
    {
      title: '反馈覆盖率', dataIndex: 'feedback_coverage_pct', key: 'feedback_coverage_pct',
      render: (v: number) => `${v}%`,
    },
    {
      title: '风险人数', dataIndex: 'at_risk_count', key: 'at_risk_count',
      render: (v: number) => v > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#10b981' }}>0</span>,
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>导师管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加导师</Button>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={mentors} columns={cols} rowKey="id" loading={loading} pagination={false} size="middle" />
      </div>

      <Modal title="添加导师" open={addOpen} onCancel={() => setAddOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入导师姓名' }]}>
            <Input placeholder="如：张导师" />
          </Form.Item>
          <Form.Item name="department" label="部门" rules={[{ required: true, message: '请输入部门' }]}>
            <Input placeholder="如：技术研发部" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>确认添加</Button>
        </Form>
      </Modal>

      <Modal
        title="导师已添加"
        open={credOpen}
        onCancel={() => setCredOpen(false)}
        footer={[
          <Button key="copy" type="primary" onClick={handleCopyCred}>复制凭证</Button>,
          <Button key="close" onClick={() => setCredOpen(false)}>关闭</Button>,
        ]}
      >
        {credentials && (
          <div style={{ padding: '16px 0' }}>
            <Typography.Paragraph style={{ fontSize: '1.05rem', marginBottom: 8 }}>
              请将以下凭证发送给导师：
            </Typography.Paragraph>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, fontFamily: 'monospace' }}>
              <div>用户名：<Typography.Text copyable strong>{credentials.username}</Typography.Text></div>
              <div style={{ marginTop: 4 }}>密码：<Typography.Text copyable strong>{credentials.password}</Typography.Text></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
