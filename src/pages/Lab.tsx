import { useEffect, useState, useCallback } from 'react';
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
  BookOpen, Zap, RotateCcw, Trophy, Crosshair, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LessonViewer from '@/components/features/LessonViewer';
import CodeEditor from '@/components/features/CodeEditor';
import CyberTerminal from '@/components/features/CyberTerminal';
import emptyImg from '@/assets/empty-mission.jpg';

type LabPhase = 'briefing' | 'lesson' | 'challenges';

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
  const [phase, setPhase] = useState<LabPhase>('briefing');
  const [lessonRead, setLessonRead] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);

  // Challenge-specific state
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [ctfInput, setCtfInput] = useState('');
  const [ctfHints, setCtfHints] = useState(0);
  const [ctfAttempts, setCtfAttempts] = useState(0);
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<number, string>>({});
  const [scenarioRevealed, setScenarioRevealed] = useState<Record<number, boolean>>({});

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

      // Determine initial phase
      const missionChallengeIds = new Set(challs.map((c) => c.id));
      const anyDone = prog.some((p) => missionChallengeIds.has(p.challenge_id) && p.status === 'completed');
      if (anyDone) {
        setPhase('challenges');
        setLessonRead(true);
      } else if (m?.story_intro) {
        setPhase('briefing');
      } else if (m?.lesson_content) {
        setPhase('lesson');
      } else {
        setPhase('challenges');
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, missionId]);

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
    setScenarioAnswers({});
    setScenarioRevealed({});
  }, []);

  const selectChallenge = (idx: number) => {
    setSelectedIdx(idx);
    resetChallengeState();
  };

  const markComplete = async (challengeId: string, xpReward: number) => {
    if (!user || isCompleted(challengeId)) return;
    await upsertChallengeProgress(user.id, challengeId, 'completed', 100);
    setProgress((prev) => [...prev, {
      id: crypto.randomUUID(), user_id: user.id, challenge_id: challengeId,
      status: 'completed' as const, score: 100, answer: null, completed_at: new Date().toISOString(),
    }]);

    const profile = await fetchUserProfile(user.id);
    if (profile) {
      const newTotalXp = profile.total_xp + xpReward;
      const newStats = calculateLevel(newTotalXp);
      await updateUserProfile(user.id, {
        total_xp: newTotalXp, xp: newStats.xp, level: newStats.level,
        tier: newStats.tier, xp_to_next: newStats.xpToNext,
        challenges_completed: profile.challenges_completed + 1,
        flags_captured: selected?.type === 'ctf' ? profile.flags_captured + 1 : profile.flags_captured,
      });
    }

    toast.success(`+${xpReward} XP earned!`);

    // Check all challenges completed
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
      // Auto-advance
      const nextIdx = challenges.findIndex((ch, i) =>
        i > selectedIdx && !updatedProgress.some((p) => p.challenge_id === ch.id && p.status === 'completed')
      );
      if (nextIdx !== -1) {
        setTimeout(() => selectChallenge(nextIdx), 1500);
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

  // No mission selected
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

  // Mission complete
  if (missionComplete) {
    const nextMission = missions.find(
      (m) => (m.chapter === mission.chapter && m.mission_order === mission.mission_order + 1) ||
        (m.chapter === mission.chapter + 1 && m.mission_order === 1)
    );
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <div className="size-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/30">
          <Trophy className="size-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground mb-2">Mission Complete</h2>
        <p className="text-base font-mono text-primary mb-1">{mission.title}</p>
        {mission.story_outro && (
          <div className="max-w-lg rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-5 my-4">
            <p className="text-sm text-foreground/80 leading-relaxed italic">{mission.story_outro}</p>
          </div>
        )}
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-lg bg-primary/10 px-4 py-2">
            <p className="text-lg font-bold font-mono text-primary">+{mission.xp_reward} XP</p>
          </div>
        </div>
        <div className="flex gap-3">
          {nextMission && (
            <Button onClick={() => { setMissionComplete(false); navigate(`/lab/${nextMission.id}`); }} className="bg-primary text-primary-foreground font-bold">
              Next Module <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
          <Link to="/missions"><Button variant="outline" className="font-bold"><Crosshair className="size-4 mr-2" /> All Missions</Button></Link>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE 1: MISSION BRIEFING
  // ═══════════════════════════════════════
  if (phase === 'briefing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 lg:p-8 text-center">
        <div className="max-w-2xl w-full">
          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono text-amber-400 tracking-widest">INCOMING TRANSMISSION</span>
          </div>
          <p className="text-xs font-mono text-muted-foreground mb-2">
            CHAPTER {mission.chapter} · MODULE {mission.mission_order}
          </p>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-1">{mission.title}</h2>
          <p className="text-xs font-mono text-muted-foreground mb-6">{mission.codename}</p>

          {/* Briefing content */}
          <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-6 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="size-4 text-amber-400/70" />
              <p className="text-[10px] font-mono text-amber-400/70 tracking-wider">MISSION BRIEFING</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{mission.story_intro}</p>
          </div>

          {/* What you'll learn */}
          <div className="rounded-xl border border-border bg-card/50 p-5 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="size-4 text-primary/70" />
              <p className="text-[10px] font-mono text-primary/70 tracking-wider">WHAT YOU WILL LEARN</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {challenges.map((ch) => (
                <div key={ch.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/50">
                  {ch.type === 'ctf' && <Flag className="size-3 text-amber-400" />}
                  {ch.type === 'quiz' && <HelpCircle className="size-3 text-blue-400" />}
                  {ch.type === 'code' && <Code2 className="size-3 text-emerald-400" />}
                  {ch.type === 'terminal' && <Terminal className="size-3 text-cyan-400" />}
                  {ch.type === 'scenario' && <FileText className="size-3 text-violet-400" />}
                  <span className="text-xs text-foreground/80">{ch.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="size-4 text-primary" /> {mission.xp_reward} XP</span>
            <span className="flex items-center gap-1"><Trophy className="size-4 text-amber-400" /> {challenges.length} challenges</span>
          </div>

          <Button
            onClick={() => setPhase(mission.lesson_content ? 'lesson' : 'challenges')}
            className="bg-primary text-primary-foreground font-bold px-8 py-3 text-base"
          >
            {mission.lesson_content ? 'Start Learning' : 'Begin Challenges'}
            <ChevronRight className="size-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE 2: LESSON CONTENT
  // ═══════════════════════════════════════
  if (phase === 'lesson' && mission.lesson_content && !lessonRead) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0">
        {/* Header */}
        <div className="border-b border-border bg-card/30 px-5 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-amber-400 tracking-wider mb-1">
                MODULE {mission.chapter}.{mission.mission_order} — LESSON
              </p>
              <h1 className="text-xl font-extrabold text-foreground">{mission.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-muted-foreground">
                Step 1 of 2 · Read & Learn
              </span>
              <Button
                onClick={() => { setLessonRead(true); setPhase('challenges'); }}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Skip to Challenges <ChevronRight className="size-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-5 lg:p-8">
          <LessonViewer
            content={mission.lesson_content}
            title={`${mission.title} — Core Concepts`}
            onComplete={() => { setLessonRead(true); setPhase('challenges'); }}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE 3: CHALLENGES (Practice & Test)
  // ═══════════════════════════════════════
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
              <span className="text-[10px] font-mono text-primary tracking-wider">
                {completedCount === challenges.length ? 'ALL COMPLETE' : 'PRACTICE & CHALLENGES'}
              </span>
            </div>
            <h1 className="text-lg lg:text-xl font-extrabold text-foreground">{mission.title}</h1>
            <p className="text-[10px] font-mono text-muted-foreground">
              {mission.codename} · Ch {mission.chapter}.{mission.mission_order}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Back to lesson */}
            {mission.lesson_content && (
              <Button
                onClick={() => { setLessonRead(false); setPhase('lesson'); }}
                variant="ghost" size="sm" className="text-xs text-amber-400/70 hover:text-amber-400"
              >
                <BookOpen className="size-3 mr-1" /> Review Lesson
              </Button>
            )}
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
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Challenge sidebar */}
        <div className="lg:w-56 xl:w-64 border-b lg:border-b-0 lg:border-r border-border bg-card/20 p-3 lg:min-h-[calc(100vh-80px)]">
          <p className="text-[9px] font-mono text-muted-foreground mb-2 px-1 tracking-widest">
            MODULE CHALLENGES
          </p>
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
        <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-5xl">
          {selected && (
            <>
              {/* Challenge header */}
              <div className="rounded-xl border border-border bg-card/50 p-4">
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
                  <Button variant="ghost" size="sm" disabled={selectedIdx === 0} onClick={() => selectChallenge(selectedIdx - 1)} className="text-xs text-muted-foreground h-8">
                    <ChevronLeft className="size-3 mr-1" /> Prev
                  </Button>
                  <span className="text-[10px] font-mono text-muted-foreground flex-1 text-center">
                    Challenge {selectedIdx + 1} of {challenges.length}
                  </span>
                  <Button variant="ghost" size="sm" disabled={selectedIdx === challenges.length - 1} onClick={() => selectChallenge(selectedIdx + 1)} className="text-xs text-muted-foreground h-8">
                    Next <ChevronRight className="size-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Per-challenge lesson content */}
              {selected.lesson_content && (
                <LessonViewer
                  content={selected.lesson_content}
                  title={`${selected.title} — Lesson`}
                  completed={isCompleted(selected.id)}
                />
              )}

              {/* ─── QUIZ ─── */}
              {selected.type === 'quiz' && <QuizChallenge
                content={selected.content}
                completed={isCompleted(selected.id)}
                quizSelected={quizSelected}
                setQuizSelected={setQuizSelected}
                quizSubmitted={quizSubmitted}
                setQuizSubmitted={setQuizSubmitted}
                onComplete={() => markComplete(selected.id, selected.xp_reward)}
              />}

              {/* ─── CTF ─── */}
              {selected.type === 'ctf' && <CtfChallenge
                content={selected.content}
                completed={isCompleted(selected.id)}
                ctfInput={ctfInput}
                setCtfInput={setCtfInput}
                ctfHints={ctfHints}
                setCtfHints={setCtfHints}
                ctfAttempts={ctfAttempts}
                setCtfAttempts={setCtfAttempts}
                onComplete={() => markComplete(selected.id, selected.xp_reward)}
              />}

              {/* ─── TERMINAL ─── */}
              {selected.type === 'terminal' && (() => {
                const c = selected.content as Record<string, unknown>;
                return (
                  <CyberTerminal
                    environment={(c.environment as string) || 'operator@cyberNinja'}
                    objective={(c.objective as string) || selected.description}
                    commands={(c.commands as Record<string, { output: string; success: boolean }>) || {}}
                    flag={(c.flag as string) || ''}
                    hint={c.hint as string}
                    onFlagCaptured={() => markComplete(selected.id, selected.xp_reward)}
                    completed={isCompleted(selected.id)}
                  />
                );
              })()}

              {/* ─── CODE ─── */}
              {selected.type === 'code' && (() => {
                const c = selected.content as Record<string, unknown>;
                return (
                  <CodeEditor
                    language={(c.language as string) || 'python'}
                    starterCode={(c.starterCode as string) || ''}
                    testCases={c.testCases as { input: string; expected: string; description: string }[]}
                    challengeDescription={selected.description}
                    onSubmit={() => markComplete(selected.id, selected.xp_reward)}
                    completed={isCompleted(selected.id)}
                  />
                );
              })()}

              {/* ─── SCENARIO ─── */}
              {selected.type === 'scenario' && <ScenarioChallenge
                content={selected.content}
                completed={isCompleted(selected.id)}
                answers={scenarioAnswers}
                setAnswers={setScenarioAnswers}
                revealed={scenarioRevealed}
                setRevealed={setScenarioRevealed}
                onComplete={() => markComplete(selected.id, selected.xp_reward)}
              />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Sub-components for challenge types
// ═══════════════════════════════════

function QuizChallenge({ content, completed, quizSelected, setQuizSelected, quizSubmitted, setQuizSubmitted, onComplete }: {
  content: Record<string, unknown>;
  completed: boolean;
  quizSelected: number | null;
  setQuizSelected: (v: number | null) => void;
  quizSubmitted: boolean;
  setQuizSubmitted: (v: boolean) => void;
  onComplete: () => void;
}) {
  const options = content.options as string[];
  const correctIdx = content.correctIndex as number;
  const isCorrect = quizSelected === correctIdx;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
      {content.scenario && (
        <div className="rounded-lg bg-amber-400/[0.03] border border-amber-400/10 p-4">
          <p className="text-[10px] font-mono text-amber-400/70 mb-1 tracking-wider">SCENARIO</p>
          <p className="text-sm text-foreground/80">{content.scenario as string}</p>
        </div>
      )}
      <h3 className="text-base font-bold text-foreground">{content.question as string}</h3>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !quizSubmitted && !completed && setQuizSelected(i)}
            disabled={quizSubmitted || completed}
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
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{content.explanation as string}</p>
        </div>
      )}
      {!quizSubmitted && !completed && (
        <Button onClick={() => { if (quizSelected === null) return; setQuizSubmitted(true); if (quizSelected === correctIdx) onComplete(); }} disabled={quizSelected === null} className="bg-primary text-primary-foreground font-bold">
          Submit Answer
        </Button>
      )}
      {quizSubmitted && !isCorrect && !completed && (
        <Button onClick={() => { setQuizSelected(null); setQuizSubmitted(false); }} variant="outline" className="text-muted-foreground">
          <RotateCcw className="size-3 mr-2" /> Try Again
        </Button>
      )}
    </div>
  );
}

function CtfChallenge({ content, completed, ctfInput, setCtfInput, ctfHints, setCtfHints, ctfAttempts, setCtfAttempts, onComplete }: {
  content: Record<string, unknown>;
  completed: boolean;
  ctfInput: string;
  setCtfInput: (v: string) => void;
  ctfHints: number;
  setCtfHints: (v: number) => void;
  ctfAttempts: number;
  setCtfAttempts: (v: number) => void;
  onComplete: () => void;
}) {
  const hints = (content.hints as string[]) || [];
  const flag = content.flag as string;

  const tryCapture = () => {
    if (ctfInput.trim() === flag) {
      onComplete();
    } else {
      setCtfAttempts(ctfAttempts + 1);
      toast.error('Incorrect flag. Keep trying.');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
      <div className="rounded-lg bg-secondary/30 p-4">
        <p className="text-[10px] font-mono text-primary/70 mb-1 tracking-wider">INTELLIGENCE BRIEF</p>
        <p className="text-sm text-foreground/80 leading-relaxed">{(content.description || content.scenario) as string}</p>
        {content.encoded && (
          <div className="mt-3 rounded-lg bg-[hsl(220_16%_3%)] border border-border p-4 font-mono text-sm text-primary/90 break-all whitespace-pre-wrap">
            {content.encoded as string}
          </div>
        )}
      </div>

      {/* Hints */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-muted-foreground tracking-wider">HINTS ({ctfHints}/{hints.length})</p>
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

      {!completed && (
        <>
          {ctfAttempts > 0 && <p className="text-xs text-red-400/70 font-mono">{ctfAttempts} failed attempt{ctfAttempts > 1 ? 's' : ''}</p>}
          <div className="flex gap-2">
            <input
              value={ctfInput}
              onChange={(e) => setCtfInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryCapture()}
              placeholder="CyberNinja{...}"
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-secondary/50 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
            />
            <Button onClick={tryCapture} className="bg-primary text-primary-foreground font-bold">
              <Flag className="size-4 mr-1" /> Capture
            </Button>
          </div>
        </>
      )}
      {completed && (
        <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 p-3 text-center">
          <p className="text-sm font-mono font-bold text-emerald-400">🚩 FLAG CAPTURED</p>
          <p className="text-xs font-mono text-emerald-400/60 mt-1">{flag}</p>
        </div>
      )}
    </div>
  );
}

function ScenarioChallenge({ content, completed, answers, setAnswers, revealed, setRevealed, onComplete }: {
  content: Record<string, unknown>;
  completed: boolean;
  answers: Record<number, string>;
  setAnswers: (v: Record<number, string>) => void;
  revealed: Record<number, boolean>;
  setRevealed: (v: Record<number, boolean>) => void;
  onComplete: () => void;
}) {
  const questions = content.questions as { question: string; answer: string }[];
  const allAnswered = questions?.every((_, i) => (answers[i]?.trim().length ?? 0) > 10);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
      <div className="rounded-lg bg-amber-400/[0.03] border border-amber-400/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="size-3.5 text-amber-400/70" />
          <p className="text-[10px] font-mono text-amber-400/70 tracking-wider">SCENARIO BRIEFING</p>
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{content.scenario as string}</p>
      </div>

      {questions?.map((q, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm font-bold text-foreground">
            <span className="text-primary font-mono mr-2">Q{i + 1}.</span>{q.question}
          </p>
          <textarea
            value={answers[i] || ''}
            onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
            className="w-full h-28 p-3 rounded-lg border border-border bg-secondary/30 text-sm text-foreground resize-none outline-none focus:border-primary/50 leading-relaxed"
            placeholder="Type your analysis here..."
            disabled={completed}
          />
          <div>
            <button onClick={() => setRevealed({ ...revealed, [i]: !revealed[i] })} className="text-xs font-mono text-primary/70 hover:text-primary transition-colors">
              <Lightbulb className="size-3 inline mr-1" />{revealed[i] ? 'Hide' : 'Show'} model answer
            </button>
            {revealed[i] && (
              <div className="mt-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15 p-3">
                <p className="text-[10px] font-mono text-emerald-400/70 mb-1 tracking-wider">MODEL ANSWER</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{q.answer}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      {!completed && (
        <Button onClick={onComplete} disabled={!allAnswered} className="bg-primary text-primary-foreground font-bold">
          <FileText className="size-4 mr-2" />
          {allAnswered ? 'Complete Scenario' : 'Answer all questions (min 10 chars each)'}
        </Button>
      )}
    </div>
  );
}
