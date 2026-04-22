from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Attendance, Student
from app.services.deps import require_teacher_or_admin

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def report_summary(
    class_name: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin)
):
    student_query = db.query(Student)
    if class_name:
        student_query = student_query.filter(Student.class_name == class_name)

    base = db.query(Attendance, Student).join(Student, Attendance.student_id == Student.id)
    if class_name:
        base = base.filter(Student.class_name == class_name)

    total_students = student_query.count()
    total_attendance = base.count()
    present = base.filter(Attendance.status == "Present").count()
    late = base.filter(Attendance.status == "Late").count()
    absent = base.filter(Attendance.status == "Absent").count()
    liveness_passed = base.filter(Attendance.liveness_passed == True).count()
    avg_confidence = db.query(func.avg(Attendance.confidence_score)).scalar() or 0

    return {
        "total_students": total_students,
        "attendance_records": total_attendance,
        "present": present,
        "late": late,
        "absent": absent,
        "liveness_passed": liveness_passed,
        "average_confidence": round(float(avg_confidence), 2),
    }
