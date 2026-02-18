import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { RoomPlayer, startGame } from '@/lib/roomService';
import { Copy, Check, Users, Play } from 'lucide-react';

interface WaitingRoomProps {
  roomId: string;
  roomCode: string;
  sessionId: string;
  playerName: string;
  isHost: boolean;
  onGameStart: () => void;
}

const WaitingRoom = ({ roomId, roomCode, sessionId, isHost, onGameStart }: WaitingRoomProps) => {
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Initial fetch
    supabase.from('room_players').select().eq('room_id', roomId).then(({ data }) => {
      if (data) setPlayers(data as RoomPlayer[]);
    });

    // Realtime subscription for players
    const channel = supabase
      .channel(`room-${roomId}-players`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => {
        supabase.from('room_players').select().eq('room_id', roomId).then(({ data }) => {
          if (data) setPlayers(data as RoomPlayer[]);
        });
      })
      .subscribe();

    // Listen for game start
    const roomChannel = supabase
      .channel(`room-${roomId}-status`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new.status === 'playing') {
          onGameStart();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, onGameStart]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (players.length < 2) return;
    setStarting(true);
    const sorted = [...players].sort((a, b) => (a.player_index ?? 0) - (b.player_index ?? 0));
    await startGame(roomId, sorted.map(p => p.name));
    setStarting(false);
  };

  const shareUrl = `${window.location.origin}?join=${roomCode}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Vänd Tia', text: `Gå med i mitt spel! Koden är: ${roomCode}`, url: shareUrl });
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-1 text-gold">Väntar på spelare</h1>
        <p className="text-center text-muted-foreground mb-6">Bjud in fölket!</p>

        {/* Room code display */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Rumkod</p>
          <p className="text-5xl font-bold tracking-[0.3em] text-gold mb-4">{roomCode}</p>
          <div className="flex gap-2">
            <button onClick={handleShare} className="flex-1 py-2.5 rounded-xl bg-gold text-primary-foreground font-medium flex items-center justify-center gap-2 glow-gold">
              Dela inbjudan
            </button>
            <button onClick={handleCopyCode} className="px-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground">
              {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* Players list */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{players.length} spelare</span>
          </div>
          <AnimatePresence>
            {players.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-gold font-bold text-sm">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{p.name}</span>
                {p.session_id === sessionId && <span className="text-xs text-muted-foreground ml-auto">(du)</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={players.length < 2 || starting}
            className="w-full py-4 rounded-xl bg-gold text-primary-foreground font-semibold text-lg glow-gold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Play size={20} />
            {starting ? 'Startar...' : players.length < 2 ? 'Väntar på fler...' : 'Starta spelet!'}
          </button>
        ) : (
          <p className="text-center text-muted-foreground">Väntar på att värden startar...</p>
        )}
      </motion.div>
    </div>
  );
};

export default WaitingRoom;
