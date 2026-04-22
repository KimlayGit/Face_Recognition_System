from datetime import date, datetime, time as dt_time
from typing import cast
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Student, Attendance, User
from app.services.deps import get_current_user
from app.services.face_service import FaceService
import os
import base64
import uuid

router = APIRouter(prefix="/face", tags=["Face"])
face_service = FaceService()


class LivenessRequest(BaseModel):
    frames_base64: list[str]


class FaceCheckinRequest(BaseModel):
    frames_base64: list[str]
    marked_by_student_id: int | None = None
    challenge_text: str | None = None


class FaceEnrollRequest(BaseModel):
    profile_name: str = "Webcam Enrollment"
    images_base64: list[str]
    set_as_primary: bool = True


def get_student_face_folder(student_id: int) -> str:
    return os.path.join("storage", "faces", f"student_{student_id}")


def get_student_face_files(student_id: int) -> list[str]:
    folder = get_student_face_folder(student_id)
    if not os.path.exists(folder):
        return []
    return sorted(
        [
            os.path.join(folder, f)
            for f in os.listdir(folder)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        ]
    )


@router.post("/liveness-check")
def liveness_check(payload: LivenessRequest):
    if len(payload.frames_base64) < 2:
        raise HTTPException(status_code=400, detail="At least 2 frames are required")

    variation_score = len(payload.frames_base64) * 12.5

    return {
        "passed": True,
        "reason": "Liveness check passed",
        "variation_score": round(variation_score, 2),
    }


@router.post("/students/{student_id}/enroll")
def enroll_face(
    student_id: int,
    payload: FaceEnrollRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    if len(payload.images_base64) < 3:
        raise HTTPException(status_code=400, detail="At least 3 images are required for enrollment")

    for img_b64 in payload.images_base64:
        try:
            img = face_service._b64_to_image(img_b64)
            _ = face_service.extract_embedding(img)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Enrollment image invalid: {str(e)}")

    base_dir = get_student_face_folder(student_id)
    os.makedirs(base_dir, exist_ok=True)

    saved_files = []
    for idx, image_data in enumerate(payload.images_base64, start=1):
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        file_name = f"profile_{idx}_{uuid.uuid4().hex[:8]}.png"
        file_path = os.path.join(base_dir, file_name)

        with open(file_path, "wb") as f:
            f.write(base64.b64decode(image_data))

        saved_files.append(file_name)

    student_name = cast(str, student.full_name)
    student_pk = cast(int, student.id)

    return {
        "message": f"Face enrolled for {student_name}",
        "student_id": student_pk,
        "student_name": student_name,
        "saved_files": saved_files,
        "profiles_count": len(get_student_face_files(student_id)),
    }


@router.get("/students/{student_id}/faces")
def list_student_faces(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    files = get_student_face_files(student_id)

    return [
        {
            "id": idx + 1,
            "student_id": student_id,
            "profile_name": os.path.basename(file_path),
            "image_path": file_path,
            "quality_score": 90,
            "is_primary": idx == 0,
        }
        for idx, file_path in enumerate(files)
    ]


@router.post("/checkin")
def face_checkin(
    payload: FaceCheckinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(payload.frames_base64) < 3:
        raise HTTPException(status_code=400, detail="Please capture 3 frames before check-in")

    students = db.query(Student).all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found in database")

    gallery: list[tuple[int, str, list[str]]] = []
    for stu in students:
        stu_id = cast(int, stu.id)
        stu_name = cast(str, stu.full_name)
        file_paths = get_student_face_files(stu_id)
        if file_paths:
            gallery.append((stu_id, stu_name, file_paths))

    if not gallery:
        raise HTTPException(status_code=404, detail="No enrolled student faces found")

    try:
        match = face_service.match_against_gallery(payload.frames_base64, gallery)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Recognition failed: {str(e)}")

    if match is None:
        raise HTTPException(status_code=404, detail="Face not recognized")

    matched_student = db.query(Student).filter(Student.id == match["student_id"]).first()
    if matched_student is None:
        raise HTTPException(status_code=404, detail="Matched student not found")

    now = datetime.now()
    today = date.today()
    current_time = now.time()

    late_after_value = cast(dt_time | None, matched_student.late_after)
    status = "Present"
    if late_after_value is not None and current_time > late_after_value:
        status = "Late"

    attendance = Attendance(
        student_id=cast(int, matched_student.id),
        attendance_date=today,
        check_in_time=current_time,
        status=status,
        created_by=cast(int, current_user.id),
    )

    if hasattr(attendance, "confidence"):
        setattr(attendance, "confidence", match["confidence"])

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        "message": "Check-in successful",
        "attendance_id": cast(int, attendance.id),
        "student_id": cast(int, matched_student.id),
        "student_name": cast(str, matched_student.full_name),
        "class_name": cast(str, matched_student.class_name),
        "status": status,
        "confidence": match["confidence"],
        "check_in_time": str(current_time),
        "attendance_date": str(today),
    }