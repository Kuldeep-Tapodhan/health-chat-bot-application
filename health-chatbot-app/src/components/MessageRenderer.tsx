"use client";

import React from 'react';
import ChartRenderer from './ChartRenderer';

interface MessageRendererProps {
    content: string;
}

// Parse markdown content and render with charts support
const MessageRenderer: React.FC<MessageRendererProps> = ({ content }) => {
    // Split content by chart code blocks
    const parts = parseContent(content);

    return (
        <div className="message-content space-y-3 max-w-full break-words">
            {parts.map((part, index) => {
                if (part.type === 'chart') {
                    return <ChartRenderer key={index} data={part.data} />;
                }
                return <MarkdownText key={index} text={part.content || ''} />;
            })}
        </div>
    );
};

// Parse content to extract chart blocks and regular text
function parseContent(content: string): Array<{ type: 'text' | 'chart'; content?: string; data?: any }> {
    const parts: Array<{ type: 'text' | 'chart'; content?: string; data?: any }> = [];

    // Regex to match ```chart ... ``` or ```json ... ``` blocks
    const blockRegex = /```(chart|json)\s*([\s\S]*?)```/g;

    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(content)) !== null) {
        // Add text before the block
        if (match.index > lastIndex) {
            const textContent = content.slice(lastIndex, match.index).trim();
            if (textContent) {
                parts.push({ type: 'text', content: textContent });
            }
        }

        const blockType = match[1];
        const blockContent = match[2].trim();

        // Try to parse the JSON content
        try {
            const jsonContent = JSON.parse(blockContent);

            // Check if it's a chart definition
            // Either specifically ```chart``` block OR ```json``` block with type:"chart"
            if (blockType === 'chart' || (blockType === 'json' && jsonContent.type === 'chart')) {
                if (jsonContent.data) {
                    parts.push({ type: 'chart', data: jsonContent });
                } else {
                    // Fallback for valid JSON but invalid chart structure
                    parts.push({ type: 'text', content: '```' + blockType + '\n' + blockContent + '\n```' });
                }
            } else {
                // Regular JSON block, render as text
                parts.push({ type: 'text', content: '```' + blockType + '\n' + blockContent + '\n```' });
            }
        } catch (e) {
            // JSON parse error, show as code block
            parts.push({ type: 'text', content: '```' + blockType + '\n' + blockContent + '\n```' });
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last chart block
    if (lastIndex < content.length) {
        const textContent = content.slice(lastIndex).trim();
        if (textContent) {
            parts.push({ type: 'text', content: textContent });
        }
    }

    // If no parts found, return the whole content as text
    if (parts.length === 0 && content.trim()) {
        parts.push({ type: 'text', content: content });
    }

    return parts;
}

// Simple markdown text renderer
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
    return (
        <div
            className="prose prose-invert prose-sm max-w-none
                       prose-headings:text-white prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                       prose-p:text-slate-300 prose-p:leading-relaxed
                       prose-strong:text-white prose-strong:font-semibold
                       prose-ul:text-slate-300 prose-ol:text-slate-300
                       prose-li:marker:text-teal-400
                       prose-code:text-teal-300 prose-code:bg-slate-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                       prose-pre:bg-slate-800/50 prose-pre:border prose-pre:border-white/10"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }}
        />
    );
};

// Simple markdown parser
function parseMarkdown(text: string): string {
    let html = text;

    // Escape HTML entities first (except for our generated HTML)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Code blocks (non-chart)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Tables
    html = parseMarkdownTables(html);

    // Unordered lists
    html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

    // Line breaks - convert double newlines to paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<table>)/g, '$1');
    html = html.replace(/(<\/table>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');

    return html;
}

// Parse markdown tables
function parseMarkdownTables(text: string): string {
    const lines = text.split('\n');
    let result: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
        const isSeparator = /^\|[\s:-]+\|/.test(line.trim());

        if (isTableRow && !isSeparator) {
            if (!inTable) {
                inTable = true;
                tableLines = [];
            }
            tableLines.push(line);
        } else if (isSeparator && inTable) {
            // Skip separator line
            continue;
        } else {
            if (inTable) {
                // End of table, convert to HTML
                result.push(convertTableToHtml(tableLines));
                inTable = false;
                tableLines = [];
            }
            result.push(line);
        }
    }

    // Handle table at end of content
    if (inTable && tableLines.length > 0) {
        result.push(convertTableToHtml(tableLines));
    }

    return result.join('\n');
}

function convertTableToHtml(tableLines: string[]): string {
    if (tableLines.length === 0) return '';

    let html = '<div class="overflow-x-auto my-4 rounded-xl border border-white/10 bg-white/5">';
    html += '<table class="w-full text-sm text-left">';

    tableLines.forEach((line, index) => {
        const cells = line.split('|').filter(cell => cell.trim() !== '');
        const tag = index === 0 ? 'th' : 'td';
        const rowTag = index === 0 ? 'thead' : (index === 1 ? 'tbody' : '');

        // Header styles
        const headerClass = "px-4 py-3 border-b border-white/10 bg-white/5 font-semibold text-white uppercase tracking-wider text-xs whitespace-nowrap";
        // Cell styles
        const cellClass = "px-4 py-3 border-b border-white/5 text-slate-300 whitespace-nowrap";

        if (rowTag === 'thead') html += '<thead class="bg-white/5">';
        if (rowTag === 'tbody') html += '<tbody class="divide-y divide-white/5">';

        html += `<tr class="${index === 0 ? '' : 'hover:bg-white/5 transition-colors'}">`;
        cells.forEach(cell => {
            html += `<${tag} class="${index === 0 ? headerClass : cellClass}">${cell.trim()}</${tag}>`;
        });
        html += '</tr>';

        if (rowTag === 'thead') html += '</thead>';
    });

    html += '</tbody></table></div>';
    return html;
}

export default MessageRenderer;
