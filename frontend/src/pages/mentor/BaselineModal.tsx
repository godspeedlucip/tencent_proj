import { useState } from 'react'
import { Modal, Slider, Space, message } from 'antd'
import { mentors } from '../../services/api'

const DIMS = ['业务理解', '需求分析', '协作沟通', '交付质量']

interface Props {
  internId: string
  internName: string
  onClose: () => void
}

export default function BaselineModal({ internId, internName, onClose }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({
    业务理解: 2, 需求分析: 2, 协作沟通: 3, 交付质量: 2,
  })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      await mentors.submitBaseline(internId, scores)
      message.success(`${internName} 的基线评估已提交`)
      onClose()
    } catch {
      message.error('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`基线评估 — ${internName}`} open onCancel={onClose} footer={null} width={500}>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
        评估实习生当前四项核心能力的基线水平（1=完全不了解，5=能独立完成）
      </p>
      <Space direction="vertical" style={{ width: '100%' }}>
        {DIMS.map(dim => (
          <div key={dim}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong style={{ color: '#334155' }}>{dim}</strong>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{scores[dim]} 分</span>
            </div>
            <Slider min={1} max={5} value={scores[dim]} onChange={v => setScores(s => ({ ...s, [dim]: v }))} />
          </div>
        ))}
      </Space>
      <button className="btn-primary" onClick={submit} disabled={submitting} style={{ marginTop: 16, width: '100%' }}>
        {submitting ? '提交中...' : '提交基线评估'}
      </button>
    </Modal>
  )
}
