import { useState, useEffect, useCallback } from 'react'
import { Badge, Popover, List, Button, Typography, Empty } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { notifications as notifApi } from '../services/api'
import type { Notification } from '../types'

interface Props {
  role: string
  userId: string
}

const priorityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' }
const typeLabels: Record<string, string> = {
  deadline_reminder: '截止提醒', mentor_nudge: '反馈提醒', risk_alert: '风险预警',
  positive_milestone: '成长激励', system: '系统通知',
}

export default function NotificationBell({ role, userId }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await notifApi.list(role, userId, false)
      setNotifs(res.notifications.slice(0, 10))
      setUnread(res.unread_count)
    } catch { /* silently fail */ }
  }, [role, userId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  async function handleMarkAllRead() {
    await notifApi.markAllRead(role, userId)
    load()
  }

  const content = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong>通知</Typography.Text>
        {unread > 0 && <Button type="link" size="small" onClick={handleMarkAllRead}>全部已读</Button>}
      </div>
      {notifs.length === 0 ? (
        <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List dataSource={notifs} renderItem={(n) => (
          <List.Item style={{ background: n.read ? 'transparent' : '#f6ffed', padding: '8px 12px', cursor: 'pointer' }}
            onClick={async () => { await notifApi.markRead(n.id); load() }}>
            <List.Item.Meta
              title={<span><span className="capsule-tag" style={{ fontSize: 11, marginRight: 6, background: `${priorityColors[n.priority]}15`, color: priorityColors[n.priority] }}>{typeLabels[n.type] || n.type}</span> {n.title}</span>}
              description={<span style={{ fontSize: 12, color: '#94a3b8' }}>{n.body}</span>}
            />
          </List.Item>
        )} />
      )}
    </div>
  )

  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Badge count={unread} size="small">
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  )
}
