from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, str(user.password_hash)):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "sub": str(user.id),
        "role": str(user.role),
        "email": str(user.email)
    })

    return TokenResponse(
        access_token=token,
        role=str(user.role),
        full_name=str(user.full_name)
    )