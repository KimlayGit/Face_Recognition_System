from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Attendance, Student, User
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate
from app.services.deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("")
def list_attendance(
    attendance_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin)
):
    query = db.query(Attendance).join(Student, Attendance.student_id == Student.id)

    if attendance_date:
        query = query.filter(Attendance.attendance_date == attendance_date)

    records = query.order_by(Attendance.id.desc()).all()

    result = []
    for record in records:
        student = db.query(Student).filter(Student.id == record.student_id).first()

        result.append({
            "id": record.id,
            "student_id": record.student_id,
            "student_name": student.full_name if student else "Unknown",
            "class_name": student.class_name if student else "",
            "status": record.status,
            "confidence": getattr(record, "confidence", None),
            "attendance_date": record.attendance_date,
            "check_in_time": str(record.check_in_time) if getattr(record, "check_in_time", None) else None,
            "created_by": record.created_by,
        })

    return result


@router.post("")
def create_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    attendance = Attendance(**payload.model_dump(), created_by=current_user.id)
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        "id": attendance.id,
        "student_id": attendance.student_id,
        "student_name": student.full_name,
        "class_name": student.class_name,
        "status": attendance.status,
        "confidence": getattr(attendance, "confidence", None),
        "attendance_date": attendance.attendance_date,
        "check_in_time": str(attendance.check_in_time) if getattr(attendance, "check_in_time", None) else None,
        "created_by": attendance.created_by,
    }


@router.put("/{attendance_id}")
def update_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)

    student = db.query(Student).filter(Student.id == record.student_id).first()

    return {
        "id": record.id,
        "student_id": record.student_id,
        "student_name": student.full_name if student else "Unknown",
        "class_name": student.class_name if student else "",
        "status": record.status,
        "confidence": getattr(record, "confidence", None),
        "attendance_date": record.attendance_date,
        "check_in_time": str(record.check_in_time) if getattr(record, "check_in_time", None) else None,
        "created_by": record.created_by,
    }