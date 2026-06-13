import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import jwt

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
ALGORITHM = "HS256"

PUBLIC_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/docs",
    "/openapi.json",
}


def create_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


class JWTMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/")
        if path in PUBLIC_PATHS or path.startswith("/docs") or path.startswith("/openapi"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid token")

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        request.state.user_id = payload.get("sub")
        request.state.role = payload.get("role")
        return await call_next(request)
