'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api-client';
import { AnalyticsService } from '@/lib/analytics';
import Sidebar from '@/components/Sidebar';
import Tesseract from 'tesseract.js';

import {
    Upload, FileText, Activity, Calendar, User as UserIcon,
    Download, Scan, Lock, ArrowRight, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';


export default function ReportsPage() {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [textInput, setTextInput] = useState('');
    const [inputType, setInputType] = useState<'file' | 'text'>('file');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [processingStep, setProcessingStep] = useState<'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete'>('idle');
    const [progress, setProgress] = useState(0);
    const router = useRouter();

    // History State
    const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
    const [pastReports, setPastReports] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Fetch History when tab changes to 'history'
    useEffect(() => {
        if (activeTab === 'history' && user) {
            fetchHistory();
        }
    }, [activeTab, user]);

    const fetchHistory = async () => {
        if (!user) return;
        setLoadingHistory(true);
        try {
            const response = await apiClient.getReports(user.uid);
            if (response.success) {
                setPastReports(response.reports);
            }
        } catch (err) {
            console.error("Failed to fetch reports:", err);
            // Don't show generic error to user immediately, might just be empty or setup issue
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setAnalysis(null);
            setProcessingStep('idle');
            setProgress(0);
        }
    };

    const simulateProgress = (start: number, end: number, duration: number) => {
        return new Promise<void>(resolve => {
            const stepTime = 50;
            const steps = duration / stepTime;
            const increment = (end - start) / steps;
            let current = start;
            let count = 0;

            const timer = setInterval(() => {
                current += increment;
                count++;
                setProgress(Math.min(current, end));
                if (count >= steps) {
                    clearInterval(timer);
                    resolve();
                }
            }, stepTime);
        });
    };

    const handleAnalyze = async () => {
        if ((inputType === 'file' && !file) || (inputType === 'text' && !textInput.trim()) || !user) return;

        setProcessingStep('uploading');
        setProgress(0);
        setError(null);

        try {
            let downloadURL = '';
            let contentToAnalyze = inputType === 'text' ? textInput : undefined;

            // 1. Upload File (if applicable)
            if (inputType === 'file' && file) {
                await simulateProgress(0, 15, 1000); // Upload fake progress

                // 2. OCR if Image
                if (file.type.startsWith('image/')) {
                    setProcessingStep('scanning'); // Helper UI text: "Scanning..."
                    await simulateProgress(15, 30, 500);

                    console.log("Starting Frontend OCR...");
                    const result = await Tesseract.recognize(
                        file,
                        'eng', // Default to English, could make dynamic
                        {
                            logger: m => {
                                if (m.status === 'recognizing text') {
                                    setProgress(30 + (m.progress * 40)); // Map 0-1 to 30-70%
                                }
                            }
                        }
                    );

                    contentToAnalyze = result.data.text;
                    console.log("OCR Complete:", contentToAnalyze.substring(0, 100) + "...");

                    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
                        throw new Error("Could not read any text from this image. Please ensure the image is clear.");
                    }

                    // We will send 'text' to backend instead of 'file'
                }
            } else {
                await simulateProgress(0, 30, 500);
            }

            setProcessingStep('analyzing');
            if (inputType === 'file' && !file?.type.startsWith('image/')) {
                await simulateProgress(30, 60, 1500); // Standard progress for PDF/Server side
            } else {
                setProgress(70); // Already at 70% from OCR
            }

            await simulateProgress(Math.max(progress, 70), 90, 2000);

            const token = "user-token-placeholder"; // Auth token logic could be improved

            // Determine what to send to API
            // If we extracted text (OCR) or user typed text, send 'text'.
            // If it's a PDF, send 'file'.

            const apiPayload: any = {};
            if (contentToAnalyze) {
                apiPayload.text = contentToAnalyze;
            } else if (inputType === 'file' && file) {
                apiPayload.file = file;
            }

            const response = await apiClient.analyzeReport(apiPayload, token);

            if (response.success && response.analysis) {
                setAnalysis(response.analysis);

                // Save Result to DB via API
                try {
                    await apiClient.saveReport({
                        user_id: user.uid,
                        title: file ? file.name : (contentToAnalyze?.slice(0, 30) + '...' || 'Text Analysis'),
                        analysis: response.analysis
                    });
                } catch (dbError: any) {
                    console.error("Failed to save report to history", dbError);
                    setError("Analysis complete, but failed to save to history.");
                }

            } else {
                throw new Error(response.error || 'Failed to analyze report');
            }

            setProcessingStep('complete');
            setProgress(100);

            if (user) {
                AnalyticsService.logEvent('Report Uploaded', user.displayName || user.email || 'User', 'info');
                AnalyticsService.incrementStat('totalReports');
            }

        } catch (err: any) {
            console.error('Error processing report:', err);
            setError(err.message || 'Failed to process report. Please try again.');
            setProcessingStep('idle');
            setProgress(0);
        }
    };

    const downloadPDF = async () => {
        if (!analysis) return;

        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // --- HEADER ---
            pdf.setFontSize(22);
            pdf.setTextColor(41, 37, 36);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Medical Analysis Report", 15, 20);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Generated by Health AI Assistant • ${new Date().toLocaleDateString()}`, 15, 28);

            pdf.setDrawColor(220, 220, 220);
            pdf.setLineWidth(0.5);
            pdf.line(15, 33, 195, 33);

            // --- CONTENT PARSER ---
            let y = 45;
            const lineHeight = 6;

            // Clean Text Logic (Aggressive)
            const cleanText = (text: string) => {
                return text
                    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII
                    .replace(/\*\*/g, "")         // Remove bold markers
                    .replace(/\*/g, "")           // Remove italic markers
                    .replace(/`/g, "")            // Remove code markers
                    .trim();
            };

            const rawContent = analysis || '';
            const lines = rawContent.split('\n');

            pdf.setFontSize(11);
            pdf.setTextColor(20, 20, 20);

            lines.forEach((line) => {
                let text = line.trim();

                // Check Page Break
                if (y > 275) {
                    pdf.addPage();
                    y = 20;
                }

                if (!text) {
                    y += 3;
                    return;
                }

                // 1. Headers
                if (text.startsWith('#') || text.startsWith('Ø')) {
                    const cleanedHeader = cleanText(text.replace(/^[#Ø=Ü¡Ê>Þz]+\s*/, ''));
                    if (cleanedHeader.length < 2) return;

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(14);
                    pdf.setTextColor(0, 102, 204);

                    y += 8;
                    pdf.text(cleanedHeader, 15, y);
                    y += 8;

                    // Reset
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(11);
                    pdf.setTextColor(30, 30, 30);
                }
                // 2. Table Rows
                else if (text.includes('|') && text.length > 5) {
                    // Skip separator lines
                    if (text.match(/[-]{3,}/)) return;

                    const cols = text.split('|').map(c => cleanText(c)).filter(c => c);
                    if (cols.length === 0) return;

                    let xOffset = 15;

                    // Dynamic layout based on col count
                    const colWidths = cols.length === 2 ? [85, 85] : [50, 30, 40, 50];

                    pdf.setFont('courier', 'normal');
                    pdf.setFontSize(10);

                    cols.forEach((col, i) => {
                        const width = colWidths[i] || 40;
                        const safeText = col.substring(0, width / 2.5); // Estimate char fit
                        pdf.text(safeText, xOffset, y);
                        xOffset += width;
                    });

                    y += 6;

                    // Reset
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(11);
                }
                // 3. Bullet Points
                else if (text.startsWith('•') || text.startsWith('-') || text.match(/^\d+\./)) {
                    const cleanItem = cleanText(text.replace(/^[•\-\d\.]+\s*/, ''));
                    pdf.text(`• ${cleanItem}`, 20, y);
                    y += lineHeight;
                }
                // 4. Regular Text
                else {
                    const cleanLine = cleanText(text);
                    const splitText = pdf.splitTextToSize(cleanLine, 180);
                    pdf.text(splitText, 15, y);
                    y += (splitText.length * lineHeight);
                }
            });

            // --- FOOTER ---
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(9);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
            }

            pdf.save(`medical-report-${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (err) {
            console.error("PDF generation failed:", err);
            setError("Failed to generate PDF. Please try again.");
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] font-sans text-foreground transition-colors duration-500">
            <Sidebar />

            <main className="lg:pl-64 min-h-screen relative overflow-hidden bg-grid-pattern">
                {/* Header */}
                <header className="px-6 lg:px-8 py-5 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 sticky top-0 z-20">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                <FileText className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                {t('reports.title')}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('reports.subtitle')}</p>
                        </div>
                        {/* Tab Switcher */}
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('new')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'new'
                                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                New Analysis
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                History
                            </button>
                        </div>
                    </div>
                </header>

                <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-8">

                    {activeTab === 'new' ? (
                        <>
                            {processingStep === 'complete' && analysis ? (
                                // Result View
                                <div className="glass-card stat-card-purple p-0 overflow-hidden">
                                    {/* Action Bar */}
                                    <div className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5 p-4 flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-slate-800 dark:text-white px-2">Analysis Result</h2>
                                        <button
                                            onClick={downloadPDF}
                                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors shadow-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download PDF
                                        </button>
                                    </div>

                                    <div className="p-6 lg:p-8 space-y-8 relative">
                                        <div className="max-w-none" ref={reportRef}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-white/10" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mt-6 mb-3 flex items-center gap-2" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 mt-4 mb-2" {...props} />,
                                                    p: ({ node, ...props }) => <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 mb-4 ml-2" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 mb-4 ml-2" {...props} />,
                                                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-800 dark:text-white bg-slate-100 dark:bg-white/5 px-1 py-0.5 rounded" {...props} />,
                                                    blockquote: ({ node, ...props }) => (
                                                        <blockquote className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-500/10 p-4 my-4 rounded-r-lg">
                                                            <p className="text-amber-700 dark:text-amber-200 m-0 font-medium italic">{props.children}</p>
                                                        </blockquote>
                                                    ),
                                                    table: ({ node, ...props }) => (
                                                        <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                                                            <table className="w-full text-left text-sm" {...props} />
                                                        </div>
                                                    ),
                                                    thead: ({ node, ...props }) => <thead className="bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 font-semibold" {...props} />,
                                                    tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-transparent" {...props} />,
                                                    tr: ({ node, ...props }) => <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" {...props} />,
                                                    th: ({ node, ...props }) => <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400" {...props} />,
                                                    td: ({ node, ...props }) => <td className="px-4 py-3 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/5 last:border-r-0" {...props} />,
                                                    code: ({ node, ...props }) => <code className="bg-slate-100 dark:bg-black/30 px-1.5 py-0.5 rounded text-pink-500 dark:text-pink-400 font-mono text-sm" {...props} />,
                                                }}
                                            >
                                                {typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Hidden Print Version (White Background for PDF) */}
                                        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: 'white', padding: '40px', color: 'black', zIndex: -1 }} ref={printRef}>
                                            <div className="mb-6 border-b border-gray-200 pb-4">
                                                <h1 className="text-3xl font-bold text-gray-900">Medical Analysis Report</h1>
                                                <p className="text-sm text-gray-500 mt-2">Generated by Health AI Assistant • {new Date().toLocaleDateString()}</p>
                                            </div>
                                            <div className="prose max-w-none text-gray-900">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}
                                                </ReactMarkdown>
                                            </div>
                                            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                                                <p>Disclaimer: This is an AI-generated analysis. Please consult a doctor for a definitive diagnosis.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-4 p-6 border-t border-slate-200 dark:border-white/5 mx-6 lg:mx-8">
                                        <button onClick={() => router.push('/chat')} className="flex-1 btn-gradient-primary text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30">
                                            <span className="flex items-center justify-center gap-2">Follow-up in Chat <ArrowRight className="w-4 h-4" /></span>
                                        </button>
                                        <button onClick={() => { setAnalysis(null); setProcessingStep('idle'); }} className="flex-1 py-3 bg-white dark:bg-white/5 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/10 rounded-xl">
                                            Analyze Another
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Upload View
                                <div className="glass-card stat-card-purple p-8 lg:p-16 text-center max-w-3xl mx-auto backdrop-blur-md">
                                    {processingStep === 'idle' ? (
                                        <div>
                                            {/* Input Type Toggle */}
                                            <div className="flex justify-center mb-10">
                                                <div className="bg-slate-100 dark:bg-white/5 p-1.5 inline-flex rounded-2xl border border-slate-200 dark:border-white/5">
                                                    <button
                                                        onClick={() => setInputType('file')}
                                                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${inputType === 'file' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                                    >
                                                        <span>{t('reports.upload.toggle.file')}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setInputType('text')}
                                                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${inputType === 'text' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                                    >
                                                        <span>{t('reports.upload.toggle.text')}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {inputType === 'file' ? (
                                                <div className="max-w-lg mx-auto">
                                                    <label
                                                        htmlFor="file-upload"
                                                        className="flex flex-col items-center justify-center w-full h-64 
                                                            border-2 border-dashed border-slate-300 dark:border-white/10 
                                                            rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]
                                                            hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-white/[0.05]
                                                            transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                                                                <Upload className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                                                            </div>
                                                            <p className="mb-2 text-lg font-medium text-slate-800 dark:text-white">
                                                                {t('reports.upload.dropzone.main')}
                                                            </p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('reports.upload.dropzone.sub')}</p>
                                                        </div>
                                                        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg,.txt,.csv" />
                                                    </label>
                                                    {file && (
                                                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 py-2.5 px-6 rounded-xl shadow-sm">
                                                            <FileText className="w-4 h-4" />
                                                            {file.name}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="max-w-lg mx-auto">
                                                    <textarea
                                                        value={textInput}
                                                        onChange={(e) => setTextInput(e.target.value)}
                                                        placeholder={t('reports.upload.text_placeholder')}
                                                        className="w-full h-64 p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all font-mono text-sm resize-none"
                                                    ></textarea>
                                                </div>
                                            )}

                                            <div className="mt-10">
                                                <button
                                                    onClick={handleAnalyze}
                                                    disabled={inputType === 'file' ? !file : !textInput.trim()}
                                                    className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                                                >
                                                    <span>{t('reports.upload.analyze_button')}</span>
                                                </button>
                                                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                                    <Lock className="w-3 h-3" />
                                                    {t('reports.upload.security')}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Processing State
                                        <div className="py-12">
                                            <div className="relative w-24 h-24 mx-auto mb-8">
                                                <div className="absolute inset-0 border-4 border-slate-100 dark:border-white/5 rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-purple-500 dark:border-purple-400 rounded-full border-t-transparent animate-spin"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Scan className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                                {processingStep === 'uploading' && t('reports.processing.uploading')}
                                                {processingStep === 'scanning' && t('reports.processing.scanning')}
                                                {processingStep === 'analyzing' && t('reports.processing.analyzing')}
                                            </h3>
                                            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                                                {t('reports.processing.subtitle')}
                                            </p>
                                            <div className="w-64 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full mx-auto overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 rounded-full"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        // History Tab
                        <div className="space-y-4">
                            {loadingHistory ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400">Loading your past reports...</p>
                                </div>
                            ) : pastReports.length === 0 ? (
                                <div className="text-center py-16 bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Reports Found</h3>
                                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                                        You haven't analyzed any reports yet. Upload a medical report to get started.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('new')}
                                        className="text-purple-600 dark:text-purple-400 font-medium hover:underline"
                                    >
                                        Analyze your first report
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {pastReports.map((report) => (
                                        <div
                                            key={report.id || report.$id}
                                            onClick={() => {
                                                setAnalysis(report.analysis);
                                                setActiveTab('new');
                                                setProcessingStep('complete');
                                            }}
                                            className="group relative bg-white dark:bg-[#0f172a]/40 p-5 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/5"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                                                            {report.title}
                                                        </h3>
                                                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                                            <span className="flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {new Date(report.timestamp).toLocaleDateString()}
                                                            </span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
                                                            <span className="uppercase text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10">
                                                                {report.type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400 p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                                                        View Analysis
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400">
                            <Activity className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
