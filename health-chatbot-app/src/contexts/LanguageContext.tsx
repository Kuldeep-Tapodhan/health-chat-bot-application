'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { translations, Language, TranslationKey } from '@/lib/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [language, setLanguageState] = useState<Language>('en-US');

    // Load language from user preferences or local storage
    useEffect(() => {
        if (user?.prefs?.language) {
            setLanguageState(user.prefs.language as Language);
        } else {
            const storedLang = localStorage.getItem('health-ai-lang') as Language;
            if (storedLang && translations[storedLang]) {
                setLanguageState(storedLang);
            }
        }
    }, [user]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('health-ai-lang', lang);
        // Note: We don't automatically save to database here to avoid too many API calls.
        // It should be saved explicitly when the user changes it in settings or onboarding.
    };

    const t = (key: TranslationKey): string => {
        const langData = translations[language] || translations['en-US'];
        return (langData as any)[key] || (translations['en-US'] as any)[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
