'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient, API_BASE_URL } from '@/lib/api-client';
import Sidebar from '@/components/Sidebar';
import { Send, Bot, User, Sparkles, Plus, Trash2, MessageSquare, Mic, Square, Volume2, Globe, ChevronDown, Check, Clock, Stethoscope, Heart, Brain, FileText } from 'lucide-react';
import MessageRenderer from '@/components/MessageRenderer';
import toast from 'react-hot-toast';
import { SkeletonChatMessage } from '@/components/ui/Skeleton';

// Helper function for relative time
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

// Helper to check if two timestamps are on different days
function isDifferentDay(ts1: number, ts2: number): boolean {
    const d1 = new Date(ts1).toDateString();
    const d2 = new Date(ts2).toDateString();
    return d1 !== d2;
}

function formatDateSeparator(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}



const INDIAN_LANGUAGES = [
    { code: 'en-IN', name: 'English', native: 'English' },
    { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
    { code: 'mr-IN', name: 'Marathi', native: 'मराठी' },
    { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
    { code: 'bn-IN', name: 'Bengali', native: 'বাংলা' },
    { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
];

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface ChatSession {
    $id: string;
    title: string;
    messages: Message[];
    userId: string;
    createdAt: string;
}

export default function ChatPage() {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Audio & Translation State
    const [chatLanguage, setChatLanguage] = useState('en-IN');
    const [isRecording, setIsRecording] = useState(false);
    const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [translatedContent, setTranslatedContent] = useState<Record<number, string>>({});
    const [isTranslating, setIsTranslating] = useState(false);

    // Dynamic Thinking Steps
    const [thinkingStepIndex, setThinkingStepIndex] = useState(0);
    const thinkingSteps = [
        "AI is thinking...",
        "Analyzing medical context...",
        "Retrieving health knowledge...",
        "Formatting clinical guidance..."
    ];

    useEffect(() => {
        if (!isTyping) {
            setThinkingStepIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setThinkingStepIndex(prev => (prev + 1) % thinkingSteps.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [isTyping]);

    const handleReportFollowUpContext = async (context: { title: string; analysis: string; timestamp?: string }) => {
        if (!user) return;

        const reportTitle = `Report: ${context.title || 'Medical Analysis'}`;
        const formattedPrompt = `I would like to follow up on my medical report.\n\n### Report Context (${context.title})\n\n${context.analysis}\n\n---\nPlease review this report, summarize key findings and potential concerns, and offer follow-up guidance or answers to any questions I might have.`;

        const tempSessionId = `temp-${Date.now()}`;
        const userMsg: Message = {
            role: 'user',
            content: formattedPrompt,
            timestamp: Date.now()
        };

        const initialSession: ChatSession = {
            $id: tempSessionId,
            title: reportTitle,
            messages: [userMsg],
            userId: user.uid,
            createdAt: new Date().toISOString()
        };

        // Instantly update UI so user sees session and message right away
        setSessions(prev => [initialSession, ...(prev || []).filter(s => s.$id !== tempSessionId)]);
        setCurrentSessionId(tempSessionId);
        setIsTyping(true);

        try {
            const createRes = await apiClient.createSession(reportTitle, [userMsg]);
            const realSessionId = (createRes.success && createRes.sessionId) ? createRes.sessionId : tempSessionId;

            if (realSessionId !== tempSessionId) {
                setCurrentSessionId(realSessionId);
                setSessions(prev => (prev || []).map(s => s.$id === tempSessionId ? { ...s, $id: realSessionId } : s));
            }

            // Stream AI response
            const response = await fetch(`${API_BASE_URL}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                },
                body: JSON.stringify({
                    message: formattedPrompt,
                    history: []
                }),
            });

            if (!response.ok) throw new Error(`AI Error: ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let aiResponseContent = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    aiResponseContent += chunk;
                }
            }

            const aiMsg: Message = {
                role: 'assistant',
                content: aiResponseContent,
                timestamp: Date.now()
            };

            const finalMessages = [userMsg, aiMsg];
            setSessions(prev => (prev || []).map(s => s.$id === realSessionId || s.$id === tempSessionId ? { ...s, $id: realSessionId, messages: finalMessages } : s));
            await apiClient.updateSession(realSessionId, reportTitle, finalMessages);

        } catch (error: any) {
            console.error("Error creating report follow-up session", error);
            toast.error("Could not send report to AI assistant");
        } finally {
            setIsTyping(false);
        }
    };

    // Load sessions from API on mount
    useEffect(() => {
        if (!user) return;

        const fetchSessions = async () => {
            let loadedSessions: ChatSession[] = [];
            try {
                const response = await apiClient.getSessions();
                if (response.success && response.sessions) {
                    // API returns sessions in {id, title, messages, ...}
                    loadedSessions = response.sessions.map((doc: any) => {
                        let parsedMessages = [];
                        if (typeof doc.messages === 'string') {
                            try {
                                parsedMessages = JSON.parse(doc.messages) || [];
                            } catch (e) {
                                parsedMessages = [];
                            }
                        } else if (Array.isArray(doc.messages)) {
                            parsedMessages = doc.messages;
                        }
                        return {
                            $id: doc.id || doc.session_id || doc.$id,
                            title: doc.title || 'New Chat',
                            messages: Array.isArray(parsedMessages) ? parsedMessages : [],
                            userId: doc.user_id || doc.userId,
                            createdAt: doc.created_at || doc.createdAt
                        };
                    });

                    setSessions(loadedSessions);
                }
            } catch (err: any) {
                console.error("Failed to load sessions from API", err);
            }

            // Check for pending report context from localStorage or sessionStorage
            let pendingContextRaw = null;
            if (typeof window !== 'undefined') {
                pendingContextRaw = localStorage.getItem('pending_report_context') || sessionStorage.getItem('pending_report_context');
                localStorage.removeItem('pending_report_context');
                sessionStorage.removeItem('pending_report_context');
            }

            if (pendingContextRaw) {
                try {
                    const pendingContext = JSON.parse(pendingContextRaw);
                    await handleReportFollowUpContext(pendingContext);
                    return;
                } catch (e) {
                    console.error("Failed to parse pending report context", e);
                }
            }

            if (loadedSessions.length > 0) {
                setCurrentSessionId(loadedSessions[0].$id);
            } else {
                createNewSession();
            }
        };

        fetchSessions();
    }, [user]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sessions, currentSessionId, translatedContent]);

    // Cleanup audio URL on unmount if needed (not strictly used here but good practice)
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && isRecording) {
                stopRecording();
            }
        };
    }, [isRecording]);

    // Translate messages when language changes or session changes
    useEffect(() => {
        if (!currentSessionId || chatLanguage === 'en-IN') {
            setTranslatedContent({}); // Reset if English
            return;
        }

        const currentSession = (sessions || []).find(s => s.$id === currentSessionId);
        if (currentSession && Array.isArray(currentSession.messages) && currentSession.messages.length > 0) {
            translateAllMessages(currentSession.messages);
        }
    }, [currentSessionId, chatLanguage]);

    const translateAllMessages = async (messages: Message[]) => {
        setIsTranslating(true);
        const textsToTranslate = messages.map(m => m.content);

        try {
            const response = await fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: textsToTranslate, target_lang: chatLanguage.split('-')[0] })
            });

            if (!response.ok) throw new Error('Translation failed');

            const data = await response.json();
            const translations = data.translated_texts;

            const newTranslations: Record<number, string> = {};
            translations.forEach((text: string, idx: number) => {
                newTranslations[idx] = text;
            });

            setTranslatedContent(newTranslations);
        } catch (err) {
            console.error("Translation error:", err);
            // Don't show global error for translation failure, just log it
        } finally {
            setIsTranslating(false);
        }
    };

    const createNewSession = async () => {
        if (!user) return;

        const newTitle = t('chat.new_chat');

        try {
            const response = await apiClient.createSession(newTitle, []);
            if (response.success && response.sessionId) {
                const newSession: ChatSession = {
                    $id: response.sessionId,
                    title: newTitle,
                    messages: [],
                    userId: user.uid,
                    createdAt: new Date().toISOString(),
                };

                setSessions(prev => [newSession, ...prev]);
                setCurrentSessionId(response.sessionId);
                setTranslatedContent({});
            }
        } catch (error: any) {
            console.error("Failed to create session via API", error);
            setError(`Failed to create chat session: ${error.message || 'Unknown API error'}`);
        }
    };

    const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const newSessions = sessions.filter(s => s.$id !== sessionId);
        setSessions(newSessions);

        if (currentSessionId === sessionId) {
            if (newSessions.length > 0) {
                setCurrentSessionId(newSessions[0].$id);
            } else {
                createNewSession();
            }
        }

        try {
            await apiClient.deleteSession(sessionId);
        } catch (error: any) {
            console.error("Failed to delete session via API", error);
            setError(`Failed to delete session: ${error.message || 'Unknown API error'}`);
        }
    };

    const playTextToSpeech = async (text: string, index: number) => {
        if (playingMessageIndex === index) {
            // Stop logic could be implemented if we stored the audio instance
            // For now, simple toggle isn't fully robust without ref, but let's just allow playing
            return;
        }

        try {
            setPlayingMessageIndex(index);
            const response = await fetch(`${API_BASE_URL}/speech/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language: chatLanguage }),
            });

            if (!response.ok) throw new Error('Text to speech failed');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => setPlayingMessageIndex(null);
            audio.play();
        } catch (err) {
            console.error('TTS Error:', err);
            setPlayingMessageIndex(null);
            setError('Failed to generate speech.');
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user || !currentSessionId) return;

        const userMessageContent = input.trim();
        setInput('');
        setIsTyping(true);
        setError(null);

        // Get current session snapshot
        const currentSession = (sessions || []).find(s => s.$id === currentSessionId);
        if (!currentSession) return;

        // 1. Add User Message Locally
        const userMessage: Message = { role: 'user', content: userMessageContent, timestamp: Date.now() };
        const initialMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
        let currentMessages = [...initialMessages, userMessage];

        // Optimistic UI Update
        setSessions(prev => (prev || []).map(s =>
            s.$id === currentSessionId ? { ...s, messages: currentMessages } : s
        ));

        // Update Title if it's the first message
        const isNewChat = currentMessages.length <= 1;
        const newTitle = isNewChat
            ? userMessageContent.slice(0, 30) + (userMessageContent.length > 30 ? '...' : '')
            : currentSession.title;

        // Sync to API (User Message)
        try {
            await apiClient.updateSession(currentSessionId, isNewChat ? newTitle : undefined, currentMessages);
        } catch (error: any) {
            console.error("Failed to sync user message", error);
        }

        // Pass previous history to backend stream API
        const historyForAi = initialMessages.map((m: Message) => ({
            role: m.role,
            content: m.content
        }));

        // Call Gemini via Backend API
        try {
            const response = await fetch(`${API_BASE_URL}/chat/stream`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                },
                body: JSON.stringify({ 
                    message: userMessageContent,
                    history: historyForAi
                }),
            });

            if (!response.ok) throw new Error(`AI Error: ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let aiResponseContent = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    aiResponseContent += chunk;
                }
            }

            const aiMessage: Message = { role: 'assistant', content: aiResponseContent, timestamp: Date.now() };

            // 2. Add AI Message Locally
            currentMessages = [...currentMessages, aiMessage];

            // Update UI
            setSessions(prev => prev.map(s =>
                s.$id === currentSessionId ? { ...s, messages: currentMessages } : s
            ));

            // Sync to API (AI Message)
            await apiClient.updateSession(currentSessionId, undefined, currentMessages);

            // Translate AI Response if needed
            if (chatLanguage !== 'en-IN') {
                translateMessage(aiResponseContent, currentMessages.length - 1);
            }

        } catch (error: any) {
            console.error('AI Error:', error);
            const errorMessageContent = `Error: ${error.message || 'Could not connect to AI'}`;
            const errorMessage: Message = { role: 'assistant', content: errorMessageContent, timestamp: Date.now() };

            setSessions(prev => (prev || []).map(s =>
                s.$id === currentSessionId ? { ...s, messages: [...(Array.isArray(s.messages) ? s.messages : []), errorMessage] } : s
            ));
            toast.error(error.message || 'Could not connect to AI');
        } finally {
            setIsTyping(false);
        }
    };

    // Helper to translate single message and update state
    const translateMessage = async (text: string, index: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: [text], target_lang: chatLanguage.split('-')[0] })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.translated_texts && data.translated_texts[0]) {
                    setTranslatedContent(prev => ({ ...prev, [index]: data.translated_texts[0] }));
                }
            }
        } catch (e) {
            console.error("Single msg translation failed", e);
        }
    };

    const startRecording = () => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            toast.error('Speech-to-text is not supported in this browser. Please type your message.');
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = chatLanguage || 'en-IN';

            recognition.onstart = () => {
                setIsRecording(true);
                toast.success('Listening... Speak your symptoms');
            };

            recognition.onresult = (event: any) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                if (transcript.trim()) {
                    setInput(prev => {
                        const base = prev.trim();
                        return base ? `${base} ${transcript.trim()}` : transcript.trim();
                    });
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
                if (event.error === 'not-allowed') {
                    toast.error('Microphone access denied. Please enable mic permissions in your browser.');
                }
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err: any) {
            console.error('Speech recognition error:', err);
            setIsRecording(false);
            toast.error('Could not start microphone');
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error(e);
            }
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const promptSuggestions = [
        t('chat.prompt.cold'),
        t('chat.prompt.sleep'),
        t('chat.prompt.bp')
    ];

    // Skeleton loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex transition-colors duration-500">
                <Sidebar />
                <main className="lg:pl-64 flex-1 flex h-screen bg-grid-pattern">
                    <div className="flex-1 flex flex-col">
                        <header className="px-6 py-4 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded animate-shimmer" />
                                    <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded animate-shimmer" />
                                </div>
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <SkeletonChatMessage />
                            <SkeletonChatMessage isUser />
                            <SkeletonChatMessage />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const currentSession = sessions.find(s => s.$id === currentSessionId);

    // Language Dropdown
    const LanguageSelector = () => (
        <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-sm transition-colors border border-slate-200 dark:border-white/10">
                <Globe className="w-3.5 h-3.5" />
                <span>{INDIAN_LANGUAGES.find(l => l.code === chatLanguage)?.name || 'English'}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 py-1 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl z-50 hidden group-hover:block">
                {INDIAN_LANGUAGES.map(lang => (
                    <button
                        key={lang.code}
                        onClick={() => setChatLanguage(lang.code)}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors
                            ${chatLanguage === lang.code ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300'}
                        `}
                    >
                        <span>{lang.name}</span>
                        {chatLanguage === lang.code && <Check className="w-3 h-3" />}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex transition-colors duration-500">
            <Sidebar />

            <main className="lg:pl-64 flex-1 flex h-screen bg-grid-pattern overflow-hidden">
                {/* Left: Chat Sessions List */}
                <div className="w-72 border-r border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#060d1b]/80 backdrop-blur-2xl hidden xl:flex flex-col">
                    <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-emerald-500" />
                            {t('chat.sidebar_title')}
                        </h2>
                        <button
                            onClick={createNewSession}
                            className="p-2 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all shadow-md shadow-emerald-500/25 active:scale-95"
                            title={t('chat.new_chat')}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {sessions.map(session => (
                            <div
                                key={session.$id}
                                onClick={() => setCurrentSessionId(session.$id)}
                                className={`
                                    group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200
                                    ${currentSessionId === session.$id
                                        ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 text-slate-900 dark:text-white border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)] font-semibold'
                                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'}
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.$id ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                    <span className="truncate text-sm font-medium">{session.title}</span>
                                </div>
                                <button
                                    onClick={(e) => deleteSession(e, session.$id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Active Chat */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <header className="px-6 py-4 bg-white/90 dark:bg-[#030712]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    {currentSession?.title || t('chat.header.title')}
                                    {currentSession?.title?.startsWith('Report:') && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                            <FileText className="w-3 h-3" />
                                            Report Context
                                        </span>
                                    )}
                                    {isTyping ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                                            <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                                            <span>AI Thinking...</span>
                                        </span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                                    )}
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('chat.header.subtitle')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <LanguageSelector />
                        </div>
                    </header>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Errors now shown via toast notifications */}

                        {(!currentSession || !Array.isArray(currentSession.messages) || currentSession.messages.length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-10">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30 animate-float ring-4 ring-emerald-500/20">
                                    <Sparkles className="w-12 h-12 text-white" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                                    {t('chat.welcome.title')}
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-base">
                                    {t('chat.welcome.subtitle')}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                                    {promptSuggestions.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setInput(prompt)}
                                            className="px-4 py-3.5 glass-card text-sm text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300 border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/15 hover:scale-[1.02] transition-all duration-300 font-medium text-left flex items-start justify-between"
                                        >
                                            <span>{prompt}</span>
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-500 opacity-60 flex-shrink-0 mt-0.5" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {(currentSession.messages || []).map((message, idx) => {
                                    const prevMessage = idx > 0 ? (currentSession.messages || [])[idx - 1] : undefined;
                                    const showDateSeparator = idx === 0 || (prevMessage && isDifferentDay(prevMessage.timestamp, message.timestamp));

                                    return (
                                        <div key={idx}>
                                            {showDateSeparator && (
                                                <div className="flex items-center justify-center my-6">
                                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200/60 dark:border-white/10">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                            {formatDateSeparator(message.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {message.role === 'assistant' && (
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-md">
                                                        <Bot className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <div className={`max-w-2xl px-6 py-4.5 break-words overflow-hidden ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                                                        {message.role === 'assistant' ? (
                                                            <MessageRenderer content={translatedContent[idx] || message.content} />
                                                        ) : (
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{translatedContent[idx] || message.content}</p>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-medium text-slate-400 mt-1.5 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                        {formatRelativeTime(message.timestamp)}
                                                    </span>
                                                </div>
                                                {/* TTS Button */}
                                                <button
                                                    onClick={() => playTextToSpeech(translatedContent[idx] || message.content, idx)}
                                                    className={`p-2 rounded-xl transition-all self-start ${playingMessageIndex === idx
                                                        ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-500/30'
                                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                                        }`}
                                                    title="Read aloud"
                                                    aria-label="Read message aloud"
                                                >
                                                    <Volume2 className={`w-4 h-4 ${playingMessageIndex === idx ? 'animate-pulse' : ''}`} />
                                                </button>

                                                {message.role === 'user' && (
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/20">
                                                        <User className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {isTyping && (
                                    <div className="flex gap-4 justify-start my-4">
                                        <div className="relative">
                                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-60 blur-sm animate-pulse" />
                                            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-emerald-500/30">
                                                <Bot className="w-5 h-5 text-white animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="chat-bubble-ai border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-indigo-500/5 backdrop-blur-md p-4 rounded-2xl max-w-md shadow-lg shadow-emerald-500/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                                                <span className="text-xs font-bold tracking-wide text-emerald-600 dark:text-emerald-400 transition-all duration-500">
                                                    {thinkingSteps[thinkingStepIndex]}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="typing-indicator">
                                                    <div className="typing-dot" />
                                                    <div className="typing-dot" />
                                                    <div className="typing-dot" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 opacity-60">
                                                <div className="h-2 w-48 bg-emerald-500/20 dark:bg-white/10 rounded animate-pulse" />
                                                <div className="h-2 w-32 bg-emerald-500/15 dark:bg-white/5 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-5 bg-white/90 dark:bg-[#030712]/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10">
                        <div className="max-w-4xl mx-auto flex gap-3 relative">
                            {/* Mic Button */}
                            <button
                                type="button"
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`p-3.5 rounded-xl transition-all duration-300 ${isRecording
                                    ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse text-white'
                                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/10'
                                    }`}
                                title={isRecording ? "Stop Recording" : "Start Recording"}
                            >
                                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                            </button>

                            <form onSubmit={handleSubmit} className="flex-1 flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={isRecording ? "Listening..." : t('chat.input.placeholder')}
                                    className="flex-1 input-glass font-medium text-base px-5"
                                    disabled={isTyping || isRecording}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="btn-gradient-primary rounded-xl px-6 py-3.5 flex items-center gap-2.5 font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-emerald-500/25"
                                >
                                    <span>{t('chat.send')}</span>
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
