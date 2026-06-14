# 部署对齐改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将代码与生产环境实际部署对齐，修复 4 个差距

**Architecture:** 4 个独立改动：新增启动脚本、修改 Dockerfile 入口、调整端口映射、扩展 CORS

**Tech Stack:** Bash, Docker, Python/FastAPI

---

### Task 1: 创建 backend/start.sh 启动脚本

**Files:**
- Create: `backend/start.sh`

- [ ] **Step 1: 创建 start.sh**

```bash
#!/bin/bash
set -e
python -c "from app.seed import seed; seed()"
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --proxy-headers
```

- [ ] **Step 2: Commit**

```bash
git add backend/start.sh
git commit -m "feat: add start.sh to auto-seed DB on container startup"
```

---

### Task 2: 修改 Dockerfile 使用 start.sh

**Files:**
- Modify: `Dockerfile:7`

- [ ] **Step 1: 修改 CMD**

将第 7 行：
```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--proxy-headers"]
```

改为：
```dockerfile
CMD ["bash", "start.sh"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "fix: use start.sh as container entrypoint for auto-seeding"
```

---

### Task 3: 修改 docker-compose.yml 端口为 8080

**Files:**
- Modify: `docker-compose.yml:18`

- [ ] **Step 1: 修改端口映射**

将第 18 行：
```yaml
      - "80:80"
```

改为：
```yaml
      - "8080:80"
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "fix: expose nginx on 8080 to avoid k3s Traefik port conflict"
```

---

### Task 4: 扩展 CORS origins

**Files:**
- Modify: `backend/app/main.py:12`

- [ ] **Step 1: 扩展 allow_origins**

将第 12 行：
```python
    allow_origins=["http://106.55.137.53"],
```

改为：
```python
    allow_origins=[
        "http://106.55.137.53",
        "http://106.55.137.53:8080",
        "http://localhost:8080",
    ],
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "fix: add multiple CORS origins for Traefik, direct, and local access"
```

---

### Task 5: 验证 Docker 构建

- [ ] **Step 1: 构建并启动**

```bash
docker compose build --no-cache backend
docker compose up -d
```

- [ ] **Step 2: 验证后端健康**

```bash
curl -s http://localhost:8080/aihr/docs
```

Expected: 返回 Swagger 文档页 HTML。

- [ ] **Step 3: 验证 seed 已执行**

```bash
docker logs tencent-backend-1 2>&1 | head -5
```

Expected: 无 "ModuleNotFoundError" 或 seed 相关错误。

- [ ] **Step 4: 清理**

```bash
docker compose down
```
