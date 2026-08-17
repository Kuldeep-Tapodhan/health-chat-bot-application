import os
import re
import base64
import requests
import asyncio
from typing import Optional, Dict, Any

# Map common language ISO codes to Sarvam AI supported BCP-47 codes
LANGUAGE_MAP = {
    "en": "en-IN",
    "en-in": "en-IN",
    "en-us": "en-IN",
    "hi": "hi-IN",
    "hi-in": "hi-IN",
    "bn": "bn-IN",
    "bn-in": "bn-IN",
    "kn": "kn-IN",
    "kn-in": "kn-IN",
    "ml": "ml-IN",
    "ml-in": "ml-IN",
    "mr": "mr-IN",
    "mr-in": "mr-IN",
    "or": "od-IN",
    "od": "od-IN",
    "od-in": "od-IN",
    "pa": "pa-IN",
    "pa-in": "pa-IN",
    "ta": "ta-IN",
    "ta-in": "ta-IN",
    "te": "te-IN",
    "te-in": "te-IN",
    "gu": "gu-IN",
    "gu-in": "gu-IN",
}

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"

def get_sarvam_lang(lang_code: str) -> str:
    """Normalize input language code to standard Sarvam BCP-47 code."""
    if not lang_code:
        return "en-IN"
    cleaned = lang_code.strip().lower()
    return LANGUAGE_MAP.get(cleaned, "hi-IN" if "hi" in cleaned else "en-IN")

# Voice mapping per target language
# Default speaker requested: 'ritu'
DEFAULT_SPEAKER = "ritu"

SPEAKER_MAP = {
    "hi-IN": "ritu",
    "en-IN": "ritu",
    "ta-IN": "ritu",
    "te-IN": "ritu",
    "mr-IN": "ritu",
    "gu-IN": "ritu",
    "bn-IN": "ritu",
    "kn-IN": "ritu",
    "ml-IN": "ritu",
    "pa-IN": "ritu",
    "od-IN": "ritu",
}

# List of officially supported speakers for Sarvam bulbul models
VALID_SPEAKERS = {
    "ritu", "anushka", "abhilash", "manisha", "vidya", "arya", "karun", "hitesh",
    "aditya", "priya", "neha", "rahul", "pooja", "rohan", "simran", "kavya", "amit",
    "dev", "ishita", "shreya", "ratan", "varun", "manan", "sumit", "roopa", "kabir",
    "aayan", "shubh", "ashutosh", "advait", "anand", "tanya", "tarun", "sunny",
    "mani", "gokul", "vijay", "shruti", "suhani", "mohit", "kavitha", "rehan",
    "soham", "rupali"
}

def get_default_speaker() -> str:
    """Get default speaker from SARVAM_DEFAULT_SPEAKER env variable."""
    env_spk = os.getenv("SARVAM_DEFAULT_SPEAKER", os.getenv("SARVAM_SPEAKER", "ritu")).strip().lower()
    return env_spk if env_spk in VALID_SPEAKERS else "ritu"

def get_speaker_for_lang(lang_code: str, preferred_speaker: Optional[str] = None) -> str:
    """Select the voice speaker based on target language with .env SARVAM_DEFAULT_SPEAKER fallback."""
    default_spk = get_default_speaker()
    if preferred_speaker and preferred_speaker.strip():
        spk = preferred_speaker.strip().lower()
        if spk in VALID_SPEAKERS:
            return spk
        else:
            print(f"⚠️ Speaker '{preferred_speaker}' is invalid. Falling back to env default '{default_spk}'.")
    sarvam_lang = get_sarvam_lang(lang_code)
    return SPEAKER_MAP.get(sarvam_lang, default_spk)

def clean_text_for_speech(text: str) -> str:
    """
    Sanitizes markdown syntax, code blocks, URLs, and formatting symbols
    into clean, fluid, natural spoken prose for Sarvam AI TTS.
    """
    if not text:
        return ""

    s = text

    # Remove fenced code blocks ```chart ... ``` or ``` ... ```
    s = re.sub(r"```[\s\S]*?```", "", s)

    # Remove URLs
    s = re.sub(r"https?://\S+", "", s)

    # Convert markdown links [Text](url) -> Text
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)

    # Remove headers (# ## ###)
    s = re.sub(r"^#{1,6}\s*", "", s, flags=re.MULTILINE)

    # Remove bold / italic asterisks & underscores (**text**, *text*, _text_)
    s = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", s)
    s = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", s)

    # Remove inline backticks
    s = re.sub(r"`([^`]+)`", r"\1", s)

    # Convert bullet lists into clean sentence pauses
    s = re.sub(r"^\s*[-*+]\s+", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*\d+\.\s+", "", s, flags=re.MULTILINE)

    # Replace special symbols with spoken equivalents
    s = s.replace("&", " and ")
    s = s.replace("%", " percent ")
    s = s.replace("+", " plus ")
    s = s.replace("@", " at ")

    # Normalize multiple newlines/spaces into single sentence breaks
    s = re.sub(r"\n+", ". ", s)
    s = re.sub(r"\s+", " ", s).strip()

    # Truncate at natural sentence boundary near 480 chars limit for Sarvam bulbul
    if len(s) > 480:
        truncated = s[:480]
        last_punct = max(truncated.rfind("."), truncated.rfind("?"), truncated.rfind("!"))
        if last_punct > 150:
            s = truncated[:last_punct + 1]
        else:
            s = truncated + "."

    return s

def generate_sarvam_tts(
    text: str,
    lang_code: str = "hi-IN",
    speaker: Optional[str] = None,
    pace: float = 1.0,
    pitch: float = 0.0,
    model: str = "bulbul:v3"
) -> bytes:
    """
    Generate Text-to-Speech audio bytes via Sarvam AI API using model 'bulbul:v3' and speaker 'ritu'.
    Supports official sarvamai Python SDK with automatic REST API fallback.
    """
    api_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not api_key:
        raise ValueError("SARVAM_API_KEY is not set in environment or .env file.")

    sarvam_lang = get_sarvam_lang(lang_code)
    chosen_speaker = get_speaker_for_lang(sarvam_lang, speaker)
    
    # Sanitize markdown, code blocks, bullet points, and URLs into clean spoken prose
    clean_text = clean_text_for_speech(text)
    if not clean_text:
        raise ValueError("Input text for TTS is empty after sanitization.")

    # 1. Try official sarvamai Python SDK
    try:
        from sarvamai import SarvamAI
        client = SarvamAI(api_subscription_key=api_key)
        print(f"🔊 Requesting Sarvam AI SDK TTS (model={model}, lang={sarvam_lang}, speaker={chosen_speaker})...")
        response = client.text_to_speech.convert(
            model=model,
            text=clean_text,
            target_language_code=sarvam_lang,
            speaker=chosen_speaker,
        )
        
        audios = None
        if hasattr(response, "audios"):
            audios = response.audios
        elif isinstance(response, dict):
            audios = response.get("audios")

        if audios and len(audios) > 0:
            audio_bytes = base64.b64decode(audios[0])
            print(f"✅ Sarvam AI SDK generated {len(audio_bytes)} bytes audio.")
            return audio_bytes
    except ImportError:
        pass  # SDK not installed, fallback to direct REST API
    except Exception as sdk_err:
        print(f"⚠️ Sarvam AI SDK call failed, falling back to REST API: {sdk_err}")

    # 2. Direct HTTP REST API fallback
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "inputs": [clean_text],
        "target_language_code": sarvam_lang,
        "speaker": chosen_speaker,
        "pace": pace,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": model
    }
    if model != "bulbul:v3":
        payload["pitch"] = pitch
        payload["loudness"] = 1.5

    print(f"🔊 Requesting Sarvam REST API TTS (model={model}, lang={sarvam_lang}, speaker={chosen_speaker})...")
    response = requests.post(SARVAM_TTS_URL, json=payload, headers=headers, timeout=15)
    
    if response.status_code == 200:
        res_data = response.json()
        audios = res_data.get("audios", [])
        if audios and len(audios) > 0:
            audio_bytes = base64.b64decode(audios[0])
            print(f"✅ Sarvam REST API generated {len(audio_bytes)} bytes audio.")
            return audio_bytes
        else:
            raise RuntimeError("Sarvam API returned HTTP 200 but audios array was empty.")
    else:
        err_detail = response.text
        print(f"❌ Sarvam REST API Error {response.status_code}: {err_detail}")
        raise RuntimeError(f"Sarvam API error ({response.status_code}): {err_detail}")

async def generate_speech_async(
    text: str,
    lang_code: str = "hi-IN",
    speaker: Optional[str] = None,
    pace: float = 1.0,
    model: str = "bulbul:v3"
) -> bytes:
    """Async wrapper for Sarvam AI TTS generation."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, generate_sarvam_tts, text, lang_code, speaker, pace, 0.0, model
    )

def transcribe_audio(audio_path: str, lang_code: str = "en-IN") -> str:
    """
    Transcribe audio file via Sarvam AI STT API (saarika:v1).
    """
    api_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not api_key:
        print("⚠️ SARVAM_API_KEY is not set. Returning placeholder STT response.")
        return "Sarvam API key is not configured. Please add SARVAM_API_KEY to backend .env file."

    sarvam_lang = get_sarvam_lang(lang_code)
    
    headers = {
        "api-subscription-key": api_key
    }

    try:
        with open(audio_path, "rb") as audio_file:
            files = {"file": (os.path.basename(audio_path), audio_file, "audio/wav")}
            data = {
                "model": "saarika:v1",
                "language_code": sarvam_lang,
                "with_timestamps": "false"
            }
            
            response = requests.post(SARVAM_STT_URL, files=files, data=data, headers=headers, timeout=20)
            if response.status_code == 200:
                result = response.json()
                transcript = result.get("transcript", "")
                print(f"✅ Sarvam STT Transcript: '{transcript}'")
                return transcript
            else:
                print(f"❌ Sarvam STT Error {response.status_code}: {response.text}")
                return f"STT Error: {response.text}"

    except Exception as e:
        print(f"❌ Sarvam STT Exception: {e}")
        return f"STT Exception: {str(e)}"

