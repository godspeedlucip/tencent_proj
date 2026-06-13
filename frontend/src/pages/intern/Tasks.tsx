import { List, Tag } from 'antd'
import type { Task } from '../../types'

const typeColor: Record<string, string> = { learning: 'blue', practice: 'green', output: 'orange', retrospective: 'purple' }
const typeLabel: Record<string, string> = { learning: '学习', practice: '实践', output: '产出', retrospective: '复盘' }
const statusColor: Record<string, string> = { not_started: 'default', in_progress: 'processing', completed: 'success', blocked: 'error' }
const statusLabel: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成', blocked: '阻塞' }

export default function Tasks({ tasks }: { tasks: Task[] }) {
  return (
    <List
      dataSource={tasks}
      renderItem={(t) => (
        <List.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>{t.title}</span>
            <span>
              <Tag color={typeColor[t.type]}>{typeLabel[t.type]}</Tag>
              <Tag color={statusColor[t.status]}>{statusLabel[t.status]}</Tag>
            </span>
          </div>
        </List.Item>
      )}
      locale={{ emptyText: '暂无任务' }}
    />
  )
}
