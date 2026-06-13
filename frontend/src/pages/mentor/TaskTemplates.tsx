import { useState, useEffect } from 'react'
import { Card, Table, Button, Popconfirm, message, Spin } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { TaskTemplate } from '../../types'

export default function TaskTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const mentorId = JSON.parse(localStorage.getItem('user') || '{}').id

  useEffect(() => {
    mentors.getTemplates(mentorId).then(r => setTemplates(r.templates)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await mentors.deleteTemplate(mentorId, id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      message.success('已删除')
    } catch (err: any) { message.error(err.message) }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>任务模板</h2>
      <Card className="glass-card">
        <Table
          dataSource={templates}
          rowKey="id"
          columns={[
            { title: '标题', dataIndex: 'title', key: 'title' },
            { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
            { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
            { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180, render: (v: string) => new Date(v).toLocaleDateString() },
            { title: '操作', key: 'action', width: 80,
              render: (_: any, record: TaskTemplate) => (
                <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
