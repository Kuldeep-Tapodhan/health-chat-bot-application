# Cloud Production Deployment Architecture

This document describes the cloud deployment configuration and instructions for the Health AI Assistant application using **Vercel**, **Render**, and **Supabase**.

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                  |
| +-----------------------------------------------------------------------------+ |
| |                        Vercel Global Edge Network                           | |
| |                         Next.js 16 Web Application                          | |
| |                           (health-chatbot-app)                              | |
| +-----------------------------------------------------------------------------+ |
+---------------------------------------|-----------------------------------------+
                                        | REST API (NEXT_PUBLIC_API_URL)
+---------------------------------------v-----------------------------------------+
|                         RENDER PYTHON WEB SERVICE                               |
| +-----------------------------------------------------------------------------+ |
| |                         FastAPI Python Backend                              | |
| |                           (backend_fastapi)                                 | |
| +------------------------------------|----------------------------------------+ |
+--------------------------------------|------------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
+------------------v------------------+ +------------------v------------------+
|        SUPABASE POSTGRESQL DB       | |       SUPABASE STORAGE BUCKET       |
|    User accounts, chat logs, &      | |      Uploaded lab report PDFs &     | |
|    epidemiological analytics        | |      clinical document images       |
+-------------------------------------+ +-------------------------------------+
```

---

## 📦 Component Overview

### 1. Frontend (Vercel)
- **Folder**: `health-chatbot-app`
- **Framework**: Next.js 16 App Router
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Render Backend Public HTTPS Endpoint

### 2. Backend (Render)
- **Folder**: `backend_fastapi`
- **Environment**: Native Python 3.13 Web Service
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Blueprint File**: `backend_fastapi/render.yaml`
- **Environment Variables**:
  - `DATABASE_URL`: Supabase PostgreSQL URI
  - `SUPABASE_URL`: Supabase Project URL
  - `SUPABASE_KEY`: Supabase Service / Anon API Key
  - `SUPABASE_BUCKET`: `medical-reports`
  - `GOOGLE_API_KEY`: Google Gemini Generative AI Key
  - `JWT_SECRET`: Secret JWT signing key
  - `CORS_ORIGINS`: Allowed client origins (`*`)

### 3. Database & Storage (Supabase)
- **Database**: PostgreSQL Instance
- **Storage Bucket**: `medical-reports` (Public access for report CDN delivery)

---

## 🛠️ Step-by-Step Deployment Instructions

Refer to the primary guide: **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for detailed, step-by-step instructions.