import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserProfile, fetchUserMissionProgress, fetchUserAchievements, fetchMissions, updateUserProfile } from '@/lib/api';
import { calculateLevel, TIER_CONFIG, TIER_ORDER } from '@/constants/config';
import type { UserProfile, UserAchievement, Mission, UserMissionProgress } from '@/types';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import { Zap, Crosshair, Flag, Flame, Trophy, Settings, LogOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<UserMissionProgress[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');

  useEffect(() => {
    if (!authUser) return;
    Promise.all([
      fetchUserProfile(authUser.id),
      fetchMissions(),
      fetchUserMissionProgress(authUser.id),
      fetchUserAchievements(authUser.id),
    ]).then(([prof, miss, prog, ach]) => {
      setProfile(prof);
      setMissions(miss);
      setProgress(prog);
      setAchievements(ach);
      setEditBio(prof?.bio || '');
      setEditUsername(prof?.username || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authUser]);

  const handleSave = async () => {
    if (!authUser) return;
    try {
      await updateUserProfile(authUser.id, { bio: editBio, username: editUsername });
      setProfile((p) => p ? { ...p, bio: editBio, username: editUsername } : p);
      setEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  const stats = calculateLevel(profile?.total_xp ?? 0);
  const tierCfg = TIER_CONFIG[stats.tier];
  const completedMissions = progress.filter((p) => p.status === 'completed').length;

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* Header */}
      <div className="border-b border-border bg-card/30 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-20 rounded-full object-cover ring-2 ring-primary/30" />
          ) : (
            <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
              {(profile?.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            {editing ? (
              <input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="text-2xl font-extrabold bg-transparent border-b border-primary/30 text-foreground outline-none mb-1"
              />
            ) : (
              <h1 className="text-2xl font-extrabold text-foreground">{profile?.username}</h1>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap mt-1">
              <span className="font-medium" style={{ color: tierCfg.color }}>{tierCfg.icon} {tierCfg.label}</span>
              <span className="font-mono">Level {stats.level}</span>
              {(profile?.streak ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Flame className="size-3.5" />{profile?.streak}d
                </span>
              )}
            </div>

            {/* XP */}
            <div className="max-w-sm mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-muted-foreground font-mono">Level {stats.level} → {stats.level + 1}</span>
                <span className="font-mono text-foreground">{stats.xp}/{stats.xpToNext}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary animate-fill" style={{ width: `${(stats.xp / stats.xpToNext) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <Button onClick={handleSave} size="sm" className="bg-primary text-primary-foreground"><Save className="size-4 mr-1" />Save</Button>
            ) : (
              <Button onClick={() => setEditing(true)} variant="ghost" size="sm" className="text-muted-foreground"><Settings className="size-4 mr-1" />Edit</Button>
            )}
            <Button onClick={() => signOut()} variant="ghost" size="sm" className="text-muted-foreground"><LogOut className="size-4 mr-1" />Sign Out</Button>
          </div>
        </div>

        {/* Bio */}
        {editing ? (
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="Write a short bio..."
            className="mt-3 w-full max-w-md p-2 rounded-lg border border-border bg-secondary/50 text-sm text-foreground resize-none outline-none"
            rows={2}
          />
        ) : profile?.bio ? (
          <p className="mt-3 text-sm text-muted-foreground max-w-md">{profile.bio}</p>
        ) : null}
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total XP', value: (profile?.total_xp ?? 0).toLocaleString(), icon: Zap, color: 'text-primary' },
            { label: 'Missions', value: `${completedMissions}/${missions.length}`, icon: Crosshair, color: 'text-violet-400' },
            { label: 'Flags', value: profile?.flags_captured ?? 0, icon: Flag, color: 'text-amber-400' },
            { label: 'Challenges', value: profile?.challenges_completed ?? 0, icon: Trophy, color: 'text-emerald-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`size-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Tier Path */}
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-lg border border-border bg-card/50 p-5">
              <h3 className="text-base font-bold text-foreground mb-4">Tier Progression</h3>
              <div className="space-y-2">
                {TIER_ORDER.map((t, idx) => {
                  const cfg = TIER_CONFIG[t];
                  const isCurrent = t === stats.tier;
                  const unlocked = idx <= TIER_ORDER.indexOf(stats.tier);
                  return (
                    <div key={t} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isCurrent ? 'bg-primary/[0.06] border border-primary/20' : ''}`}>
                      <span className="text-base">{cfg.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${unlocked ? 'text-foreground' : 'text-muted-foreground/40'}`}>{cfg.label}</p>
                        <p className="text-[10px] text-muted-foreground">Level {cfg.minLevel}–{cfg.maxLevel}</p>
                      </div>
                      {isCurrent && <span className="text-[10px] font-mono text-primary">CURRENT</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="col-span-12 lg:col-span-7">
            <div className="rounded-lg border border-border bg-card/50 p-5">
              <h3 className="text-base font-bold text-foreground mb-4">Achievements ({achievements.length})</h3>
              {achievements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Complete challenges to earn achievements.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {achievements.map((ua) => (
                    <div key={ua.id} className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                      <span className="text-2xl">{ua.achievement?.icon || '🏆'}</span>
                      <p className="text-xs font-medium text-foreground mt-1">{ua.achievement?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{ua.achievement?.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Missions */}
            <div className="rounded-lg border border-border bg-card/50 p-5 mt-4">
              <h3 className="text-base font-bold text-foreground mb-4">Completed Missions</h3>
              {completedMissions === 0 ? (
                <p className="text-sm text-muted-foreground">No missions completed yet.</p>
              ) : (
                <div className="space-y-2">
                  {progress
                    .filter((p) => p.status === 'completed')
                    .map((p) => {
                      const m = missions.find((x) => x.id === p.mission_id);
                      if (!m) return null;
                      return (
                        <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-secondary/20">
                          <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary font-mono text-xs font-bold">
                            {m.chapter}.{m.mission_order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{m.codename}</p>
                          </div>
                          <span className="text-xs font-mono text-primary">+{m.xp_reward}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
