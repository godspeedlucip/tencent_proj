# Research & Technical Decisions — 实习能量站

**Date**: 2026-05-31

## Decision 1: Frontend Framework

**Decision**: React 18 + TypeScript + Vite

**Rationale**:
- React 生态最成熟，中文社区资源丰富
- TypeScript 提供类型安全，适合多角色/多实体数据模型
- Vite 开发体验快，Demo 演示时无需等待构建
- 不需要 SSR/SSG（Demo 为纯客户端渲染的管理后台）

**Alternatives considered**:
- Vue 3: 同样优秀但 React 在本场景中组件化/状态管理更成熟（Redux/Zustand 处理四角色状态切换）
- Next.js: 过于重量级，Demo 不需要路由和服务端渲染
- 纯 HTML/JS: 无法体现真实架构

---

## Decision 2: Backend Framework

**Decision**: Python 3.11+ FastAPI + SQLAlchemy + SQLite

**Rationale**:
- FastAPI 是当前 Python 生态最流行的 API 框架，自动生成 OpenAPI 文档，便于 Demo 展示
- SQLAlchemy ORM 操作 SQLite，零配置，Demo 结束后文件可直接复制分享
- Python 拥有最成熟的 LLM SDK 生态（openai 库）
- 与 spec-kit 项目本身的 Python 技术栈保持一致

**Alternatives considered**:
- Node.js Express/Nest.js: 需要额外 JS 运行环境，增加 Demo 部署复杂度
- Django + DRF: 过于重，非此场景最佳
- Go/Gin: AI 集成生态不如 Python

---

## Decision 3: Database Design

**Decision**: SQLite via SQLAlchemy ORM, with Alembic migrations

**Rationale**:
- 单文件数据库，Demo 无需启动外部服务
- SQLAlchemy 支持后续无缝迁移至 PostgreSQL
- Alembic 跟踪 schema 变更，即使 Demo 也保留迁移记录
- 20 名实习生数据量完全在 SQLite 能力范围内（< 1MB）

**Alternatives considered**:
- 内存数据结构 (dict/list): 无法体现真实架构，查询/关联需要手动实现
- JSON 文件：多角色并发读写场景下数据一致性难保证
- PostgreSQL: Demo 需要外部依赖，评审部署成本高

---

## Decision 4: AI Integration

**Decision**: OpenAI SDK 兼容接口 + 预置 fallback JSON

**Rationale**:
- OpenAI SDK 兼容绝大多数 LLM 提供商（OpenAI, Azure, 智谱, 通义千问等）
- 后端代理调用，避免前端暴露 API Key
- 5 秒超时自动降级为预置 JSON（符合 spec SC-007）
- Fallback JSON 覆盖所有四个角色视角的关键场景

**Alternatives considered**:
- 纯 Mock AI: 无法展示真实 AI 能力
- 前端直接调用: API Key 暴露风险
- LangChain/LlamaIndex: 过于重量级，当前场景只需要 prompt + completion

---

## Decision 5: UI Component Library

**Decision**: Ant Design 5 + Tailwind CSS

**Rationale**:
- Ant Design 是国内最主流的企业级 React 组件库，Table/Form/Chart 等组件可直接用于 HR 看板
- 风险看板需要表格、标签、进度条、雷达图——Ant Design 内置或社区方案成熟
- Tailwind CSS 覆盖 Ant Design 无法满足的定制布局
- 符合桌面端管理后台的产品形态

**Alternatives considered**:
- shadcn/ui: 更现代但组件覆盖面有限，需要自行组装复杂表格
- TDesign (腾讯): 与企业内部技术栈一致，但社区成熟度不如 Ant Design
- Element Plus (Vue): 与 React 技术栈不兼容
