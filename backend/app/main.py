from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.routers import auth, students, attendance, reports, face
from pathlib import Path

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(face.router)

storage_path = Path(__file__).resolve().parents[1] / 'storage'
storage_path.mkdir(parents=True, exist_ok=True)
app.mount('/storage', StaticFiles(directory=storage_path), name='storage')


@app.get("/")
def root():
    return {"message": "Facial Recognition Attendance API running"}
