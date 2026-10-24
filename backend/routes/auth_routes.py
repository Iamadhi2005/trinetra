from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, AuditLog
from backend.schemas import LoginRequest, TokenResponse, UserResponse, PasswordChangeRequest
from backend.auth import verify_password, get_password_hash, create_access_token, get_current_user
import datetime

from sqlalchemy import func

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    clean_u = req.username.strip()
    user = db.query(User).filter(
        (func.lower(User.username) == clean_u.lower()) |
        (func.lower(func.replace(User.username, " ", "")) == clean_u.replace(" ", "").lower()) |
        (func.lower(User.name) == clean_u.lower())
    ).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact Hospital Administrator.",
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    
    # Audit log
    audit = AuditLog(
        username=user.username,
        action="USER_LOGIN",
        target="AUTH_GATEWAY",
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "must_change_password": bool(user.must_change_password)
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed",
        )
    
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long",
        )
    
    current_user.password_hash = get_password_hash(req.new_password)
    current_user.must_change_password = False
    
    audit = AuditLog(
        username=current_user.username,
        action="PASSWORD_CHANGE",
        target="AUTH_GATEWAY",
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Password changed successfully"}

