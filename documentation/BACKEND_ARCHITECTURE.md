# Health Chatbot - Backend API Architecture

## Overview

This document describes the backend architecture for serving the Health Chatbot application to the Next.js frontend using FastAPI, PostgreSQL, and ChromaDB.

## System Architecture: FastAPI + Next.js + PostgreSQL

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Next.js       │  HTTP   │   FastAPI        │ ◄─────► │   PostgreSQL    │
│   Frontend      │ ◄─────► │   (Python)       │         │   Database      │
│   (Port 3003)   │         │   (Port 8001)    │         └─────────────────┘
└─────────────────┘         └──────────────────┘                  ▲
                                     │                            │
                                     ▼                            │
                            ┌──────────────────┐                  │
                            │   ChromaDB       │                  │
                            │   Vector Store   │ ─────────────────┘
                            └──────────────────┘
```

## Backend Structure (`backend_fastapi/`)

```
backend_fastapi/
├── main.py                     # Main FastAPI application & CORS
├── requirements.txt            # Python dependencies
├── routers/
│   ├── auth.py                 # Authentication & OTP endpoints
│   ├── chat.py                 # Chat endpoints
│   ├── reports.py              # Medical report analysis endpoints
│   ├── admin.py                # Admin dashboard & analytics endpoints
│   ├── ingest.py               # Document upload & RAG ingestion
│   └── outbreaks.py            # Disease outbreak endpoints
├── services/
│   ├── database.py             # PostgreSQL connection wrapper
│   ├── auth_service.py         # JWT & password hashing
│   ├── rag_service.py          # ChromaDB vector RAG operations
│   └── email_service.py        # SMTP OTP delivery
└── data/                       # Local document storage
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
- PostgreSQL integration for message storage

### Report Analyzer (`services/report_analyzer.py`)

Handles:
- PDF/Image text extraction (using PyPDF2, pytesseract)
- Medical report parsing
- AI-powered analysis using BioMistral
- Structured output generation

## Database & Authentication Integration

The backend uses **PostgreSQL** (via `services/database.py`) and **PyJWT** (via `services/auth_service.py`):
- PostgreSQL stores users, chat history, medical reports, OTP verifications, and alert subscriptions.
- PyJWT verifies Bearer tokens from the frontend.

**Setup:**
```python
from services.database import get_db_connection
from services.auth_service import get_current_user

# Get a normalized Postgres connection
conn = get_db_connection()
```

## Authentication Middleware

Protected API endpoints require JWT authentication:

```python
from fastapi import Depends
from services.auth_service import get_current_user

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}
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

# PostgreSQL & DB Configuration
DATABASE_URL=postgresql://health_user:health_pass@postgres:5432/health_db
JWT_SECRET=super-secret-health-ai-jwt-key-2026-production

# CORS
CORS_ORIGINS=*
```

## Security

1. **Authentication**: All protected endpoints require valid JWT Bearer Token
2. **Rate Limiting**: Implement rate limiting per user
3. **Input Validation**: Validate all inputs using Pydantic models
4. **CORS**: Dynamic wildcard/host matching for universal IP support
5. **File Upload**: Validate file types (.pdf, .txt, .csv) and sanitize paths
6. **API Keys**: Never expose API keys in frontend

## System Status

1. FastAPI backend architecture complete
2. Integrated PostgreSQL database connection wrapper
3. Ingest, Chat, Reports, Outbreaks, Admin endpoints active
4. Fully decoupled from Firebase / Appwrite
5. Production Docker Compose deployment ready
