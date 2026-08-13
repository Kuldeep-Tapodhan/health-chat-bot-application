# Health Chatbot Web Application - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Firebase account
- Google Maps API key (for hospital finder)
- AI model endpoint (BioMistral or OpenAI API key)

## Initial Setup

### 1. Create Next.js Project

```bash
npx create-next-app@latest health-chatbot-app --typescript --tailwind --app --eslint
cd health-chatbot-app
```

### 2. Install Dependencies

```bash
npm install firebase
npm install @react-google-maps/api
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react
npm install date-fns
npm install recharts  # For admin analytics charts
```

### 3. Setup Firebase Project (Detailed Steps)

1.  **Create Project**:
    *   Go to [Firebase Console](https://console.firebase.google.com/).
    *   Click **"Add project"**.
    *   Name it (e.g., "Health Chatbot") and disable Google Analytics for now (simpler setup).
    *   Click **"Create project"**.

2.  **Enable Authentication**:
    *   In the left sidebar, click **Build** -> **Authentication**.
    *   Click **"Get started"**.
    *   Select **"Sign-in method"** tab.
    *   Click **"Email/Password"** -> Enable -> Save.
    *   Click **"Add new provider"** -> **"Google"** -> Enable -> Set support email -> Save.

3.  **Create Firestore Database**:
    *   In the left sidebar, click **Build** -> **Firestore Database**.
    *   Click **"Create database"**.
    *   **IMPORTANT**: Ensure the Database ID is set to **`(default)`**. Do NOT change this or type a new name, as named databases require billing.
    *   Choose **"Start in test mode"** (easier for development).
    *   Click **Next**.
    *   **CRITICAL FOR FREE TIER**: When asked for a location, select **`nam5 (us-central)`** or **`us-central1`**.
    *   *Note: If it asks for billing, try creating a NEW project and ensure you select the "Spark" (Free) plan from the start.*
    *   Click **Enable**.

4.  **Enable Storage**:
    *   In the left sidebar, click **Build** -> **Storage**.
    *   Click **"Get started"**.
    *   Choose **"Start in test mode"**.
    *   Click **Next** -> **Done**.

5.  **Check Billing Plan (Spark vs Blaze)**:
    *   Look at the **bottom-left corner** of the Firebase Console sidebar.
    *   It should say **"Spark Plan"** (Free).
    *   If it says "Blaze Plan", click it and switch back to Spark (unless you intentionally want paid features).
    *   *Note: The free plan is sufficient for this project.*

6.  **Get API Keys**:
    *   Click the **Gear icon (⚙️)** next to "Project Overview" -> **Project settings**.
    *   Scroll down to the **"Your apps"** section.
    *   Click the **Web icon (</>)**.
    *   Register app (Nickname: "Web App").
    *   **Copy the `firebaseConfig` object values** (apiKey, authDomain, etc.).
    *   You will paste these into your `.env.local` file.

### 4. Configure Environment Variables

Create `.env.local` in the root directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Model Configuration
OPENAI_API_KEY=your_openai_key
# OR
AI_MODEL_ENDPOINT=http://localhost:5000/api/chat

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key

# WhatsApp (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 5. Initialize Firebase in Your App

Create `src/lib/firebase/config.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
```

### 6. Setup Firestore Security Rules

In Firebase Console, go to Firestore Database → Rules and paste the security rules from the implementation plan.

### 7. Create Initial Admin User

After first user signup, manually update their role in Firestore:

```javascript
// In Firestore Console
users/{userId}
{
  ...
  role: "admin"  // Change from "user" to "admin"
}
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure Overview

```
src/
├── app/                    # Next.js App Router pages
├── components/             # Reusable React components
├── lib/                    # Utilities and configurations
├── types/                  # TypeScript type definitions
└── contexts/               # React Context providers
```

## Key Implementation Files

### Authentication Context

`src/contexts/AuthContext.tsx` - Manages user authentication state globally

### Protected Routes

`src/middleware.ts` - Protects routes based on authentication and role

### API Routes

- `/api/chatbot` - AI chatbot endpoint
- `/api/reports/upload` - Medical report upload
- `/api/hospitals/nearby` - Hospital finder

## Next Steps

1. Implement authentication components
2. Create landing page
3. Build user dashboard
4. Build admin dashboard
5. Integrate AI chatbot
6. Add report analyzer
7. Implement hospital finder
8. Test and deploy

## Deployment

### Vercel (Recommended for Next.js)

```bash
npm install -g vercel
vercel
```

### Firebase Hosting

```bash
npm run build
firebase init hosting
firebase deploy
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
