'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setIsTransitioning(true);
        setProgress(35);

        const timer1 = setTimeout(() => setProgress(75), 80);
        const timer2 = setTimeout(() => setProgress(100), 220);
        const timer3 = setTimeout(() => {
            setIsTransitioning(false);
            setProgress(0);
        }, 380);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [pathname]);

    return (
        <>
            {/* Top Glowing Page Progress Bar */}
            {isTransitioning && (
                <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-rose-400 shadow-[0_0_12px_#fb7185] transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Page Entry Content Wrapper */}
            <div key={pathname} className="animate-page-entry min-h-screen">
                {children}
            </div>
        </>
    );
}
