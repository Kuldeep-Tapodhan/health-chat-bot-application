from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import Optional
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
import pypdf
import io
import base64
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import uuid
from fastapi import Depends
from services.database import get_db_connection
from services.auth_service import get_current_user

load_dotenv()

router = APIRouter()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

TEXT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
VISION_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GOOGLE_API_KEY:
    print("Warning: GOOGLE_API_KEY not found. Report analysis will fail.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

@router.post("/analyze")
async def analyze_report(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None)
):
    """
    Analyze a medical report (file or text) and return structured JSON data.
    Supports PDF, Text, and Images (JPEG, PNG).
    """
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="Analysis service unavailable (Missing API Key)")

    report_text = ""
    is_image = False
    image_parts = []
    
    # 1. Extract Content
    try:
        if file:
            content = await file.read()
            content_type = file.content_type
            
            print(f"Processing file: {file.filename} ({content_type})")

            if content_type == "application/pdf":
                try:
                    pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            report_text += page_text + "\n"
                except Exception as e:
                    print(f"PDF Extraction Error: {e}")
                    raise HTTPException(status_code=400, detail="Failed to extract text from PDF. Ensure it is a valid PDF.")

            elif content_type.startswith("image/"):
                is_image = True
                image_parts = [
                    {
                        "mime_type": content_type,
                        "data": content
                    }
                ]
            
            elif content_type.startswith("text/"):
                report_text = content.decode("utf-8")
                
            else:
                 # Fallback
                try:
                    report_text = content.decode("utf-8")
                except:
                    raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF, Text, or Image.")

        elif text:
            report_text = text

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error reading file: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to read report: {str(e)}")

    if not report_text.strip() and not is_image:
        msg = "Could not extract any text from the report."
        if file and file.content_type == "application/pdf":
            msg += " (PDF might be scanned/image-only. OCR for PDFs is not enabled)."
        raise HTTPException(status_code=400, detail=msg)

    # 2. Analyze with AI
    print(f"DEBUG: Analyzing report. Image: {is_image}, Text length: {len(report_text)}")

    system_prompt = """### ROLE
You are a professional, empathetic, and highly accurate Medical Report Analyst. Your job is to take raw, messy text from a medical lab report and transform it into a clean, easy-to-understand health summary for a layperson.

### INSTRUCTIONS
1. **Sanitize the Data:** Ignore random characters, gibberish (like "Dwallbon..."), or OCR artifacts. Only keep valid medical data.
2. **Structure the Output:**
   - **Patient Context:** (If available, list Name, Age, Sex. If not, omit).
   - **Executive Summary:** A 2-3 sentence overview of the patient's health status in plain English.
   - **Abnormal Findings (Priority):** List ONLY the metrics that are High or Low. Explain briefly what that metric does and generic reasons why it might be abnormal.
   - **Full Data Table:** A clean Markdown table of all extracted values.
   - **Actionable Insights:** Generic lifestyle tips based on the results (e.g., "Drink more water," "Sleep well").
3. **Resolve Conflicts:** If the text provides a Reference Range, prioritize that to determine "High/Low" status. If the extracted value contradicts the status (e.g., Value 35, Range 0-6, Status listed as Low), prioritize the numerical value vs the range to determine the true flag.
4. **Tone:** Professional, reassuring, and objective. Never diagnose specific diseases. Use phrases like "indicates," "suggests," or "commonly associated with."
5. **Mandatory Disclaimer:** End with a clear statement that this is an AI analysis and not a substitute for a doctor's advice.

### OUTPUT FORMAT (Markdown)

## 🩺 Health Report Analysis

**Executive Summary**
[Summary here]

**⚠️ Attention Required**
* **[Test Name]**: [Value] (Target: [Range])
    * *What it is:* [Simple definition]
    * *Why it matters:* [Generic explanation of high/low levels]

**📊 Complete Breakdown**
| Test Name | Result | Reference Range | Status |
| :--- | :--- | :--- | :--- |
| [Name] | [Value] | [Range] | [Status] |

**💡 Next Steps**
* [Suggestion 1]
* [Suggestion 2]

---
*Disclaimer: This analysis is generated by AI for informational purposes only and does not constitute medical advice. Please consult your physician for clinical interpretation.*
"""

    model = genai.GenerativeModel(model_name=VISION_MODEL if is_image else TEXT_MODEL, system_instruction=system_prompt)
    
    try:
        contents = []
        if is_image:
            contents.extend(image_parts)
            if report_text:
                contents.append(report_text)
            else:
                contents.append("Extract and analyze the medical report from this image.")
        else:
            report_text_safe = report_text[:50000]
            contents.append(f"### INPUT DATA\n{report_text_safe}")

        response = model.generate_content(
            contents,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
            )
        )

        content = response.text
        
        # We now return the raw markdown content, not JSON
        return {"success": True, "analysis": content}

    except Exception as e:
        from utils.error_handler import handle_ai_exception
        friendly_msg = handle_ai_exception(e)
        raise HTTPException(status_code=500, detail=friendly_msg)

class ReportSaveRequest(BaseModel):
    user_id: str
    title: str
    analysis: str

@router.post("/")
def save_report(request: ReportSaveRequest, user: dict = Depends(get_current_user)):
    """Save a report analysis to the database."""
    if request.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to save reports for this user")
    
    conn = get_db_connection()
    try:
        report_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        
        conn.execute("""
            INSERT INTO reports (id, user_id, title, analysis, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (report_id, request.user_id, request.title, request.analysis, now_iso))
        conn.commit()
        
        return {"success": True, "report_id": report_id}
    except Exception as e:
        print(f"Error saving report: {e}")
        raise HTTPException(status_code=500, detail="Failed to save report")
    finally:
        conn.close()

@router.get("/")
def get_reports(user_id: str, user: dict = Depends(get_current_user)):
    """Get all reports for a specific user."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access reports for this user")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM reports WHERE user_id = ? OR user_id = 'legacy' OR user_id = 'demo' OR user_id IS NULL ORDER BY timestamp DESC",
            (user_id,)
        )
        rows = cursor.fetchall()
        reports = [dict(row) for row in rows]
        return {"success": True, "reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
