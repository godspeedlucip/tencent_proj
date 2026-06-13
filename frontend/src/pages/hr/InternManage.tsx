import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { HRIntern, MentorSummary } from '../../types'

const statusStyle: Record<string, { color: string; label: string }> = {
  normal: { color: 'green', label: '正常' },
  potential: { color: 'blue', label: '高潜' },
  watch: { color: 'orange', label: '需关注' },
  risk: { color: 'red', label: '高风险' },
}

export default function InternManage() {
  const [interns, setInterns] = useState<HRIntern[]>([])
  const [mentors, setMentors] = useState<MentorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [iRes, mRes] = await Promise.all([hr.listAllInterns(), hr.listMentors()])
      setInterns(iRes.interns)
      setMentors(mRes.mentors)
    } catch {} finally { setLoading(false) }
  }

  async function handleAdd(values: any) {
    try {
      await hr.createIntern(values)
      message.success('实习生已添加')
      setAddOpen(false)
      form.resetFields()
      loadData()
    } catch (err: any) {
      message.error(err.message || '添加失败')
    }
  }

  async function handleDelete(id: string) {
    try {
      await hr.deleteIntern(id)
      message.success('已删除')
      loadData()
    } catch (err: any) {
      message.error(err.message || '删除失败')
    }
  }

  async function handleAssign(internId: string, mentorId: string) {
    try {
      await hr.assignMentor(internId, mentorId)
      message.success('导师已更新')
      loadData()
    } catch (err: any) {
      message.error(err.message || '分配失败')
    }
  }

  const cols = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '岗位', dataIndex: 'role', key: 'role' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const st = statusStyle[s] ?? { color: 'default', label: s }
        return <Tag color={st.color}>{st.label}</Tag>
      },
    },
    { title: '导师', dataIndex: 'mentor_name', key: 'mentor' },
    { title: '入职周', dataIndex: 'onboard_week', key: 'week' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: HRIntern) => (
        <Space>
          <Select
            size="small"
            style={{ width: 120 }}
            placeholder="更换导师"
            value={undefined}
            onChange={(mid: string) => handleAssign(record.id, mid)}
            options={mentors.map(m => ({ value: m.id, label: m.name }))}
          />
          <Popconfirm title="确定删除该实习生？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>实习生管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加实习生</Button>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <Table dataSource={interns} columns={cols} rowKey="id" loading={loading} pagination={false} size="middle" />
      </div>

      <Modal title="添加实习生" open={addOpen} onCancel={() => setAddOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="岗位" rules={[{ required: true }]}>
            <Input placeholder="如：前端开发实习生" />
          </Form.Item>
          <Form.Item name="department" label="部门" rules={[{ required: true }]}>
            <Input placeholder="如：技术研发部" />
          </Form.Item>
          <Form.Item name="mentor_id" label="导师" rules={[{ required: true }]}>
            <Select options={mentors.map(m => ({ value: m.id, label: m.name }))} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>确认添加</Button>
        </Form>
      </Modal>
    </>
  )
}
