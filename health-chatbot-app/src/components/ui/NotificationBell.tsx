'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, MessageSquare, FileText, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'chat' | 'report';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
}

// Mock notifications for demonstration
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'chat',
        title: 'New AI Response',
        message: 'Your health query has been answered.',
        timestamp: Date.now() - 5 * 60000,
        read: false,
    },
    {
        id: '2',
        type: 'report',
        title: 'Report Analyzed',
        message: 'Your lab report analysis is ready.',
        timestamp: Date.now() - 30 * 60000,
        read: false,
    },
    {
        id: '3',
        type: 'success',
        title: 'Profile Updated',
        message: 'Your settings have been saved.',
        timestamp: Date.now() - 2 * 3600000,
        read: true,
    },
];

const typeIcons = {
    info: AlertCircle,
    success: Check,
    warning: AlertCircle,
    chat: MessageSquare,
    report: FileText,
};

const typeColors = {
    info: 'text-blue-500 bg-blue-500/10',
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    chat: 'text-teal-500 bg-teal-500/10',
    report: 'text-purple-500 bg-purple-500/10',
};

function formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-xl z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            Notifications
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No notifications yet
                                </p>
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const Icon = typeIcons[notification.type];
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={cn(
                                            'p-4 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors',
                                            !notification.read && 'bg-teal-50/50 dark:bg-teal-500/5'
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', typeColors[notification.type])}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {formatTime(notification.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-200 dark:border-white/5">
                            <button
                                onClick={clearAll}
                                className="w-full py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
