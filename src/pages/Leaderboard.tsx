import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchLeaderboard } from '@/lib/api';
import { TIER_CONFIG } from '@/constants/config';
import type { LeaderboardEntry, Tier } from '@/types';
import { Trophy, Search, Medal } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLeaderboard()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(
    (e) => !search || e.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="border-b border-border bg-card/30 p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="size-5 text-amber-400" />
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground">Leaderboard</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {entries.length > 0 ? `${entries.length} operators ranked by XP` : 'Be the first operator on the board'}
        </p>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search operators..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="p-6 lg:p-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Medal className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-1">No operators yet</h2>
            <p className="text-sm text-muted-foreground">Complete missions and challenges to appear on the leaderboard.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase border-b border-border mb-1">
              <span className="w-10 text-center">#</span>
              <span className="ml-4">Operator</span>
              <span className="ml-auto flex gap-6">
                <span className="w-16 text-right">Level</span>
                <span className="w-20 text-right">XP</span>
              </span>
            </div>

            {filtered.map((entry, idx) => {
              const tierCfg = TIER_CONFIG[(entry.tier as Tier) || 'recruit'];
              const isMe = entry.id === user?.id;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center px-4 py-3 rounded-lg mb-1 transition-colors ${
                    isMe ? 'bg-primary/[0.06] border border-primary/20' : 'hover:bg-card/50'
                  }`}
                >
                  <span className="w-10 text-center text-sm font-bold font-mono text-muted-foreground">
                    {idx < 3 ? medals[idx] : idx + 1}
                  </span>
                  <div className="flex items-center gap-3 ml-4">
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <div className="size-9 rounded-full bg-secondary flex items-center justify-center font-bold text-sm text-foreground">
                        {(entry.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.username || 'Anonymous'}</p>
                      <p className="text-[10px] font-mono" style={{ color: tierCfg.color }}>{tierCfg.icon} {tierCfg.label}</p>
                    </div>
                  </div>
                  <div className="ml-auto flex gap-6 items-center">
                    <span className="w-16 text-right font-mono text-sm text-foreground">{entry.level}</span>
                    <span className="w-20 text-right font-mono text-sm text-primary font-medium">{(entry.total_xp || 0).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
