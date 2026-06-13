import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Table, Tag, Spin, Alert, Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { HRInternDetail, MentorInternTask, MentorInternCheckin } from '../../types'

const typeLabels: Record<string, string> = { learning: '学习', practice: '实践', output: '产出', retrospective: '复盘' }
const statusLabels: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成', blocked: '阻塞' }
const approvalLabels: Record<string, string> = { pending: '待审', approved: '已通过', rejected: '已驳回' }
const approvalColors: Record<string, string> = { pending: 'default', approved: 'green', rejected: 'red' }
const statusColors: Record<string, string> = { normal: 'green', potential: 'blue', watch: 'orange', risk: 'red' }
const statusText: Record<string, string> = { normal: '正常', potential: '高潜', watch: '需关注', risk: '高风险' }
const emotionLabels: Record<string, string> = { energetic: '精力充沛', steady: '平稳', blocked: '受阻', overloaded: '超负荷', motivated: '有动力' }

export default function InternDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<HRInternDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    hr.getInternDetail(id)
      .then(setData)
      .catch((err: any) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />
  if (error) return <Alert message={error} type="error" showIcon />
  if (!data) return <Alert message="未找到实习生" type="warning" showIcon />

  const { intern, tasks, checkins } = data

  const taskCols = [
    { title: '任务', dataIndex: 'title', key: 'title' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (t: string) => typeLabels[t] || t,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => statusLabels[s] || s,
    },
    {
      title: '分数', dataIndex: 'score', key: 'score',
      render: (s: number | null) => s != null ? s : '-',
    },
    {
      title: '审批', dataIndex: 'approval_status', key: 'approval',
      render: (a: string) => <Tag color={approvalColors[a] || 'default'}>{approvalLabels[a] || a}</Tag>,
    },
    {
      title: '驳回原因', dataIndex: 'rejection_reason', key: 'rejection_reason',
      render: (r: string | null) => r ? <Typography.Text type="danger">{r}</Typography.Text> : '-',
    },
  ]

  const checkinCols = [
    {
      title: '周次', dataIndex: 'week', key: 'week',
      render: (w: number) => `第 ${w} 周`,
    },
    {
      title: '进度', dataIndex: 'progress', key: 'progress',
      render: (p: string) => <Typography.Text ellipsis style={{ maxWidth: 200 }}>{p}</Typography.Text>,
    },
    { title: '阻碍', dataIndex: 'blockers', key: 'blockers', render: (b: string | null) => b || '-' },
    {
      title: '情绪', dataIndex: 'emotion_capsule', key: 'emotion',
      render: (e: string) => emotionLabels[e] || e,
    },
    {
      title: '评分', dataIndex: 'mentor_score', key: 'score',
      render: (s: number | null) => s != null ? s : '-',
    },
    { title: '评语', dataIndex: 'mentor_comment', key: 'comment', render: (c: string | null) => c || '-' },
    {
      title: '提交时间', dataIndex: 'submitted_at', key: 'submitted_at',
      render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    },
    {
      title: '迟到', dataIndex: 'is_late', key: 'is_late',
      render: (l: boolean) => l ? <Tag color="red">迟到</Tag> : <Tag color="green">准时</Tag>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/interns')}>返回</Button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {intern.name} 的详情
        </h2>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div><Typography.Text type="secondary">岗位</Typography.Text> <strong>{intern.role}</strong></div>
          <div><Typography.Text type="secondary">部门</Typography.Text> <strong>{intern.department}</strong></div>
          <div><Typography.Text type="secondary">导师</Typography.Text> <strong>{intern.mentor_name}</strong></div>
          <div><Typography.Text type="secondary">入职周</Typography.Text> <strong>第 {intern.onboard_week} 周</strong></div>
          <div>
            <Typography.Text type="secondary">状态</Typography.Text>{' '}
            <Tag color={statusColors[intern.status] || 'default'}>{statusText[intern.status] || intern.status}</Tag>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <Tabs defaultActiveKey="tasks" items={[
          {
            key: 'tasks', label: `任务列表 (${tasks.length})`,
            children: tasks.length === 0
              ? <Alert message="暂无任务" type="info" />
              : <Table
                  dataSource={tasks} columns={taskCols} rowKey="id"
                  pagination={false} size="middle"
                  expandable={{
                    expandedRowRender: (t: MentorInternTask) => (
                      <div style={{ padding: '12px 24px' }}>
                        <Typography.Text strong>报告内容：</Typography.Text>
                        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#475569' }}>
                          {t.report_md || '暂无报告'}
                        </div>
                      </div>
                    ),
                    rowExpandable: (t: MentorInternTask) => !!t.report_md,
                  }}
                />,
          },
          {
            key: 'checkins', label: `Check-in 记录 (${checkins.length})`,
            children: checkins.length === 0
              ? <Alert message="暂无 Check-in" type="info" />
              : <Table
                  dataSource={checkins} columns={checkinCols} rowKey="id"
                  pagination={false} size="middle"
                  expandable={{
                    expandedRowRender: (c: MentorInternCheckin) => (
                      <div style={{ padding: '12px 24px' }}>
                        <Typography.Text strong>周报内容：</Typography.Text>
                        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#475569' }}>
                          {c.weekly_report_md || '暂无周报'}
                        </div>
                      </div>
                    ),
                    rowExpandable: (c: MentorInternCheckin) => !!c.weekly_report_md,
                  }}
                />,
          },
        ]} />
      </div>
    </div>
  )
}
