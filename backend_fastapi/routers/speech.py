from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse
from services.speech_service import transcribe_audio, generate_speech_async
import shutil
import os

router = APIRouter()

@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...), language: str = "en-in"):
    """
    Convert uploaded audio file to text.
    """
    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        text = transcribe_audio(temp_filename, language)
        return {"text": text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@router.post("/tts")
async def text_to_speech(text: str = Body(..., embed=True), language: str = Body("en-in", embed=True)):
    """
    Convert text to audio file (async for faster response).
    """
    try:
        file_path = await generate_speech_async(text, language)
        return FileResponse(file_path, media_type="audio/mpeg", filename="speech.mp3")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
