import { useState, useEffect } from 'react'
import { Modal, List, Button, Spin, Empty } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { mentors } from '../services/api'
import type { TaskTemplate } from '../types'

interface Props { open: boolean; onSelect: (template: TaskTemplate) => void; onClose: () => void; mentorId: string }

export default function TaskTemplatePicker({ open, onSelect, onClose, mentorId }: Props) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      mentors.getTemplates(mentorId).then(r => setTemplates(r.templates)).catch(() => {}).finally(() => setLoading(false))
    }
  }, [open, mentorId])

  return (
    <Modal title="从模板创建" open={open} onCancel={onClose} footer={null}>
      {loading ? <Spin /> : templates.length === 0 ? <Empty description="暂无模板，请先创建" /> : (
        <List dataSource={templates} renderItem={t => (
          <List.Item actions={[<Button type="link" onClick={() => onSelect(t)}>使用</Button>]}>
            <List.Item.Meta avatar={<FileTextOutlined />} title={t.title} description={`${t.type} · ${t.priority}`} />
          </List.Item>
        )} />
      )}
    </Modal>
  )
}
