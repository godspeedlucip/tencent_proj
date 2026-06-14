# Docker 部署设计：实习能量站 → 106.55.137.53/aihr

## 目标

将全栈项目部署到 `http://106.55.137.53/aihr`，使用 Docker + Nginx 反向代理，支持子路径 `/aihr/`。

## 架构

```
Browser
  └─ http://106.55.137.53/aihr/*
       │
       v
     Nginx (port 80)
       ├─ /aihr/api/* → proxy_pass → backend:8001/api/* (剥离 /aihr 前缀)
       └─ /aihr/*     → serve 前端静态文件，SPA fallback → index.html
                              │
                              v
                         FastAPI + SQLite (内网端口 8001)
```

## 文件变更

### 新增

| 文件 | 用途 |
|------|------|
| `Dockerfile` | 后端 Python 镜像 (FastAPI + uvicorn) |
| `nginx.conf` | Nginx 子路径路由 + 反向代理 + SPA fallback |
| `.dockerignore` | 排除 node_modules, .git, __pycache__ |
| `docker-compose.yml` | 编排 nginx + backend 两个服务 |
| `frontend/.env.production` | `VITE_API_BASE=/aihr/api/v1` |
| `frontend/.env.development` | `VITE_API_BASE=/api/v1` |

### 修改

| 文件 | 改动 |
|------|------|
| `frontend/vite.config.ts` | 加 `base: '/aihr/'` |
| `frontend/src/App.tsx:76` | `<BrowserRouter>` 加 `basename="/aihr"` |
| `frontend/src/services/api.ts:3` | `const BASE = import.meta.env.VITE_API_BASE` |
| `backend/app/main.py:12` | CORS allow_origins 改为 `["http://106.55.137.53"]` |

### 不变

- 后端路由 `/api/v1/...` 不变（Nginx 剥离前缀）
- JWT 认证不变
- SQLite（volume 挂载持久化）

## Nginx 核心逻辑

```
location /aihr/api/  → proxy_pass http://backend:8001/api/ （前缀剥离）
location /aihr/      → alias 前端目录，try_files → index.html（SPA fallback）
location /           → 重定向 / 到 /aihr/
```

## docker-compose 拓扑

- **backend**: Python 3.11，uvicorn 监听 8001，volume 挂载 `./backend` 数据目录
- **nginx**: `nginx:alpine`，复制前端构建产物 + nginx.conf，映射端口 80

## 部署步骤

1. 本地提交改动，scp 项目到服务器（排除 node_modules, .git, __pycache__）
2. 服务器执行 `docker compose build && docker compose up -d`
3. 验证 `http://106.55.137.53/aihr`

## 后续 HTTPS

改 `nginx.conf` 加 SSL 证书路径 + 443 端口，其余不变。
