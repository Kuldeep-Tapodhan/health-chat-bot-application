'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Activity, MessageCircle, FileSearch, MapPin, Shield, Sparkles, Check, Zap, Heart } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  const features = [
    {
      icon: MessageCircle,
      title: 'AI Health Chat',
      description: 'Get instant answers to your health questions from our advanced AI assistant.'
    },
    {
      icon: FileSearch,
      title: 'Report Analysis',
      description: 'Upload lab reports and receive detailed, easy-to-understand interpretations.'
    },
    {
      icon: MapPin,
      title: 'Find Care',
      description: 'Discover hospitals and specialists near you when you need professional help.'
    },
    {
      icon: Shield,
      title: 'Private & Secure',
      description: 'Your health data is encrypted and never shared with third parties.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-medical bg-grid-pattern relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-1/2 w-[450px] h-[450px] bg-teal-500/15 dark:bg-teal-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Navigation - Glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="max-w-7xl mx-auto glass rounded-2xl px-6 py-4 flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all duration-500 group-hover:scale-110">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-slate-800 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Health AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-10">
              <Link href="#features" className="text-[15px] font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300">Features</Link>
              <Link href="#how-it-works" className="text-[15px] font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300">How it works</Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="border-r border-slate-200 dark:border-slate-700 pr-4 mr-2 hidden sm:block">
                <ThemeToggle compact={true} />
              </div>
              <Link href="/login" className="hidden sm:block text-[15px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300 px-2 whitespace-nowrap">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary text-sm py-2.5 px-6 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Powered by Advanced AI</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up animation-delay-100 text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-slate-900 dark:text-white">Your Personal</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 bg-clip-text text-transparent">
              Health Assistant
            </span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Instant answers to your health questions, detailed report analysis, and hospital location services enabled by advanced AI.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in-up animation-delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/chat" className="btn-primary w-auto !px-4 flex items-center gap-2 group">
              Start Chatting
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link href="/reports" className="btn-secondary flex items-center gap-2">
              Analyze Report
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="animate-fade-in-up animation-delay-400 mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400">
            {[
              { icon: Check, text: 'Free to use' },
              { icon: Zap, text: 'Instant results' },
              { icon: Shield, text: '100% Private' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group cursor-default">
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="font-medium group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-300">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="animate-fade-in-up text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Everything you need for better health
            </h2>
            <p className="animate-fade-in-up animation-delay-100 text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Comprehensive tools to help you understand and manage your health journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="animate-fade-in-up glass-card rounded-2xl p-6 card-hover"
                style={{ animationDelay: `${(idx + 2) * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white mb-5 shadow-lg shadow-teal-500/25 group-hover:scale-110 transition-all duration-500">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Three simple steps to understand your health better.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-teal-500/20 via-teal-500/40 to-teal-500/20" />

            {[
              { step: '01', title: 'Describe Symptoms', desc: 'Chat with our AI about how you are feeling or upload a medical report.' },
              { step: '02', title: 'Instant Analysis', desc: 'Our advanced algorithms analyze your data to identify potential health issues.' },
              { step: '03', title: 'Get Guidance', desc: 'Receive immediate advice and find nearby hospitals for professional care.' }
            ].map((item, idx) => (
              <div key={idx} className="relative glass-card rounded-2xl p-8 card-hover text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/25">
                  <span className="text-white font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative glass-card rounded-3xl p-12 md:p-16 text-center overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600/5 to-cyan-600/5" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900 dark:to-cyan-900 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-md">
                      <Heart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                  ))}
                </div>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Ready to take control of your health?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg max-w-xl mx-auto">
                Join thousands of users who trust Health AI for their health-related questions.
              </p>
              <Link href="/signup" className="btn-primary w-auto !px-4 inline-flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800 dark:text-white">Health AI</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2024 Health AI Assistant. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
