# Claude Code 产品开发工作流

> 原始工作流基于 Gemini + Figma + Cursor 三工具协作，以下将其映射到 Claude Code 当前可用的 tool/skill 体系。

---

## STEP 1: 建立初版 PRD（产品需求文档）、确定视觉风格

**核心工具：** Claude Code

### 动作 1 - 脑暴 (Brainstorming)

使用 `superpowers:brainstorming` skill 对齐产品核心诉求（功能、目标用户、可行性）。

如需搜索优秀 UI 设计灵感，使用 `WebSearch` tool 搜索 Dribbble、Behance 等平台，提炼视觉方向。

### 动作 2 - 收敛 (Converging)

让 Claude 输出两份不同侧重点的初版文档：

- **Figma 版 PRD (`PRD-figma.md`)：** 侧重视觉呈现和交互体验，用于指导后续画界面。
- **Cursor 版 PRD (`PRD-cursor.md`)：** 侧重产品逻辑、功能流程和数据结构，用于指导后续写代码。

使用 `Write` tool 将两份文档写入项目目录。

---

## STEP 2: 确认前端设计及产品需求

**核心工具：** Figma（外部）+ Claude Code

### 动作 1 - UI 设计 (Figma)

根据 Figma 版 PRD，在 Figma 中快速搭出 UI 草图。

- 不需要死磕 UI 细节，只要有基本元素和大概风格即可。
- 将画好的 UI 截图保存到项目目录。

> **备选方案：** 如果没有 Figma，可以让 Claude 直接用 `Write` 生成 HTML/CSS 静态 mockup 页面。

### 动作 2 - 递交需求 (Claude Code)

将 UI 截图路径和 Cursor 版 PRD 一起提供给 Claude（Claude 支持读取图片理解布局）。

### 动作 3 - 确立 MVP（最小可行性产品）

使用 `EnterPlanMode` 或 `superpowers:writing-plans` skill，生成一份包含以下内容的正式 PRD：

- Mermaid 时序图
- 核心业务流程
- 数据模型

将正式 PRD 存入项目文档（如 `docs/PRD.md`）。

---

## STEP 3: 开发前准备

**核心工具：** Claude Code

### 动作 - 制定开发计划

根据正式 PRD，使用 `EnterPlanMode` 制定详细开发计划。批准后使用 `TaskCreate` 创建任务清单。

**Claude Code Task 系统 vs Markdown Checklist：** Task 系统天然支持 `pending → in_progress → completed` 状态流转、任务依赖关系设置，比静态 checkbox 更强。

### 最佳实践

- **开发逻辑：** 先搭建数据库 → 再按功能模块逐个开发（每个模块先做前端，再做后端）。使用 `TaskCreate` 按顺序建任务，通过 `addBlockedBy` 设置依赖关系。
- **任务拆解：** 每个模块拆成独立 task，可并行开发的模块用 `superpowers:subagent-driven-development` 调度多个 Agent 并行推进。
- **进度追踪：** 使用 `TaskList` 查看完成状态，`TaskUpdate` 更新进度。

---

## STEP 4: 正式开发

**核心工具：** Claude Code

### 动作 1 - 基础搭建

先搭好页面骨架（UI）和数据库设计。

### 动作 2 - 模块化开发

逐个模块推进，形成一个 **"测试验证 → 反馈修正"** 的循环：

- 使用 `superpowers:test-driven-development` skill 驱动开发（红-绿-重构循环）。
- 用 `verify` skill 或 `superpowers:verification-before-completion` 验证每个模块。

### 关键点

| 注意事项 | Claude Code 做法 |
|---|---|
| 修改同步更新到 PRD 和任务清单 | 用 `Edit` 更新 PRD，`TaskUpdate` 更新任务状态 |
| 开发阶段不过度追求 UI 精美 | 最后集中调整 |
| 新灵感/新需求评估 | 直接对话评估：小需求即时 `Edit` 实现，大需求新建 `TaskCreate` 放入后续迭代 |
| 开发记录 | 用 `Bash` 执行 `git commit` 做版本管控 |

---

## STEP 5: 收尾及发布

**核心工具：** Claude Code + GitHub

### 动作 1 - 收尾验收

- 用 `TaskList` 对照任务清单查缺补漏。
- 用 `verify` skill 做整体功能测试（排查基本逻辑错误）。
- 最后统一调整所有 UI 细节，确保体验顺畅。
- 调起 `superpowers:requesting-code-review` 或 `/code-review` 做最终代码审查。

### 动作 2 - 部署上线

- 用 `Bash` tool 执行 `git` 命令进行版本管控（add/commit/push）。
- 通过 `gh` CLI（`Bash` tool）创建 PR 或执行部署命令。
- 如需指导，直接在对话中让 Claude 一步一步教你操作，或让 Claude 直接执行部署指令。

### 收尾分支管理

使用 `superpowers:finishing-a-development-branch` skill，结构化处理合并、PR 或清理选项。

---

## 工具映射速查表

| 原始工具 | Claude Code 替代 |
|---|---|
| Gemini 脑暴 | `brainstorming` skill + `WebSearch` |
| Figma 画图 | 外部工具（截图给 Claude） / Claude 直出 HTML mockup |
| Cursor 写代码 | `Edit` / `Write` / `Bash` tools |
| Cursor 对话讨论 | Claude Code 对话 |
| GitHub 版本管控 | `gh` CLI + `git`（`Bash` tool） |
| 任务 Checklist | `TaskCreate` / `TaskUpdate` / `TaskList` |
| TDD 开发 | `test-driven-development` skill |
| 代码审查 | `requesting-code-review` skill / `/code-review` |
| 验收 & 部署 | `verification-before-completion` + `finishing-a-development-branch` skill |

---

## 快速启动命令参考

```
/loop              → 设置定时循环任务（如定期检查部署状态）
/clear             → 清理对话上下文
/compact           → 压缩上下文（长对话后释放空间）
/code-review       → 审查当前 diff
/simplify          → 审查并自动修复 diff
/verify            → 验证代码变更是否生效
/fast              → 切换快速模式（Opus 快速输出）
/config            → 调整主题/模型等配置
```
