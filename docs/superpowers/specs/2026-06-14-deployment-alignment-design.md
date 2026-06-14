# 部署对齐改进设计

## 目标

根据实际部署经验，修复代码与生产环境之间的 4 个差距。

## 改动

### 1. 新增 `backend/start.sh`

容器启动脚本，先执行数据库 seed 再启动 uvicorn。seed 内部判断已有数据则跳过。

```bash
#!/bin/bash
python -c "from app.seed import seed; seed()"
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --proxy-headers
```

### 2. 修改 `Dockerfile`

CMD 从直接调 uvicorn 改为执行 start.sh。

### 3. 修改 `docker-compose.yml`

nginx 端口映射从 `80:80` 改为 `8080:80`，避开 k3s Traefik 占用的 80 端口。

### 4. 修改 `backend/app/main.py`

CORS allow_origins 从单个 origin 扩展为三个：
- `http://106.55.137.53`（Traefik 入口）
- `http://106.55.137.53:8080`（直连 Docker）
- `http://localhost:8080`（本地测试）
