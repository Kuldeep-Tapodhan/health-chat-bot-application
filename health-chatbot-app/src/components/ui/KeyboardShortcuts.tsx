'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { X, MessageSquare, FileText, MapPin, Search, Command } from 'lucide-react';

interface KeyboardShortcutsContextType {
    isCommandOpen: boolean;
    openCommand: () => void;
    closeCommand: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export function useKeyboardShortcuts() {
    const context = useContext(KeyboardShortcutsContext);
    if (!context) {
        throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
    }
    return context;
}

interface KeyboardShortcutsProviderProps {
    children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const router = useRouter();

    const openCommand = useCallback(() => setIsCommandOpen(true), []);
    const closeCommand = useCallback(() => setIsCommandOpen(false), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open command palette
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandOpen(prev => !prev);
            }

            // ESC to close modals
            if (e.key === 'Escape') {
                setIsCommandOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const quickActions = [
        { label: 'Start AI Chat', icon: MessageSquare, href: '/chat', shortcut: 'C' },
        { label: 'Analyze Report', icon: FileText, href: '/reports', shortcut: 'R' },
        { label: 'Find Hospitals', icon: MapPin, href: '/hospitals', shortcut: 'H' },
    ];

    const handleAction = (href: string) => {
        router.push(href);
        closeCommand();
    };

    return (
        <KeyboardShortcutsContext.Provider value={{ isCommandOpen, openCommand, closeCommand }}>
            {children}

            {/* Command Palette Modal */}
            {isCommandOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
                    onClick={closeCommand}
                >
                    <div
                        className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-in-up"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-white/10">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 outline-none text-lg"
                                autoFocus
                            />
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md text-xs text-slate-500 dark:text-slate-400">
                                ESC
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Quick Actions
                            </div>
                            {quickActions.map((action) => (
                                <button
                                    key={action.href}
                                    onClick={() => handleAction(action.href)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <action.icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {action.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md text-xs text-slate-500 dark:text-slate-400">
                                        <Command className="w-3 h-3" />
                                        {action.shortcut}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded">↑</kbd>
                                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded">↓</kbd>
                                    to navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded">↵</kbd>
                                    to select
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </KeyboardShortcutsContext.Provider>
    );
}

// Keyboard hint badge component
export function KeyboardHint({ keys }: { keys: string[] }) {
    return (
        <div className="hidden sm:flex items-center gap-0.5">
            {keys.map((key, i) => (
                <kbd
                    key={i}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[10px] text-slate-500 dark:text-slate-400 font-mono"
                >
                    {key}
                </kbd>
            ))}
        </div>
    );
}
