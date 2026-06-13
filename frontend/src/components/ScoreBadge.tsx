interface Props { score: number | null; size?: 'small' | 'default' }

export default function ScoreBadge({ score, size = 'default' }: Props) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
  const fontSize = size === 'small' ? '0.75rem' : '1rem'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size === 'small' ? 24 : 32, height: size === 'small' ? 24 : 32,
      borderRadius: '50%', backgroundColor: score ? colors[score - 1] : '#94a3b8',
      color: '#fff', fontWeight: 700, fontSize,
    }}>
      {score ?? '–'}
    </span>
  )
}
