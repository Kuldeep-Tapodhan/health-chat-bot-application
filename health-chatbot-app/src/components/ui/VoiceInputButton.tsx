'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
    onTranscript: (text: string) => void;
    onRecordingStart?: () => void;
    onRecordingEnd?: () => void;
    disabled?: boolean;
    language?: string;
    className?: string;
    autoSubmit?: boolean;
}

export default function VoiceInputButton({
    onTranscript,
    onRecordingStart,
    onRecordingEnd,
    disabled = false,
    language = 'en-IN',
    className,
    autoSubmit = true,
}: VoiceInputButtonProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Initialize Web Speech API
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = language;

                recognitionRef.current.onresult = (event: any) => {
                    const lastResult = event.results[event.results.length - 1];
                    const transcript = lastResult[0].transcript;

                    if (lastResult.isFinal) {
                        setIsProcessing(false);
                        setIsRecording(false);
                        onTranscript(transcript);
                        onRecordingEnd?.();
                    }
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsRecording(false);
                    setIsProcessing(false);
                    onRecordingEnd?.();
                };

                recognitionRef.current.onend = () => {
                    setIsRecording(false);
                    setIsProcessing(false);
                };
            }
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
        };
    }, [language, onTranscript, onRecordingEnd]);

    const startRecording = () => {
        if (!recognitionRef.current || disabled) return;

        try {
            recognitionRef.current.lang = language;
            recognitionRef.current.start();
            setIsRecording(true);
            setIsProcessing(false);
            onRecordingStart?.();

            // Auto-stop after 30 seconds
            timeoutRef.current = setTimeout(() => {
                stopRecording();
            }, 30000);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const stopRecording = () => {
        if (!recognitionRef.current) return;

        try {
            recognitionRef.current.stop();
            setIsProcessing(true);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // Check if browser supports speech recognition
    const isSupported = typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!isSupported) {
        return null; // Don't render if not supported
    }

    return (
        <button
            type="button"
            onClick={toggleRecording}
            disabled={disabled || isProcessing}
            className={cn(
                'relative p-3 rounded-xl transition-all duration-300',
                isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-500/30 text-white'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
        >
            {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
                <>
                    <Square className="w-5 h-5 fill-current" />
                    {/* Pulse animation rings */}
                    <span className="absolute inset-0 rounded-xl bg-red-500 animate-ping opacity-25" />
                </>
            ) : (
                <Mic className="w-5 h-5" />
            )}
        </button>
    );
}
