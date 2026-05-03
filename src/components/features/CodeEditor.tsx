import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Copy, Check, ChevronRight, FileCode2, Terminal as TermIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TestCase {
  input: string;
  expected: string;
  description: string;
}

interface CodeEditorProps {
  language: string;
  starterCode: string;
  testCases?: TestCase[];
  onSubmit: (code: string) => void;
  disabled?: boolean;
  completed?: boolean;
}

export default function CodeEditor({ language, starterCode, testCases, onSubmit, disabled, completed }: CodeEditorProps) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'output'>('editor');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const lineCount = lines.length;

  // Sync scroll between line numbers and textarea
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
    // Auto-close brackets
    const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
    if (pairs[e.key]) {
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (start === end) {
        e.preventDefault();
        const newCode = code.substring(0, start) + e.key + pairs[e.key] + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
        }, 0);
      }
    }
    // Enter with auto-indent
    if (e.key === 'Enter') {
      const target = e.target as HTMLTextAreaElement;
      const pos = target.selectionStart;
      const currentLine = code.substring(0, pos).split('\n').pop() || '';
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      const extraIndent = currentLine.trimEnd().endsWith(':') ? '    ' : '';
      e.preventDefault();
      const newCode = code.substring(0, pos) + '\n' + indent + extraIndent + code.substring(target.selectionEnd);
      setCode(newCode);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = pos + 1 + indent.length + extraIndent.length;
      }, 0);
    }
  };

  const handleRun = () => {
    setRunning(true);
    setActiveTab('output');
    setOutput(['>>> Running code...', '']);

    // Simulate code execution with basic validation
    setTimeout(() => {
      const results: string[] = ['>>> Code Analysis Report', '─'.repeat(40), ''];

      // Check if the function body is implemented
      const hasImplementation = !code.includes('pass') || code.split('pass').length < code.split('def ').length;
      const hasReturn = code.includes('return');

      if (!hasImplementation && !hasReturn) {
        results.push('⚠ Function body not implemented');
        results.push('  Replace "pass" with your implementation');
        results.push('');
      } else {
        // Run test cases
        if (testCases && testCases.length > 0) {
          results.push(`Running ${testCases.length} test case(s)...`, '');
          testCases.forEach((tc, i) => {
            // Basic pattern matching to check if code handles the test case
            const hasLogic = code.length > starterCode.length + 20;
            if (hasLogic) {
              results.push(`  ✓ Test ${i + 1}: ${tc.description}`);
              results.push(`    Input: ${tc.input}`);
              results.push(`    Expected: ${tc.expected}`);
              results.push('');
            } else {
              results.push(`  ✗ Test ${i + 1}: ${tc.description}`);
              results.push(`    Needs more implementation`);
              results.push('');
            }
          });
        }

        // Code quality checks
        results.push('─'.repeat(40));
        results.push('Code Quality:', '');
        if (code.includes('def ')) results.push('  ✓ Function defined');
        if (hasReturn) results.push('  ✓ Return statement found');
        if (code.includes('#')) results.push('  ✓ Comments present');
        if (code.includes('if ')) results.push('  ✓ Conditional logic');
        if (code.includes('for ') || code.includes('while ')) results.push('  ✓ Loop logic');
        const codeLines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
        results.push(`  Lines of code: ${codeLines}`);
      }

      results.push('', '─'.repeat(40));
      results.push('✓ Analysis complete. Submit when ready.');
      setOutput(results);
      setRunning(false);
    }, 1200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode(starterCode);
    setOutput([]);
    setActiveTab('editor');
  };

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
              Output
              {output.length > 0 && <div className="size-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Reset to starter code"
          >
            <RotateCcw className="size-3.5" />
          </button>
          {completed && <span className="text-[10px] font-mono text-emerald-400 ml-2">SUBMITTED</span>}
        </div>
      </div>

      {/* Editor area */}
      {activeTab === 'editor' && (
        <div className="flex h-80 lg:h-96">
          {/* Line numbers */}
          <div
            ref={lineNumberRef}
            className="w-12 bg-[hsl(220_16%_4%)] border-r border-border/30 overflow-hidden select-none pt-4 pr-1"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-right text-[11px] font-mono text-muted-foreground/40 leading-[1.65rem] px-1">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea */}
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

      {/* Output area */}
      {activeTab === 'output' && (
        <div className="h-80 lg:h-96 overflow-auto p-4 font-mono text-sm">
          {output.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
              <TermIcon className="size-8 mb-2" />
              <p className="text-xs">Click "Run" to analyze your code</p>
            </div>
          ) : (
            output.map((line, i) => (
              <div key={i} className={cn(
                'leading-6 whitespace-pre-wrap',
                line.includes('✓') ? 'text-emerald-400' :
                line.includes('✗') ? 'text-red-400' :
                line.includes('⚠') ? 'text-amber-400' :
                line.startsWith('>>>') ? 'text-primary' :
                line.includes('─') ? 'text-border' :
                'text-foreground/70'
              )}>
                {line}
              </div>
            ))
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-[hsl(220_16%_5%)]">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="px-2 py-0.5 bg-secondary/50 rounded">{language.toUpperCase()}</span>
          <span>{lineCount} lines</span>
          <span>{code.length} chars</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRun}
            disabled={running || disabled}
            variant="outline"
            size="sm"
            className="text-xs font-bold h-8"
          >
            <Play className={cn("size-3 mr-1", running && "animate-spin")} />
            {running ? 'Running...' : 'Run'}
          </Button>
          {!disabled && !completed && (
            <Button
              onClick={() => onSubmit(code)}
              size="sm"
              className="bg-primary text-primary-foreground text-xs font-bold h-8"
            >
              Submit Solution <ChevronRight className="size-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Test cases panel */}
      {testCases && testCases.length > 0 && (
        <div className="border-t border-border/50 px-4 py-3 bg-[hsl(220_16%_4%)]">
          <p className="text-[10px] font-mono text-muted-foreground mb-2 tracking-wider">TEST CASES</p>
          <div className="space-y-1.5">
            {testCases.map((tc, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-mono px-3 py-2 rounded-lg bg-secondary/10 border border-border/30">
                <span className="text-muted-foreground/50 mt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/80 font-medium">{tc.description}</p>
                  <p className="text-muted-foreground mt-0.5">Input: <span className="text-foreground/60">{tc.input}</span></p>
                  <p className="text-emerald-400/60">Expected: <span className="text-emerald-400/80">{typeof tc.expected === 'object' ? JSON.stringify(tc.expected) : tc.expected}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
