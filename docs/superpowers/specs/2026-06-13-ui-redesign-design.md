# UI Redesign: 实习能量站视觉重塑

**Date**: 2026-06-13
**Status**: Approved
**Reference**: `index.html` (godspeedlucip portfolio) design language
**Approach**: B — Hybrid: 自定义视觉外壳 + 保留 Ant Design 复杂组件

---

## Overview

参考 index.html 的玻璃态设计语言，重塑「实习能量站」前端视觉，提升品牌感和信息层级清晰度。保留 Ant Design 的复杂交互组件（Table、Modal、Select），用 Tailwind + 自定义 CSS 重写卡片、统计、按钮、标签等视觉组件。

---

## Section 1: Design System

### 1.1 Color Palette

Tailwind 扩展 token（`tailwind.config.js`）：

```
brand: {
  50:  '#fffbeb',   // bg light
  100: '#fef3c7',   // tag/info bg
  500: '#f59e0b',   // primary
  600: '#d97706',   // primary hover
}
surface: {
  glass:  'rgba(255,255,255,0.6)',
  border: 'rgba(253,230,138,0.3)',
}
```

语义色沿用 Tailwind 内置：emerald-500 (success)、blue-500 (info)、red-500 (danger)、purple-500 (tasks)。

### 1.2 Typography

| Level | Size/Weight | Usage |
|-------|-------------|-------|
| Logo | `1.1rem / 800` | 顶部品牌名，渐变文字 |
| Page Title | `1.5rem / 700` | 各角色 Dashboard 标题 |
| Card Title | `1rem / 600` | 卡片内标题 |
| Body | `0.9rem / 400` | 正文、描述 |
| Caption | `0.8rem / 400` | 辅助信息、时间戳 |

### 1.3 Glassmorphism Token

```
backdrop-blur: 12px
background: rgba(255,255,255,0.6)
border: 1px solid rgba(253,230,138,0.3)
border-radius: 12px
box-shadow: 0 4px 24px rgba(245,158,11,0.08)
hover shadow: 0 12px 32px rgba(245,158,11,0.12)
```

### 1.4 Page Background

```
background: linear-gradient(135deg, #fffbeb 0%, #f0f9ff 100%)
```

---

## Section 2: Layout & Navigation

### 2.1 App.tsx Shell

- 移除 Ant Design `<Layout>` / `<Header>` / `<Content>`
- 替换为原生 div + Tailwind：
  - Nav: `position: sticky; background: rgba(255,255,255,0.7); backdrop-filter: blur(12px)`
  - Content: 渐变背景 + `max-width: 1200px; margin: 0 auto; padding: 24px`
- Logo 使用渐变文字：`background: linear-gradient(135deg, #f59e0b, #ef4444); -webkit-background-clip: text`

### 2.2 RoleSwitcher

- 当前角色 Tag：琥珀色胶囊（`background: rgba(245,158,11,0.1); border-radius: 20px`）
- 角色 Select：圆角 8px + amber 边框 + 半透明背景
- 交互逻辑不变

---

## Section 3: Component Replacements

### 3.1 Stat Card (替代 Ant Design Statistic)

```html
<div class="glass-card text-center">
  <div class="text-slate-400 text-xs">任务完成率</div>
  <div class="text-3xl font-extrabold text-brand-500">85%</div>
  <div class="text-xs text-emerald-500">↑ 12% vs 上周</div>
</div>
```

颜色语义：amber=主要指标、blue=成长、green=正向、red=警告。

### 3.2 Status Tag (替代 Ant Design Tag)

```html
<span class="rounded-full px-3 py-0.5 text-xs font-medium border"
  style="background: rgba(16,185,129,0.1); color: #065f46; border-color: rgba(16,185,129,0.2)">
  ✓ 正常
</span>
```

与 index.html `.skill-tag` 风格统一，4 种状态：正常(green) / 高潜(blue) / 需关注(amber) / 高风险(red)。

### 3.3 Button

- Primary: `background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 2px 8px rgba(245,158,11,0.3)`
- Secondary/Glass: `background: rgba(255,255,255,0.6); backdrop-filter: blur(12px); border: 1px solid rgba(253,230,138,0.4)`
- Link: 透明背景 + amber 文字

### 3.4 Progress Bar (替代 Ant Design Progress)

```html
<div class="h-1.5 bg-brand-100/30 rounded-full overflow-hidden">
  <div class="h-full rounded-full" style="width:80%; background:linear-gradient(90deg,#f59e0b,#fbbf24); transition:width 0.6s"></div>
</div>
```

附带基线→当前分值标注。

### 3.5 Preserved Ant Design Components

- **Table**: 包裹在 glass-card 中，透明表头背景
- **Modal**: 通过 ConfigProvider 统一 primary color 为 `#f59e0b`
- **Select / Spin / Alert**: ConfigProvider 全局主题覆盖

---

## Section 4: Page-Level Changes

### 4.1 Intern Dashboard (重写视觉)

- 统计行：3 个 glass stat-card 替代 Ant Design Statistic
- AI 建议卡：左侧 amber 色条 + BulbOutlined 图标
- 成长卡：自定义渐变进度条 + 基线对比标注
- Check-in 按钮：amber 渐变 primary button
- 页面标题："欢迎回来，{name}" 大标题

### 4.2 Mentor Dashboard (微调)

- Table 包裹在 glass-card 中
- 状态 Tag 改为胶囊样式
- 操作按钮改为 amber link 风格

### 4.3 HR Risk Board (重写视觉)

- 顶部 4 个统计改为 glass stat-card
- 高风险数字红色突出 + Warning 图标保留
- 周报卡片独立视觉层
- Modal 通过 ConfigProvider 继承主题

### 4.4 Recruiter Fit Report (微调)

- Table 包裹在 glass-card 中
- AI 建议 Tag 改为胶囊样式
- 雷达图容器改为 glass-card

---

## Section 5: Animation & Micro-interactions

### 5.1 Card Hover

```css
.glass-card { transition: transform 0.3s, box-shadow 0.3s; }
.glass-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245,158,11,0.12); }
```

### 5.2 Page Entrance

卡片从下向上淡入（fade-in-up），各卡片 stagger 50ms（纯 CSS animation）。

### 5.3 Progress Bar

加载时从 0 展开到目标值：`transition: width 0.6s ease-out`。

### 5.4 Celebration (FR-006)

连续两周完成率 > 90% 或导师"超出预期"时触发。轻量 CSS confetti + 卡片 amber 边框闪烁。不引入动画库。

### 5.5 Constraints

- 不引入 framer-motion 等动画库
- 所有动效纯 CSS
- `prefers-reduced-motion` 时禁用动效

---

## Section 6: File Changes

### New Files
- (none)

### Modified Files

| File | Change | Effort |
|------|--------|--------|
| `frontend/tailwind.config.js` | 扩展 brand/surface 颜色 + glass 阴影 | 小 |
| `frontend/src/index.css` | 渐变背景、glassmorphism 工具类、动画 keyframes | 中 |
| `frontend/src/App.tsx` | 移除 Ant Design Layout，glass nav + 渐变背景 | 中 |
| `frontend/src/components/RoleSwitcher.tsx` | Tag/Select 样式微调 | 小 |
| `frontend/src/pages/intern/Dashboard.tsx` | 卡片/统计/进度条自定义 | 大 |
| `frontend/src/pages/intern/CheckIn.tsx` | 卡片容器改为 glass-card | 小 |
| `frontend/src/pages/intern/Tasks.tsx` | 卡片容器改为 glass-card | 小 |
| `frontend/src/pages/intern/Baseline.tsx` | 卡片容器改为 glass-card | 小 |
| `frontend/src/pages/mentor/Dashboard.tsx` | Table 容器 + Tag/Button 样式 | 小 |
| `frontend/src/pages/hr/RiskBoard.tsx` | 统计卡片 + 周报卡片 + Tag 样式 | 中 |
| `frontend/src/pages/recruiter/FitReportList.tsx` | Table 容器 + Tag 样式 | 小 |
| `frontend/src/pages/recruiter/FitReportDetail.tsx` | 卡片容器改为 glass-card | 小 |

---

## Section 7: Scope Boundaries

### In Scope
- 上述所有文件的视觉改造
- Tailwind 配置扩展
- CSS 动画和工具类
- Ant Design ConfigProvider 主题覆盖

### Out of Scope
- 引入新 npm 依赖
- 移动端适配
- 页面路由结构调整
- 数据流 / API 调用逻辑变更
- 功能逻辑变更
- 后端任何修改
