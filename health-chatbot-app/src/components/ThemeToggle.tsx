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
        if (theme === 'light') return <Sun className="w-5 h-5" />;
        return <Moon className="w-5 h-5" />;
    };

    const getLabel = () => {
        if (theme === 'light') return 'Light';
        return 'Dark';
    };

    if (compact) {
        return (
            <button
                onClick={cycleTheme}
                className="p-2 rounded-lg transition-all duration-200 
                    text-gray-500 dark:text-gray-400 
                    hover:bg-gray-100 dark:hover:bg-white/5
                    hover:text-gray-900 dark:hover:text-white"
                title={`Theme: ${getLabel()}`}
            >
                {getIcon()}
            </button>
        );
    }

    return (
        <button
            onClick={cycleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 
                text-gray-600 dark:text-gray-400 
                hover:bg-gray-50 dark:hover:bg-white/5 
                hover:text-gray-900 dark:hover:text-white"
        >
            {getIcon()}
            <span>{getLabel()} Mode</span>
        </button>
    );
}
