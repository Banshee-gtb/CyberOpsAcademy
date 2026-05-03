import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchMissions, fetchUserProfile, fetchUserMissionProgress, fetchUserChallengeProgress, fetchLeaderboard } from '@/lib/api';
import { calculateLevel, TIER_CONFIG, TIER_ORDER } from '@/constants/config';
import type { Mission, UserProfile, UserMissionProgress, LeaderboardEntry, Tier } from '@/types';
import { Crosshair, Trophy, Zap, Flag, Flame, ArrowRight, Bot, ChevronRight, Terminal, BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImg from '@/assets/hero-cyberninja.jpg';

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<UserMissionProgress[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    Promise.all([
      fetchUserProfile(authUser.id),
      fetchMissions(),
      fetchUserMissionProgress(authUser.id),
      fetchUserChallengeProgress(authUser.id),
      fetchLeaderboard(),
    ]).then(([prof, miss, prog, , lb]) => {
      setProfile(prof);
      setMissions(miss);
      setProgress(prog);
      setLeaderboard(lb);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const stats = calculateLevel(profile?.total_xp ?? 0);
  const tierCfg = TIER_CONFIG[stats.tier];
  const completedMissions = progress.filter((p) => p.status === 'completed').length;
  const activeMission = progress.find((p) => p.status === 'in_progress');
  const activeMissionData = activeMission ? missions.find((m) => m.id === activeMission.mission_id) : null;

  const completedIds = new Set(progress.filter((p) => p.status === 'completed').map((p) => p.mission_id));
  const inProgressIds = new Set(progress.filter((p) => p.status === 'in_progress').map((p) => p.mission_id));
  const nextMission = missions.find((m) => !completedIds.has(m.id) && !inProgressIds.has(m.id));

  // Find user rank
  const userRank = leaderboard.findIndex((e) => e.id === authUser?.id) + 1;
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* Hero */}
      <section className="relative h-[240px] lg:h-[300px] overflow-hidden">
        <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end p-6 lg:p-8">
          <p className="font-mono text-[10px] text-primary mb-1 tracking-widest">COMMAND CENTER</p>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-2">
            Welcome back, <span className="text-primary">{profile?.username || authUser?.username}</span>
          </h1>
          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium" style={{ color: tierCfg.color }}>
              {tierCfg.icon} {tierCfg.label}
            </span>
            <span className="font-mono">Level {stats.level}</span>
            {(profile?.streak ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="size-4" />{profile?.streak}d streak
              </span>
            )}
            {userRank > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="size-3.5" /> Rank #{userRank}
              </span>
            )}
          </div>

          {/* XP bar */}
          <div className="max-w-md mt-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground font-mono">Level {stats.level} → {stats.level + 1}</span>
              <span className="font-mono text-foreground">{stats.xp}/{stats.xpToNext} XP</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary animate-fill" style={{ width: `${(stats.xp / stats.xpToNext) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="p-5 lg:p-8 space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total XP', value: (profile?.total_xp ?? 0).toLocaleString(), icon: Zap, color: 'text-primary' },
            { label: 'Missions Done', value: `${completedMissions}/${missions.length}`, icon: Crosshair, color: 'text-violet-400' },
            { label: 'Flags Captured', value: profile?.flags_captured ?? 0, icon: Flag, color: 'text-amber-400' },
            { label: 'Challenges', value: profile?.challenges_completed ?? 0, icon: Trophy, color: 'text-emerald-400' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`size-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground font-mono">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Main content */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Active Mission */}
            {activeMissionData && (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-mono text-primary tracking-widest">ACTIVE MISSION</span>
                  </div>
                  <Link to={`/lab/${activeMissionData.id}`}>
                    <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold">
                      <Terminal className="size-3 mr-1" /> CONTINUE LEARNING
                    </Button>
                  </Link>
                </div>
                <h3 className="text-lg font-bold text-foreground">{activeMissionData.title}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5 mb-2">
                  CH{activeMissionData.chapter}.{activeMissionData.mission_order} · {activeMissionData.codename}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">{activeMissionData.description}</p>
              </div>
            )}

            {/* Next Mission */}
            {nextMission && !activeMissionData && (
              <div className="rounded-lg border border-border bg-card/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="size-4 text-amber-400/70" />
                  <span className="text-[10px] font-mono text-muted-foreground tracking-widest">NEXT MISSION</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{nextMission.title}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5 mb-2">
                  CH{nextMission.chapter}.{nextMission.mission_order} · {nextMission.codename}
                </p>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3 italic">{nextMission.story_intro}</p>
                <Link to="/missions">
                  <Button size="sm" className="bg-primary text-primary-foreground font-bold">
                    View Mission <ChevronRight className="size-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Campaign Progress */}
            <div className="rounded-lg border border-border bg-card/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground">Campaign Progress</h3>
                <Link to="/missions" className="text-xs font-mono text-primary hover:underline">View path →</Link>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((ch) => {
                  const chMissions = missions.filter((m) => m.chapter === ch);
                  const done = chMissions.filter((m) => completedIds.has(m.id)).length;
                  const total = chMissions.length;
                  const pct = total > 0 ? (done / total) * 100 : 0;
                  const chapterNames: Record<number, string> = {
                    1: 'Foundations', 2: 'Network Shadows', 3: 'System Breach',
                    4: 'Advanced Ops', 5: 'Elite Operator'
                  };
                  return (
                    <div key={ch}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          <span className="font-mono text-foreground mr-1">CH{ch}</span>
                          {chapterNames[ch]}
                        </span>
                        <span className="font-mono text-foreground">{done}/{total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            pct === 100 ? 'bg-emerald-400' : 'bg-primary'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* AI Mentor */}
            <Link to="/ai" className="block rounded-lg border border-primary/15 bg-primary/[0.03] p-5 hover:bg-primary/[0.06] transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Bot className="size-5 text-primary" />
                <span className="text-sm font-bold text-foreground">AI Mentor</span>
              </div>
              <p className="text-xs text-muted-foreground">Ask anything about cybersecurity. Get personalized guidance and challenge hints.</p>
            </Link>

            {/* Top Leaderboard */}
            {topThree.length > 0 && (
              <div className="rounded-lg border border-border bg-card/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Trophy className="size-4 text-amber-400" /> Top Operators
                  </h3>
                  <Link to="/leaderboard" className="text-[10px] font-mono text-primary hover:underline">View all</Link>
                </div>
                <div className="space-y-2">
                  {topThree.map((entry, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const tCfg = TIER_CONFIG[(entry.tier as Tier) || 'recruit'];
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-secondary/30">
                        <span className="text-sm">{medals[idx]}</span>
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="size-7 rounded-full object-cover" />
                        ) : (
                          <div className="size-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                            {(entry.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{entry.username}</p>
                          <p className="text-[9px] font-mono" style={{ color: tCfg.color }}>{tCfg.icon} {tCfg.label}</p>
                        </div>
                        <span className="text-[10px] font-mono text-primary">{(entry.total_xp || 0).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier Path */}
            <div className="rounded-lg border border-border bg-card/50 p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">Your Path</h3>
              <div className="space-y-1.5">
                {TIER_ORDER.map((t) => {
                  const cfg = TIER_CONFIG[t];
                  const isCurrent = t === stats.tier;
                  const unlocked = TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(stats.tier);
                  return (
                    <div key={t} className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg',
                      isCurrent ? 'bg-primary/[0.06] border border-primary/20' : ''
                    )}>
                      <span className="text-sm">{cfg.icon}</span>
                      <div className="flex-1">
                        <p className={cn(
                          'text-xs font-medium',
                          unlocked ? 'text-foreground' : 'text-muted-foreground/40'
                        )}>{cfg.label}</p>
                      </div>
                      {isCurrent && <span className="text-[9px] font-mono text-primary">CURRENT</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
