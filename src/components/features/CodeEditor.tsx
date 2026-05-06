import { useState, useRef, useCallback } from 'react';
import { Play, RotateCcw, Copy, Check, ChevronRight, FileCode2, Terminal as TermIcon, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface TestCase {
  input: string;
  expected: string;
  description: string;
}

interface TestResult {
  testIndex: number;
  passed: boolean;
  actualOutput: string;
  feedback: string;
}

interface CodeQuality {
  hasImplementation: boolean;
  hasSyntaxErrors: boolean;
  hasReturnStatement: boolean;
  linesOfCode: number;
  complexity: string;
}

interface EvalResult {
  overall: 'pass' | 'fail' | 'partial';
  score: number;
  testResults: TestResult[];
  codeQuality: CodeQuality;
  feedback: string;
  suggestions: string[];
  securityNotes: string;
}

interface CodeEditorProps {
  language: string;
  starterCode: string;
  testCases?: TestCase[];
  challengeDescription?: string;
  onSubmit: (code: string) => void;
  disabled?: boolean;
  completed?: boolean;
  sandbox?: boolean;
}

export default function CodeEditor({ language, starterCode, testCases, challengeDescription, onSubmit, disabled, completed, sandbox }: CodeEditorProps) {
  const [code, setCode] = useState(starterCode);
  const [running, setRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'output'>('editor');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  const lineCount = code.split('\n').length;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => { target.selectionStart = target.selectionEnd = start + 4; }, 0);
    }
    const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
    if (pairs[e.key]) {
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (start === end) {
        e.preventDefault();
        const newCode = code.substring(0, start) + e.key + pairs[e.key] + code.substring(end);
        setCode(newCode);
        setTimeout(() => { target.selectionStart = target.selectionEnd = start + 1; }, 0);
      }
    }
    if (e.key === 'Enter') {
      const target = e.target as HTMLTextAreaElement;
      const pos = target.selectionStart;
      const currentLine = code.substring(0, pos).split('\n').pop() || '';
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      const extraIndent = currentLine.trimEnd().endsWith(':') ? '    ' : '';
      e.preventDefault();
      const newCode = code.substring(0, pos) + '\n' + indent + extraIndent + code.substring(target.selectionEnd);
      setCode(newCode);
      setTimeout(() => { target.selectionStart = target.selectionEnd = pos + 1 + indent.length + extraIndent.length; }, 0);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setActiveTab('output');
    setEvalResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('evaluate-code', {
        body: {
          code,
          language,
          testCases: testCases || [],
          challengeDescription: challengeDescription || '',
          starterCode,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const textContent = await error.context?.text();
            errorMessage = textContent || error.message;
          } catch {
            errorMessage = error.message;
          }
        }
        toast.error('Evaluation failed: ' + errorMessage);
        setRunning(false);
        return;
      }

      console.log('AI Evaluation result:', data);
      setEvalResult(data as EvalResult);
    } catch (err) {
      console.error('Evaluation error:', err);
      toast.error('Failed to evaluate code. Please try again.');
    }

    setRunning(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode(starterCode);
    setEvalResult(null);
    setActiveTab('editor');
  };

  const allPassed = evalResult?.overall === 'pass';

  return (
    <div className="rounded-xl border border-border bg-[hsl(220_16%_3%)] overflow-hidden">
      {/* Editor chrome */}
      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(220_16%_6%)] border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/60" />
            <div className="size-2.5 rounded-full bg-amber-500/60" />
            <div className="size-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors',
                activeTab === 'editor' ? 'bg-[hsl(220_16%_3%)] text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileCode2 className="size-3" />
              solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}
            </button>
            <button
              onClick={() => setActiveTab('output')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors',
                activeTab === 'output' ? 'bg-[hsl(220_16%_3%)] text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TermIcon className="size-3" />
              AI Analysis
              {evalResult && (
                <div className={cn('size-1.5 rounded-full', allPassed ? 'bg-emerald-400' : 'bg-red-400')} />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy code">
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
          <button onClick={handleReset} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Reset">
            <RotateCcw className="size-3.5" />
          </button>
          {completed && <span className="text-[10px] font-mono text-emerald-400 ml-2">SUBMITTED</span>}
        </div>
      </div>

      {/* Editor area */}
      {activeTab === 'editor' && (
        <div className="flex h-80 lg:h-96">
          <div ref={lineNumberRef} className="w-12 bg-[hsl(220_16%_4%)] border-r border-border/30 overflow-hidden select-none pt-4 pr-1">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-right text-[11px] font-mono text-muted-foreground/40 leading-[1.65rem] px-1">{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            className="flex-1 p-4 bg-transparent font-mono text-sm text-foreground/90 resize-none outline-none leading-[1.65rem] overflow-auto"
            spellCheck={false}
            disabled={disabled}
            style={{ tabSize: 4 }}
          />
        </div>
      )}

      {/* AI Analysis output */}
      {activeTab === 'output' && (
        <div className="h-80 lg:h-96 overflow-auto p-4">
          {running ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs font-mono text-muted-foreground">AI is analyzing your code...</p>
              <p className="text-[10px] font-mono text-muted-foreground/50">Checking logic, test cases, and security patterns</p>
            </div>
          ) : !evalResult ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
              <TermIcon className="size-8 mb-2" />
              <p className="text-xs">Click "Run Analysis" to evaluate your code with AI</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall result */}
              <div className={cn(
                'rounded-lg border p-4',
                evalResult.overall === 'pass' ? 'border-emerald-500/30 bg-emerald-500/[0.06]' :
                evalResult.overall === 'partial' ? 'border-amber-500/30 bg-amber-500/[0.06]' :
                'border-red-500/30 bg-red-500/[0.06]'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {evalResult.overall === 'pass' ? (
                      <CheckCircle2 className="size-5 text-emerald-400" />
                    ) : evalResult.overall === 'partial' ? (
                      <AlertTriangle className="size-5 text-amber-400" />
                    ) : (
                      <XCircle className="size-5 text-red-400" />
                    )}
                    <span className={cn(
                      'text-sm font-bold',
                      evalResult.overall === 'pass' ? 'text-emerald-400' :
                      evalResult.overall === 'partial' ? 'text-amber-400' : 'text-red-400'
                    )}>
                      {evalResult.overall === 'pass' ? 'ALL TESTS PASSED' :
                       evalResult.overall === 'partial' ? 'PARTIALLY CORRECT' : 'TESTS FAILED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Score:</span>
                    <span className={cn(
                      'text-lg font-bold font-mono',
                      evalResult.score >= 80 ? 'text-emerald-400' :
                      evalResult.score >= 50 ? 'text-amber-400' : 'text-red-400'
                    )}>{evalResult.score}%</span>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{evalResult.feedback}</p>
              </div>

              {/* Test results */}
              {evalResult.testResults && evalResult.testResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider">TEST RESULTS</p>
                  {evalResult.testResults.map((tr, i) => (
                    <div key={i} className={cn(
                      'rounded-lg border px-4 py-3',
                      tr.passed ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]'
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        {tr.passed ? (
                          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 text-red-400 shrink-0" />
                        )}
                        <span className={cn('text-xs font-bold', tr.passed ? 'text-emerald-400' : 'text-red-400')}>
                          Test {i + 1}: {testCases?.[i]?.description || `Test ${i + 1}`}
                        </span>
                      </div>
                      {tr.actualOutput && (
                        <p className="text-[11px] font-mono text-foreground/60 ml-5 mb-1">
                          Output: <span className="text-foreground/80">{tr.actualOutput}</span>
                        </p>
                      )}
                      <p className="text-xs text-foreground/70 ml-5 leading-relaxed">{tr.feedback}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Code quality */}
              {evalResult.codeQuality && (
                <div className="rounded-lg border border-border/50 bg-secondary/10 p-4">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-2">CODE QUALITY</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {evalResult.codeQuality.hasImplementation ? (
                        <CheckCircle2 className="size-3 text-emerald-400" />
                      ) : (
                        <XCircle className="size-3 text-red-400" />
                      )}
                      <span className="text-foreground/70">Has implementation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!evalResult.codeQuality.hasSyntaxErrors ? (
                        <CheckCircle2 className="size-3 text-emerald-400" />
                      ) : (
                        <XCircle className="size-3 text-red-400" />
                      )}
                      <span className="text-foreground/70">No syntax errors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {evalResult.codeQuality.hasReturnStatement ? (
                        <CheckCircle2 className="size-3 text-emerald-400" />
                      ) : (
                        <XCircle className="size-3 text-muted-foreground/40" />
                      )}
                      <span className="text-foreground/70">Return statement</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground/70">
                      <span className="text-muted-foreground/50 font-mono">{evalResult.codeQuality.linesOfCode}</span> lines · {evalResult.codeQuality.complexity}
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {evalResult.suggestions && evalResult.suggestions.length > 0 && (
                <div className="rounded-lg border border-primary/15 bg-primary/[0.03] p-4">
                  <p className="text-[10px] font-mono text-primary/70 tracking-wider mb-2">IMPROVEMENT SUGGESTIONS</p>
                  <div className="space-y-1.5">
                    {evalResult.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                        <span className="text-primary/60 mt-0.5">→</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security notes */}
              {evalResult.securityNotes && (
                <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.03] p-4">
                  <p className="text-[10px] font-mono text-amber-400/70 tracking-wider mb-1">SECURITY NOTES</p>
                  <p className="text-xs text-foreground/70 leading-relaxed">{evalResult.securityNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-[hsl(220_16%_5%)]">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="px-2 py-0.5 bg-secondary/50 rounded">{language.toUpperCase()}</span>
          <span>{lineCount} lines</span>
          <span>{code.length} chars</span>
          {evalResult && (
            <span className={cn(
              'px-2 py-0.5 rounded',
              allPassed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            )}>
              {evalResult.score}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRun}
            disabled={running || disabled}
            variant="outline"
            size="sm"
            className="text-xs font-bold h-8"
          >
            {running ? (
              <><Loader2 className="size-3 mr-1 animate-spin" /> Analyzing...</>
            ) : (
              <><Play className="size-3 mr-1" /> Run Analysis</>
            )}
          </Button>
          {!disabled && !completed && !sandbox && (
            <Button
              onClick={() => onSubmit(code)}
              disabled={!allPassed}
              size="sm"
              className={cn(
                'text-xs font-bold h-8',
                allPassed
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {allPassed ? (
                <><CheckCircle2 className="size-3 mr-1" /> Submit Solution</>
              ) : (
                <>Submit <ChevronRight className="size-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Test cases panel */}
      {testCases && testCases.length > 0 && (
        <div className="border-t border-border/50 px-4 py-3 bg-[hsl(220_16%_4%)]">
          <p className="text-[10px] font-mono text-muted-foreground mb-2 tracking-wider">TEST CASES</p>
          <div className="space-y-1.5">
            {testCases.map((tc, i) => {
              const result = evalResult?.testResults?.find(r => r.testIndex === i);
              return (
                <div key={i} className={cn(
                  'flex items-start gap-2 text-xs font-mono px-3 py-2 rounded-lg border',
                  result?.passed ? 'bg-emerald-500/[0.03] border-emerald-500/15' :
                  result && !result.passed ? 'bg-red-500/[0.03] border-red-500/15' :
                  'bg-secondary/10 border-border/30'
                )}>
                  <div className="mt-0.5 shrink-0">
                    {result?.passed ? <CheckCircle2 className="size-3.5 text-emerald-400" /> :
                     result && !result.passed ? <XCircle className="size-3.5 text-red-400" /> :
                     <span className="text-muted-foreground/50">{i + 1}.</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground/80 font-medium">{tc.description}</p>
                    <p className="text-muted-foreground mt-0.5">Input: <span className="text-foreground/60">{tc.input}</span></p>
                    <p className="text-emerald-400/60">Expected: <span className="text-emerald-400/80">{typeof tc.expected === 'object' ? JSON.stringify(tc.expected) : tc.expected}</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
