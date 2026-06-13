export type Role = 'intern' | 'mentor' | 'hr' | 'recruiter'

export type InternStatus = 'normal' | 'potential' | 'watch' | 'risk'

export interface Intern {
  id: string
  name: string
  role: string
  department: string
  mentor_id: string
  mentor_name?: string
  onboard_week: number
  status: InternStatus
  baseline_scores: Record<string, number> | null
  current_scores: Record<string, number> | null
  task_completion_rate?: number
  last_emotion?: string
}

export interface Mentor {
  id: string
  name: string
  department: string
  role_type: 'mentor' | 'hr' | 'recruiter'
}

export type TaskType = 'learning' | 'practice' | 'output' | 'retrospective'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked'

export interface Task {
  id: string
  intern_id: string
  title: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
}

export type EmotionCapsule = 'energetic' | 'steady' | 'blocked' | 'overloaded' | 'motivated'

export interface CheckIn {
  id: string
  intern_id: string
  week: number
  progress: string
  blockers: string | null
  emotion_capsule: EmotionCapsule
  next_plan: string | null
  submitted_at: string
  has_feedback?: boolean
}

export interface MentorFeedback {
  id: string
  intern_id: string
  mentor_id: string
  checkin_id?: string
  ai_draft?: string
  final_feedback?: string
  rating?: 'exceeds' | 'meets' | 'needs_improvement'
  ai_suggestion_vote: 'upvote' | 'downvote' | 'none'
  created_at: string
}

export type RiskLevel = 'normal' | 'watch' | 'risk'

export interface RiskSignal {
  id: string
  intern_id: string
  intern_name?: string
  level: RiskLevel
  triggers: string[]
  ai_confidence: number
  review_status: 'pending' | 'confirmed' | 'overridden'
  review_note: string | null
  created_at: string
}

export interface FitReport {
  id: string
  intern_id: string
  intern_name?: string
  score_dimensions: Record<string, { baseline: number; current: number; trend: string }>
  growth_evidence: string
  ai_recommendation: 'high_potential' | 'observe' | 'not_suitable'
  human_review_note: string | null
  generated_at: string
  has_human_review?: boolean
}

export interface HRDashboard {
  summary: { total: number; normal: number; potential: number; watch: number; risk: number }
  risk_list: RiskSignal[]
}

export interface WeeklyReport {
  week: number
  generated_at: string
  source: string
  summary_stats: Record<string, number>
  risk_details: RiskSignal[]
  recommended_actions: string[]
}

export interface TalkingPoints {
  intern_name: string
  generated_at: string
  source: string
  outline: {
    recent_highlights: string[]
    areas_to_discuss: string[]
    suggested_questions: string[]
    tone_hint: string
  }
}

export interface AIDailyTip {
  tip: string
  generated_at: string
  source: string
}

export interface ApiError {
  error: { code: string; message: string }
}
