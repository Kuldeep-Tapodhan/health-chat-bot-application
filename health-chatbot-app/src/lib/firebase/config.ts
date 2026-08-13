// Firebase configuration
// Replace these values with your actual Firebase project credentials

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCoY8ANLGRe-Q0NH_fxmdpKYB4p4oZvpw0",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "health-chatbot-2025.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "health-chatbot-2025",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "health-chatbot-2025.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "635542443306",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:635542443306:web:3d6bba249e1c50e423fa53"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
