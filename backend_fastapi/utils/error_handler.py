import logging

logger = logging.getLogger("health_ai.backend")

def handle_ai_exception(e: Exception, fallback_message: str = "The AI service is temporarily unavailable. Please try again in a few moments.") -> str:
    """
    Logs the full technical exception details to server logs while returning
    a clean, friendly, reassuring message for end users.
    """
    err_str = str(e)
    
    # 1. Log full technical details to server console / container logs
    print(f"🚨 [BACKEND LOG] AI Exception Details: {err_str}")
    logger.error(f"AI Execution Error: {err_str}", exc_info=True)
    
    # 2. Check for Quota Exceeded / Rate Limit / 429 errors
    if any(k in err_str.lower() for k in ["429", "quota", "resourceexhausted", "rate_limit", "generativelanguage"]):
        return "The AI assistant is currently experiencing high demand. Please wait a few moments and try your request again."
    
    # 3. Check for API key configuration issues
    if any(k in err_str.lower() for k in ["api_key", "unauthorized", "invalid key", "authentication"]):
        return "The AI service configuration requires verification. Please check server settings."
        
    return fallback_message
