import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LessonViewerProps {
  content: string;
  title?: string;
  onComplete?: () => void;
  completed?: boolean;
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
            <div className="prose prose-sm prose-invert max-w-none
              [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-foreground [&_h1]:mb-4 [&_h1]:mt-2
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-3
              [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-2
              [&_p]:text-sm [&_p]:text-foreground/80 [&_p]:leading-relaxed [&_p]:mb-3
              [&_ul]:space-y-1 [&_li]:text-sm [&_li]:text-foreground/75
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_code]:text-primary [&_code]:bg-primary/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
              [&_pre]:bg-[hsl(220_16%_6%)] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-3
              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground/80
              [&_table]:w-full [&_table]:text-sm [&_table]:my-3
              [&_th]:text-left [&_th]:text-foreground [&_th]:font-semibold [&_th]:py-2 [&_th]:px-3 [&_th]:border-b [&_th]:border-border [&_th]:bg-secondary/30
              [&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-border/50 [&_td]:text-foreground/75
              [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:bg-primary/[0.03] [&_blockquote]:rounded-r-lg [&_blockquote]:pr-4 [&_blockquote]:my-4
              [&_blockquote_p]:text-primary/80
              [&_hr]:border-border [&_hr]:my-4
              [&_a]:text-primary [&_a]:underline
            ">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
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
