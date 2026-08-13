'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Save, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AlertSubscriptionProps {
    userId: string;
    states: string[];
    onClose: () => void;
}

interface Subscription {
    states: string[];
    threshold: number;
    email: string;
    enabled: boolean;
}

export default function AlertSubscription({ userId, states, onClose }: AlertSubscriptionProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const [subscription, setSubscription] = useState<Subscription>({
        states: [],
        threshold: 10,
        email: '',
        enabled: true
    });

    // Fetch existing subscription
    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                const data = await apiClient.getAlerts(userId);

                if (data.subscriptions && data.subscriptions.length > 0) {
                    const sub = data.subscriptions[0];
                    setSubscription({
                        states: sub.states || [],
                        threshold: sub.threshold || 10,
                        email: sub.email || '',
                        enabled: sub.enabled ?? true
                    });
                }
            } catch (err) {
                console.error('Failed to fetch subscription:', err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchSubscription();
    }, [userId]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSaved(false);

        try {
            await apiClient.saveAlerts({
                userId,
                ...subscription
            });

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError('Failed to save preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const toggleState = (state: string) => {
        setSubscription(prev => ({
            ...prev,
            states: prev.states.includes(state)
                ? prev.states.filter(s => s !== state)
                : [...prev.states, state]
        }));
    };

    const selectAllStates = () => {
        setSubscription(prev => ({
            ...prev,
            states: prev.states.length === states.length ? [] : [...states]
        }));
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-600 dark:text-slate-400">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 dark:bg-teal-500/10 rounded-lg">
                            <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Outbreak Alerts
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Get notified about outbreaks
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            {subscription.enabled ? (
                                <Bell className="w-5 h-5 text-teal-500" />
                            ) : (
                                <BellOff className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="font-medium text-slate-900 dark:text-white">
                                {subscription.enabled ? 'Alerts Enabled' : 'Alerts Disabled'}
                            </span>
                        </div>
                        <button
                            onClick={() => setSubscription(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${subscription.enabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${subscription.enabled ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Threshold Setting */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <AlertTriangle className="w-4 h-4 inline mr-2" />
                            Alert when outbreaks exceed
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={subscription.threshold}
                                onChange={(e) => setSubscription(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                            />
                            <span className="w-16 text-center font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-3 py-1 rounded-lg">
                                {subscription.threshold}+
                            </span>
                        </div>
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email for Notifications (Optional)
                        </label>
                        <input
                            type="email"
                            value={subscription.email}
                            onChange={(e) => setSubscription(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* State Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Monitor States ({subscription.states.length} selected)
                            </label>
                            <button
                                onClick={selectAllStates}
                                className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                            >
                                {subscription.states.length === states.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                            {states.map(state => (
                                <button
                                    key={state}
                                    onClick={() => toggleState(state)}
                                    className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${subscription.states.includes(state)
                                        ? 'bg-teal-500 text-white'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {state}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    {error && (
                        <div className="mb-3 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {saved && (
                        <div className="mb-3 p-3 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Preferences saved successfully!
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Preferences
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
