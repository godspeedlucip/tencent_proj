import type { Intern, CheckIn, Task, MentorFeedback, TalkingPoints, AIDailyTip, HRDashboard, WeeklyReport, RiskSignal, FitReport } from '../types'

const BASE = '/api/v1'

let currentRole: string = 'intern'
let currentUserId: string = ''

export function setRole(role: string, userId?: string) {
  currentRole = role
  if (userId) currentUserId = userId
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Role': currentRole,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// Auth
export const auth = {
  switchRole: (role: string, userId?: string) =>
    request<{ role: string; user: { id: string; name: string; department: string }; permissions: string[] }>(
      '/auth/switch-role',
      { method: 'POST', body: JSON.stringify({ role, user_id: userId }) },
    ),
}

// Interns
export const interns = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ interns: Intern[]; total: number; status_distribution: Record<string, number> }>(`/interns${qs}`)
  },
  get: (id: string) => request<Intern & { mentor: { id: string; name: string }; recent_checkins: CheckIn[] }>(`/interns/${id}`),
  getTasks: (id: string) => request<{ tasks: Task[] }>(`/interns/${id}/tasks`),
  getCheckins: (id: string, week?: number) => {
    const qs = week ? `?week=${week}` : ''
    return request<{ checkins: CheckIn[] }>(`/interns/${id}/checkins${qs}`)
  },
  submitCheckin: (id: string, data: Omit<CheckIn, 'id' | 'intern_id' | 'submitted_at'>) =>
    request<{ id: string }>(`/interns/${id}/checkins`, { method: 'POST', body: JSON.stringify(data) }),
  submitBaseline: (id: string, scores: Record<string, number>) =>
    request<{ id: string; status: string }>(`/interns/${id}/baseline`, { method: 'POST', body: JSON.stringify({ scores }) }),
}

// Mentors
export const mentors = {
  getInterns: (mentorId: string) => request<{ interns: Intern[] }>(`/mentor/${mentorId}/interns`),
  getTalkingPoints: (internId: string) => request<TalkingPoints>(`/mentor/talking-points/${internId}`),
  submitFeedback: (internId: string, data: { checkin_id?: string; final_feedback: string; rating: string; ai_suggestion_vote: string }) =>
    request<{ id: string }>(`/mentor/feedback/${internId}`, { method: 'POST', body: JSON.stringify(data) }),
  getFeedbackDraft: (internId: string) => request<{ intern_id: string; ai_draft: string; generated_at: string; source: string }>(`/mentor/feedback-draft/${internId}`),
}

// HR
export const hr = {
  getDashboard: () => request<HRDashboard>('/hr/dashboard'),
  getWeeklyReport: () => request<WeeklyReport>('/hr/weekly-report'),
  setProxyMentor: (internId: string, proxyMentorId: string, reason: string) =>
    request<{ status: string }>(`/hr/interns/${internId}/proxy-mentor`, { method: 'POST', body: JSON.stringify({ proxy_mentor_id: proxyMentorId, reason }) }),
}

// Recruiters
export const recruiters = {
  getFitReports: () => request<{ reports: FitReport[] }>('/recruiter/fit-reports'),
  getFitReport: (id: string) => request<FitReport>(`/recruiter/fit-reports/${id}`),
}

// AI
export const ai = {
  getDailyTip: (internId: string) => request<AIDailyTip>(`/ai/daily-tip/${internId}`),
}
