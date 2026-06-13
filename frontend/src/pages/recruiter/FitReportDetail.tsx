import { useState, useEffect } from 'react'
import { Modal, Spin, Tag, Alert, Typography, Descriptions } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { recruiters } from '../../services/api'
import type { FitReport } from '../../types'
import RadarChart from '../../components/RadarChart'

interface Props { report: FitReport; onClose: () => void }

const recTag: Record<string, { color: string; label: string }> = {
  high_potential: { color: 'green', label: '高潜' },
  observe: { color: 'orange', label: '观察' },
  not_suitable: { color: 'red', label: '暂不适配' },
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

  return (
    <Modal title={`适岗报告 — ${data.intern_name}`} open onCancel={onClose} footer={null} width={700}>
      {loading ? <Spin /> : (
        <>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="AI建议">
              <Tag color={recTag[data.ai_recommendation]?.color}>{recTag[data.ai_recommendation]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="人工复核">
              {data.has_human_review ? <Tag color="green">已复核</Tag> : <Tag color="red">未复核</Tag>}
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
            <div style={{ marginTop: 12, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
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
