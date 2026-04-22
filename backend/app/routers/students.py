from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Student
from app.schemas.student import StudentCreate, StudentUpdate
from app.services.deps import require_admin, require_teacher_or_admin
import os

router = APIRouter(prefix="/students", tags=["Students"])


def get_student_face_folder(student_id: int) -> str:
    return os.path.join("storage", "faces", f"student_{student_id}")


def get_student_face_files(student_id: int) -> list[str]:
    folder = get_student_face_folder(student_id)
    if not os.path.exists(folder):
        return []
    return sorted(
        [
            f for f in os.listdir(folder)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        ]
    )


def serialize_student(student: Student):
    files = get_student_face_files(student.id)
    return {
        "id": student.id,
        "student_code": student.student_code,
        "full_name": student.full_name,
        "class_name": student.class_name,
        "late_after": str(student.late_after) if student.late_after else None,
        "active": student.active,
        "face_profiles": [
            {
                "id": idx + 1,
                "student_id": student.id,
                "profile_name": file_name,
                "image_path": os.path.join(get_student_face_folder(student.id), file_name),
                "quality_score": 90,
                "is_primary": idx == 0,
            }
            for idx, file_name in enumerate(files)
        ],
    }


@router.get("")
def list_students(db: Session = Depends(get_db), _=Depends(require_teacher_or_admin)):
    students = db.query(Student).order_by(Student.id.desc()).all()
    return [serialize_student(student) for student in students]


@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), _=Depends(require_teacher_or_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return serialize_student(student)


@router.post("")
def create_student(payload: StudentCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return serialize_student(student)


@router.put("/{student_id}")
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for key, value in payload.model_dump().items():
        setattr(student, key, value)

    db.commit()
    db.refresh(student)
    return serialize_student(student)


@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"message": "Student deleted"}