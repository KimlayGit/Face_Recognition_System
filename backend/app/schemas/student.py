from datetime import time
from pydantic import BaseModel


class StudentBase(BaseModel):
    student_code: str
    full_name: str
    class_name: str
    late_after: time | None = None
    active: bool = True


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    full_name: str
    class_name: str
    late_after: time | None = None
    active: bool = True


class StudentFaceProfileOut(BaseModel):
    id: int
    student_id: int
    profile_name: str
    image_path: str | None = None
    quality_score: float | None = None
    is_primary: bool

    class Config:
        from_attributes = True


class StudentOut(StudentBase):
    id: int
    face_profiles: list[StudentFaceProfileOut] = []

    class Config:
        from_attributes = True
