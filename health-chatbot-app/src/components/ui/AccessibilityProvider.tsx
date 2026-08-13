'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AccessibilityContextType {
    highContrast: boolean;
    toggleHighContrast: () => void;
    reducedMotion: boolean;
    toggleReducedMotion: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within AccessibilityProvider');
    }
    return context;
}

interface AccessibilityProviderProps {
    children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
    const [highContrast, setHighContrast] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    // Load preferences from localStorage
    useEffect(() => {
        const savedHighContrast = localStorage.getItem('a11y-high-contrast');
        const savedReducedMotion = localStorage.getItem('a11y-reduced-motion');

        if (savedHighContrast === 'true') {
            setHighContrast(true);
            document.documentElement.classList.add('high-contrast');
        }

        if (savedReducedMotion === 'true') {
            setReducedMotion(true);
            document.documentElement.classList.add('reduced-motion');
        }

        // Also respect system preference for reduced motion
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches && savedReducedMotion === null) {
            setReducedMotion(true);
            document.documentElement.classList.add('reduced-motion');
        }
    }, []);

    const toggleHighContrast = useCallback(() => {
        setHighContrast(prev => {
            const newValue = !prev;
            localStorage.setItem('a11y-high-contrast', String(newValue));
            if (newValue) {
                document.documentElement.classList.add('high-contrast');
            } else {
                document.documentElement.classList.remove('high-contrast');
            }
            return newValue;
        });
    }, []);

    const toggleReducedMotion = useCallback(() => {
        setReducedMotion(prev => {
            const newValue = !prev;
            localStorage.setItem('a11y-reduced-motion', String(newValue));
            if (newValue) {
                document.documentElement.classList.add('reduced-motion');
            } else {
                document.documentElement.classList.remove('reduced-motion');
            }
            return newValue;
        });
    }, []);

    return (
        <AccessibilityContext.Provider value={{
            highContrast,
            toggleHighContrast,
            reducedMotion,
            toggleReducedMotion,
        }}>
            {children}
        </AccessibilityContext.Provider>
    );
}
