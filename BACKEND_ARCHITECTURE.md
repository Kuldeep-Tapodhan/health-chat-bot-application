# Health Chatbot - Backend API Architecture

## Overview

This document describes the backend architecture for serving your BioMistral-7B model (from `model_4bit` folder) to the Next.js frontend.

## Architecture Choice: Flask + Next.js

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Next.js       │  HTTP   │   Flask API      │  Load   │  BioMistral     │
│   Frontend      │ ◄─────► │   (Python)       │ ◄─────► │  model_4bit/    │
│   (Port 3000)   │         │   (Port 5000)    │         │  (GPU/CPU)      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│   Firebase      │         │   File Storage   │
│   Auth/DB       │         │   (Reports)      │
└─────────────────┘         └──────────────────┘
```

## Backend Structure

```
backend/
├── app.py                      # Main Flask application
├── config.py                   # Configuration settings
├── requirements.txt            # Python dependencies
├── models/
│   └── model_loader.py         # Model loading and inference
├── routes/
│   ├── __init__.py
│   ├── chat.py                 # Chat endpoints
│   ├── reports.py              # Report analysis endpoints
│   └── health.py               # Health check endpoints
├── services/
│   ├── __init__.py
│   ├── chat_service.py         # Chat business logic
│   └── report_analyzer.py      # Report analysis logic
├── utils/
│   ├── __init__.py
│   ├── firebase_admin.py       # Firebase Admin SDK
│   └── auth_middleware.py      # JWT verification
└── .env                        # Environment variables
```

## API Endpoints

### 1. Chat Endpoints

#### POST `/api/chat/message`
Generate AI response for user message

**Request:**
```json
{
  "message": "What are the symptoms of diabetes?",
  "sessionId": "session_123",
  "userId": "user_abc",
  "maxTokens": 150,
  "temperature": 0.7,
  "topP": 0.9
}
```

**Response:**
```json
{
  "success": true,
  "response": "Diabetes symptoms include...",
  "messageId": "msg_456",
  "metadata": {
    "model": "BioMistral-7B-4bit",
    "tokensGenerated": 87,
    "inferenceTime": 2.3
  }
}
```

#### GET `/api/chat/sessions/:userId`
Get all chat sessions for a user

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "session_123",
      "title": "Diabetes symptoms",
      "messageCount": 8,
      "lastMessage": "2025-01-25T10:15:00Z"
    }
  ]
}
```

### 2. Report Analysis Endpoints

#### POST `/api/reports/analyze`
Analyze uploaded medical report

**Request (multipart/form-data):**
```
file: [PDF/Image file]
userId: "user_abc"
reportId: "report_123"
```

**Response:**
```json
{
  "success": true,
  "reportId": "report_123",
  "analysis": {
    "summary": "Blood test results show normal ranges...",
    "findings": ["Hemoglobin: 14.5 g/dL (Normal)"],
    "recommendations": ["Continue current health regimen"],
    "confidence": 0.92
  },
  "processingTime": 5.2
}
```

### 3. Health Check

#### GET `/api/health`
Check API and model status

**Response:**
```json
{
  "status": "healthy",
  "model": {
    "loaded": true,
    "name": "BioMistral-7B-4bit",
    "device": "cuda",
    "memoryUsage": "3.5GB"
  },
  "uptime": 3600
}
```

## Model Integration

### Model Loader (`models/model_loader.py`)

Based on your existing `ui.py`, the model loader will:

1. Load the 4-bit quantized model from `model_4bit/`
2. Use BitsAndBytesConfig for 4-bit quantization
3. Keep model in memory for fast inference
4. Support concurrent requests with thread-safe inference

**Key Features:**
- Singleton pattern (load once, use many times)
- Automatic device detection (CUDA/CPU)
- Memory-efficient 4-bit quantization
- Fast inference with caching

### Chat Service (`services/chat_service.py`)

Handles:
- Message formatting with chat templates
- Token management and truncation
- Response generation with configurable parameters
- Firebase integration for message storage

### Report Analyzer (`services/report_analyzer.py`)

Handles:
- PDF/Image text extraction (using PyPDF2, pytesseract)
- Medical report parsing
- AI-powered analysis using BioMistral
- Structured output generation

## Firebase Admin Integration

The backend will use Firebase Admin SDK to:
- Verify JWT tokens from frontend
- Store chat messages in Firestore
- Store report analysis results
- Upload files to Firebase Storage

**Setup:**
```python
import firebase_admin
from firebase_admin import credentials, firestore, storage

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'storageBucket': 'your-project.appspot.com'
})

db = firestore.client()
bucket = storage.bucket()
```

## Authentication Middleware

All API endpoints (except `/api/health`) require authentication:

```python
from functools import wraps
from firebase_admin import auth

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        try:
            decoded_token = auth.verify_id_token(token)
            request.user_id = decoded_token['uid']
            return f(*args, **kwargs)
        except:
            return jsonify({'error': 'Unauthorized'}), 401
    return decorated_function
```

## Environment Variables

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_PORT=5000
FLASK_HOST=0.0.0.0

# Model Configuration
MODEL_PATH=C:\Users\Vivek\PycharmProjects\Health-Assistance\model_4bit
MAX_TOKENS_DEFAULT=150
TEMPERATURE_DEFAULT=0.7
TOP_P_DEFAULT=0.9

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/serviceAccountKey.json
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# CORS (for Next.js frontend)
CORS_ORIGINS=http://localhost:3000,https://your-production-domain.com

# GPU Configuration
CUDA_VISIBLE_DEVICES=0
```

## Dependencies (requirements.txt)

```txt
flask==3.0.0
flask-cors==4.0.0
python-dotenv==1.0.0
transformers==4.36.0
torch==2.1.0
accelerate==0.25.0
bitsandbytes==0.41.3
firebase-admin==6.3.0
PyPDF2==3.0.1
pytesseract==0.3.10
Pillow==10.1.0
gunicorn==21.2.0
```

## Deployment Options

### Option 1: Local Development
- Run Flask on `localhost:5000`
- Run Next.js on `localhost:3000`
- Use CORS to allow cross-origin requests

### Option 2: Production (Same Server)
- Deploy Flask as API server
- Deploy Next.js frontend
- Use Nginx as reverse proxy
- Route `/api/*` to Flask, everything else to Next.js

### Option 3: Separate Servers
- Deploy Flask on GPU server (for model inference)
- Deploy Next.js on Vercel/Firebase Hosting
- Use HTTPS for secure communication

## Performance Considerations

### Model Loading
- Load model once at startup (not per request)
- Keep model in GPU memory for fast inference
- Implement model warmup on startup

### Request Handling
- Use async/await for non-blocking I/O
- Implement request queuing for high load
- Set timeout limits for long-running requests

### Caching
- Cache frequently asked questions
- Implement response caching with TTL
- Use Redis for distributed caching (optional)

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "MODEL_ERROR",
    "message": "Failed to generate response",
    "details": "CUDA out of memory"
  }
}
```

## Monitoring & Logging

- Log all API requests with timestamps
- Track model inference times
- Monitor GPU memory usage
- Log errors with stack traces
- Implement health check endpoint for uptime monitoring

## Security

1. **Authentication**: All endpoints require valid Firebase JWT
2. **Rate Limiting**: Implement rate limiting per user
3. **Input Validation**: Validate all inputs before processing
4. **CORS**: Whitelist only trusted origins
5. **File Upload**: Validate file types and sizes
6. **API Keys**: Never expose API keys in frontend

## Next Steps

1. Create Flask application structure
2. Implement model loader based on your `ui.py`
3. Create chat and report analysis endpoints
4. Integrate Firebase Admin SDK
5. Test with Next.js frontend
6. Deploy and monitor
