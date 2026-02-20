import { supabase } from '@/integrations/supabase/client';
import { dealGame, GameState } from './gameEngine';

export interface Room {
  id: string;
  code: string;
  host_session_id: string;
  status: 'lobby' | 'playing' | 'finished';
  game_state: GameState | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  session_id: string;
  name: string;
  is_ready: boolean;
  player_index: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRoom = (r: any): Room => ({ ...r, game_state: r.game_state ?? null }) as Room;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPlayer = (p: any): RoomPlayer => p as RoomPlayer;

const generateCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const validatePlayerName = (name: string): string => {
  const trimmed = name.trim().substring(0, 50);
  if (trimmed.length === 0) {
    throw new Error('Player name cannot be empty');
  }
  return trimmed;
};

export const getOrCreateSessionId = (): string => {
  let id = localStorage.getItem('vt_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('vt_session_id', id);
  }
  return id;
};

export const createRoom = async (hostName: string): Promise<{ room: Room; player: RoomPlayer } | null> => {
  const validName = validatePlayerName(hostName);
  const sessionId = getOrCreateSessionId();
  const code = generateCode();

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({ code, host_session_id: sessionId, status: 'lobby' })
    .select()
    .single();

  if (roomErr || !room) {
    console.error(roomErr);
    return null;
  }

  const { data: player, error: playerErr } = await supabase
    .from('room_players')
    .insert({ room_id: room.id, session_id: sessionId, name: validName, is_ready: false, player_index: 0 })
    .select()
    .single();

  if (playerErr || !player) {
    console.error(playerErr);
    return null;
  }

  return { room: toRoom(room), player: toPlayer(player) };
};

export const joinRoom = async (code: string, playerName: string): Promise<{ room: Room; player: RoomPlayer } | null> => {
  const validName = validatePlayerName(playerName);
  const sessionId = getOrCreateSessionId();

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single();

  if (roomErr || !room) return null;
  if (room.status !== 'lobby') return null;

  // Check if already in room
  const { data: existing } = await supabase
    .from('room_players')
    .select()
    .eq('room_id', room.id)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    return { room: toRoom(room), player: toPlayer(existing) };
  }

  const { data: players } = await supabase
    .from('room_players')
    .select()
    .eq('room_id', room.id);

  const playerIndex = (players?.length ?? 0);

  const { data: player, error: playerErr } = await supabase
    .from('room_players')
    .insert({ room_id: room.id, session_id: sessionId, name: validName, is_ready: false, player_index: playerIndex })
    .select()
    .single();

  if (playerErr || !player) {
    console.error(playerErr);
    return null;
  }

  return { room: toRoom(room), player: toPlayer(player) };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const startGame = async (roomId: string, playerNames: string[]): Promise<void> => {
  const gameState = dealGame(playerNames);
  await supabase
    .from('rooms')
    .update({ status: 'playing', game_state: gameState as unknown as any })
    .eq('id', roomId);
};

export const updateGameState = async (roomId: string, gameState: GameState): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase
    .from('rooms')
    .update({ game_state: gameState as unknown as any })
    .eq('id', roomId);
};
