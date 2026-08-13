'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import {
    MessageSquare, Send, Plus, MoreVertical, Search,
    Mic, Bot, User as UserIcon, Trash2, Sparkles, Square, Volume2, AlertCircle, Loader2, Check, ChevronDown
} from 'lucide-react';
import { AnalyticsService } from '@/lib/analytics';
import MessageRenderer from '@/components/MessageRenderer';
import { apiClient } from '@/lib/api-client';

// ... (skipping unchanged lines)



interface Message {
    role: 'user' | 'assistant';
    content: string;
    originalContent?: string; // For restoring after translation
    timestamp: number;
    $id?: string;
}

interface ChatSession {
    $id: string; // Appwrite ID
    title: string;
    messages: Message[];
    userId: string;
    createdAt: string;
}

export default function RegionalChatPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [language, setLanguage] = useState('en-in');
    const [isRecording, setIsRecording] = useState(false);
    const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const router = useRouter();

    // Load sessions from Appwrite
    useEffect(() => {
        if (!user) return;

        const fetchSessions = async () => {
            try {
                const response = await apiClient.getSessions();
                
                if (response.success && response.sessions) {
                    const loadedSessions = response.sessions.map((doc: any) => ({
                        $id: doc.id || doc.session_id || doc.$id,
                        title: doc.title,
                        messages: typeof doc.messages === 'string' ? JSON.parse(doc.messages) : doc.messages,
                        userId: doc.user_id || doc.userId,
                        createdAt: doc.created_at || doc.createdAt
                    }));

                    setSessions(loadedSessions);

                    if (loadedSessions.length > 0) {
                        setCurrentSessionId(loadedSessions[0].$id);
                    } else {
                        createNewSession();
                    }
                } else {
                    createNewSession();
                }
            } catch (err: any) {
                console.error("Failed to load sessions from API", err);
                if (sessions.length === 0) createNewSession();
            }
        };
        fetchSessions();
    }, [user]);

    // Translation Logic
    const translateChatSession = async (targetLang: string) => {
        if (!currentSessionId) return;

        const session = sessions.find(s => s.$id === currentSessionId);
        if (!session) return;

        if (targetLang === 'en-in') {
            const restoredMessages = session.messages.map(msg => ({
                ...msg,
                content: msg.originalContent || msg.content
            }));

            setSessions(prev => prev.map(s =>
                s.$id === currentSessionId ? { ...s, messages: restoredMessages } : s
            ));
            return;
        }

        const messagesToTranslate = session.messages.map(msg => msg.originalContent || msg.content);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

        try {
            const response = await fetch(`${apiUrl}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: messagesToTranslate, target_lang: targetLang.split('-')[0] })
            });

            if (!response.ok) throw new Error('Translation failed');

            const data = await response.json();
            const translatedTexts = data.translated_texts;

            const updatedMessages = session.messages.map((msg, idx) => ({
                ...msg,
                originalContent: msg.originalContent || msg.content,
                content: translatedTexts[idx] || msg.content
            }));

            setSessions(prev => prev.map(s =>
                s.$id === currentSessionId ? { ...s, messages: updatedMessages } : s
            ));

        } catch (err) {
            console.error("Translation error", err);
            setError("Failed to translate chat");
        }
    };

    useEffect(() => {
        if (currentSessionId && language) {
            translateChatSession(language);
        }
    }, [language, currentSessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sessions, currentSessionId]);

    const getAppwriteLanguage = (code: string) => {
        // Appwrite Enum only supports specific values. Map our codes to them.
        // Current allowed: (English, Spanish, French, German, Chinese)
        const map: Record<string, string> = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'zh': 'Chinese'
        };
        const mainCode = code.split('-')[0];
        return map[mainCode] || 'English'; // Fallback to English to prevent crash
    };

    const createNewSession = async () => {
        const newTitle = t('regional.new_chat');
        const initialMessages = [{
            role: 'assistant',
            content: t('regional.welcome.subtitle'),
            timestamp: Date.now()
        }];

        try {
            const response = await apiClient.createSession(newTitle, initialMessages);
            if (response.success && response.sessionId) {
                const newSession: ChatSession = {
                    $id: response.sessionId,
                    title: newTitle,
                    messages: initialMessages as any,
                    userId: user?.uid || '',
                    createdAt: new Date().toISOString(),
                };

                setSessions(prev => [newSession, ...prev]);
                setCurrentSessionId(response.sessionId);
            }
        } catch (error: any) {
            console.error("Failed to create session via API", error);
            setError(`Failed to create session in API: ${error.message || 'Unknown error'}`);
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

        if (user) {
            try {
                await apiClient.deleteSession(sessionId);
            } catch (error) {
                console.error("Failed to delete session via API", error);
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await handleAudioUpload(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop mic
            };

            mediaRecorder.start();
            setIsRecording(true);
            setError(null);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            setError('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleAudioUpload = async (audioBlob: Blob) => {
        setSending(true);
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('language', language);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

        try {
            const response = await fetch(`${apiUrl}/speech/stt`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to transcribe audio');

            const data = await response.json();
            if (data.text) {
                setInput(data.text);
            }
        } catch (err: any) {
            setError('Failed to process speech: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const playTextToSpeech = async (text: string, index: number) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';
        try {
            setPlayingMessageIndex(index);
            const response = await fetch(`${apiUrl}/speech/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language }),
            });

            if (!response.ok) throw new Error('Failed to generate speech');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => setPlayingMessageIndex(null);
            audio.play();
        } catch (err) {
            console.error('TTS Error:', err);
            setPlayingMessageIndex(null);
        }
    };


    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user || !currentSessionId) return;

        const userMessageContent = input.trim();
        setInput('');
        setSending(true);
        setError(null);

        // Track messages locally to ensure valid history for DB/AI
        let sessionToUpdate = sessions.find(s => s.$id === currentSessionId);
        if (!sessionToUpdate) return;

        // 1. Add User Message Locally
        const userMessage: Message = { role: 'user', content: userMessageContent, timestamp: Date.now() };
        let currentMessages = [...sessionToUpdate.messages, userMessage];

        // Optimistically update UI
        setSessions(prev => prev.map(s =>
            s.$id === currentSessionId ? { ...s, messages: currentMessages } : s
        ));

        // 2. Sync User Message to API
        try {
            const newTitle = currentMessages.length <= 2 ? userMessageContent.slice(0, 30) + (userMessageContent.length > 30 ? '...' : '') : undefined;
            await apiClient.updateSession(currentSessionId, newTitle, currentMessages);
        } catch (error: any) {
            console.error("Failed to sync user message to API", error);
            // Continue anyway to get AI response
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

        try {
            const response = await fetch(`${apiUrl}/chat/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: userMessageContent,
                    mode: 'rag',
                    history: currentMessages.map(m => ({ role: m.role, content: m.content }))
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get response: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // 3. Prepare AI Message
            let content = data.message;
            if (data.chart_data) {
                content += `\n\n\`\`\`json\n${JSON.stringify({ type: 'chart', data: data.chart_data }, null, 2)}\n\`\`\``;
            }

            const aiMessage: Message = { role: 'assistant', content: content, timestamp: Date.now() };

            // 4. Update Local History with AI Message
            currentMessages = [...currentMessages, aiMessage];

            // Update UI
            setSessions(prev => prev.map(s =>
                s.$id === currentSessionId ? { ...s, messages: currentMessages } : s
            ));

            // 5. Sync AI Message to API
            try {
                await apiClient.updateSession(currentSessionId, undefined, currentMessages);
            } catch (error: any) {
                console.error("Failed to sync AI message to API", error);
                setError(`Failed to save AI response: ${error.message || 'Unknown API error'}`);
            }

        } catch (error: any) {
            console.error('Failed to send message:', error);
            const errorMessageContent = error.message === 'Failed to fetch'
                ? `Error: Could not connect to the backend server at ${apiUrl}. Please ensure the backend is running.`
                : 'Sorry, I encountered an error: ' + (error.message || 'Unknown error');

            const errorMessage: Message = { role: 'assistant', content: errorMessageContent, timestamp: Date.now() };

            // Show error in UI
            setSessions(prev => prev.map(s =>
                s.$id === currentSessionId ? { ...s, messages: [...s.messages, errorMessage] } : s
            ));
        } finally {
            setSending(false);
        }
    };

    if (authLoading) return null;
    if (!user) {
        router.push('/login');
        return null;
    }

    const currentSession = sessions.find(s => s.$id === currentSessionId);

    // Filter valid languages for dropdown
    const languages = [
        { code: 'en-IN', name: 'English', flag: '🇬🇧' },
        { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
        { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳' },
        { code: 'te-IN', name: 'Telugu', flag: '🇮🇳' },
        { code: 'bn-IN', name: 'Bengali', flag: '🇮🇳' },
        { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳' },
        { code: 'ml-IN', name: 'Malayalam', flag: '🇮🇳' },
        { code: 'mr-IN', name: 'Marathi', flag: '🇮🇳' },
        { code: 'gu-IN', name: 'Gujarati', flag: '🇮🇳' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#080c14] font-sans text-foreground selection:bg-teal-500/30 transition-colors duration-500">
            <Sidebar />
            <main className="lg:pl-64 w-full flex h-full relative overflow-hidden bg-grid-pattern">
                {/* Visual effect removed based on user feedback */}

                {/* Left: Recent Chats List */}
                <div className="w-80 border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f172a]/50 backdrop-blur-xl hidden xl:flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 dark:text-white tracking-tight">{t('regional.sidebar_title')}</h2>
                        <button onClick={createNewSession} className="p-2 bg-gradient-to-r from-teal-500 to-electric-blue text-white rounded-lg hover:opacity-90 transition-colors shadow-lg shadow-teal-500/20">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('regional.search_placeholder')}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {sessions.map(session => (
                            <div
                                key={session.$id}
                                onClick={() => setCurrentSessionId(session.$id)}
                                className={`
                                    group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent
                                    ${currentSessionId === session.$id
                                        ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border-slate-200 dark:border-white/5'
                                        : 'hover:bg-white/60 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.$id ? 'text-teal-500 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate text-sm font-medium">{session.title}</span>
                                        <span className="text-[10px] opacity-60 truncate">
                                            {session.messages.length > 0 ? session.messages[session.messages.length - 1].content : t('regional.new_chat')}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => deleteSession(e, session.$id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Active Chat */}
                <div className="flex-1 flex flex-col bg-transparent relative">
                    {/* Chat Header */}
                    <header className="border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-electric-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20 border border-white/10">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 dark:text-white tracking-tight">{currentSession?.title || t('regional.header.title')}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('regional.header.subtitle')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="appearance-none pl-4 pr-10 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-teal-500/50 outline-none hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.code} className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white">
                                            {lang.flag} {lang.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                        {currentSession?.messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-full">
                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-500 to-electric-blue flex items-center justify-center mb-6 shadow-lg shadow-teal-500/25 animate-float">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3 tracking-tight">{t('regional.welcome.title')}</h2>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed text-center">
                                    {t('regional.welcome.subtitle')}
                                </p>
                            </div>
                        ) : (
                            currentSession?.messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 bg-gradient-to-tr from-teal-500 to-electric-blue rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-lg border border-white/10">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="flex flex-col max-w-[85%] lg:max-w-[70%]">
                                        <div
                                            className={`
                                                relative group rounded-2xl px-5 py-3.5 shadow-md break-words overflow-hidden
                                                ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
                                            `}
                                        >
                                            {msg.role === 'assistant' ? (
                                                <MessageRenderer content={msg.content} />
                                            ) : (
                                                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                                            )}

                                            {/* TTS Button */}
                                            {msg.role === 'assistant' && (
                                                <button
                                                    onClick={() => playTextToSpeech(msg.content, index)}
                                                    className={`absolute -right-10 top-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ${playingMessageIndex === index ? 'text-teal-500 animate-pulse' : 'text-slate-400 hover:text-teal-500'
                                                        }`}
                                                    title="Read aloud"
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1.5 px-1 self-end font-mono">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 bg-slate-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0 mt-1 overflow-hidden border border-slate-200 dark:border-white/10">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon className="w-4 h-4" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {sending && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-gradient-to-tr from-teal-500 to-electric-blue rounded-lg flex items-center justify-center text-white flex-shrink-0 border border-white/10">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="chat-bubble-ai">
                                    <div className="flex space-x-1.5">
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex justify-center">
                                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/5">
                        <div className="max-w-3xl mx-auto">
                            <form onSubmit={handleSend} className="glass-card p-2.5 flex items-center">
                                <div className="flex-1 flex items-center">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isRecording ? t('regional.input.listening') : t('regional.input.placeholder')}
                                        className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0 text-sm py-3 px-3"
                                        disabled={sending}
                                    />
                                    <button
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`p-2 rounded-full transition-all ${isRecording
                                            ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse'
                                            : 'text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                            }`}
                                        title={isRecording ? "Stop recording" : "Start recording"}
                                    >
                                        {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!input.trim() || sending}
                                    className={`p-2.5 ml-2 rounded-xl transition-all duration-200 ${input.trim()
                                        ? 'btn-gradient-primary text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30'
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>
                            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                                {t('regional.disclaimer')}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
