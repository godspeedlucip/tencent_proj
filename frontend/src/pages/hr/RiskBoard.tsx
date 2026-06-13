import { useState, useEffect } from 'react'
import { Table, Modal, Button, Spin, Alert, Typography } from 'antd'
import { WarningOutlined, FileTextOutlined } from '@ant-design/icons'
import { hr } from '../../services/api'
import type { HRDashboard, RiskSignal, WeeklyReport } from '../../types'
import RadarChart from '../../components/RadarChart'

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  normal: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '正常' },
  potential: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '高潜' },
  watch: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '需关注' },
  risk: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '高风险' },
}

const reviewStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  pending: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', color: '#475569', label: '未复核' },
  confirmed: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '已确认' },
  overridden: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '已否决' },
}

const statCards = [
  { key: 'total', label: '总人数', color: '#475569' },
  { key: 'normal', label: '正常', color: '#10b981' },
  { key: 'potential', label: '高潜', color: '#3b82f6' },
  { key: 'risk', label: '高风险', color: '#ef4444', icon: true },
]

export default function HRDashboard() {
  const [dashboard, setDashboard] = useState<HRDashboard | null>(null)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRisk, setSelectedRisk] = useState<RiskSignal | null>(null)

  useEffect(() => {
    hr.getDashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function generateReport() {
    const r = await hr.getWeeklyReport()
    setReport(r)
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />
  if (!dashboard) return <Alert message="请先确保后端已启动" type="warning" />

  const riskCols = [
    { title: '实习生', dataIndex: 'intern_name', key: 'name' },
    {
      title: '风险等级', dataIndex: 'level', key: 'level',
      render: (l: string) => {
        const st = statusStyle[l] ?? statusStyle.normal
        return <span className="capsule-tag" style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
      },
    },
    { title: '触发原因', dataIndex: 'triggers', key: 'triggers', render: (t: string[]) => t.join(', ') },
    { title: 'AI置信度', dataIndex: 'ai_confidence', key: 'confidence', render: (c: number) => `${Math.round(c * 100)}%` },
    {
      title: '复核状态', dataIndex: 'review_status', key: 'review',
      render: (s: string) => {
        const rs = reviewStyle[s] ?? reviewStyle.pending
        return <span className="capsule-tag" style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>{rs.label}</span>
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: RiskSignal) => <button className="btn-link" onClick={() => setSelectedRisk(r)}>详情</button>,
    },
  ]

  return (
    <>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {statCards.map(s => (
          <div key={s.key} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
              {s.icon && <WarningOutlined style={{ color: '#ef4444', marginRight: 4 }} />}
              {s.label}
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {dashboard.summary[s.key as keyof typeof dashboard.summary] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Risk Table + Weekly Report */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>风险看板</h3>
            <button className="btn-primary" onClick={generateReport}>
              <FileTextOutlined style={{ marginRight: 6 }} />
              一键生成周报
            </button>
          </div>
          <Table dataSource={dashboard.risk_list} columns={riskCols} rowKey="id" pagination={false} size="small"
            locale={{ emptyText: '暂无风险信号，所有实习生状态正常' }} />
        </div>

        <div>
          {report ? (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>
                第 {report.week} 周周报摘要
              </h3>
              <span className="capsule-tag" style={{
                background: report.source === 'ai' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                borderColor: report.source === 'ai' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                color: report.source === 'ai' ? '#065f46' : '#92400e',
                marginBottom: 16,
              }}>
                {report.source === 'ai' ? 'AI生成' : '本地模板'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>周报提交率</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                    {Math.round((report.summary_stats.checkin_rate ?? 0) * 100)}%
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>任务完成率</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
                    {Math.round((report.summary_stats.avg_task_completion ?? 0) * 100)}%
                  </div>
                </div>
              </div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>行动建议</h4>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {report.recommended_actions?.map((a, i) => (
                  <li key={i} style={{ marginBottom: 8, fontSize: '0.85rem', color: '#475569' }}>{a}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 24 }}>
              <Alert message="点击'一键生成周报'查看本周摘要" type="info" />
            </div>
          )}
        </div>
      </div>

      {selectedRisk && (
        <Modal title="风险详情" open onCancel={() => setSelectedRisk(null)} footer={null}>
          <p><strong>实习生：</strong>{selectedRisk.intern_name}</p>
          <p>
            <strong>等级：</strong>
            {(() => {
              const st = statusStyle[selectedRisk.level] ?? statusStyle.normal
              return <span className="capsule-tag" style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
            })()}
          </p>
          <p><strong>触发原因：</strong>{selectedRisk.triggers?.join(', ')}</p>
          <p><strong>AI置信度：</strong>{Math.round(selectedRisk.ai_confidence * 100)}%</p>
          <p>
            <strong>复核状态：</strong>
            {(() => {
              const rs = reviewStyle[selectedRisk.review_status] ?? reviewStyle.pending
              return <span className="capsule-tag" style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>{rs.label}</span>
            })()}
          </p>
          {selectedRisk.review_note && <p><strong>复核备注：</strong>{selectedRisk.review_note}</p>}
          {selectedRisk.review_status === 'pending' && (
            <Alert message="该风险信号尚未经过人工复核，请提醒导师或HR进行复核。" type="warning" style={{ marginTop: 12 }} />
          )}
        </Modal>
      )}
    </>
  )
}
