'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme') as Theme;
        const initialTheme: Theme = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
        setTheme(initialTheme);
        setResolvedTheme(initialTheme);

        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(initialTheme);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        setResolvedTheme(theme);
        localStorage.setItem('theme', theme);
    }, [theme, mounted]);

    // Removed the forced dark mode effect to prevent overriding user preference


    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        // Return a default value during SSR instead of throwing - defaulting to light
        return {
            theme: 'light' as Theme,
            setTheme: () => { },
            resolvedTheme: 'light' as const
        };
    }
    return context;
}
