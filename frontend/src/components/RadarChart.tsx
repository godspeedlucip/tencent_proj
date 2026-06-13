interface Props {
  scores: Record<string, { baseline: number; current: number; trend: string }>
}

const DIM_LABELS: Record<string, string> = {
  业务理解: '业务理解',
  需求分析: '需求分析',
  协作沟通: '协作沟通',
  交付质量: '交付质量',
}

export default function RadarChart({ scores }: Props) {
  const dims = Object.keys(scores)
  const centerX = 150; const centerY = 150; const radius = 120
  const maxVal = 5

  function getPoint(angle: number, val: number) {
    const r = (val / maxVal) * radius
    return {
      x: centerX + r * Math.sin(angle),
      y: centerY - r * Math.cos(angle),
    }
  }

  function getPolygonPoints(vals: number[]) {
    return vals.map((v, i) => {
      const angle = (2 * Math.PI * i) / vals.length - Math.PI / 2
      const pt = getPoint(angle, v)
      return `${pt.x},${pt.y}`
    }).join(' ')
  }

  const gridLevels = [1, 2, 3, 4, 5]
  const angles = dims.map((_, i) => (2 * Math.PI * i) / dims.length - Math.PI / 2)
  const baselineVals = dims.map(d => scores[d]?.baseline ?? 1)
  const currentVals = dims.map(d => scores[d]?.current ?? 1)

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width="320" height="320" viewBox="0 0 300 300">
        {gridLevels.map(level => {
          const pts = angles.map(a => {
            const r = (level / maxVal) * radius
            return `${centerX + r * Math.sin(a)},${centerY - r * Math.cos(a)}`
          }).join(' ')
          return <polygon key={level} points={pts} fill="none" stroke="#e0e0e0" strokeWidth="1" />
        })}

        {angles.map((a, i) => (
          <line key={`axis-${i}`} x1={centerX} y1={centerY}
            x2={centerX + radius * Math.sin(a)} y2={centerY - radius * Math.cos(a)}
            stroke="#e0e0e0" strokeWidth="1" />
        ))}

        <polygon points={getPolygonPoints(baselineVals)} fill="rgba(24,144,255,0.15)" stroke="#1890ff" strokeWidth="2" />
        <polygon points={getPolygonPoints(currentVals)} fill="rgba(82,196,26,0.2)" stroke="#52c41a" strokeWidth="2" />

        {angles.map((a, i) => {
          const pt = getPoint(a, currentVals[i])
          return <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r="4" fill="#52c41a" />
        })}

        {angles.map((a, i) => {
          const pt = getPoint(a, maxVal + 0.7)
          return (
            <text key={`label-${i}`} x={pt.x} y={pt.y} textAnchor="middle" fontSize="12" fill="#555">
              {dims[i]}
            </text>
          )
        })}
      </svg>

      <div style={{ marginLeft: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 16, height: 16, background: '#1890ff', borderRadius: 2 }} />
          <span style={{ fontSize: 12 }}>基线</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 2 }} />
          <span style={{ fontSize: 12 }}>当前</span>
        </div>
      </div>
    </div>
  )
}
