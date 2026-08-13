'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
    return (
        <Toaster
            position="bottom-right"
            toastOptions={{
                duration: 4000,
                style: {
                    background: 'var(--toast-bg, #1e293b)',
                    color: 'var(--toast-color, #f1f5f9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(10px)',
                },
                success: {
                    iconTheme: {
                        primary: '#14b8a6',
                        secondary: '#ffffff',
                    },
                    style: {
                        border: '1px solid rgba(20, 184, 166, 0.3)',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#ffffff',
                    },
                    style: {
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                    },
                },
                loading: {
                    iconTheme: {
                        primary: '#3b82f6',
                        secondary: '#ffffff',
                    },
                },
            }}
        />
    );
}
