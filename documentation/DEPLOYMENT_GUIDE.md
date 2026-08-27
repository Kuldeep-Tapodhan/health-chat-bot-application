# 🚀 Complete Production Deployment Guide

This document provides a step-by-step guide to deploying the **Health AI Assistant** application across **Vercel**, **Render**, and **Supabase** directly from your Git source code without Docker images.

---

## 🏗️ Architecture Overview

| Component | Platform | Purpose | Environment / Runtime |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Next.js 16 Web App | Node.js (Native Next.js Build) |
| **Backend** | **Render** | FastAPI Python API | Python 3.13 (Native Python Web Service) |
| **Database** | **Supabase** | Relational Database | PostgreSQL |
| **File Storage**| **Supabase** | Lab PDF/Report Uploads | Supabase Storage Bucket (`medical-reports`) |

---

## 📍 Phase 1: Supabase Setup (Database & File Storage)

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://database.new) and log in / sign up.
2. Click **New Project**, select an organization, and enter:
   - **Name**: `health-ai-app`
   - **Database Password**: *Generate a secure password and save it*.
   - **Region**: Choose the region closest to your users.
3. Click **Create new project** and wait 1-2 minutes for initialization.

### 2. Copy Database Connection String
1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) -> **Database**.
2. Scroll to **Connection string** -> select **URI** (or Transaction Pooler).
3. Copy the string. It will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
   *Replace `[YOUR-PASSWORD]` with the password created in step 1.*

### 3. Create Storage Bucket for Medical Reports
1. In Supabase sidebar, click **Storage**.
2. Click **New Bucket**.
3. Bucket Name: `medical-reports`
4. Toggle **Public Bucket** to **ON** (allows frontend to display uploaded lab reports via secure URLs).
5. Click **Save Bucket**.
6. Copy your **Supabase URL** and **API Key** from **Project Settings** -> **API**.

---

## 📍 Phase 2: Render Backend Deployment (FastAPI)

### 1. Connect GitHub to Render
1. Push your repository code to **GitHub**.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub account and select your `health-chat-bot-application` repository.

### 2. Configure Web Service Settings
- **Name**: `health-chatbot-backend`
- **Region**: Choose same region as Supabase.
- **Root Directory**: `backend_fastapi`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Instance Type**: Free (or Starter)

### 3. Set Backend Environment Variables
In the **Environment** section of your Render Web Service, add the following key-value pairs:

| Environment Variable | Value / Description |
| :--- | :--- |
| `DATABASE_URL` | Your Supabase PostgreSQL connection URI |
| `SUPABASE_URL` | `https://[YOUR-PROJECT-REF].supabase.co` |
| `SUPABASE_KEY` | Your Supabase `anon` key or `service_role` key |
| `SUPABASE_BUCKET` | `medical-reports` |
| `GOOGLE_API_KEY` | Your Google Gemini API Key |
| `JWT_SECRET` | Secret key for auth tokens (e.g. `super-secret-key-2026`) |
| `CORS_ORIGINS` | `*` (or your Vercel deployment URL) |

4. Click **Create Web Service**. Render will automatically pull the code, install requirements, and deploy your live FastAPI backend.
5. Copy your live Render service URL (e.g. `https://health-chatbot-backend.onrender.com`).

---

## 📍 Phase 3: Vercel Frontend Deployment (Next.js 16)

### 1. Import Repository to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new) and log in.
2. Click **Add New...** -> **Project**.
3. Import your `health-chat-bot-application` GitHub repository.

### 2. Configure Vercel Project Settings
- **Framework Preset**: `Next.js`
- **Root Directory**: Click **Edit** and set to `health-chatbot-app`.
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### 3. Set Frontend Environment Variables
Expand **Environment Variables** and add:

| Environment Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Your Render Backend URL (e.g. `https://health-chatbot-backend.onrender.com`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps API key (optional for Hospital Finder) |

4. Click **Deploy**. Vercel will build your Next.js application and assign a live production URL (e.g., `https://health-chatbot-app.vercel.app`).

---

## 📍 Phase 4: Final Linking & Verification

1. **Verify Backend Health**:
   Visit `https://health-chatbot-backend.onrender.com/` in your browser. You should see:
   `{"message": "Data-Aware RAG System API is running"}`
2. **Verify Interactive API Documentation**:
   Visit `https://health-chatbot-backend.onrender.com/docs` to test live endpoints.
3. **Verify Frontend Application**:
   Open your live Vercel URL `https://health-chatbot-app.vercel.app`.
   - Test user sign-up / login.
   - Test sending a chat prompt to the AI assistant.
   - Test uploading a medical report to confirm Supabase Storage file upload.

---

## 🎉 Congratulations!

Your full-stack **Health AI Assistant** is now completely live:
- ⚡ **Frontend**: Hosted globally on Vercel Edge.
- 🐍 **Backend**: Running on Render Native Python.
- 🗄️ **Database & Storage**: Powered by Supabase PostgreSQL & Storage.
