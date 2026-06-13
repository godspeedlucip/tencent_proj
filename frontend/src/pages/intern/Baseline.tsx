import { useState } from 'react'
import { Card, Slider, Button, message, Space } from 'antd'
import { interns } from '../../services/api'

const DIMS = ['业务理解', '需求分析', '协作沟通', '交付质量']

export default function Baseline({ internId, onComplete }: { internId: string; onComplete: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>({ 业务理解: 2, 需求分析: 2, 协作沟通: 3, 交付质量: 2 })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      await interns.submitBaseline(internId, scores)
      message.success('基线评估已提交，等待导师复核')
      onComplete()
    } catch {
      message.error('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="入职成长基线评估" style={{ marginBottom: 16, background: '#e6f7ff', borderColor: '#91d5ff' }}>
      <p style={{ color: '#666', marginBottom: 16 }}>
        欢迎加入！请诚实地评估自己在以下四个维度的当前水平（1=完全不了解，5=能独立完成）。导师会对你的自评进行复核，这是你成长路径的起点。
      </p>
      <Space direction="vertical" style={{ width: '100%' }}>
        {DIMS.map(dim => (
          <div key={dim}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong>{dim}</strong>
              <span>{scores[dim]} 分</span>
            </div>
            <Slider min={1} max={5} value={scores[dim]} onChange={v => setScores(s => ({ ...s, [dim]: v }))} />
          </div>
        ))}
      </Space>
      <Button type="primary" onClick={submit} loading={submitting} style={{ marginTop: 16 }}>提交基线评估</Button>
    </Card>
  )
}
