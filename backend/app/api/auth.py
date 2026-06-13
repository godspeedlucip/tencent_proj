from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from passlib.context import CryptContext
from ..models import SessionLocal
from ..models.user import User, RoleType
from ..models.mentor import Mentor
from ..models.intern import Intern
from ..middleware.jwt import create_token

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str


@router.post("/login")
def login(req: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == req.username).first()
        if not user or not pwd_context.verify(req.password, user.hashed_password):
            raise HTTPException(401, "Invalid username or password")
        if not user.is_active:
            raise HTTPException(403, "Account is disabled")

        token = create_token(user.id, user.role.value)

        profile = {"id": user.id, "name": user.username}
        if user.role == RoleType.intern:
            intern = db.query(Intern).filter(Intern.user_id == user.id).first()
            if intern:
                profile = {"id": intern.id, "name": intern.name, "department": intern.department}
        else:
            mentor = db.query(Mentor).filter(Mentor.user_id == user.id).first()
            if mentor:
                profile = {"id": mentor.id, "name": mentor.name, "department": mentor.department}

        return {
            "token": token,
            "user": {"id": user.id, "username": user.username, "role": user.role.value, "profile": profile},
        }
    finally:
        db.close()


@router.post("/register")
def register(req: RegisterRequest):
    db = SessionLocal()
    try:
        if req.role not in ("intern", "mentor", "hr", "recruiter"):
            raise HTTPException(400, "Invalid role")

        existing = db.query(User).filter(User.username == req.username).first()
        if existing:
            raise HTTPException(409, "Username already exists")

        user = User(
            username=req.username,
            hashed_password=pwd_context.hash(req.password),
            role=RoleType(req.role),
        )
        db.add(user)
        db.flush()

        if req.role == "intern":
            first_mentor = db.query(Mentor).first()
            mentor_id = first_mentor.id if first_mentor else "seed-mentor"
            db.add(Intern(name=req.username, role="实习生", department="待分配",
                         mentor_id=mentor_id, user_id=user.id))
        else:
            db.add(Mentor(name=req.username, department="待分配", user_id=user.id))

        db.commit()
        return {"id": user.id, "username": user.username, "role": user.role.value}
    finally:
        db.close()


@router.get("/me")
def me(request: Request):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == request.state.user_id).first()
        if not user:
            raise HTTPException(404, "User not found")

        profile = {"id": user.id, "name": user.username}
        if user.role == RoleType.intern:
            intern = db.query(Intern).filter(Intern.user_id == user.id).first()
            if intern:
                profile = {"id": intern.id, "name": intern.name, "department": intern.department}
        else:
            mentor = db.query(Mentor).filter(Mentor.user_id == user.id).first()
            if mentor:
                profile = {"id": mentor.id, "name": mentor.name, "department": mentor.department}

        return {"id": user.id, "username": user.username, "role": user.role.value, "profile": profile}
    finally:
        db.close()
