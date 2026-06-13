import type { Intern, CheckIn, Task, MentorFeedback, TalkingPoints, AIDailyTip, HRDashboard, WeeklyReport, RiskSignal, FitReport, Notification, AnalyticsData, MentorPerformance, DeadlineConfig, MentorInternTask, MentorInternCheckin, MentorSummary, HRIntern } from '../types'

const BASE = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('user')
      window.location.href = '/login'
      throw new Error('Session expired')
    }
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    request<import('../types').LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () =>
    request<import('../types').UserInfo>('/auth/me'),
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
  submitTaskReport: (internId: string, taskId: string, reportMd: string) =>
    request<{ id: string; status: string }>(`/interns/${internId}/tasks/${taskId}/report`, { method: 'POST', body: JSON.stringify({ report_md: reportMd }) }),
  getGrowthTimeline: (id: string) => request<import('../types').GrowthTimeline>(`/interns/${id}/growth-timeline`),
}

// Mentors
export const mentors = {
  getInterns: (mentorId: string) => request<{ interns: Intern[] }>(`/mentor/${mentorId}/interns`),
  getTalkingPoints: (internId: string) => request<TalkingPoints>(`/mentor/talking-points/${internId}`),
  submitFeedback: (internId: string, data: { checkin_id?: string; final_feedback: string; rating: string; ai_suggestion_vote: string }) =>
    request<{ id: string }>(`/mentor/feedback/${internId}`, { method: 'POST', body: JSON.stringify(data) }),
  getFeedbackDraft: (internId: string) => request<{ intern_id: string; ai_draft: string; generated_at: string; source: string }>(`/mentor/feedback-draft/${internId}`),
  createTask: (data: { intern_id: string; title: string; description?: string; type: string; priority?: string; due_date?: string }) =>
    request<{ id: string; title: string; status: string }>('/mentor/tasks', { method: 'POST', body: JSON.stringify(data) }),
  getPendingReviews: (mentorId: string) =>
    request<{ tasks: Array<{ id: string; title: string; intern_id: string; intern_name: string; report_md: string | null; report_submitted_at: string | null }> }>(`/mentor/pending-reviews?mentor_id=${mentorId}`),
  reviewTask: (taskId: string, data: { approval: string; score?: number; annotations?: { line: number; text: string }[]; rejection_reason?: string }) =>
    request<{ id: string; approval_status: string }>(`/mentor/tasks/${taskId}/review`, { method: 'POST', body: JSON.stringify(data) }),
  scoreCheckin: (checkinId: string, data: { score: number; comment?: string }) =>
    request<{ id: string; score: number }>(`/mentor/checkins/${checkinId}/score`, { method: 'POST', body: JSON.stringify(data) }),
  getTemplates: (mentorId: string) => request<{ templates: import('../types').TaskTemplate[] }>(`/mentor/task-templates?mentor_id=${mentorId}`),
  deleteTemplate: (mentorId: string, templateId: string) => request<{ deleted: boolean }>(`/mentor/task-templates/${templateId}?mentor_id=${mentorId}`, { method: 'DELETE' }),
  getDeadline: (mentorId: string) =>
    request<DeadlineConfig>(`/mentor/${mentorId}/deadline`),
  setDeadline: (data: { day_of_week: number; hour: number }, mentorId?: string) =>
    request<DeadlineConfig>('/mentor/deadline', { method: 'POST', body: JSON.stringify(data) }),
  submitBaseline: (internId: string, scores: Record<string, number>) =>
    request<{ id: string; status: string }>(`/mentor/interns/${internId}/baseline`, { method: 'POST', body: JSON.stringify({ scores }) }),
  getInternTasks: (mentorId: string, internId: string) =>
    request<{ tasks: MentorInternTask[] }>(`/mentor/${mentorId}/interns/${internId}/tasks`),
  getInternCheckins: (mentorId: string, internId: string) =>
    request<{ checkins: MentorInternCheckin[] }>(`/mentor/${mentorId}/interns/${internId}/checkins`),
}

// Recruiters
export const recruiters = {
  getFitReports: () => request<{ reports: FitReport[] }>('/recruiter/fit-reports'),
  getFitReport: (id: string) => request<FitReport>(`/recruiter/fit-reports/${id}`),
}

// HR (extended)
export const hr = {
  getDashboard: () => request<HRDashboard>('/hr/dashboard'),
  getWeeklyReport: () => request<WeeklyReport>('/hr/weekly-report'),
  getAnalytics: () => request<AnalyticsData>('/hr/analytics'),
  setProxyMentor: (internId: string, proxyMentorId: string, reason: string) =>
    request<{ status: string }>(`/hr/interns/${internId}/proxy-mentor`, { method: 'POST', body: JSON.stringify({ proxy_mentor_id: proxyMentorId, reason }) }),
  reviewRisk: (riskId: string, reviewStatus: string, reviewNote: string) =>
    request<{ status: string }>(`/hr/risks/${riskId}/review`, { method: 'POST', body: JSON.stringify({ review_status: reviewStatus, review_note: reviewNote }) }),
  getMentorPerformance: () => request<MentorPerformance[]>('/hr/mentor-performance'),
  exportData: (format: string) => request<Blob>(`/hr/export?format=${format}`),
  createIntern: (data: { name: string; role: string; department: string; mentor_id: string }) =>
    request<HRIntern>('/hr/interns', { method: 'POST', body: JSON.stringify(data) }),
  deleteIntern: (internId: string) =>
    request<{ deleted: boolean }>(`/hr/interns/${internId}`, { method: 'DELETE' }),
  assignMentor: (internId: string, mentorId: string) =>
    request<{ intern_id: string; mentor_id: string }>(`/hr/interns/${internId}/mentor`, { method: 'PUT', body: JSON.stringify({ mentor_id: mentorId }) }),
  listAllInterns: () =>
    request<{ interns: HRIntern[] }>('/hr/interns-all'),
  listMentors: () =>
    request<{ mentors: MentorSummary[] }>('/hr/mentors'),
}

// Notifications
export const notifications = {
  list: (role: string, userId: string, unreadOnly = false) => {
    const params = new URLSearchParams({ role, user_id: userId, unread_only: String(unreadOnly) })
    return request<{ notifications: Notification[]; unread_count: number }>(`/notifications?${params}`)
  },
  markRead: (id: string) => request<{ status: string }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: (role: string, userId: string) => {
    const params = new URLSearchParams({ role, user_id: userId })
    return request<{ status: string }>(`/notifications/read-all?${params}`, { method: 'POST' })
  },
}

// AI
export const ai = {
  getDailyTip: (internId: string) => request<AIDailyTip>(`/ai/daily-tip/${internId}`),
  getReviewDraft: (taskId: string) =>
    request<{ draft: { highlights: string[]; suggestions: string[]; suggested_score: number }; source: string }>(`/ai/review-draft/${taskId}`, { method: 'POST' }),
}
