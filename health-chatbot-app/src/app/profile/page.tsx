'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations, Language } from '@/lib/translations';
import { useRouter } from 'next/navigation';
import { User, Moon, Sun, Save, Loader2, Camera, Globe, Check, Palette, Eye, Zap } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api-client';
import { useAccessibility } from '@/components/ui/AccessibilityProvider';

export default function ProfilePage() {
    const { user, loading: authLoading, updatePreferences } = useAuth();
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const { highContrast, toggleHighContrast, reducedMotion, toggleReducedMotion } = useAccessibility();
    const router = useRouter();

    const [displayName, setDisplayName] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>('en-US');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            setDisplayName(user.displayName || '');
            setSelectedLang(language);
        }
    }, [user, authLoading, router, language]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setMessage('');

        try {
            let changesMade = false;

            // Update Display Name
            if (displayName !== user.displayName) {
                await apiClient.updateProfile(displayName);
                changesMade = true;
            }

            // Update Language Preference
            if (selectedLang !== user.prefs?.language) {
                await updatePreferences({ language: selectedLang });
                setLanguage(selectedLang); // Update context immediately
                changesMade = true;
            }

            if (changesMade) {
                setMessage(t('settings.success'));
            } else {
                setMessage(t('settings.no_changes'));
            }
        } catch (error: any) {
            console.error('Update profile error:', error);
            setMessage(error.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };



    if (authLoading) return null;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] font-sans text-foreground transition-colors duration-500">
            <Sidebar />

            <main className="lg:pl-64 min-h-screen relative overflow-hidden bg-grid-pattern">
                {/* Header */}
                <header className="px-6 lg:px-8 py-5 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 sticky top-0 z-20">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                            <User className="w-5 h-5 text-teal-500 dark:text-teal-400" />
                            {t('settings.title')}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account settings and preferences</p>
                    </div>
                </header>

                <div className="max-w-3xl mx-auto p-6 lg:p-8 space-y-6">
                    {/* Profile Card */}
                    <div className="glass-card overflow-hidden">
                        {/* Profile Header with Gradient */}
                        <div className="p-8 border-b border-slate-200 dark:border-white/5 bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-purple-500/10 dark:from-teal-600/20 dark:via-blue-600/20 dark:to-purple-600/20 relative">
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="relative group">
                                    <div className="w-24 h-24 bg-slate-200 dark:bg-neutral-800 rounded-full flex items-center justify-center text-slate-700 dark:text-white text-4xl font-bold shadow-lg overflow-hidden border-4 border-white dark:border-white/10">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                                        ) : (
                                            user.displayName ? user.displayName[0].toUpperCase() : <User className="w-12 h-12" />
                                        )}
                                    </div>
                                    </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user.displayName || 'User'}</h2>
                                    <p className="text-slate-500 dark:text-neutral-400">{user.email}</p>
                                    <span className="inline-block px-3 py-1 mt-2 rounded-full bg-teal-50 dark:bg-teal-500/10 text-xs font-semibold text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20 capitalize">
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Personal Info */}
                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-slate-400" />
                                    {t('settings.personal_info')}
                                </h3>
                                <div className="grid gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-neutral-400 mb-2">
                                            {t('settings.display_name')}
                                        </label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="block w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-colors outline-none"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-neutral-400 mb-2">
                                            {t('settings.email')}
                                        </label>
                                        <input
                                            type="email"
                                            value={user.email || ''}
                                            disabled
                                            className="block w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-400 dark:text-neutral-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Language Settings */}
                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-slate-400" />
                                    {t('settings.language')}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.keys(translations).map((langKey) => (
                                        <button
                                            key={langKey}
                                            onClick={() => setSelectedLang(langKey as Language)}
                                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${selectedLang === langKey
                                                ? 'bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/20'
                                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4" />
                                                {t(`lang.${langKey}` as any)}
                                            </div>
                                            {selectedLang === langKey && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Appearance */}
                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-slate-400" />
                                    {t('settings.appearance')}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`p-5 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'light'
                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-lg shadow-teal-500/10'
                                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-full ${theme === 'light' ? 'bg-teal-100 dark:bg-teal-500/20' : 'bg-slate-100 dark:bg-white/10'}`}>
                                            <Sun className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-semibold">{t('settings.theme.light')}</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`p-5 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'dark'
                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-lg shadow-teal-500/10'
                                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-teal-100 dark:bg-teal-500/20' : 'bg-slate-100 dark:bg-white/10'}`}>
                                            <Moon className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-semibold">{t('settings.theme.dark')}</span>
                                    </button>
                                </div>
                            </section>

                            {/* Accessibility */}
                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-slate-400" />
                                    Accessibility
                                </h3>
                                <div className="space-y-4">
                                    {/* High Contrast Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${highContrast ? 'bg-teal-100 dark:bg-teal-500/20' : 'bg-slate-100 dark:bg-white/10'}`}>
                                                <Eye className={`w-5 h-5 ${highContrast ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'}`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">High Contrast Mode</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Increase color contrast for better visibility</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleHighContrast}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${highContrast ? 'bg-teal-500' : 'bg-slate-300 dark:bg-white/20'}`}
                                            role="switch"
                                            aria-checked={highContrast}
                                            aria-label="Toggle high contrast mode"
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${highContrast ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {/* Reduced Motion Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${reducedMotion ? 'bg-teal-100 dark:bg-teal-500/20' : 'bg-slate-100 dark:bg-white/10'}`}>
                                                <Zap className={`w-5 h-5 ${reducedMotion ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'}`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">Reduced Motion</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Minimize animations and transitions</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleReducedMotion}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${reducedMotion ? 'bg-teal-500' : 'bg-slate-300 dark:bg-white/20'}`}
                                            role="switch"
                                            aria-checked={reducedMotion}
                                            aria-label="Toggle reduced motion"
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${reducedMotion ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Save Button */}
                            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-white/5">
                                <p className={`text-sm font-medium ${message.includes('success') || message.includes('Success') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {message}
                                </p>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    ) : (
                                        <Save className="w-5 h-5 mr-2" />
                                    )}
                                    {t('settings.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
