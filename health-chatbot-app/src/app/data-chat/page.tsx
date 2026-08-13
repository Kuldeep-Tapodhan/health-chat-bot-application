"use client";

import React, { useState } from 'react';
import ChartRenderer from '@/components/ChartRenderer';

export default function DataChatPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8001/api/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input }),
            });

            const data = await response.json();

            const botMessage = {
                role: 'bot',
                content: data.message,
                chartData: data.chart_data
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages((prev) => [...prev, { role: 'bot', content: "Sorry, something went wrong." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const [files, setFiles] = useState<any[]>([]);

    React.useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8001/api/ingest/files');
            const data = await res.json();
            setFiles(data);
        } catch (error) {
            console.error("Error fetching files:", error);
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-black">
            {/* Sidebar for Files */}
            <div className="w-64 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/10 p-4 hidden md:block overflow-y-auto">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Documents</h2>
                {files.length === 0 ? (
                    <p className="text-sm text-neutral-500">No files uploaded.</p>
                ) : (
                    <ul className="space-y-2">
                        {files.map((file, idx) => (
                            <li key={idx} className="p-2 bg-white dark:bg-neutral-800 rounded text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/5 truncate" title={file.name}>
                                📄 {file.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex-1 flex flex-col p-6">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Data-Aware Chatbot</h1>
                    <p className="text-neutral-500 dark:text-neutral-400">Ask questions about your documents or request charts from your data.</p>
                </header>

                <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-2xl p-4 rounded-lg shadow-sm ${msg.role === 'user'
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                                    : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-white/10'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>

                                {msg.chartData && (
                                    <div className="mt-4 w-full h-64 bg-neutral-50 dark:bg-neutral-900 rounded p-2">
                                        <ChartRenderer data={msg.chartData} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 p-4 rounded-lg animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={sendMessage} className="flex gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or request a chart (e.g., 'Show sales trend')..."
                        className="flex-1 p-4 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-white/20 shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 shadow-sm transition-colors"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
