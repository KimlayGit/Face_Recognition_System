from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_code = Column(String(30), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    class_name = Column(String(50), nullable=False)
    late_after = Column(Time, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    face_profiles = relationship("StudentFaceProfile", back_populates="student", cascade="all, delete-orphan")


class StudentFaceProfile(Base):
    __tablename__ = "student_face_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    profile_name = Column(String(100), nullable=False)
    image_path = Column(String(255), nullable=True)
    embedding = Column(String, nullable=False)
    quality_score = Column(Float, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="face_profiles")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    check_in_time = Column(Time, nullable=True)
    status = Column(String(20), nullable=False)
    late_after = Column(Time, nullable=True)
    confidence_score = Column(Float, nullable=True)
    liveness_passed = Column(Boolean, default=False)
    capture_source = Column(String(30), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="attendances")
