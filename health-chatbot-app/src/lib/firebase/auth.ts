// Authentication helper functions

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup,
    User,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

// Sign up with email and password
export const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile
    await updateProfile(user, { displayName });

    // Send verification email
    await sendEmailVerification(user);

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        role: 'user',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        settings: {
            defaultMaxTokens: 150,
            defaultTemperature: 0.7,
            defaultTopP: 0.9,
        },
        stats: {
            totalChats: 0,
            totalMessages: 0,
        },
    });

    return user;
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Update last active
    await setDoc(
        doc(db, 'users', userCredential.user.uid),
        { lastActive: serverTimestamp() },
        { merge: true }
    );

    return userCredential.user;
};

// Sign in with Google
export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
        // Create user document for new Google users
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'User',
            role: 'user',
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            settings: {
                defaultMaxTokens: 150,
                defaultTemperature: 0.7,
                defaultTopP: 0.9,
            },
            stats: {
                totalChats: 0,
                totalMessages: 0,
            },
        });
    } else {
        // Update last active
        await setDoc(
            doc(db, 'users', user.uid),
            { lastActive: serverTimestamp() },
            { merge: true }
        );
    }

    return user;
};

// Sign out
export const signOut = async () => {
    await firebaseSignOut(auth);
};

// Reset password
export const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
};

// Get user data from Firestore
export const getUserData = async (uid: string) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
};

// Check if user is admin
export const isAdmin = async (user: User | null): Promise<boolean> => {
    if (!user) return false;
    const userData = await getUserData(user.uid);
    return userData?.role === 'admin';
};
