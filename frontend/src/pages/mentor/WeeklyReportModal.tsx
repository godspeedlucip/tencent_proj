import { useState, useEffect } from 'react'
import { Modal, List, Tag, Spin, Alert } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { mentors } from '../../services/api'
import type { MentorInternCheckin } from '../../types'
import ScoreReportModal from './ScoreReportModal'

interface Props {
  mentorId: string
  internId: string
  internName: string
  onClose: () => void
}

export default function WeeklyReportModal({ mentorId, internId, internName, onClose }: Props) {
  const [checkins, setCheckins] = useState<MentorInternCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [scoringCheckin, setScoringCheckin] = useState<MentorInternCheckin | null>(null)

  useEffect(() => {
    mentors.getInternCheckins(mentorId, internId)
      .then(r => setCheckins(r.checkins))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mentorId, internId])

  if (scoringCheckin) {
    return (
      <ScoreReportModal
        checkin={scoringCheckin}
        onClose={() => { setScoringCheckin(null); onClose() }}
      />
    )
  }

  return (
    <Modal title={`${internName} 的周报`} open onCancel={onClose} footer={null} width={700}>
      {loading ? <Spin /> : checkins.length === 0
        ? <Alert message="暂无周报" type="info" />
        : (
          <List
            dataSource={checkins}
            renderItem={c => (
              <List.Item
                actions={[
                  c.mentor_score != null
                    ? <Tag color="green">已打分: {c.mentor_score}/5</Tag>
                    : <button className="btn-link" onClick={() => setScoringCheckin(c)}>打分</button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span>
                      第 {c.week} 周
                      {c.is_late && <Tag color="orange" style={{ marginLeft: 8 }}><ClockCircleOutlined /> 迟交</Tag>}
                    </span>
                  }
                  description={c.progress?.slice(0, 80) + (c.progress?.length > 80 ? '...' : '')}
                />
              </List.Item>
            )}
          />
        )}
    </Modal>
  )
}
