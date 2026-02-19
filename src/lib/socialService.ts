import { supabase } from '@/integrations/supabase/client';

// ─── Auth helpers ───────────────────────────────────────

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(cb: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user?.id ?? null);
  });
}

// ─── Profile helpers ────────────────────────────────────

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  return data;
}

export async function updateProfile(fields: { display_name?: string; avatar_url?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('user_id', user.id);
  if (error) throw error;
}

// ─── Game result helpers ────────────────────────────────

export async function recordGameResult(roomId: string, isWin: boolean, playerCount: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // anonymous players won't record
  const { error } = await supabase.from('game_results').insert({
    user_id: user.id,
    room_id: roomId,
    is_win: isWin,
    player_count: playerCount,
  });
  if (error) throw error;
}

export async function getMyStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { wins: 0, losses: 0, total: 0 };
  const { data } = await supabase
    .from('game_results')
    .select('is_win')
    .eq('user_id', user.id);
  const wins = data?.filter(r => r.is_win).length ?? 0;
  const total = data?.length ?? 0;
  return { wins, losses: total - wins, total };
}

// ─── Friendship helpers ─────────────────────────────────

export async function sendFriendRequest(addresseeUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: addresseeUserId,
  });
  if (error) throw error;
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', friendshipId);
  if (error) throw error;
}

export async function getMyFriends() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('friendships')
    .select('*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted');
  return data ?? [];
}

export async function getPendingRequests() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('friendships')
    .select('*, requester:profiles!friendships_requester_id_fkey(*)')
    .eq('addressee_id', user.id)
    .eq('status', 'pending');
  return data ?? [];
}
