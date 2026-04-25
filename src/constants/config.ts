import type { Tier } from '@/types';

export const APP_NAME = 'CyberNinja';

export const TIER_CONFIG: Record<Tier, { label: string; color: string; minLevel: number; maxLevel: number; icon: string }> = {
  recruit: { label: 'Recruit', color: '#6b7280', minLevel: 1, maxLevel: 10, icon: '🔰' },
  analyst: { label: 'Analyst', color: '#06b6d4', minLevel: 11, maxLevel: 25, icon: '🛡️' },
  operative: { label: 'Operative', color: '#a855f7', minLevel: 26, maxLevel: 45, icon: '⚔️' },
  specialist: { label: 'Specialist', color: '#f59e0b', minLevel: 46, maxLevel: 70, icon: '🎯' },
  elite: { label: 'Elite Operator', color: '#ef4444', minLevel: 71, maxLevel: 100, icon: '💀' },
};

export const TIER_ORDER: Tier[] = ['recruit', 'analyst', 'operative', 'specialist', 'elite'];

export const XP_PER_LEVEL = 500;

export function calculateLevel(totalXp: number): { level: number; xp: number; xpToNext: number; tier: Tier } {
  const level = Math.max(1, Math.floor(totalXp / XP_PER_LEVEL) + 1);
  const xp = totalXp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL;
  let tier: Tier = 'recruit';
  for (const t of TIER_ORDER) {
    if (level >= TIER_CONFIG[t].minLevel) tier = t;
  }
  return { level, xp, xpToNext, tier };
}
