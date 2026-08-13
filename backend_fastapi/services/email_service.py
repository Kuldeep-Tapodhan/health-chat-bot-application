import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import uuid
import datetime

# SMTP Configuration
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465  # 465 for SSL

def get_email_template(name: str, otp: str, link: str) -> str:
    """
    Generate HTML email template with dark mode and gold accents.
    """
    year = datetime.datetime.now().year
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ text-align: center; padding-bottom: 30px; }}
            .header h1 {{ color: #d4a373; margin: 0; font-size: 28px; letter-spacing: 3px; text-transform: uppercase; }}
            .content {{ background-color: #1e293b; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); text-align: center; border: 1px solid #334155; }}
            .otp-code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d4a373; margin: 30px 0; background: rgba(212, 163, 115, 0.1); padding: 15px; border-radius: 8px; display: inline-block; }}
            .btn {{ display: inline-block; background-color: #d4a373; color: #0f172a; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 10px; transition: background-color 0.3s; }}
            .btn:hover {{ background-color: #c58f5f; }}
            .footer {{ text-align: center; margin-top: 40px; font-size: 12px; color: #64748b; }}
            .text-muted {{ color: #94a3b8; font-size: 14px; line-height: 1.6; }}
            h2 {{ color: #f8fafc; font-size: 24px; margin-bottom: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>HEALTH ASSISTANCE</h1>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2> 
                <!-- Note: Using generic header, reused for login/signup currently -->
                
                <p class="text-muted">Hello {name},</p>
                <p class="text-muted">Use the code below to complete your verification.</p>
                
                <div class="otp-code">{otp}</div>
                
                <p class="text-muted">Or click the button below to verify automatically:</p>
                <a href="{link}" class="btn">VERIFY NOW</a>
                
                <p class="text-muted" style="margin-top: 30px; font-size: 13px;">
                    This link will expire in 10 minutes.<br>
                    If you didn't request this code, you can safely ignore this email.
                </p>
            </div>
            <div class="footer">
                &copy; {year} Health Assistance. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

def send_email_via_smtp(to_email: str, subject: str, content: str, html_content: str = None) -> dict:
    """
    Send an email using smtplib with SMTP_SSL.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        content: Plain text email body content
        html_content: Optional HTML email body content
    
    Returns:
        dict: Success response with message details ({'$id': '...'})
    
    Raises:
        Exception: If email sending fails
    """
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print(f"\\n[DEV MODE] SMTP not configured. Mocking email send.")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content:\\n{content}\\n")
        print("---------------------------------------------------")
        return {"$id": "mock_email_id_dev_mode"}
    
    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"Health Assistant Team <{smtp_user}>"
    message["To"] = to_email
    
    # Add plain text content
    text_part = MIMEText(content, "plain", "utf-8")
    message.attach(text_part)

    # Add HTML content if provided
    if html_content:
        html_part = MIMEText(html_content, "html", "utf-8")
        message.attach(html_part)
    
    try:
        # Use SMTP_SSL for port 465 (SSL/TLS)
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(smtp_user, smtp_password)
            server.send_message(message)
        
        # Generate a pseudo message ID for consistency
        message_id = str(uuid.uuid4())
        
        return {"$id": message_id}
    
    except smtplib.SMTPAuthenticationError as e:
        raise Exception(f"SMTP Authentication failed: {str(e)}")
    except smtplib.SMTPException as e:
        raise Exception(f"SMTP error occurred: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to send email: {str(e)}")
