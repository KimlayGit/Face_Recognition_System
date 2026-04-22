from datetime import date, time
from pydantic import BaseModel


class AttendanceCreate(BaseModel):
    student_id: int
    attendance_date: date
    check_in_time: time | None = None
    status: str
    late_after: time | None = None
    confidence_score: float | None = None
    liveness_passed: bool = False
    capture_source: str | None = None


class AttendanceUpdate(BaseModel):
    check_in_time: time | None = None
    status: str
    late_after: time | None = None
    confidence_score: float | None = None
    liveness_passed: bool = False
    capture_source: str | None = None


class AttendanceOut(BaseModel):
    id: int
    student_id: int
    attendance_date: date
    check_in_time: time | None = None
    status: str
    late_after: time | None = None
    confidence_score: float | None = None
    liveness_passed: bool = False
    capture_source: str | None = None

    class Config:
        from_attributes = True
