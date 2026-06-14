#!/bin/bash
set -e
python -c "from app.seed import seed; seed()"
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --proxy-headers
