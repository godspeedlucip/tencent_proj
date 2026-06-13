import { useState, useEffect } from 'react'
import { Modal, Spin, Tag, List, Typography } from 'antd'
import { BulbOutlined, QuestionCircleOutlined, SoundOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { TalkingPoints } from '../../types'

interface Props { internId: string; internName: string; onClose: () => void }

export default function TalkingPointsView({ internId, internName, onClose }: Props) {
  const [data, setData] = useState<TalkingPoints | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mentors.getTalkingPoints(internId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [internId])

  return (
    <Modal title={`1:1 沟通提纲 — ${internName}`} open onCancel={onClose} footer={null} width={600}>
      {loading ? <Spin /> : data && (
        <>
          <Tag>{data.source === 'ai' ? 'AI 生成' : '本地模板'}</Tag>
          <Typography.Title level={5}><BulbOutlined /> 近期亮点</Typography.Title>
          <List dataSource={data.outline.recent_highlights} renderItem={i => <List.Item>{i}</List.Item>} size="small" />

          <Typography.Title level={5} style={{ marginTop: 16 }}><SoundOutlined /> 需关注话题</Typography.Title>
          <List dataSource={data.outline.areas_to_discuss} renderItem={i => <List.Item>{i}</List.Item>} size="small" />

          <Typography.Title level={5} style={{ marginTop: 16 }}><QuestionCircleOutlined /> 建议提问</Typography.Title>
          <List dataSource={data.outline.suggested_questions} renderItem={i => <List.Item>💬 {i}</List.Item>} size="small" />

          <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <strong>沟通基调提示：</strong>{data.outline.tone_hint}
          </div>
        </>
      )}
    </Modal>
  )
}
