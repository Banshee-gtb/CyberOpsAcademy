import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMissions, fetchChallengesByMission, fetchUserChallengeProgress,
  upsertChallengeProgress, upsertMissionProgress, updateUserProfile, fetchUserProfile
} from '@/lib/api';
import { calculateLevel } from '@/constants/config';
import type { Mission, Challenge, UserChallengeProgress } from '@/types';
import { toast } from 'sonner';
import {
  CheckCircle2, Flag, HelpCircle, Code2, Terminal, FileText,
  Lock, Lightbulb, ChevronRight, ChevronLeft, ArrowRight,
  BookOpen, Zap, RotateCcw, Trophy, Crosshair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import emptyImg from '@/assets/empty-mission.jpg';

export default function LabPage() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<UserChallengeProgress[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showStoryIntro, setShowStoryIntro] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);

  // Challenge-specific state
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [ctfInput, setCtfInput] = useState('');
  const [ctfHints, setCtfHints] = useState(0);
  const [ctfAttempts, setCtfAttempts] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState<{ type: string; text: string }[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<number, string>>({});
  const [scenarioRevealed, setScenarioRevealed] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !missionId) { setLoading(false); return; }
    Promise.all([
      fetchMissions(),
      fetchChallengesByMission(missionId),
      fetchUserChallengeProgress(user.id),
    ]).then(([allMissions, challs, prog]) => {
      const m = allMissions.find((x) => x.id === missionId) ?? null;
      setMission(m);
      setMissions(allMissions);
      setChallenges(challs);
      setProgress(prog);

      // Show story intro on first visit (if no challenges completed for this mission)
      const missionChallengeIds = new Set(challs.map((c) => c.id));
      const anyDone = prog.some((p) => missionChallengeIds.has(p.challenge_id) && p.status === 'completed');
      if (!anyDone && m?.story_intro) {
        setShowStoryIntro(true);
      }

      // Set initial code value
      if (challs[0]?.type === 'code') {
        setCodeValue((challs[0].content as Record<string, unknown>).starterCode as string || '');
      }
      // Initialize terminal
      if (challs[0]?.type === 'terminal') {
        const env = (challs[0].content as Record<string, unknown>).environment as string || 'operator@cyberNinja';
        setTerminalOutput([
          { type: 'output', text: `CyberNinja Terminal v2.0 — ${env}` },
          { type: 'output', text: 'Type "help" for available commands.\n' },
        ]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, missionId]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const selected = challenges[selectedIdx] ?? null;
  const isCompleted = useCallback((challengeId: string) =>
    progress.some((p) => p.challenge_id === challengeId && p.status === 'completed'),
  [progress]);

  const resetChallengeState = useCallback(() => {
    setQuizSelected(null);
    setQuizSubmitted(false);
    setCtfInput('');
    setCtfHints(0);
    setCtfAttempts(0);
    setTerminalInput('');
    setScenarioAnswers({});
    setScenarioRevealed({});
    setShowHint(false);
  }, []);

  const selectChallenge = (idx: number) => {
    setSelectedIdx(idx);
    resetChallengeState();
    const ch = challenges[idx];
    if (ch?.type === 'code') {
      setCodeValue((ch.content as Record<string, unknown>).starterCode as string || '');
    }
    if (ch?.type === 'terminal') {
      const env = (ch.content as Record<string, unknown>).environment as string || 'operator@cyberNinja';
      setTerminalOutput([
        { type: 'output', text: `CyberNinja Terminal v2.0 — ${env}` },
        { type: 'output', text: 'Type "help" for available commands.\n' },
      ]);
    }
  };

  const markComplete = async (challengeId: string, xpReward: number) => {
    if (!user || isCompleted(challengeId)) return;
    await upsertChallengeProgress(user.id, challengeId, 'completed', 100);
    setProgress((prev) => [...prev, {
      id: crypto.randomUUID(),
      user_id: user.id,
      challenge_id: challengeId,
      status: 'completed' as const,
      score: 100,
      answer: null,
      completed_at: new Date().toISOString(),
    }]);

    const profile = await fetchUserProfile(user.id);
    if (profile) {
      const newTotalXp = profile.total_xp + xpReward;
      const newStats = calculateLevel(newTotalXp);
      await updateUserProfile(user.id, {
        total_xp: newTotalXp,
        xp: newStats.xp,
        level: newStats.level,
        tier: newStats.tier,
        xp_to_next: newStats.xpToNext,
        challenges_completed: profile.challenges_completed + 1,
        flags_captured: selected?.type === 'ctf' ? profile.flags_captured + 1 : profile.flags_captured,
      });
    }

    toast.success(`+${xpReward} XP earned!`);

    // Check if all challenges completed → mark mission complete
    const updatedProgress = [...progress, { challenge_id: challengeId, status: 'completed' as const }];
    const allCompleted = challenges.every(
      (ch) => updatedProgress.some((p) => p.challenge_id === ch.id && p.status === 'completed')
    );
    if (allCompleted && mission) {
      await upsertMissionProgress(user.id, mission.id, 'completed');
      const mProfile = await fetchUserProfile(user.id);
      if (mProfile) {
        const totalXp = mProfile.total_xp + mission.xp_reward;
        const s = calculateLevel(totalXp);
        await updateUserProfile(user.id, { total_xp: totalXp, xp: s.xp, level: s.level, tier: s.tier, xp_to_next: s.xpToNext });
      }
      setMissionComplete(true);
    } else {
      // Auto-advance to next incomplete challenge
      const nextIdx = challenges.findIndex((ch, i) =>
        i > selectedIdx && !updatedProgress.some((p) => p.challenge_id === ch.id && p.status === 'completed')
      );
      if (nextIdx !== -1) {
        setTimeout(() => selectChallenge(nextIdx), 1500);
      }
    }
  };

  // Terminal handler
  const handleTerminalCmd = (cmd: string) => {
    if (!selected) return;
    const content = selected.content as Record<string, unknown>;
    const commands = content.commands as Record<string, { output: string; success: boolean }>;
    const flag = content.flag as string;

    setTerminalOutput((prev) => [...prev, { type: 'input', text: cmd }]);

    if (cmd === 'help') {
      setTerminalOutput((prev) => [...prev, {
        type: 'output',
        text: 'Available commands:\n  ls, cd, cat, whoami, pwd\n  nmap, tcpdump, whois, nslookup, dig\n  arp, arping, ip, find, strings, ps\n  flag <value>  — submit a captured flag\n  clear         — clear terminal\n  hint          — show objective hint'
      }]);
    } else if (cmd === 'clear') {
      setTerminalOutput([]);
    } else if (cmd === 'hint') {
      const hint = content.hint as string;
      setTerminalOutput((prev) => [...prev, { type: 'hint', text: hint || 'No hint available for this challenge.' }]);
    } else if (cmd === 'whoami') {
      const env = (content.environment as string) || 'operator';
      setTerminalOutput((prev) => [...prev, { type: 'output', text: env.split('@')[0] }]);
    } else if (cmd === 'pwd') {
      setTerminalOutput((prev) => [...prev, { type: 'output', text: '/home/operator' }]);
    } else if (commands && commands[cmd]) {
      setTerminalOutput((prev) => [...prev, {
        type: commands[cmd].success ? 'success' : 'output',
        text: commands[cmd].output
      }]);
      if (commands[cmd].success) markComplete(selected.id, selected.xp_reward);
    } else if (cmd.startsWith('flag ') && cmd.replace('flag ', '').trim() === flag) {
      setTerminalOutput((prev) => [...prev, { type: 'success', text: `\n🚩 FLAG CAPTURED: ${flag}\n\nWell done, operator. Challenge complete.` }]);
      markComplete(selected.id, selected.xp_reward);
    } else if (cmd.startsWith('flag ')) {
      setTerminalOutput((prev) => [...prev, { type: 'error', text: 'Incorrect flag. Keep investigating.' }]);
    } else {
      // Try partial match on first word
      const firstWord = cmd.split(' ')[0];
      const matchedKey = Object.keys(commands || {}).find((k) => k.startsWith(firstWord));
      if (matchedKey && commands[matchedKey]) {
        setTerminalOutput((prev) => [...prev, { type: 'output', text: commands[matchedKey].output }]);
      } else {
        setTerminalOutput((prev) => [...prev, { type: 'error', text: `bash: ${firstWord}: command not found` }]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // No mission selected state
  if (!missionId || !mission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <img src={emptyImg} alt="" className="w-52 h-40 object-cover rounded-lg mb-5 opacity-40" />
        <h2 className="text-xl font-bold text-foreground mb-2">No Active Mission</h2>
        <p className="text-sm text-muted-foreground mb-4">Select a mission from the operations board to begin training.</p>
        <Link to="/missions">
          <Button className="bg-primary text-primary-foreground font-bold">
            <Crosshair className="size-4 mr-2" /> View Missions
          </Button>
        </Link>
      </div>
    );
  }

  // Mission complete screen
  if (missionComplete) {
    const nextMission = missions.find(
      (m) => (m.chapter === mission.chapter && m.mission_order === mission.mission_order + 1) ||
        (m.chapter === mission.chapter + 1 && m.mission_order === 1)
    );

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <div className="mb-6">
          <div className="size-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/30">
            <Trophy className="size-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Mission Complete</h2>
          <p className="text-base font-mono text-primary mb-1">{mission.title}</p>
          <p className="text-sm text-muted-foreground">{mission.codename}</p>
        </div>

        {mission.story_outro && (
          <div className="max-w-lg rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-5 mb-6">
            <p className="text-sm text-foreground/80 leading-relaxed italic">{mission.story_outro}</p>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-lg bg-primary/10 px-4 py-2">
            <p className="text-lg font-bold font-mono text-primary">+{mission.xp_reward} XP</p>
          </div>
          <div className="rounded-lg bg-secondary/50 px-4 py-2">
            <p className="text-lg font-bold font-mono text-foreground">{challenges.length} challenges</p>
          </div>
        </div>

        <div className="flex gap-3">
          {nextMission && (
            <Button
              onClick={() => {
                setMissionComplete(false);
                navigate(`/lab/${nextMission.id}`);
              }}
              className="bg-primary text-primary-foreground font-bold"
            >
              Next Mission <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
          <Link to="/missions">
            <Button variant="outline" className="font-bold">
              <Crosshair className="size-4 mr-2" /> Mission Board
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Story intro overlay
  if (showStoryIntro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono text-amber-400 tracking-widest">INCOMING TRANSMISSION</span>
          </div>

          <p className="text-xs font-mono text-muted-foreground mb-2">
            CHAPTER {mission.chapter} · MISSION {mission.mission_order}
          </p>
          <h2 className="text-2xl font-extrabold text-foreground mb-1">{mission.title}</h2>
          <p className="text-xs font-mono text-muted-foreground mb-6">{mission.codename}</p>

          <div className="rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-6 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="size-4 text-amber-400/70" />
              <p className="text-[10px] font-mono text-amber-400/70 tracking-wider">MISSION BRIEFING</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{mission.story_intro}</p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="size-4 text-primary" /> {mission.xp_reward} XP</span>
            <span className="flex items-center gap-1"><Trophy className="size-4 text-amber-400" /> {challenges.length} challenges</span>
          </div>

          <Button
            onClick={() => setShowStoryIntro(false)}
            className="bg-primary text-primary-foreground font-bold px-8 py-3"
          >
            Accept Mission <ChevronRight className="size-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  const typeIcons: Record<string, typeof Flag> = {
    ctf: Flag, quiz: HelpCircle, code: Code2, terminal: Terminal, scenario: FileText
  };
  const completedCount = challenges.filter((ch) => isCompleted(ch.id)).length;

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* Header */}
      <div className="border-b border-border bg-card/30 px-4 py-3 lg:px-6 lg:py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-primary tracking-wider">ACTIVE OPERATION</span>
            </div>
            <h1 className="text-lg lg:text-xl font-extrabold text-foreground">{mission.title}</h1>
            <p className="text-[10px] font-mono text-muted-foreground">{mission.codename} · Ch {mission.chapter}.{mission.mission_order}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">{completedCount}/{challenges.length}</p>
            <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Challenge sidebar */}
        <div className="lg:w-56 xl:w-64 border-b lg:border-b-0 lg:border-r border-border bg-card/20 p-3 lg:p-3 lg:min-h-[calc(100vh-80px)]">
          <p className="text-[9px] font-mono text-muted-foreground mb-2 px-1 tracking-widest">CHALLENGES</p>
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible">
            {challenges.map((ch, idx) => {
              const Icon = typeIcons[ch.type] || HelpCircle;
              const active = selectedIdx === idx;
              const done = isCompleted(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => selectChallenge(idx)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2.5 lg:p-3 transition-all shrink-0 lg:shrink lg:w-full text-left',
                    active ? 'border-primary/30 bg-primary/[0.06] ring-1 ring-primary/10' :
                    done ? 'border-emerald-500/20 bg-emerald-500/[0.03]' :
                    'border-border/50 bg-card/30 hover:bg-card/50'
                  )}
                >
                  <div className={cn(
                    'size-7 rounded flex items-center justify-center shrink-0',
                    done ? 'bg-emerald-500/10' : active ? 'bg-primary/10' : 'bg-secondary/50'
                  )}>
                    {done ? <CheckCircle2 className="size-3.5 text-emerald-400" /> : <Icon className="size-3.5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 hidden lg:block">
                    <p className="text-xs font-medium text-foreground truncate">{ch.title}</p>
                    <p className="text-[9px] font-mono text-muted-foreground capitalize">{ch.type} · +{ch.xp_reward}</p>
                  </div>
                  <div className="lg:hidden">
                    <p className="text-[10px] font-mono text-muted-foreground capitalize whitespace-nowrap">{ch.type}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-4xl">
          {selected && (
            <>
              {/* Challenge header */}
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 bg-secondary/80 rounded">{selected.type}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 bg-secondary/50 rounded">{selected.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary">+{selected.xp_reward} XP</span>
                    {isCompleted(selected.id) && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                        <CheckCircle2 className="size-3" /> DONE
                      </span>
                    )}
                  </div>
                </div>
                <h2 className="text-lg font-bold text-foreground">{selected.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>

                {/* Navigation */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  <Button
                    variant="ghost" size="sm"
                    disabled={selectedIdx === 0}
                    onClick={() => selectChallenge(selectedIdx - 1)}
                    className="text-xs text-muted-foreground h-8"
                  >
                    <ChevronLeft className="size-3 mr-1" /> Prev
                  </Button>
                  <span className="text-[10px] font-mono text-muted-foreground flex-1 text-center">
                    {selectedIdx + 1} of {challenges.length}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    disabled={selectedIdx === challenges.length - 1}
                    onClick={() => selectChallenge(selectedIdx + 1)}
                    className="text-xs text-muted-foreground h-8"
                  >
                    Next <ChevronRight className="size-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Quiz */}
              {selected.type === 'quiz' && (() => {
                const c = selected.content as Record<string, unknown>;
                const options = c.options as string[];
                const correctIdx = c.correctIndex as number;
                const isCorrect = quizSelected === correctIdx;
                const done = isCompleted(selected.id);

                return (
                  <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
                    {c.scenario && (
                      <div className="rounded-lg bg-amber-400/[0.03] border border-amber-400/10 p-4">
                        <p className="text-[10px] font-mono text-amber-400/70 mb-1 tracking-wider">SCENARIO</p>
                        <p className="text-sm text-foreground/80">{c.scenario as string}</p>
                      </div>
                    )}
                    <h3 className="text-base font-bold text-foreground">{c.question as string}</h3>
                    <div className="space-y-2">
                      {options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => !quizSubmitted && !done && setQuizSelected(i)}
                          disabled={quizSubmitted || done}
                          className={cn(
                            'w-full text-left rounded-lg border px-4 py-3 text-sm transition-all',
                            quizSubmitted && i === correctIdx ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-medium' :
                            quizSubmitted && i === quizSelected ? 'border-red-500/40 bg-red-500/10 text-red-300' :
                            quizSelected === i ? 'border-primary/40 bg-primary/10 text-foreground font-medium' :
                            'border-border bg-card/30 text-muted-foreground hover:bg-card/50 hover:text-foreground'
                          )}
                        >
                          <span className="font-mono text-xs mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                          {quizSubmitted && i === correctIdx && <CheckCircle2 className="size-4 inline ml-2 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                    {quizSubmitted && (
                      <div className={`rounded-lg border p-4 ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-red-500/20 bg-red-500/[0.04]'}`}>
                        <p className={`text-sm font-bold mb-1 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCorrect ? '✓ Correct!' : '✗ Incorrect — Review the explanation below'}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.explanation as string}</p>
                      </div>
                    )}
                    {!quizSubmitted && !done && (
                      <Button
                        onClick={() => {
                          if (quizSelected === null) return;
                          setQuizSubmitted(true);
                          if (quizSelected === correctIdx) markComplete(selected.id, selected.xp_reward);
                        }}
                        disabled={quizSelected === null}
                        className="bg-primary text-primary-foreground font-bold"
                      >
                        Submit Answer
                      </Button>
                    )}
                    {quizSubmitted && !isCorrect && !done && (
                      <Button
                        onClick={() => { setQuizSelected(null); setQuizSubmitted(false); }}
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        <RotateCcw className="size-3 mr-2" /> Try Again
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* CTF */}
              {selected.type === 'ctf' && (() => {
                const c = selected.content as Record<string, unknown>;
                const hints = (c.hints as string[]) || [];
                const flag = c.flag as string;
                const done = isCompleted(selected.id);

                return (
                  <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
                    <div className="rounded-lg bg-secondary/30 p-4">
                      <p className="text-[10px] font-mono text-primary/70 mb-1 tracking-wider">INTELLIGENCE BRIEF</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{(c.description || c.scenario) as string}</p>
                      {c.encoded && (
                        <div className="mt-3 rounded-lg bg-[hsl(220_16%_3%)] border border-border p-4 font-mono text-sm text-primary/90 break-all whitespace-pre-wrap">
                          {c.encoded as string}
                        </div>
                      )}
                    </div>

                    {/* Hints */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-muted-foreground tracking-wider">HINTS ({ctfHints}/{hints.length} revealed)</p>
                      {hints.map((h, i) => (
                        <div key={i}>
                          {i < ctfHints ? (
                            <div className="rounded-lg bg-amber-400/[0.04] border border-amber-400/15 px-3 py-2">
                              <p className="text-xs text-amber-400/80"><Lightbulb className="size-3 inline mr-1" />Hint {i + 1}: {h}</p>
                            </div>
                          ) : (
                            <button onClick={() => setCtfHints(i + 1)} className="text-xs font-mono text-muted-foreground hover:text-amber-400 transition-colors">
                              <Lock className="size-3 inline mr-1" />Reveal Hint {i + 1}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {!done && (
                      <>
                        {ctfAttempts > 0 && (
                          <p className="text-xs text-red-400/70 font-mono">{ctfAttempts} failed attempt{ctfAttempts > 1 ? 's' : ''}</p>
                        )}
                        <div className="flex gap-2">
                          <input
                            value={ctfInput}
                            onChange={(e) => setCtfInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (ctfInput.trim() === flag) {
                                  markComplete(selected.id, selected.xp_reward);
                                } else {
                                  setCtfAttempts((p) => p + 1);
                                  toast.error('Incorrect flag. Keep trying.');
                                }
                              }
                            }}
                            placeholder="CyberNinja{...}"
                            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-secondary/50 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
                          />
                          <Button
                            onClick={() => {
                              if (ctfInput.trim() === flag) {
                                markComplete(selected.id, selected.xp_reward);
                              } else {
                                setCtfAttempts((p) => p + 1);
                                toast.error('Incorrect flag.');
                              }
                            }}
                            className="bg-primary text-primary-foreground font-bold"
                          >
                            <Flag className="size-4 mr-1" /> Capture
                          </Button>
                        </div>
                      </>
                    )}
                    {done && (
                      <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 p-3 text-center">
                        <p className="text-sm font-mono font-bold text-emerald-400">🚩 FLAG CAPTURED</p>
                        <p className="text-xs font-mono text-emerald-400/60 mt-1">{flag}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Terminal */}
              {selected.type === 'terminal' && (() => {
                const c = selected.content as Record<string, unknown>;
                const env = (c.environment as string) || 'operator@cyberNinja';
                const done = isCompleted(selected.id);

                return (
                  <div className="rounded-lg border border-border bg-[hsl(220_16%_2.5%)] overflow-hidden">
                    {/* Terminal chrome */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-[hsl(220_16%_5%)]">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="size-2.5 rounded-full bg-red-500/60" />
                          <div className="size-2.5 rounded-full bg-amber-500/60" />
                          <div className="size-2.5 rounded-full bg-emerald-500/60" />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground ml-2">{env}</span>
                      </div>
                      {done && <span className="text-[10px] font-mono text-emerald-400">COMPLETED</span>}
                    </div>

                    {/* Objective */}
                    <div className="px-4 py-2 border-b border-border/30 bg-primary/[0.02]">
                      <p className="font-mono text-[11px] text-primary/70">
                        <span className="text-primary/40">OBJECTIVE:</span> {c.objective as string}
                      </p>
                    </div>

                    {/* Hint bar */}
                    {c.hint && (
                      <div className="px-4 py-1.5 border-b border-border/20">
                        <button onClick={() => setShowHint(!showHint)} className="text-[10px] font-mono text-amber-400/50 hover:text-amber-400 transition-colors">
                          <Lightbulb className="size-3 inline mr-1" />{showHint ? (c.hint as string) : 'Show hint'}
                        </button>
                      </div>
                    )}

                    {/* Output area */}
                    <div className="h-72 overflow-y-auto p-4 font-mono text-sm space-y-0.5">
                      {terminalOutput.map((line, i) => (
                        <div key={i} className={cn(
                          line.type === 'input' ? 'text-foreground' :
                          line.type === 'error' ? 'text-red-400' :
                          line.type === 'success' ? 'text-emerald-400 font-medium' :
                          line.type === 'hint' ? 'text-amber-400/80 italic' :
                          'text-foreground/70'
                        )}>
                          {line.type === 'input' ? (
                            <>
                              <span className="text-emerald-400">{env.split('@')[0]}</span>
                              <span className="text-muted-foreground">@</span>
                              <span className="text-cyan-400">{env.split('@')[1] || 'cyberNinja'}</span>
                              <span className="text-muted-foreground">:~$ </span>
                              {line.text}
                            </>
                          ) : (
                            <span className="whitespace-pre-wrap">{line.text}</span>
                          )}
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>

                    {/* Input */}
                    {!done && (
                      <div className="flex items-center px-4 py-2.5 border-t border-border/30 bg-[hsl(220_16%_4%)]">
                        <span className="font-mono text-sm text-emerald-400">{env.split('@')[0]}</span>
                        <span className="font-mono text-sm text-muted-foreground">@</span>
                        <span className="font-mono text-sm text-cyan-400">{env.split('@')[1] || 'cyberNinja'}</span>
                        <span className="font-mono text-sm text-muted-foreground mr-1">:~$</span>
                        <ChevronRight className="size-3 text-primary mr-1" />
                        <input
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && terminalInput.trim()) {
                              handleTerminalCmd(terminalInput.trim());
                              setTerminalInput('');
                            }
                          }}
                          className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/20"
                          placeholder="type command..."
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Code */}
              {selected.type === 'code' && (() => {
                const c = selected.content as Record<string, unknown>;
                const testCases = c.testCases as { input: string; expected: string | Record<string, unknown>; description: string }[];
                const done = isCompleted(selected.id);

                return (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-[hsl(220_16%_2.5%)] overflow-hidden">
                      <div className="px-4 py-2 border-b border-border/50 bg-[hsl(220_16%_5%)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="size-2.5 rounded-full bg-red-500/60" />
                            <div className="size-2.5 rounded-full bg-amber-500/60" />
                            <div className="size-2.5 rounded-full bg-emerald-500/60" />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground ml-2">{(c.language as string || 'python').toUpperCase()}</span>
                        </div>
                        {done && <span className="text-[10px] font-mono text-emerald-400">SUBMITTED</span>}
                      </div>
                      <textarea
                        value={codeValue}
                        onChange={(e) => setCodeValue(e.target.value)}
                        className="w-full h-72 p-4 bg-transparent font-mono text-sm text-foreground resize-none outline-none leading-relaxed"
                        spellCheck={false}
                        disabled={done}
                      />
                    </div>

                    {/* Test cases */}
                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <p className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">TEST CASES</p>
                      <div className="space-y-2">
                        {testCases?.map((tc, i) => (
                          <div key={i} className="rounded-lg bg-secondary/20 border border-border/50 p-3 text-xs font-mono">
                            <p className="text-foreground font-medium mb-1">{tc.description}</p>
                            <p className="text-muted-foreground">Input: <span className="text-foreground">{tc.input}</span></p>
                            <p className="text-emerald-400/70">Expected: <span className="text-emerald-400">{typeof tc.expected === 'object' ? JSON.stringify(tc.expected) : tc.expected}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {!done && (
                      <Button
                        onClick={() => markComplete(selected.id, selected.xp_reward)}
                        className="bg-primary text-primary-foreground font-bold"
                      >
                        <Code2 className="size-4 mr-2" /> Submit Solution
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* Scenario */}
              {selected.type === 'scenario' && (() => {
                const c = selected.content as Record<string, unknown>;
                const questions = c.questions as { question: string; answer: string }[];
                const done = isCompleted(selected.id);
                const allAnswered = questions?.every((_, i) => (scenarioAnswers[i]?.trim().length ?? 0) > 10);

                return (
                  <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
                    <div className="rounded-lg bg-amber-400/[0.03] border border-amber-400/10 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="size-3.5 text-amber-400/70" />
                        <p className="text-[10px] font-mono text-amber-400/70 tracking-wider">SCENARIO BRIEFING</p>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{c.scenario as string}</p>
                    </div>

                    {questions?.map((q, i) => (
                      <div key={i} className="space-y-2">
                        <p className="text-sm font-bold text-foreground">
                          <span className="text-primary font-mono mr-2">Q{i + 1}.</span>
                          {q.question}
                        </p>
                        <textarea
                          value={scenarioAnswers[i] || ''}
                          onChange={(e) => setScenarioAnswers({ ...scenarioAnswers, [i]: e.target.value })}
                          className="w-full h-28 p-3 rounded-lg border border-border bg-secondary/30 text-sm text-foreground resize-none outline-none focus:border-primary/50 leading-relaxed"
                          placeholder="Type your analysis here..."
                          disabled={done}
                        />

                        {/* Model answer toggle */}
                        <div>
                          <button
                            onClick={() => setScenarioRevealed({ ...scenarioRevealed, [i]: !scenarioRevealed[i] })}
                            className="text-xs font-mono text-primary/70 hover:text-primary transition-colors"
                          >
                            <Lightbulb className="size-3 inline mr-1" />
                            {scenarioRevealed[i] ? 'Hide' : 'Show'} model answer
                          </button>
                          {scenarioRevealed[i] && (
                            <div className="mt-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15 p-3">
                              <p className="text-[10px] font-mono text-emerald-400/70 mb-1 tracking-wider">MODEL ANSWER</p>
                              <p className="text-xs text-foreground/80 leading-relaxed">{q.answer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {!done && (
                      <Button
                        onClick={() => markComplete(selected.id, selected.xp_reward)}
                        disabled={!allAnswered}
                        className="bg-primary text-primary-foreground font-bold"
                      >
                        <FileText className="size-4 mr-2" />
                        {allAnswered ? 'Complete Scenario' : 'Answer all questions to submit (min 10 chars each)'}
                      </Button>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
