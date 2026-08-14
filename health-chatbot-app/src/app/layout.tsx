import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LanguageProvider } from "@/contexts/LanguageContext";
import OnboardingModal from "@/components/OnboardingModal";
import ToastProvider from "@/components/ui/ToastProvider";
import { KeyboardShortcutsProvider } from "@/components/ui/KeyboardShortcuts";
import { AccessibilityProvider } from "@/components/ui/AccessibilityProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: {
    default: "Health AI Assistant - Your Personal Medical Chatbot",
    template: "%s | Health AI"
  },
  description: "Get instant answers to health questions, analyze medical reports, and find nearby hospitals. Powered by advanced AI for accurate, personalized health guidance.",
  keywords: ["health chatbot", "AI medical assistant", "symptom checker", "medical report analysis", "find hospitals", "health AI"],
  authors: [{ name: "Health AI Team" }],
  creator: "Health AI",
  publisher: "Health AI",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://health-ai.app",
    siteName: "Health AI Assistant",
    title: "Health AI - Your Personal Medical Assistant",
    description: "AI-powered health companion for instant medical guidance, report analysis, and hospital discovery.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Health AI Assistant"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Health AI - Your Personal Medical Assistant",
    description: "Get instant answers to health questions with AI-powered guidance.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <Providers>
          <AccessibilityProvider>
            <KeyboardShortcutsProvider>
              <LanguageProvider>
                {children}
                <OnboardingModal />
                <ToastProvider />
              </LanguageProvider>
            </KeyboardShortcutsProvider>
          </AccessibilityProvider>
        </Providers>
      </body>
    </html>
  );
}
