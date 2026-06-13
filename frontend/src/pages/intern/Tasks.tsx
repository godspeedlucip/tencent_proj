import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../../types'

const typeStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  learning: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '学习' },
  practice: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '实践' },
  output: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#92400e', label: '产出' },
  retrospective: { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', color: '#5b21b6', label: '复盘' },
}

const statusStyle: Record<string, { bg: string; border: string; color: string; label: string }> = {
  not_started: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', color: '#475569', label: '未开始' },
  in_progress: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#1e40af', label: '进行中' },
  completed: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#065f46', label: '已完成' },
  blocked: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#991b1b', label: '阻塞' },
}

const priorityLabels: Record<string, string> = { high: '高', medium: '中', low: '低' }
const approvalLabels: Record<string, string> = { pending: '待审', approved: '已通过', rejected: '已驳回' }

export default function Tasks({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (tasks.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: 24 }}>暂无任务</p>
  }

  return (
    <div>
      {tasks.map(t => {
        const ts = typeStyle[t.type] ?? typeStyle.learning
        const ss = statusStyle[t.status] ?? statusStyle.not_started
        const showReportBtn = t.status !== 'completed'
        const isExpanded = expandedId === t.id
        return (
          <div key={t.id}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(253,230,138,0.15)', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '0.9rem', color: '#334155', userSelect: 'none' }}>
                <span style={{ marginRight: 6, color: '#94a3b8' }}>{isExpanded ? '▼' : '▶'}</span>
                {t.title}
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="capsule-tag" style={{ background: ts.bg, borderColor: ts.border, color: ts.color }}>
                  {ts.label}
                </span>
                <span className="capsule-tag" style={{ background: ss.bg, borderColor: ss.border, color: ss.color }}>
                  {ss.label}
                </span>
                {showReportBtn && (
                  <button
                    className="btn-link"
                    onClick={(e) => { e.stopPropagation(); navigate(`/intern/tasks/${t.id}/report`) }}
                    style={{ fontSize: '0.8rem' }}
                  >
                    提交报告
                  </button>
                )}
              </span>
            </div>
            {isExpanded && (
              <div style={{ padding: '10px 20px', background: 'rgba(253,230,138,0.05)', borderBottom: '1px solid rgba(253,230,138,0.1)', fontSize: '0.85rem' }}>
                {t.description && (
                  <p style={{ color: '#475569', margin: '0 0 8px', lineHeight: 1.6 }}>{t.description}</p>
                )}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#94a3b8' }}>
                  <span>优先级：{priorityLabels[t.priority] || t.priority}</span>
                  {t.due_date && <span>截止：{t.due_date}</span>}
                  {t.report_md && <span>审批状态：{approvalLabels[t.approval_status || 'pending'] || t.approval_status}</span>}
                  {t.score != null && <span>评分：{t.score}/5</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
