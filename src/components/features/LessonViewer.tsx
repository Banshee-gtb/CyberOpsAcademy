
import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface LessonViewerProps {
  content: string;
  title?: string;
  onComplete?: () => void;
  completed?: boolean;
}

// Simple markdown-like renderer without external dependency
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-[hsl(220_16%_6%)] border border-border rounded-lg p-4 overflow-x-auto my-3">
            <code className="text-foreground/80 text-xs font-mono leading-relaxed whitespace-pre">{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // Table rows
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      // Skip separator rows (---)
      if (!cells.every(c => /^[-:]+$/.test(c))) {
        tableRows.push(cells);
      }
      i++;
      // Check if next line is NOT a table row
      if (i >= lines.length || !lines[i].includes('|') || !lines[i].trim().startsWith('|')) {
        inTable = false;
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-sm">
              {tableRows.length > 0 && (
                <thead>
                  <tr>
                    {tableRows[0].map((cell, ci) => (
                      <th key={ci} className="text-left text-foreground font-semibold py-2 px-3 border-b border-border bg-secondary/30">{cell}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.slice(1).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 border-b border-border/50 text-foreground/75">{formatInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-foreground mt-4 mb-2">{formatInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-3">{formatInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-extrabold text-foreground mb-4 mt-2">{formatInline(line.slice(2))}</h1>);
      i++; continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-primary pl-4 py-1 italic bg-primary/[0.03] rounded-r-lg pr-4 my-4">
          <p className="text-primary/80 text-sm">{formatInline(line.slice(2))}</p>
        </blockquote>
      );
      i++; continue;
    }

    // Unordered list items
    if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-foreground/75" style={{ paddingLeft: `${indent * 4 + 8}px` }}>
          <span className="text-primary/50 mt-0.5">•</span>
          <span>{formatInline(line.replace(/^\s*[-*]\s/, ''))}</span>
        </div>
      );
      i++; continue;
    }

    // Numbered list items
    if (line.match(/^\s*\d+\.\s/)) {
      const num = line.match(/^\s*(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-foreground/75 pl-2">
          <span className="text-primary/60 font-mono text-xs mt-0.5 w-4">{num}.</span>
          <span>{formatInline(line.replace(/^\s*\d+\.\s/, ''))}</span>
        </div>
      );
      i++; continue;
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} className="border-border my-4" />);
      i++; continue;
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++; continue;
    }

    // Regular paragraph
    elements.push(<p key={i} className="text-sm text-foreground/80 leading-relaxed mb-2">{formatInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  // Bold, italic, code, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/); // Corrected regex: added closing `
    if (codeMatch) {
      parts.push(<code key={key++} className="text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs font-mono">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    // Bold
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="text-foreground font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    // Link
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(<a key={key++} href={linkMatch[2]} className="text-primary underline" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>);
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }
    // Regular character
    // The issue was here: `remaining.slice(1).search(/[`*\[]/);`
    // This looks for the *next* special character, but if the current character is special,
    // and it's not matched by the above regexes, it could lead to issues or
    // skip the current character.
    // A simpler approach is to find the index of the first special character from the beginning of `remaining`.
    const nextSpecialCharIndex = remaining.search(/[`*\[]/);
    if (nextSpecialCharIndex === -1) { // No more special characters
      parts.push(remaining);
      break;
    } else if (nextSpecialCharIndex === 0) { // Special character at the very beginning, but not matched by above regexes (shouldn't happen if regexes are exhaustive)
      parts.push(remaining.charAt(0));
      remaining = remaining.slice(1);
    }
    else { // Text before the next special character
      parts.push(remaining.slice(0, nextSpecialCharIndex));
      remaining = remaining.slice(nextSpecialCharIndex);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default function LessonViewer({ content, title, onComplete, completed }: LessonViewerProps) {
  const [expanded, setExpanded] = useState(!completed);

  if (!content) return null;

  return (
    <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-card/80 hover:bg-card transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <BookOpen className="size-4 text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-mono text-amber-400/70 tracking-widest">LESSON MATERIAL</p>
            <p className="text-sm font-bold text-foreground">{title || 'Study this before attempting challenges'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completed && (
            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">READ</span>
          )}
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-border">
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            <MarkdownContent text={content} />
          </div>

          {/* Mark as read */}
          {onComplete && !completed && (
            <div className="border-t border-border px-5 py-3 bg-card/40">
              <button
                onClick={onComplete}
                className="w-full py-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 text-sm font-bold transition-colors"
              >
                I've studied this material — continue to challenges →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
