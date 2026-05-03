export type Tier = 'recruit' | 'analyst' | 'operative' | 'specialist' | 'elite';
export type ChallengeType = 'ctf' | 'quiz' | 'code' | 'terminal' | 'scenario';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  display_name: string;
  tier: Tier;
  level: number;
  xp: number;
  total_xp: number;
  xp_to_next: number;
  streak: number;
  flags_captured: number;
  challenges_completed: number;
  last_active_at: string;
  bio: string;
}

export interface Mission {
  id: string;
  chapter: number;
  mission_order: number;
  title: string;
  codename: string;
  description: string;
  story_intro: string;
  story_outro: string;
  lesson_content: string;
  tier_required: Tier;
  xp_reward: number;
  is_published: boolean;
  created_at: string;
}

export interface Challenge {
  id: string;
  mission_id: string;
  challenge_order: number;
  type: ChallengeType;
  title: string;
  description: string;
  content: Record<string, unknown>;
  lesson_content: string;
  xp_reward: number;
  difficulty: string;
  created_at: string;
}

export interface UserMissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  score: number;
  answer: Record<string, unknown> | null;
  completed_at: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  criteria: Record<string, unknown>;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string;
  tier: Tier;
  level: number;
  total_xp: number;
  flags_captured: number;
  streak: number;
  challenges_completed: number;
}
