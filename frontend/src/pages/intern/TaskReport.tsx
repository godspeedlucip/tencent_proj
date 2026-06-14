import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, message, Spin, Alert, Upload } from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { interns, upload } from '../../services/api'
import type { TaskDetail } from '../../types'
import MarkdownEditor from '../../components/MarkdownEditor'

export default function TaskReport() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [reportMd, setReportMd] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  useEffect(() => {
    const internId = user.id
    interns.getTasks(internId).then(r => {
      const t = r.tasks.find((t: any) => t.id === taskId)
      setTask(t as TaskDetail)
      if (t && (t as any).report_md) setReportMd((t as any).report_md)
      if (t && (t as any).attachment_url) setAttachment({ url: (t as any).attachment_url, name: (t as any).attachment_name || '附件' })
    }).catch(() => { setTask(null) }).finally(() => setLoading(false))
  }, [taskId])

  const handleSubmit = async () => {
    if (!reportMd.trim()) { message.warning('请输入报告内容'); return }
    setSubmitting(true)
    try {
      await interns.submitTaskReport(user.id, taskId!, reportMd, attachment?.url, attachment?.name)
      message.success('报告已提交，等待导师审批')
      navigate('/intern')
    } catch (err: any) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />
  if (!task) return <Alert message="任务未找到" type="warning" />

  const approval = (task as any).approval_status || 'pending'

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>提交任务报告</h2>
      <Card className="glass-card" style={{ marginBottom: 16 }}>
        <p><strong>任务：</strong>{task.title}</p>
        {task.description && <p style={{ color: '#475569', fontSize: '0.9rem' }}>{task.description}</p>}
      </Card>
      <Card className="glass-card">
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>完成报告 (Markdown)</h3>
        <MarkdownEditor value={reportMd} onChange={setReportMd} placeholder="## 完成情况\n\n## 关键收获\n\n## 遗留问题" />
        <div style={{ marginTop: 16 }}>
          {attachment ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0', marginBottom: 16 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{attachment.name}</span>
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => setAttachment(null)} />
            </div>
          ) : (
            <Upload
              beforeUpload={(file) => {
                const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
                if (!allowed.includes(file.type)) { message.error('仅支持 JPG/PNG/GIF/WebP/PDF'); return Upload.LIST_IGNORE }
                if (file.size > 5 * 1024 * 1024) { message.error('文件不能超过 5MB'); return Upload.LIST_IGNORE }
                setUploading(true)
                upload.file(file)
                  .then((res) => setAttachment({ url: res.url, name: res.name }))
                  .catch((err) => message.error(err.message || '上传失败'))
                  .finally(() => setUploading(false))
                return false
              }}
              showUploadList={false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>选择文件</Button>
              <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>支持 JPG/PNG/PDF，最大 5MB</span>
            </Upload>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={approval === 'approved'}>
            {approval === 'approved' ? '已通过' : approval === 'rejected' ? '重新提交' : '提交审批'}
          </Button>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </Card>
    </div>
  )
}
