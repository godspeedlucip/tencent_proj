from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .models import Base, engine
from .api import auth, interns, mentors, hr, recruiters, ai

Base.metadata.create_all(bind=engine)

app = FastAPI(title="实习能量站 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(interns.router, prefix="/api/v1/interns", tags=["Interns"])
app.include_router(mentors.router, prefix="/api/v1/mentor", tags=["Mentors"])
app.include_router(hr.router, prefix="/api/v1/hr", tags=["HR"])
app.include_router(recruiters.router, prefix="/api/v1/recruiter", tags=["Recruiters"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])
