from fastapi import APIRouter, Depends, HTTPException, status
from app.database.mongodb import get_database
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict)
async def register(user_data: RegisterRequest, db=Depends(get_database)):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user document
    user_doc = {
        "full_name": user_data.full_name,
        "email": user_data.email,
        "mobile": user_data.mobile,
        "password": hash_password(user_data.password),
        "role": user_data.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.users.insert_one(user_doc)

    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id),
    }


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db=Depends(get_database)):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "mobile": user["mobile"],
            "role": user["role"],
        },
    )


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        mobile=current_user["mobile"],
        role=current_user["role"],
    )
