const capsules = [
  { value: 'energetic', label: '干劲十足', emoji: '🔥', color: '#ff4d4f' },
  { value: 'motivated', label: '充满动力', emoji: '💪', color: '#fa8c16' },
  { value: 'steady', label: '稳步前进', emoji: '🚶', color: '#52c41a' },
  { value: 'overloaded', label: '信息过载', emoji: '🌊', color: '#faad14' },
  { value: 'blocked', label: '遇到瓶颈', emoji: '🧱', color: '#722ed1' },
]

interface Props { value: string; onChange: (v: string) => void }

export default function EmotionCapsule({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {capsules.map(c => (
        <div
          key={c.value}
          onClick={() => onChange(c.value)}
          style={{
            padding: '8px 16px', borderRadius: 20, cursor: 'pointer', border: '2px solid',
            borderColor: value === c.value ? c.color : '#d9d9d9',
            background: value === c.value ? `${c.color}15` : '#fff',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 18 }}>{c.emoji}</span>
          <span style={{ fontWeight: value === c.value ? 700 : 400 }}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}
