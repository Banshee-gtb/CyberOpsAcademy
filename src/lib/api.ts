import { supabase } from '@/lib/supabase';
import type { Mission, Challenge, UserProfile, UserMissionProgress, UserChallengeProgress, Achievement, UserAchievement, AiConversation, AiMessage, LeaderboardEntry } from '@/types';

// ---- Missions ----
export async function fetchMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('is_published', true)
    .order('chapter', { ascending: true })
    .order('mission_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---- Challenges ----
export async function fetchChallengesByMission(missionId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('mission_id', missionId)
    .order('challenge_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---- User Profile ----
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

// ---- Mission Progress ----
export async function fetchUserMissionProgress(userId: string): Promise<UserMissionProgress[]> {
  const { data, error } = await supabase
    .from('user_mission_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertMissionProgress(userId: string, missionId: string, status: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_mission_progress')
    .upsert({
      user_id: userId,
      mission_id: missionId,
      status,
      started_at: status === 'in_progress' ? now : undefined,
      completed_at: status === 'completed' ? now : undefined,
    }, { onConflict: 'user_id,mission_id' });
  if (error) throw error;
}

// ---- Challenge Progress ----
export async function fetchUserChallengeProgress(userId: string): Promise<UserChallengeProgress[]> {
  const { data, error } = await supabase
    .from('user_challenge_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertChallengeProgress(
  userId: string,
  challengeId: string,
  status: string,
  score: number = 0,
  answer?: Record<string, unknown>
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_challenge_progress')
    .upsert({
      user_id: userId,
      challenge_id: challengeId,
      status,
      score,
      answer,
      completed_at: status === 'completed' ? now : undefined,
    }, { onConflict: 'user_id,challenge_id' });
  if (error) throw error;
}

// ---- Achievements ----
export async function fetchAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('xp_reward', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

// ---- Leaderboard ----
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, username, avatar_url, tier, level, total_xp, flags_captured, streak, challenges_completed')
    .order('total_xp', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// ---- AI Conversations ----
export async function fetchConversations(userId: string): Promise<AiConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createConversation(userId: string, title: string): Promise<AiConversation> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConversation(conversationId: string) {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId);
  if (error) throw error;
}

// ---- AI Messages ----
export async function fetchMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const { error } = await supabase
    .from('ai_messages')
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
}

// ---- AI Streaming ----
export async function streamAiChat(
  messages: { role: string; content: string }[],
  conversationId: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    onError('Not authenticated');
    return;
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages, conversationId }),
  });

  if (!response.ok) {
    const errText = await response.text();
    onError(errText);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch {
        // skip malformed chunks
      }
    }
  }
  onDone();
}
