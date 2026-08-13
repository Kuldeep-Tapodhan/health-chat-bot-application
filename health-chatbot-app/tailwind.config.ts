import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'selector',
    theme: {
        extend: {
            colors: {
                // Dark mode primary colors
                'void': {
                    DEFAULT: '#000000',
                    50: '#0a0a0a',
                    100: '#121212',
                    200: '#1a1a1a',
                    300: '#262626',
                },
                // Accent colors
                'accent': {
                    blue: '#60a5fa',
                    purple: '#a78bfa',
                    cyan: '#22d3ee',
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "gradient-accent": "linear-gradient(135deg, #10b981 0%, #6366f1 100%)",
                "gradient-emerald": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                "gradient-indigo": "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                "gradient-dark": "linear-gradient(180deg, #0b0f19 0%, #111827 100%)",
                "glow-conic": "conic-gradient(from 180deg at 50% 50%, #10b98133 0deg, #6366f133 180deg, #10b98133 360deg)",
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'fade-in-up': 'fadeInUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow-pulse 3s ease-in-out infinite',
                'gradient': 'gradient-shift 8s ease infinite',
                'spin-slow': 'spin 8s linear infinite',
                'shimmer': 'shimmer 2s ease-in-out infinite',
                'spotlight': 'spotlight 2s ease .75s 1 forwards',
                'meteor': 'meteor 5s linear infinite',
            },
            keyframes: {
                spotlight: {
                    '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
                    '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
                },
                meteor: {
                    '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
                    '70%': { opacity: '1' },
                    '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: '0' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'glow-pulse': {
                    '0%, 100%': { opacity: '0.5' },
                    '50%': { opacity: '1' },
                },
                'gradient-shift': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
            },
            boxShadow: {
                'glow-blue': '0 0 60px rgba(96, 165, 250, 0.3)',
                'glow-purple': '0 0 60px rgba(167, 139, 250, 0.3)',
                'glow-sm': '0 0 20px rgba(96, 165, 250, 0.2)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
            },
            borderColor: {
                'glass': 'rgba(255, 255, 255, 0.08)',
            },
            backgroundColor: {
                'glass': 'rgba(255, 255, 255, 0.03)',
                'glass-hover': 'rgba(255, 255, 255, 0.06)',
            },
        },
    },
    plugins: [],
};
export default config;
