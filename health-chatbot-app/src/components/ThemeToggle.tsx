'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else setTheme('light');
    };

    const getIcon = () => {
        if (theme === 'light') return <Sun className="w-5 h-5 text-amber-500" />;
        return <Moon className="w-5 h-5 text-teal-400" />;
    };

    const getLabel = () => {
        if (theme === 'light') return 'Light';
        return 'Dark';
    };

    if (compact) {
        return (
            <button
                onClick={cycleTheme}
                className="p-2.5 rounded-xl transition-all duration-200 
                    bg-slate-100 dark:bg-slate-800/80
                    border border-slate-200 dark:border-white/10
                    text-slate-700 dark:text-slate-300 
                    hover:bg-slate-200 dark:hover:bg-slate-700
                    hover:text-slate-900 dark:hover:text-white shadow-xs"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
                {getIcon()}
            </button>
        );
    }

    return (
        <button
            onClick={cycleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 
                text-slate-700 dark:text-slate-300 
                bg-slate-100/80 dark:bg-white/5
                border border-slate-200/80 dark:border-white/10
                hover:bg-slate-200/80 dark:hover:bg-white/10 
                hover:text-slate-900 dark:hover:text-white mb-2 shadow-xs cursor-pointer"
        >
            {getIcon()}
            <span className="font-semibold">{getLabel()} Mode</span>
        </button>
    );
}
