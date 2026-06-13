import { useState, useEffect } from 'react'
import { Modal, Spin, Alert, Typography, Descriptions } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { recruiters } from '../../services/api'
import type { FitReport } from '../../types'
import RadarChart from '../../components/RadarChart'

interface Props { report: FitReport; onClose: () => void }

const recStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  high_potential: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '高潜' },
  observe: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '观察' },
  not_suitable: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '暂不适配' },
}

export default function FitReportDetail({ report: initial, onClose }: Props) {
  const [report, setReport] = useState<FitReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    recruiters.getFitReport(initial.id)
      .then(setReport)
      .catch(() => setReport(initial))
      .finally(() => setLoading(false))
  }, [initial.id])

  const data = report || initial
  const rec = recStyle[data.ai_recommendation] ?? recStyle.observe

  return (
    <Modal title={`适岗报告 — ${data.intern_name}`} open onCancel={onClose} footer={null} width={700}>
      {loading ? <Spin /> : (
        <>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="AI建议">
              <span className="capsule-tag" style={{ background: rec.bg, borderColor: rec.border, color: rec.color }}>{rec.label}</span>
            </Descriptions.Item>
            <Descriptions.Item label="人工复核">
              {data.has_human_review
                ? <span className="capsule-tag" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: '#065f46' }}>已复核</span>
                : <span className="capsule-tag" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#991b1b' }}>未复核</span>}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 16 }}>
            <Typography.Title level={5}>能力雷达</Typography.Title>
            <RadarChart scores={data.score_dimensions} />
          </div>

          <div style={{ marginTop: 16 }}>
            <Typography.Title level={5}>成长证据</Typography.Title>
            <p>{data.growth_evidence}</p>
          </div>

          {data.human_review_note && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
              <strong>导师/HR复核备注：</strong>{data.human_review_note}
            </div>
          )}

          {data.ai_recommendation === 'not_suitable' && !data.has_human_review && (
            <Alert
              style={{ marginTop: 12 }}
              type="error"
              icon={<WarningOutlined />}
              message="强制要求：AI判定为'暂不适配'，必须完成导师/HR人工复核后才能作为决策依据。"
            />
          )}
        </>
      )}
    </Modal>
  )
}
