# API Contract — 实习能量站

**Base URL**: `http://localhost:8000/api/v1`
**Format**: JSON, RESTful

---

## 1. Auth & Role

### POST /auth/switch-role

Switch the current user's role view. Demo mode — no real authentication.

**Request**:
```json
{
  "role": "intern | mentor | hr | recruiter",
  "user_id": "uuid (optional, auto-detected per role)"
}
```

**Response 200**:
```json
{
  "role": "mentor",
  "user": { "id": "uuid", "name": "张哥", "department": "产品部" },
  "permissions": ["view_assigned_interns", "submit_feedback", "view_ai_outline"]
}
```

---

## 2. Intern

### GET /interns

List interns. HR sees all; Mentor sees assigned only.

**Query**: `?status=normal&mentor_id=uuid`

**Response 200**:
```json
{
  "interns": [
    {
      "id": "uuid",
      "name": "小林",
      "role": "产品实习生",
      "department": "产品部",
      "mentor_name": "张哥",
      "onboard_week": 3,
      "status": "normal",
      "task_completion_rate": 0.85,
      "last_emotion": "motivated"
    }
  ],
  "total": 20,
  "status_distribution": { "normal": 12, "potential": 4, "watch": 3, "risk": 1 }
}
```

### GET /interns/{id}

Get intern detail including baseline and current scores.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "小林",
  "role": "产品实习生",
  "department": "产品部",
  "mentor": { "id": "uuid", "name": "张哥" },
  "onboard_week": 3,
  "status": "normal",
  "baseline_scores": { "业务理解": 2, "需求分析": 1, "协作沟通": 3, "交付质量": 1 },
  "current_scores": { "业务理解": 3, "需求分析": 2, "协作沟通": 3, "交付质量": 2 },
  "task_completion_rate": 0.85,
  "recent_checkins": [...]
}
```

### GET /interns/{id}/tasks

**Response 200**:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "完成用户访谈纪要",
      "type": "practice",
      "priority": "high",
      "status": "in_progress",
      "due_date": "2026-06-07"
    }
  ]
}
```

### GET /interns/{id}/checkins

**Query**: `?week=3`

**Response 200**:
```json
{
  "checkins": [
    {
      "id": "uuid",
      "week": 3,
      "progress": "本周完成了2场用户访谈的记录整理...",
      "blockers": "对Figma操作不熟练，画原型比较慢",
      "emotion_capsule": "steady",
      "next_plan": "下周开始学习Figma基础操作",
      "submitted_at": "2026-06-05T18:00:00Z",
      "has_feedback": true
    }
  ]
}
```

### POST /interns/{id}/checkins

**Request**:
```json
{
  "week": 3,
  "progress": "本周完成了2场用户访谈的记录整理...",
  "blockers": "对Figma操作不熟练",
  "emotion_capsule": "steady",
  "next_plan": "下周学习Figma基础操作"
}
```

**Response 201**: `{ "id": "uuid", "mapped_stress_score": 4 }` (stress score NOT returned to intern role)

### POST /interns/{id}/baseline

Submit initial self-assessment. Requires mentor review to finalize.

**Request**:
```json
{
  "scores": { "业务理解": 2, "需求分析": 1, "协作沟通": 3, "交付质量": 1 }
}
```

**Response 201**: `{ "id": "uuid", "status": "pending_mentor_review" }`

---

## 3. Mentor

### GET /mentor/{mentor_id}/interns

**Response 200**:
```json
{
  "interns": [
    {
      "id": "uuid",
      "name": "小林",
      "status": "normal",
      "task_completion_rate": 0.85,
      "last_emotion": "motivated",
      "last_checkin_week": 3,
      "pending_feedback": true,
      "risk_level": "normal"
    }
  ]
}
```

### GET /mentor/talking-points/{intern_id}

Generate AI communication outline for 1:1 meeting.

**Response 200**:
```json
{
  "intern_name": "小林",
  "generated_at": "2026-06-05T10:00:00Z",
  "source": "ai | fallback",
  "outline": {
    "recent_highlights": ["连续两周任务完成率 > 90%", "主动承担额外用户访谈"],
    "areas_to_discuss": ["Figma技能瓶颈影响原型交付速度"],
    "suggested_questions": ["这周最有成就感的一件事是什么？", "需要我提供什么资源来帮你跨越Figma的卡点？"],
    "tone_hint": "肯定成长为主，技术瓶颈提供具体资源支持"
  }
}
```

### POST /mentor/feedback/{intern_id}

Submit feedback (can start from AI draft).

**Request**:
```json
{
  "checkin_id": "uuid (optional)",
  "final_feedback": "小林本周进步明显，用户访谈纪要质量很高...",
  "rating": "meets",
  "ai_suggestion_vote": "upvote"
}
```

**Response 201**: `{ "id": "uuid", "created_at": "..." }`

### GET /mentor/feedback-draft/{intern_id}

Get AI-generated feedback draft based on recent checkins.

**Response 200**:
```json
{
  "intern_id": "uuid",
  "ai_draft": "小林本周在用户访谈纪要方面表现出色...",
  "generated_at": "...",
  "source": "ai | fallback"
}
```

---

## 4. HR

### GET /hr/dashboard

Global risk dashboard.

**Response 200**:
```json
{
  "summary": {
    "total": 20,
    "normal": 12, "potential": 4, "watch": 3, "risk": 1
  },
  "risk_list": [
    {
      "intern_id": "uuid",
      "intern_name": "某实习生",
      "level": "risk",
      "triggers": ["连续两周未提交周报", "情绪胶囊连续三周为blocked"],
      "ai_confidence": 0.87,
      "review_status": "pending",
      "review_note": null
    }
  ],
  "recent_alerts": [...]
}
```

### GET /hr/weekly-report

Generate weekly report.

**Response 200**:
```json
{
  "week": 3,
  "generated_at": "...",
  "source": "ai | fallback",
  "summary_stats": {
    "checkin_rate": 0.95,
    "avg_task_completion": 0.78,
    "risk_count": 1,
    "new_risks_this_week": 1,
    "resolved_risks_this_week": 0
  },
  "risk_details": [...],
  "recommended_actions": [
    "重点关注实习生[名称]：连续情绪低落后首次出现周报逾期",
    "建议与导师[张哥]沟通，了解小林Figma培训资源是否到位"
  ],
  "export_url": "/api/v1/hr/weekly-report/export?week=3"
}
```

### POST /hr/interns/{id}/proxy-mentor

Set proxy mentor when primary mentor unavailable.

**Request**:
```json
{
  "proxy_mentor_id": "uuid",
  "reason": "导师休假"
}
```

**Response 200**: `{ "status": "ok" }`

---

## 5. Recruiter

### GET /recruiter/fit-reports

**Response 200**:
```json
{
  "reports": [
    {
      "id": "uuid",
      "intern_id": "uuid",
      "intern_name": "小林",
      "ai_recommendation": "high_potential",
      "has_human_review": true,
      "generated_at": "..."
    }
  ]
}
```

### GET /recruiter/fit-reports/{id}

**Response 200**:
```json
{
  "id": "uuid",
  "intern_name": "小林",
  "score_dimensions": {
    "业务理解": { "baseline": 2, "current": 4, "trend": "up" },
    "需求分析": { "baseline": 1, "current": 3, "trend": "up" },
    "协作沟通": { "baseline": 3, "current": 4, "trend": "stable" },
    "交付质量": { "baseline": 1, "current": 2, "trend": "up" }
  },
  "growth_evidence": "小林在8周内从被动接收任务到主动发起需求讨论...",
  "ai_recommendation": "high_potential",
  "human_review_note": "导师复核：小林成长曲线明显，特别是在需求分析方面进步显著。同意AI判断。— 张哥",
  "generated_at": "..."
}
```

---

## 6. AI Services

### GET /ai/daily-tip/{intern_id}

Daily growth suggestion for intern.

**Response 200**:
```json
{
  "tip": "今天的建议：尝试用'用户故事'的格式来梳理你手头的需求，这会让你的PRD更清晰。",
  "generated_at": "...",
  "source": "ai | fallback"
}
```

### Error Responses

All endpoints return:
```json
{
  "error": {
    "code": "NOT_FOUND | PERMISSION_DENIED | VALIDATION_ERROR | AI_TIMEOUT | INTERNAL_ERROR",
    "message": "Human-readable description"
  }
}
```

**AI_TIMEOUT**: When AI service exceeds 5s, endpoints return `source: "fallback"` with pre-baked data instead of error. Non-AI endpoints return standard errors.
