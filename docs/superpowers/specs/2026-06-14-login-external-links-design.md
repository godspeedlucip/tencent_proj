# 登录页添加外部链接设计

## 概述

在登录卡片下方添加两个 icon + 文字链接：GitHub 代码仓库地址、阿里云 OSS 演示视频地址。链接地址由用户自行填入。

## 布局

```
┌─────────────────────────────────┐
│         实习能量站                │
│   AI 驱动的实习生成长导航系统      │
│                                 │
│   ┌─────────────────────────┐   │
│   │  登录表单                 │   │
│   │  测试账号提示             │   │
│   └─────────────────────────┘   │
│                                 │
│   🐙 GitHub 代码    🎬 演示视频   │  ← 新增
└─────────────────────────────────┘
```

- 链接区域在登录卡片下方，水平居中，间距 `marginTop: 24px`
- 两个链接水平排列，间距 `gap: 32px`

## 实现细节

### 文件变更

| 文件 | 变更 |
|------|------|
| `frontend/src/pages/Login.tsx` | 添加两个链接常量 + 卡片下方链接渲染 |

### 图标

使用项目已有的 `@ant-design/icons`：
- `GithubOutlined` — GitHub 代码链接
- `PlayCircleOutlined` — 演示视频链接

### 链接常量

在组件顶部定义，用户替换为自己的地址：

```ts
const GITHUB_URL = 'https://github.com/your-repo'
const DEMO_VIDEO_URL = 'https://your-oss.aliyuncs.com/demo.mp4'
```

### 样式

- 颜色：`#334155`（与正文一致）
- 字号：`0.9rem`
- hover 态：`color: #f59e0b`（主题色）
- 过渡：`transition: color 0.2s`
- 安全属性：`target="_blank" rel="noopener noreferrer"`

## 不变

- 布局结构、卡片样式、表单逻辑全部不变
- 不新增文件、不新增依赖
