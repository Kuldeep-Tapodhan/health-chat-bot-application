from fastapi import APIRouter, HTTPException, Body, status, BackgroundTasks
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, timedelta
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()

# Pydantic Models (Serializers)
class LoginNotificationSerializer(BaseModel):
    userId: str
    email: EmailStr
    name: str = "User"
    timestamp: str = None
    
    @field_validator('userId')
    @classmethod
    def validate_user_id(cls, v):
        if not v or v.strip() == "":
            raise ValueError('userId cannot be empty')
        return v


# Response Helper Classes
class APIResponseCodes:
    SUCCESS = "SUCCESS"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    EMAIL_SEND_SUCCESS = "EMAIL_SEND_SUCCESS"
    EMAIL_SEND_FAILED = "EMAIL_SEND_FAILED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class APIResponse:
    Codes = APIResponseCodes
    
    @staticmethod
    def get_success_response(return_code: str, data: dict = None, status_code: int = 200):
        return {
            "success": True,
            "return_code": return_code,
            "data": data or {}
        }
    
    @staticmethod
    def get_error_response(return_code: str, message: str = None, status_code: int = 400):
        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "return_code": return_code,
                "message": message or return_code
            }
        )
    
    @staticmethod
    def get_validation_error_response(return_code: str, serializer_errors: dict, status_code: int = 400):
        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "return_code": return_code,
                "errors": serializer_errors
            }
        )


from services.email_service import send_email_via_smtp


@router.post("/login")
async def notify_login(background_tasks: BackgroundTasks, payload: dict = Body(...)):
    """
    Send a login notification email to the user.
    """
    # Validate payload using Pydantic serializer
    try:
        serializer = LoginNotificationSerializer(**payload)
    except Exception as e:
        # Extract validation errors
        errors = {}
        if hasattr(e, 'errors'):
            for error in e.errors():
                field = error['loc'][0] if error['loc'] else 'unknown'
                errors[field] = error['msg']
        else:
            errors['detail'] = str(e)
        
        return APIResponse.get_validation_error_response(
            return_code=APIResponse.Codes.VALIDATION_ERROR,
            serializer_errors=errors
        )
    
    # Extract validated data
    user_id = serializer.userId
    email = serializer.email
    name = serializer.name
    timestamp = serializer.timestamp
    
    # Prepare email content
    subject = "Security Alert: New Login to Health Assistant"
    content = f"Hello {name},\n\nWe noticed a new login to your Health Assistant account.\n\nDate: {timestamp}\n\nIf this was you, you can ignore this email.\n\nBest regards,\nHealth Assistant Team"
    
    try:
        # Send email using background task
        background_tasks.add_task(send_email_via_smtp, email, subject, content)
        
        return APIResponse.get_success_response(
            return_code=APIResponse.Codes.EMAIL_SEND_SUCCESS,
            data={"message": "Email queued"},
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        # If queueing fails (unlikely)
        print(f"Failed to queue email: {e}")
        return APIResponse.get_error_response(
            return_code=APIResponse.Codes.EMAIL_SEND_FAILED,
            message=f"Failed to queue email: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )