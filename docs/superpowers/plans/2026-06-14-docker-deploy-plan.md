# Docker 部署实施计划：实习能量站 → 106.55.137.53/aihr

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将全栈项目 Docker 化并部署到 `http://106.55.137.53/aihr`，Nginx 反向代理处理子路径 /aihr/

**Architecture:** Nginx 容器（serve 前端静态文件 + 反向代理 API）+ Python 后端容器（FastAPI + SQLite）。Nginx 在 `/aihr/api/` 路径剥离前缀后转发给后端，`/aihr/` 其余路径 serve 前端 SPA

**Tech Stack:** Docker Compose, Nginx:alpine, Python 3.11-slim, Node 20-alpine (build stage), FastAPI, React/Vite

---

## 文件结构

| 文件 | 类型 | 职责 |
|------|------|------|
| `frontend/.env.development` | 新增 | 开发时 API 基路径 |
| `frontend/.env.production` | 新增 | 生产时 API 基路径 |
| `frontend/vite.config.ts` | 修改 | 构建资源路径加 `/aihr/` 前缀 |
| `frontend/src/App.tsx` | 修改 | 前端路由加 `/aihr` basename |
| `frontend/src/services/api.ts` | 修改 | API 基路径从 env 读取 |
| `backend/app/main.py` | 修改 | CORS 允许生产域名 |
| `Dockerfile` | 新增 | 后端 Python 镜像 |
| `Dockerfile.nginx` | 新增 | 前端构建 + Nginx 多阶段镜像 |
| `nginx.conf` | 新增 | Nginx 子路径路由、反向代理、SPA fallback |
| `docker-compose.yml` | 新增 | 编排 backend + nginx 两个服务 |
| `.dockerignore` | 新增 | 排除构建不用的文件 |

---

### Task 1: 创建前端环境变量文件

**Files:**
- Create: `frontend/.env.development`
- Create: `frontend/.env.production`

- [ ] **Step 1: 创建开发环境 env 文件**

Write `frontend/.env.development`:
```
VITE_API_BASE=/api/v1
```

- [ ] **Step 2: 创建生产环境 env 文件**

Write `frontend/.env.production`:
```
VITE_API_BASE=/aihr/api/v1
```

- [ ] **Step 3: Commit**

```bash
git add frontend/.env.development frontend/.env.production
git commit -m "feat: add VITE_API_BASE env files for dev and prod"
```

---

### Task 2: 更新 Vite 构建配置

**Files:**
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: 修改 vite.config.ts 加 base 路径**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/aihr/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "feat: add base /aihr/ to vite config for sub-path deployment"
```

---

### Task 3: 更新 React Router basename

**Files:**
- Modify: `frontend/src/App.tsx:76`

- [ ] **Step 1: 给 BrowserRouter 加 basename="/aihr"**

将第 76 行的 `<BrowserRouter>` 改为：

```tsx
<BrowserRouter basename="/aihr">
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add basename /aihr to BrowserRouter for sub-path deployment"
```

---

### Task 4: 更新 API 基路径为动态读取 env

**Files:**
- Modify: `frontend/src/services/api.ts:3`

- [ ] **Step 1: 将硬编码 BASE 替换为 env 变量**

将第 3 行的：
```typescript
const BASE = '/api/v1'
```

替换为：
```typescript
const BASE = import.meta.env.VITE_API_BASE || '/api/v1'
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: use VITE_API_BASE env var for API base URL"
```

---

### Task 5: 更新后端 CORS 配置

**Files:**
- Modify: `backend/app/main.py:12`

- [ ] **Step 1: 修改 CORS allow_origins**

将第 12 行的：
```python
allow_origins=["http://localhost:5173"],
```

替换为：
```python
allow_origins=["http://106.55.137.53"],
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: update CORS to allow production server origin"
```

---

### Task 6: 创建后端 Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: 创建后端 Dockerfile**

Write `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: add backend Dockerfile"
```

---

### Task 7: 创建前端 Nginx 多阶段 Dockerfile

**Files:**
- Create: `Dockerfile.nginx`

- [ ] **Step 1: 创建多阶段构建 Dockerfile**

Write `Dockerfile.nginx`:
```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile.nginx
git commit -m "feat: add multi-stage nginx Dockerfile for frontend"
```

---

### Task 8: 创建 Nginx 配置

**Files:**
- Create: `nginx.conf`

- [ ] **Step 1: 创建 nginx.conf**

Write `nginx.conf`:
```nginx
server {
    listen 80;
    server_name _;

    # Redirect root to /aihr/
    location = / {
        return 301 /aihr/;
    }

    # Redirect /aihr to /aihr/
    location = /aihr {
        return 301 /aihr/;
    }

    # API proxy - strip /aihr prefix before forwarding
    location /aihr/api/ {
        proxy_pass http://backend:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend static files with SPA fallback
    location /aihr/ {
        alias /usr/share/nginx/html/;
        index index.html;
        try_files $uri $uri/ /aihr/index.html;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add nginx.conf
git commit -m "feat: add nginx config for /aihr sub-path routing"
```

---

### Task 9: 创建 docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: 创建编排文件**

Write `docker-compose.yml`:
```yaml
services:
  backend:
    build: .
    volumes:
      - ./backend:/app
    restart: unless-stopped

  nginx:
    build:
      context: .
      dockerfile: Dockerfile.nginx
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose for backend + nginx services"
```

---

### Task 10: 创建 .dockerignore

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: 创建 .dockerignore**

Write `.dockerignore`:
```
.git
node_modules
__pycache__
*.pyc
.pytest_cache
.claude
.superpowers
specs
docs
```

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -m "feat: add .dockerignore"
```

---

### Task 11: 验证本地 Docker 构建

**Files:** 无

- [ ] **Step 1: 构建镜像**

```bash
docker compose build
```

Expected: 两个镜像成功构建，无错误。

- [ ] **Step 2: 启动服务**

```bash
docker compose up -d
```

Expected: 两个容器启动，`docker compose ps` 显示 healthy。

- [ ] **Step 3: 验证前端可访问**

```bash
curl -s http://localhost/aihr/ | head -c 200
```

Expected: 返回 `index.html` 内容，含 `<!DOCTYPE html>`。

- [ ] **Step 4: 验证 API 代理工作**

```bash
curl -s http://localhost/aihr/api/v1/auth/me
```

Expected: 返回 JSON（无 token 时返回 401 或相关错误），但 Nginx 成功转发到后端。

- [ ] **Step 5: 清理**

```bash
docker compose down
```

---

### Task 12: 服务器部署

**Files:** 无（服务器端操作）

- [ ] **Step 1: 打包项目并上传到服务器**

```bash
tar --exclude='.git' --exclude='node_modules' --exclude='__pycache__' --exclude='.pytest_cache' --exclude='.claude' -czf ../tencent-deploy.tar.gz .
scp ../tencent-deploy.tar.gz root@106.55.137.53:/root/
```

- [ ] **Step 2: 在服务器上解压并构建启动**

SSH 登录服务器后执行：

```bash
mkdir -p /root/tencent && cd /root/tencent
tar -xzf /root/tencent-deploy.tar.gz
docker compose build
docker compose up -d
```

- [ ] **Step 3: 验证线上部署**

```bash
curl -s http://106.55.137.53/aihr/ | head -c 200
```

Expected: 返回前端 HTML。

- [ ] **Step 4: 验证 API**

```bash
curl -s http://106.55.137.53/aihr/api/v1/auth/me
```

Expected: JSON 响应（后端正常工作）。
