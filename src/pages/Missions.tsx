import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchMissions, fetchUserMissionProgress, fetchChallengesByMission, upsertMissionProgress } from '@/lib/api';
import { TIER_CONFIG, TIER_ORDER } from '@/constants/config';
import type { Mission, UserMissionProgress, Tier, Challenge } from '@/types';
import { Search, Lock, CheckCircle2, Play, ChevronRight, Crosshair, Swords, BookOpen, Trophy, Flame, Terminal, Flag, HelpCircle, Code2, FileText, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CHAPTER_META: Record<number, { name: string; desc: string; icon: string }> = {
  1: { name: 'Foundations', desc: 'CIA triad, OSINT, password security & cryptography basics.', icon: '🔰' },
  2: { name: 'Network Shadows', desc: 'Network analysis, port scanning, MITM attacks, packet inspection.', icon: '🌐' },
  3: { name: 'System Breach', desc: 'Linux mastery, privilege escalation, web application hacking.', icon: '💻' },
  4: { name: 'Advanced Operations', desc: 'Cryptography, reverse engineering, social engineering.', icon: '🎯' },
  5: { name: 'Elite Operator', desc: 'Red team ops, full penetration testing, final certification.', icon: '💀' },
};

const typeIcons: Record<string, typeof Flag> = {
  ctf: Flag, quiz: HelpCircle, code: Code2, terminal: Terminal, scenario: FileText,
};

const typeColors: Record<string, string> = {
  ctf: 'text-amber-400', quiz: 'text-blue-400', code: 'text-emerald-400', terminal: 'text-cyan-400', scenario: 'text-violet-400',
};

export default function MissionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<UserMissionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [missionChallenges, setMissionChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number>(1);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchMissions(), fetchUserMissionProgress(user.id)])
      .then(([m, p]) => {
        setMissions(m);
        setProgress(p);
        const completedIds = new Set(p.filter((pr) => pr.status === 'completed').map((pr) => pr.mission_id));
        const firstIncomplete = m.find((mi) => !completedIds.has(mi.id));
        setActiveChapter(firstIncomplete?.chapter ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedMission) { setMissionChallenges([]); return; }
    setLoadingChallenges(true);
    fetchChallengesByMission(selectedMission.id)
      .then(setMissionChallenges)
      .catch(() => setMissionChallenges([]))
      .finally(() => setLoadingChallenges(false));
  }, [selectedMission?.id]);

  const getStatus = (missionId: string) => progress.find((p) => p.mission_id === missionId)?.status ?? 'not_started';

  const isMissionAvailable = (mission: Mission) => {
    if (mission.chapter === 1 && mission.mission_order === 1) return true;
    const prevMission = missions.find((m) => m.chapter === mission.chapter && m.mission_order === mission.mission_order - 1);
    if (prevMission && getStatus(prevMission.id) === 'completed') return true;
    if (mission.mission_order === 1 && mission.chapter > 1) {
      const prevChapterMissions = missions.filter((m) => m.chapter === mission.chapter - 1);
      return prevChapterMissions.every((m) => getStatus(m.id) === 'completed');
    }
    return false;
  };

  const handleStartMission = async (mission: Mission) => {
    if (!user) return;
    await upsertMissionProgress(user.id, mission.id, 'in_progress');
    setProgress((prev) => {
      const existing = prev.find((p) => p.mission_id === mission.id);
      if (existing) return prev.map((p) => p.mission_id === mission.id ? { ...p, status: 'in_progress' as const } : p);
      return [...prev, { id: '', user_id: user.id, mission_id: mission.id, status: 'in_progress' as const, started_at: new Date().toISOString(), completed_at: null }];
    });
    toast.success('Entering training module...');
    navigate(`/lab/${mission.id}`);
  };

  const filtered = missions.filter(
    (m) => !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.codename.toLowerCase().includes(search.toLowerCase())
  );

  const chapters = [...new Set(filtered.map((m) => m.chapter))].sort((a, b) => a - b);
  const completedTotal = progress.filter((p) => p.status === 'completed').length;

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* Header */}
      <div className="border-b border-border bg-card/30 p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="size-5 text-primary" />
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground">Learning Path</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          Progressive cybersecurity curriculum — each module teaches, then tests.
        </p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          {completedTotal}/{missions.length} modules completed · Complete modules in order to unlock the next
        </p>

        {/* Progress */}
        <div className="max-w-xl mb-4">
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-500"
              style={{ width: `${missions.length > 0 ? (completedTotal / missions.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
            />
          </div>

          {/* Chapter tabs */}
          <div className="flex gap-1.5 overflow-x-auto">
            {chapters.map((ch) => {
              const meta = CHAPTER_META[ch] || { name: `Ch ${ch}`, icon: '📦' };
              const chMissions = filtered.filter((m) => m.chapter === ch);
              const done = chMissions.filter((m) => getStatus(m.id) === 'completed').length;
              const allDone = done === chMissions.length;
              return (
                <button
                  key={ch}
                  onClick={() => { setActiveChapter(ch); setSelectedMission(null); }}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 border',
                    activeChapter === ch
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : allDone
                      ? 'bg-emerald-500/[0.06] text-emerald-400 border-emerald-500/20'
                      : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                  )}
                >
                  <span>{meta.icon}</span>
                  {meta.name}
                  <span className="text-[10px] opacity-60">{done}/{chMissions.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-12 gap-5">
          {/* Module list */}
          <div className={cn('col-span-12', selectedMission ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12')}>
            {chapters
              .filter((ch) => ch === activeChapter)
              .map((ch) => {
                const meta = CHAPTER_META[ch] || { name: `Chapter ${ch}`, desc: '' };
                const chMissions = filtered.filter((m) => m.chapter === ch);
                const done = chMissions.filter((m) => getStatus(m.id) === 'completed').length;

                return (
                  <div key={ch}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">{meta.icon}</div>
                      <div className="flex-1">
                        <h2 className="text-lg font-bold text-foreground">Chapter {ch}: {meta.name}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden max-w-xs">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${chMissions.length > 0 ? (done / chMissions.length) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{done}/{chMissions.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Module cards */}
                    <div className="space-y-3">
                      {chMissions.map((m, idx) => {
                        const status = getStatus(m.id);
                        const available = isMissionAvailable(m);
                        const locked = status === 'not_started' && !available;
                        const isSelected = selectedMission?.id === m.id;

                        return (
                          <div key={m.id} className="flex gap-3">
                            {/* Timeline */}
                            <div className="flex flex-col items-center pt-4">
                              <div className={cn(
                                'size-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                                status === 'completed' ? 'bg-emerald-400 border-emerald-400' :
                                status === 'in_progress' ? 'bg-primary border-primary' :
                                locked ? 'bg-transparent border-muted-foreground/20' :
                                'bg-transparent border-muted-foreground/40'
                              )}>
                                {status === 'completed' && <CheckCircle2 className="size-2.5 text-background" />}
                                {status === 'in_progress' && <div className="size-1.5 bg-primary-foreground rounded-full animate-pulse" />}
                              </div>
                              {idx < chMissions.length - 1 && (
                                <div className={cn('w-0.5 flex-1 mt-1', status === 'completed' ? 'bg-emerald-400/30' : 'bg-border')} />
                              )}
                            </div>

                            {/* Card */}
                            <button
                              onClick={() => !locked && setSelectedMission(isSelected ? null : m)}
                              disabled={locked}
                              className={cn(
                                'flex-1 text-left rounded-xl border p-4 mb-1 transition-all',
                                isSelected ? 'border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20' :
                                locked ? 'border-border/30 bg-card/10 opacity-40 cursor-not-allowed' :
                                status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]' :
                                status === 'in_progress' ? 'border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06]' :
                                'border-border bg-card/40 hover:bg-card/60'
                              )}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-mono font-medium text-muted-foreground tracking-wider">{m.codename}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-primary">+{m.xp_reward} XP</span>
                                  {status === 'completed' && <CheckCircle2 className="size-4 text-emerald-400" />}
                                  {status === 'in_progress' && <Play className="size-4 text-primary fill-primary" />}
                                  {locked && <Lock className="size-3.5 text-muted-foreground/40" />}
                                </div>
                              </div>
                              <h3 className="text-sm font-bold text-foreground mb-1">
                                Module {m.chapter}.{m.mission_order} — {m.title}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{m.description}</p>

                              {/* Module tags */}
                              {m.lesson_content && (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/15">
                                    <BookOpen className="size-2.5" /> Lesson
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/15">
                                    <Terminal className="size-2.5" /> Practice
                                  </span>
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Detail panel */}
          {selectedMission && (
            <div className="col-span-12 lg:col-span-6 xl:col-span-5">
              <div className="sticky top-4 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-amber-400 tracking-widest">MODULE DETAILS</span>
                    </div>
                    <button onClick={() => setSelectedMission(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                  </div>

                  <p className="text-[10px] font-mono text-muted-foreground mb-0.5">{selectedMission.codename}</p>
                  <h2 className="text-xl font-extrabold text-foreground">{selectedMission.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">Chapter {selectedMission.chapter} · Module {selectedMission.mission_order}</p>

                  {/* Curriculum flow */}
                  <div className="mt-4 rounded-lg border border-border/50 bg-secondary/10 p-4">
                    <p className="text-[10px] font-mono text-muted-foreground mb-3 tracking-wider">MODULE FLOW</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <BookOpen className="size-3.5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">1. Learn</p>
                          <p className="text-[10px] text-muted-foreground">Study core concepts & techniques</p>
                        </div>
                      </div>
                      <div className="ml-3 border-l border-border h-3" />
                      <div className="flex items-center gap-3">
                        <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Terminal className="size-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">2. Practice</p>
                          <p className="text-[10px] text-muted-foreground">Hands-on exercises in code editor & terminal</p>
                        </div>
                      </div>
                      <div className="ml-3 border-l border-border h-3" />
                      <div className="flex items-center gap-3">
                        <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Trophy className="size-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">3. Prove</p>
                          <p className="text-[10px] text-muted-foreground">Complete challenges to earn XP</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Story */}
                  {selectedMission.story_intro && (
                    <div className="rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-4 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="size-3.5 text-amber-400/70" />
                        <p className="text-[10px] font-mono text-amber-400/70 tracking-wider">BRIEFING</p>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed italic">{selectedMission.story_intro}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-lg bg-secondary/30 p-3 text-center">
                      <Swords className="size-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold font-mono text-primary">+{selectedMission.xp_reward}</p>
                      <p className="text-[9px] text-muted-foreground">XP</p>
                    </div>
                    <div className="rounded-lg bg-secondary/30 p-3 text-center">
                      <Trophy className="size-4 mx-auto mb-1 text-amber-400" />
                      <p className="text-lg font-bold font-mono text-foreground">{loadingChallenges ? '...' : missionChallenges.length}</p>
                      <p className="text-[9px] text-muted-foreground">CHALLENGES</p>
                    </div>
                    <div className="rounded-lg bg-secondary/30 p-3 text-center">
                      <Flame className="size-4 mx-auto mb-1 text-orange-400" />
                      <p className="text-lg font-bold font-mono text-foreground capitalize">{selectedMission.tier_required}</p>
                      <p className="text-[9px] text-muted-foreground">TIER</p>
                    </div>
                  </div>

                  {/* Challenges */}
                  {!loadingChallenges && missionChallenges.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-mono text-muted-foreground mb-2 tracking-wider">CHALLENGES</p>
                      <div className="space-y-1.5">
                        {missionChallenges.map((ch, i) => {
                          const Icon = typeIcons[ch.type] || HelpCircle;
                          const color = typeColors[ch.type] || 'text-muted-foreground';
                          return (
                            <div key={ch.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/20 border border-border/50">
                              <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                              <Icon className={cn('size-3.5 shrink-0', color)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{ch.title}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{ch.type} · {ch.difficulty}</p>
                              </div>
                              <span className="text-[10px] font-mono text-primary shrink-0">+{ch.xp_reward}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  <div className="mt-4">
                    {getStatus(selectedMission.id) === 'completed' ? (
                      <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 p-3 text-center">
                        <CheckCircle2 className="size-5 text-emerald-400 mx-auto mb-1" />
                        <p className="text-sm font-mono font-bold text-emerald-400">COMPLETED</p>
                        <Link to={`/lab/${selectedMission.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mt-2">Review Module <ChevronRight className="size-3 ml-1" /></Button>
                        </Link>
                      </div>
                    ) : getStatus(selectedMission.id) === 'in_progress' ? (
                      <Link to={`/lab/${selectedMission.id}`}>
                        <Button className="w-full bg-primary text-primary-foreground font-bold py-3">
                          <Terminal className="size-4 mr-2" /> Continue Learning
                        </Button>
                      </Link>
                    ) : isMissionAvailable(selectedMission) ? (
                      <Button onClick={() => handleStartMission(selectedMission)} className="w-full bg-primary text-primary-foreground font-bold py-3">
                        <Play className="size-4 mr-2 fill-current" /> Start Module
                      </Button>
                    ) : (
                      <div className="rounded-lg bg-secondary/30 border border-border p-3 text-center">
                        <Lock className="size-5 text-muted-foreground/40 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground font-mono">Complete previous modules to unlock</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
