import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { db } from './config';

// Types
export interface ChatSession {
    id?: string;
    userId: string;
    title: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    messageCount: number;
    lastMessage: string;
}

export interface Message {
    id?: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Timestamp;
    metadata?: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'user' | 'admin';
    createdAt: Timestamp;
    lastLogin: Timestamp;
}

// User Operations
export const createUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const newUser: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'User',
            photoURL: user.photoURL,
            role: 'user', // Default role
            createdAt: serverTimestamp() as Timestamp,
            lastLogin: serverTimestamp() as Timestamp
        };
        await setDoc(userRef, newUser);
        return newUser;
    } else {
        // Update last login
        await updateDoc(userRef, {
            lastLogin: serverTimestamp()
        });
        return userSnap.data() as UserProfile;
    }
};

export const getUserProfile = async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() as UserProfile : null;
};

// Chat Operations
export const createChatSession = async (userId: string, firstMessage: string) => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;

    const sessionData = {
        userId,
        title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
        lastMessage: ''
    };

    const docRef = await addDoc(collection(db, 'chat_sessions'), sessionData);
    return { id: docRef.id, ...sessionData };
};

export const getUserSessions = async (userId: string) => {
    const q = query(
        collection(db, 'chat_sessions'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addMessage = async (sessionId: string, role: 'user' | 'assistant', content: string, metadata: any = {}) => {
    const messageData = {
        sessionId,
        role,
        content,
        metadata,
        createdAt: serverTimestamp()
    };

    // Add message
    const msgRef = await addDoc(collection(db, 'messages'), messageData);

    // Update session
    const sessionRef = doc(db, 'chat_sessions', sessionId);
    await updateDoc(sessionRef, {
        lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        updatedAt: serverTimestamp(),
        // We'd ideally use increment() here but for simplicity:
        // messageCount: increment(1) 
    });

    return { id: msgRef.id, ...messageData };
};

export const getSessionMessages = async (sessionId: string) => {
    const q = query(
        collection(db, 'messages'),
        where('sessionId', '==', sessionId),
        orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Report Operations
export const saveReportAnalysis = async (userId: string, reportData: any) => {
    const data = {
        userId,
        ...reportData,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'reports'), data);
    return { id: docRef.id, ...data };
};

export const getUserReports = async (userId: string) => {
    const q = query(
        collection(db, 'reports'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
