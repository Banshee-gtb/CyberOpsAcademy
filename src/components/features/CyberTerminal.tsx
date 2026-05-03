import { useState, useRef, useEffect, useCallback } from 'react';
import { Lightbulb, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'hint' | 'system';
  text: string;
}

interface CyberTerminalProps {
  environment: string;
  objective: string;
  commands: Record<string, { output: string; success: boolean }>;
  flag: string;
  hint?: string;
  onFlagCaptured: () => void;
  disabled?: boolean;
  completed?: boolean;
}

// Built-in command responses for common linux commands
const BUILTIN_COMMANDS: Record<string, string> = {
  'help': `Available Commands:
  ─────────────────────────────────
  Navigation & Files:
    ls, ls -la       List directory contents
    cd <dir>         Change directory
    cat <file>       Display file contents
    pwd              Print working directory
    find             Search for files
    head, tail       View file start/end
    grep             Search in files
  
  System Info:
    whoami           Current user
    id               User/group IDs
    uname -a         System information
    ps aux           Running processes
    netstat -tulpn   Network connections
    
  Network Tools:
    nmap             Port scanner
    whois            Domain lookup
    dig              DNS query
    ping             Test connectivity
    traceroute       Network path
    tcpdump          Packet capture
    curl             HTTP requests
    
  Security Tools:
    arp -a           ARP table
    strings          Extract readable text
    file             Identify file type
    xxd              Hex dump
    base64           Encode/decode
    md5sum           Hash file
    
  Terminal:
    clear            Clear screen
    hint             Show mission hint
    flag <value>     Submit captured flag
  ─────────────────────────────────`,
  'id': 'uid=1000(operator) gid=1000(operator) groups=1000(operator),27(sudo)',
  'uname -a': 'Linux cyberNinja-lab 5.15.0-94-generic #104-Ubuntu SMP x86_64 GNU/Linux',
  'date': new Date().toUTCString(),
  'hostname': 'cyberNinja-lab',
  'ifconfig': `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.105  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 02:42:ac:11:00:02  txqueuelen 0  (Ethernet)`,
  'ip addr': `1: lo: <LOOPBACK,UP> mtu 65536 qdisc noqueue state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500 qdisc fq_codel state UP
    inet 192.168.1.105/24 brd 192.168.1.255 scope global eth0`,
  'cat /etc/hostname': 'cyberNinja-lab',
  'ls /': 'bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var',
};

export default function CyberTerminal({ environment, objective, commands, flag, hint, onFlagCaptured, disabled, completed }: CyberTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: '╔══════════════════════════════════════════════╗' },
    { type: 'system', text: '║    CyberNinja Terminal v3.0                  ║' },
    { type: 'system', text: '║    Secure Shell — Authenticated Session       ║' },
    { type: 'system', text: '╚══════════════════════════════════════════════╝' },
    { type: 'system', text: '' },
    { type: 'output', text: `Session: ${environment}` },
    { type: 'output', text: `Objective: ${objective}` },
    { type: 'system', text: '' },
    { type: 'output', text: 'Type "help" for available commands.' },
    { type: 'system', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [showHint, setShowHint] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const userName = environment.split('@')[0] || 'operator';
  const hostName = environment.split('@')[1] || 'cyberNinja';

  const addLines = useCallback((newLines: TerminalLine[]) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const processCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);

    // Show the command
    addLines([{ type: 'input', text: trimmed }]);

    // Handle built-in terminal commands
    if (trimmed === 'clear') {
      setLines([]);
      return;
    }

    if (trimmed === 'hint') {
      addLines([{
        type: 'hint',
        text: hint || 'No hint available. Try exploring with ls, cat, and other commands.'
      }]);
      return;
    }

    if (trimmed === 'whoami') {
      addLines([{ type: 'output', text: userName }]);
      return;
    }

    if (trimmed === 'pwd') {
      addLines([{ type: 'output', text: `/home/${userName}` }]);
      return;
    }

    // Check flag submission
    if (trimmed.startsWith('flag ')) {
      const submittedFlag = trimmed.substring(5).trim();
      if (submittedFlag === flag) {
        addLines([
          { type: 'system', text: '' },
          { type: 'success', text: '╔══════════════════════════════════════════════╗' },
          { type: 'success', text: '║  🚩 FLAG CAPTURED SUCCESSFULLY!              ║' },
          { type: 'success', text: '╚══════════════════════════════════════════════╝' },
          { type: 'success', text: '' },
          { type: 'success', text: `Flag: ${flag}` },
          { type: 'success', text: 'Challenge complete. Well done, operator.' },
          { type: 'system', text: '' },
        ]);
        onFlagCaptured();
      } else {
        addLines([
          { type: 'error', text: '✗ Incorrect flag. Keep investigating.' },
          { type: 'output', text: `Submitted: ${submittedFlag}` },
        ]);
      }
      return;
    }

    // Check mission-specific commands (exact match first)
    if (commands[trimmed]) {
      const result = commands[trimmed];
      addLines([{ type: result.success ? 'success' : 'output', text: result.output }]);
      if (result.success) {
        addLines([
          { type: 'system', text: '' },
          { type: 'success', text: '╔══════════════════════════════════════════════╗' },
          { type: 'success', text: '║  🚩 FLAG CAPTURED SUCCESSFULLY!              ║' },
          { type: 'success', text: '╚══════════════════════════════════════════════╝' },
        ]);
        onFlagCaptured();
      }
      return;
    }

    // Check built-in commands
    if (BUILTIN_COMMANDS[trimmed]) {
      addLines([{ type: 'output', text: BUILTIN_COMMANDS[trimmed] }]);
      return;
    }

    // Partial command matching — try to find a command that starts with the same word
    const cmdWords = trimmed.split(' ');
    const matchedKey = Object.keys(commands).find(k => {
      const kWords = k.split(' ');
      return kWords[0] === cmdWords[0];
    });

    if (matchedKey) {
      addLines([
        { type: 'output', text: commands[matchedKey].output },
        { type: 'hint', text: `Tip: Try the exact command "${matchedKey}" for full output.` }
      ]);
      return;
    }

    // Check builtins by first word
    const builtinMatch = Object.keys(BUILTIN_COMMANDS).find(k => k.split(' ')[0] === cmdWords[0]);
    if (builtinMatch) {
      addLines([{ type: 'output', text: BUILTIN_COMMANDS[builtinMatch] }]);
      return;
    }

    // Command not found
    addLines([{ type: 'error', text: `bash: ${cmdWords[0]}: command not found or not in scope` }]);
  }, [commands, flag, hint, userName, onFlagCaptured, addLines]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      processCommand(input);
      setInput('');
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput('');
      }
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className={cn(
      'rounded-xl border border-border bg-[hsl(220_16%_2%)] overflow-hidden transition-all',
      expanded && 'fixed inset-4 z-50 rounded-2xl'
    )}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220_16%_6%)] border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/60" />
            <div className="size-2.5 rounded-full bg-amber-500/60" />
            <div className="size-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground ml-1">
            {userName}@{hostName} — bash
          </span>
        </div>
        <div className="flex items-center gap-2">
          {completed && <span className="text-[10px] font-mono text-emerald-400">COMPLETED</span>}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Objective bar */}
      <div className="px-4 py-2 border-b border-border/30 bg-primary/[0.03]">
        <p className="font-mono text-[11px] text-primary/80">
          <span className="text-primary/50">TARGET:</span> {objective}
        </p>
      </div>

      {/* Hint toggle */}
      {hint && (
        <div className="px-4 py-1.5 border-b border-border/20">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-[10px] font-mono text-amber-400/50 hover:text-amber-400 transition-colors flex items-center gap-1"
          >
            <Lightbulb className="size-3" />
            {showHint ? hint : 'Click for hint'}
          </button>
        </div>
      )}

      {/* Terminal output */}
      <div
        className={cn("overflow-y-auto p-4 font-mono text-sm", expanded ? 'h-[calc(100vh-200px)]' : 'h-80 lg:h-96')}
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div key={i} className={cn(
            'whitespace-pre-wrap leading-6',
            line.type === 'input' ? 'text-foreground' :
            line.type === 'error' ? 'text-red-400' :
            line.type === 'success' ? 'text-emerald-400 font-medium' :
            line.type === 'hint' ? 'text-amber-400/80 italic' :
            line.type === 'system' ? 'text-primary/60' :
            'text-foreground/70'
          )}>
            {line.type === 'input' ? (
              <>
                <span className="text-emerald-400">{userName}</span>
                <span className="text-muted-foreground/60">@</span>
                <span className="text-cyan-400">{hostName}</span>
                <span className="text-muted-foreground/60">:</span>
                <span className="text-blue-400">~</span>
                <span className="text-muted-foreground/60">$ </span>
                <span className="text-foreground">{line.text}</span>
              </>
            ) : (
              line.text
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      {!disabled && !completed && (
        <div className="flex items-center px-4 py-2.5 border-t border-border/30 bg-[hsl(220_16%_4%)]">
          <span className="font-mono text-sm text-emerald-400">{userName}</span>
          <span className="font-mono text-sm text-muted-foreground/60">@</span>
          <span className="font-mono text-sm text-cyan-400">{hostName}</span>
          <span className="font-mono text-sm text-muted-foreground/60">:</span>
          <span className="font-mono text-sm text-blue-400">~</span>
          <span className="font-mono text-sm text-muted-foreground/60">$ </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none ml-1 placeholder:text-muted-foreground/20"
            placeholder="type command..."
            autoFocus
            spellCheck={false}
          />
          <span className="size-2 bg-primary animate-pulse rounded-sm" />
        </div>
      )}
    </div>
  );
}
