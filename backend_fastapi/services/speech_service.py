import os
import tempfile
import uuid
import asyncio

def transcribe_audio(audio_path: str, lang_code="en-IN") -> str:
    """
    Transcribe audio file.
    Note: Local models and SpeechRecognition have been removed.
    Pending integration with Sarvam API.
    """
    print(f"Mocking transcription for {audio_path} in {lang_code}. Sarvam API integration pending.")
    # Return a dummy string for now to avoid breaking the frontend completely
    return "This is a mocked transcription. Sarvam integration is pending."

def generate_speech(text: str, lang_code="en") -> str:
    """
    Generate TTS audio.
    Note: Local gTTS has been removed.
    Pending integration with Sarvam API.
    """
    print(f"Mocking speech generation for '{text[:20]}...' in '{lang_code}'. Sarvam API integration pending.")
    
    # Return a dummy file path
    static_dir = os.path.join(os.getcwd(), "static", "audio")
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
        
    filename = f"tts_mock_{uuid.uuid4().hex}.mp3"
    file_path = os.path.join(static_dir, filename)
    
    # Create an empty file to satisfy any file existence checks (though it's not real audio)
    with open(file_path, "wb") as f:
        f.write(b"")
        
    print(f"Saved mock TTS to: {file_path}")
    return file_path

async def generate_speech_async(text: str, lang_code="en") -> str:
    """Async version of generate_speech."""
    # Using asyncio sleep to mock a tiny delay
    await asyncio.sleep(0.1)
    return generate_speech(text, lang_code)
