import RadarChart from '../../components/RadarChart'

const DIMS = ['业务理解', '需求分析', '协作沟通', '交付质量']

interface Props {
  baselineScores: Record<string, number> | null
  currentScores: Record<string, number> | null
}

export default function Baseline({ baselineScores, currentScores }: Props) {
  if (!baselineScores) {
    return (
      <div className="glass-card" style={{ padding: 24, marginBottom: 16, textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>
          入职成长基线评估
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          等待导师评估中，完成评估后将在此展示你的成长起点和当前水平。
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>
        入职成长基线评估
      </h3>
      <RadarChart scores={Object.fromEntries(DIMS.map(dim => [
        dim,
        {
          baseline: baselineScores[dim] ?? 0,
          current: currentScores?.[dim] ?? baselineScores[dim] ?? 0,
          trend: currentScores && baselineScores
            ? currentScores[dim] > baselineScores[dim] ? 'up'
            : currentScores[dim] < baselineScores[dim] ? 'down'
            : 'stable'
            : 'stable',
        }
      ]))} />
      <div style={{ marginTop: 16 }}>
        {DIMS.map(dim => {
          const baseline = baselineScores[dim] ?? 0
          const current = currentScores?.[dim] ?? baseline
          return (
            <div key={dim} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>{dim}</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  基线 {baseline} → 当前 {current}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.round(current / 5 * 100)}%`,
                    background: current >= 4
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
