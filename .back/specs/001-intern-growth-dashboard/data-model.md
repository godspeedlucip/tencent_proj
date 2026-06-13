# Data Model — 实习能量站

**Date**: 2026-05-31 | **Based on**: spec.md Section "Key Entities"

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    Mentor     │       │      Intern       │       │    Task       │
│──────────────│       │──────────────────│       │──────────────│
│ id           │──┐    │ id                │    ┌──│ id           │
│ name         │  │    │ name              │    │  │ intern_id (FK)│
│ department   │  │    │ role              │    │  │ title        │
│              │  │    │ department        │    │  │ type         │
└──────────────┘  │    │ mentor_id (FK)    │────┘  │ priority     │
                  └────│ onboard_week      │       │ status       │
                       │ status            │       │ due_date     │
                       │ baseline_scores   │       └──────────────┘
                       │ current_scores    │
                       └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────┴─────┐  ┌──────┴──────┐  ┌─────┴─────────┐
     │   CheckIn     │  │RiskSignal   │  │  FitReport    │
     │──────────────│  │─────────────│  │───────────────│
     │ id           │  │ id          │  │ id            │
     │ intern_id(FK)│  │ intern_id(FK)│  │ intern_id(FK) │
     │ week         │  │ level       │  │ score_dims    │
     │ progress     │  │ triggers    │  │ growth_evidence│
     │ blockers     │  │ ai_confidence│ │ ai_recommend   │
     │ emotion      │  │ review_status│ │ human_review   │
     │ stress_score │  │ review_note │  │ generated_at  │
     │ next_plan    │  └────────────┘  └───────────────┘
     │ submitted_at │
     └──────────────┘
              │
     ┌────────┴─────────┐
     │ MentorFeedback   │
     │──────────────────│
     │ id               │
     │ intern_id (FK)   │
     │ mentor_id (FK)   │
     │ ai_draft         │
     │ final_feedback   │
     │ rating           │
     │ ai_suggestion_vote│
     │ created_at       │
     └──────────────────┘
```

## Entity Definitions

### 1. Intern (实习生)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | 实习生唯一标识 |
| `name` | String(50) | NOT NULL | 姓名 |
| `role` | String(100) | NOT NULL | 实习岗位，如"产品实习生" |
| `department` | String(100) | NOT NULL | 所属部门 |
| `mentor_id` | UUID | FK → Mentor.id, NOT NULL | 绑定导师 |
| `onboard_week` | Integer | 1-12, default 1 | 当前入职第几周 |
| `status` | Enum | `normal` / `potential` / `watch` / `risk` | 综合状态标签 |
| `baseline_scores` | JSON | nullable | 首周能力基线 {业务理解, 需求分析, 协作沟通, 交付质量} 各 1-5 |
| `current_scores` | JSON | nullable | 当前能力评分，同结构 |
| `created_at` | DateTime | auto | 创建时间 |
| `updated_at` | DateTime | auto | 更新时间 |

**State transitions**: `normal` ↔ `potential` ↔ `watch` ↔ `risk` (升/降级由 AI 提议 + 导师/HR 确认)

### 2. Mentor (导师)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | 导师唯一标识 |
| `name` | String(50) | NOT NULL | 姓名 |
| `department` | String(100) | NOT NULL | 所属部门 |
| `role_type` | Enum | `mentor` | 角色类型（可扩展为 HR/recruiter） |

**Note**: Demo 阶段导师与实习生为多对一关系（一名实习生绑定一位导师，一位导师可带多名实习生）。HR 和招聘角色不在此表，通过独立视图/权限实现。

### 3. Task (任务)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | 任务唯一标识 |
| `intern_id` | UUID | FK → Intern.id, NOT NULL | 关联实习生 |
| `title` | String(200) | NOT NULL | 任务标题 |
| `type` | Enum | `learning` / `practice` / `output` / `retrospective` | 学习/实践/产出/复盘 |
| `priority` | Enum | `high` / `medium` / `low` | 优先级 |
| `status` | Enum | `not_started` / `in_progress` / `completed` / `blocked` | 任务状态 |
| `due_date` | Date | nullable | 截止日期 |
| `created_at` | DateTime | auto | 创建时间 |

### 4. CheckIn (周报)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Check-in 唯一标识 |
| `intern_id` | UUID | FK → Intern.id, NOT NULL | 关联实习生 |
| `week` | Integer | 1-12, NOT NULL | 第几周 |
| `progress` | Text | NOT NULL | 本周进展描述 |
| `blockers` | Text | nullable | 当前困难 |
| `emotion_capsule` | Enum | `energetic` / `steady` / `blocked` / `overloaded` / `motivated` | 情绪胶囊 |
| `mapped_stress_score` | Integer | 1-10, computed | 后台映射压力值（仅导师/HR 可见） |
| `next_plan` | Text | nullable | 下周计划 |
| `submitted_at` | DateTime | auto | 提交时间 |

**Business Rule**: Emotion capsule → stress score mapping:
- `energetic` → 2, `motivated` → 3, `steady` → 4, `overloaded` → 7, `blocked` → 8

**Duplicate detection**: 连续两周 `progress` 文本相似度 > 80% 时触发提醒（不自动提升风险评级）。

### 5. MentorFeedback (导师反馈)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | 反馈唯一标识 |
| `intern_id` | UUID | FK → Intern.id, NOT NULL | 关联实习生 |
| `mentor_id` | UUID | FK → Mentor.id, NOT NULL | 关联导师 |
| `checkin_id` | UUID | FK → CheckIn.id, nullable | 关联的周报（可选） |
| `ai_draft` | Text | nullable | AI 反馈草稿 |
| `final_feedback` | Text | nullable | 导师确认后的最终反馈 |
| `rating` | Enum | `exceeds` / `meets` / `needs_improvement` | 本周期表现评价 |
| `ai_suggestion_vote` | Enum | `upvote` / `downvote` / `none` | 对 AI 建议的评价 |
| `created_at` | DateTime | auto | 创建时间 |

**Business Rule**: 导师 Override Rate > 50% 时，停止向该导师推送高置信 AI 建议。

### 6. RiskSignal (风险信号)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | 风险信号唯一标识 |
| `intern_id` | UUID | FK → Intern.id, NOT NULL | 关联实习生 |
| `level` | Enum | `normal` / `watch` / `risk` | 风险等级 |
| `triggers` | JSON | NOT NULL | 触发原因列表，如 `["连续两周未提交周报", "情绪持续低落"]` |
| `ai_confidence` | Float | 0.0-1.0 | AI 置信度 |
| `review_status` | Enum | `pending` / `confirmed` / `overridden` | 复核状态 |
| `review_note` | Text | nullable | 导师或 HR 复核备注 |
| `created_at` | DateTime | auto | 信号生成时间 |
| `reviewed_at` | DateTime | nullable | 复核时间 |

**Business Rule**: `level` = `risk` 时，`review_status` 必须为 `confirmed` 或 `overridden` 才可向招聘展示。`review_note` 在 `review_status` != `pending` 时必填。

### 7. FitReport (适岗报告)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | 适岗报告唯一标识 |
| `intern_id` | UUID | FK → Intern.id, NOT NULL | 关联实习生 |
| `score_dimensions` | JSON | NOT NULL | 能力维度得分 {业务理解, 需求分析, 协作沟通, 交付质量}，含变化趋势 |
| `growth_evidence` | Text | NOT NULL | 成长证据摘要（基于 CheckIn + Task + Feedback 生成） |
| `ai_recommendation` | Enum | `high_potential` / `observe` / `not_suitable` | AI 建议 |
| `human_review_note` | Text | nullable | 导师/HR 人工复核备注 |
| `generated_at` | DateTime | auto | 生成时间 |

**Business Rule**: `ai_recommendation` = `not_suitable` 时，`human_review_note` 必填，不可仅向招聘展示 AI 结论。

## Cascade Rules

- 删除 Mentor → 解除 Intern 的 mentor_id 绑定（SET NULL），停止逾期警告
- 删除 Intern → 级联删除关联的 CheckIn, Task, MentorFeedback, RiskSignal, FitReport
- 存档/转岗 Intern → 冻结数据，生成阶段性 FitReport，不再生成新 RiskSignal
