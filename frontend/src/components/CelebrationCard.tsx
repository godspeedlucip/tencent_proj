import { useEffect, useState } from 'react'
import { Typography } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'

interface Props {
  internName: string
  reason: string
  onDismiss: () => void
}

const CONFETTI_COLORS = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96']

export default function CelebrationCard({ internName, reason, onDismiss }: Props) {
  const [pieces, setPieces] = useState<{ id: number; color: string; left: string; delay: string }[]>([])

  useEffect(() => {
    setPieces(Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
    })))

    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{ background: p.color, left: p.left, animationDelay: p.delay }} />
      ))}
      <div className="glass-card" style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        zIndex: 999, width: 400, textAlign: 'center', padding: 32, border: '2px solid #faad14',
        animation: 'celebrate-bounce 0.6s ease-in-out 3',
      }}>
        <TrophyOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
        <Typography.Title level={4} style={{ color: '#1e293b' }}>太棒了，{internName}！</Typography.Title>
        <Typography.Paragraph style={{ fontSize: 16, color: '#475569' }}>{reason}</Typography.Paragraph>
        <Typography.Paragraph style={{ color: '#94a3b8' }}>继续保持，你的成长有目共睹。</Typography.Paragraph>
      </div>
    </>
  )
}
