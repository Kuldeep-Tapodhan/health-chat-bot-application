'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations, Language } from '@/lib/translations';
import { Sparkles, Check, Loader2, X } from 'lucide-react';

export default function OnboardingModal() {
    const { user, updatePreferences } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>('en-US');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user && !user.prefs?.onboardingCompleted) {
            setIsOpen(true);
            setName(user.displayName || '');
            if (user.prefs?.language) {
                setSelectedLang(user.prefs.language as Language);
            }
        } else {
            setIsOpen(false);
        }
    }, [user]);

    // ESC key to skip/close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            // Update language context immediately for feedback
            setLanguage(selectedLang);

            // Save to Appwrite
            await updatePreferences({
                language: selectedLang,
                onboardingCompleted: true
            });

            // Note: We might also want to update the display name if it changed
            // but AuthContext doesn't expose updateName directly, and profile page handles that.
            // For now, we assume this is just for preferences. 
            // If we want to update name, we'd need to call account.updateName(name) here too.

            setIsOpen(false);
        } catch (error) {
            console.error('Onboarding failed', error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 blur-[60px] rounded-full pointer-events-none" />

                <div className="p-8 relative z-10">
                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-1 rounded-full bg-indigo-500" />
                            <div className="w-8 h-1 rounded-full bg-indigo-500" />
                        </div>
                        <span className="text-xs text-neutral-500 ml-2">Step 1 of 1</span>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-white"
                        aria-label="Skip onboarding"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">
                        {t('onboarding.title')}
                    </h2>
                    <p className="text-center text-neutral-400 mb-8">
                        {t('onboarding.subtitle')}
                    </p>

                    <div className="space-y-6">
                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                {t('onboarding.name_label')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('onboarding.name_placeholder')}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            />
                        </div>

                        {/* Language Selection */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                {t('onboarding.language_label')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.keys(translations).map((langKey) => (
                                    <button
                                        key={langKey}
                                        onClick={() => setSelectedLang(langKey as Language)}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${selectedLang === langKey
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {t(`lang.${langKey}` as any)}
                                        {selectedLang === langKey && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!name.trim() || saving}
                            className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('onboarding.saving')}
                                </>
                            ) : (
                                t('onboarding.submit')
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
