from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict
import google.generativeai as genai
import os
import json

router = APIRouter()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Use gemini-1.5-flash for translation as it is fast
TRANSLATE_MODEL = "gemini-1.5-flash"

@router.post("/")
async def translate_text(
    texts: List[str] = Body(..., embed=True), 
    target_lang: str = Body(..., embed=True)
):
    """
    Translate a list of strings to the target language using Gemini.
    """
    try:
        if not texts:
            return {"translated_texts": []}
            
        if not GOOGLE_API_KEY:
            raise HTTPException(status_code=503, detail="Translation service unavailable (Missing API Key)")

        # Filter empty strings but keep track of indices
        valid_indices = [i for i, t in enumerate(texts) if t.strip()]
        valid_texts = [texts[i] for i in valid_indices]
        
        if not valid_texts:
            return {"translated_texts": [""] * len(texts)}

        model = genai.GenerativeModel(model_name=TRANSLATE_MODEL)
        
        prompt = f"""
        Translate the following JSON array of text into the language '{target_lang}'. 
        Return ONLY a JSON array of the translated strings in the exact same order.
        Do not include markdown blocks or any other text.
        
        Texts to translate:
        {json.dumps(valid_texts)}
        """
        
        response = model.generate_content(prompt, generation_config=genai.types.GenerationConfig(temperature=0.1))
        
        # Clean response in case it has markdown blocks
        cleaned_response = response.text.replace("```json", "").replace("```", "").strip()
        translated_valid = json.loads(cleaned_response)
        
        if len(translated_valid) != len(valid_texts):
             raise ValueError("Mismatch in number of translated items returned by AI.")

        # Reconstruct the list preserving empty strings
        final_translations = [""] * len(texts)
        for idx, val_idx in enumerate(valid_indices):
            final_translations[val_idx] = translated_valid[idx]
            
        return {"translated_texts": final_translations}
        
    except Exception as e:
        print(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
