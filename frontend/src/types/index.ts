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
  description?: string | null
  approval_status?: string
  report_md?: string | null
  score?: number | null
  attachment_url?: string | null
  attachment_name?: string | null
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
  attachment_url?: string | null
  attachment_name?: string | null
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

export interface Notification {
  id: string
  type: 'deadline_reminder' | 'mentor_nudge' | 'risk_alert' | 'positive_milestone' | 'system'
  title: string
  body: string
  priority: 'high' | 'medium' | 'low'
  read: boolean
  action_link: string | null
  created_at: string
}

export interface AnalyticsData {
  growth_trend: { week: number; avg_business_understanding: number; avg_requirement_analysis: number; avg_collaboration: number; avg_delivery: number }[]
  emotion_distribution: { emotion: string; count: number }[]
  task_completion_trend: { week: number; completed: number; in_progress: number; blocked: number }[]
  risk_timeline: { intern_name: string; week: number; level: string }[]
  mentor_feedback_coverage: { mentor_name: string; coverage_pct: number }[]
}

export interface MentorPerformance {
  mentor_name: string
  intern_count: number
  avg_feedback_hours: number
  feedback_coverage_pct: number
  avg_mentee_growth: number
  ai_override_rate: number
  at_risk_count: number
}

export interface ApiError {
  error: { code: string; message: string }
}

export interface UserInfo {
  id: string
  username: string
  role: Role
  profile: {
    id: string
    name: string
    department: string
  }
}

export interface LoginResponse {
  token: string
  user: UserInfo
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Annotation {
  line: number
  text: string
}

export interface TaskDetail extends Task {
  description: string | null
  creator_id: string
  report_md: string | null
  report_submitted_at: string | null
  score: number | null
  annotation_json: Annotation[] | null
  approval_status: ApprovalStatus
  rejection_reason: string | null
}

export interface CheckInDetail extends CheckIn {
  weekly_report_md: string | null
  mentor_score: number | null
  mentor_comment: string | null
}

export interface TaskTemplate {
  id: string
  mentor_id: string
  title: string
  description: string
  type: TaskType
  priority: TaskPriority
  created_at: string
}

export interface GrowthTimelinePoint {
  week: number
  task_scores_avg: number | null
  checkin_score: number | null
  radar_data: Record<string, number>
}

export interface GrowthMilestone {
  week: number
  event: string
}

export interface GrowthTimeline {
  scores_over_time: GrowthTimelinePoint[]
  milestones: GrowthMilestone[]
}

export interface DeadlineConfig {
  id: string
  mentor_id: string
  day_of_week: number
  hour: number
}

export interface MentorInternTask extends Task {
  score: number | null
  approval_status: string
  report_md: string | null
}

export interface MentorInternCheckin {
  id: string
  week: number
  progress: string
  blockers: string | null
  emotion_capsule: string
  next_plan: string | null
  weekly_report_md: string | null
  mentor_score: number | null
  mentor_comment: string | null
  submitted_at: string
  is_late: boolean
}

export interface MentorSummary {
  id: string
  name: string
  department: string
  intern_count: number
  feedback_coverage_pct: number
  at_risk_count: number
}

export interface HRIntern {
  id: string
  name: string
  role: string
  department: string
  mentor_id: string
  mentor_name: string
  onboard_week: number
  status: string
}

export interface Credentials {
  username: string
  password: string
}

export interface HRCreateInternResponse extends HRIntern {
  credentials: Credentials
}

export interface HRCreateMentorResponse {
  id: string
  name: string
  department: string
  credentials: Credentials
}

export interface HRInternDetail {
  intern: HRIntern
  tasks: MentorInternTask[]
  checkins: MentorInternCheckin[]
}
