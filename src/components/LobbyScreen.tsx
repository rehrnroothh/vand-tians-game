import { useState } from 'react';
import { motion } from 'framer-motion';
import { createRoom, joinRoom } from '@/lib/roomService';
import { Loader2, Plus, LogIn } from 'lucide-react';

interface LobbyScreenProps {
  onJoined: (roomId: string, roomCode: string, sessionId: string, playerName: string, isHost: boolean) => void;
  onStartSinglePlayer: (playerName: string) => void;
}

const LobbyScreen = ({ onJoined, onStartSinglePlayer }: LobbyScreenProps) => {
  const [mode, setMode] = useState<'home' | 'single' | 'create' | 'join'>('home');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    const result = await createRoom(name.trim());
    if (!result) {
      setError('Kunde inte skapa rum. Försök igen.');
      setLoading(false);
      return;
    }
    onJoined(result.room.id, result.room.code, result.player.session_id, name.trim(), true);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    setError('');
    const result = await joinRoom(code.trim(), name.trim());
    if (!result) {
      setError('Hittade inget rum med den koden. Kontrollera koden och försök igen.');
      setLoading(false);
      return;
    }
    const sessionId = localStorage.getItem('vt_session_id') ?? '';
    onJoined(result.room.id, result.room.code, sessionId, name.trim(), result.room.host_session_id === sessionId);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        <motion.h1
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-2 text-gold tracking-tight leading-tight px-2"
        >
          "Ska vi spela
          <br />
          vändtia??!"
        </motion.h1>
        <p className="text-center text-muted-foreground mb-10">- Kallekutt Froms</p>

        {mode === 'home' && (
          <div className="flex flex-col gap-4">
            <button onClick={() => setMode('single')} className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold text-lg flex items-center justify-center gap-2">
              🤖 Spela mot robot
            </button>
            <button onClick={() => setMode('create')} className="w-full py-4 rounded-xl bg-gold text-white font-semibold text-lg glow-gold flex items-center justify-center gap-2">
              <Plus size={20} /> Skapa nytt rum
            </button>
            <button onClick={() => setMode('join')} className="w-full py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-lg flex items-center justify-center gap-2">
              <LogIn size={20} /> Gå med i rum
            </button>
          </div>
        )}

        {mode === 'single' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Ditt namn</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Vad heter du?"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={20}
              />
            </div>

            <button
              onClick={() => onStartSinglePlayer(name.trim())}
              disabled={!name.trim()}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold text-lg disabled:opacity-40"
            >
              Starta mot robot
            </button>

            <button onClick={() => setMode('home')} className="w-full py-2 text-muted-foreground text-sm">
              ← Tillbaka
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Ditt namn</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Vad heter du?"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={20}
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Rumkod</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="T.ex. ABC123"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 tracking-widest text-center text-xl font-bold"
                  maxLength={6}
                />
              </div>
            )}

            {error && <p className="text-destructive text-sm text-center">{error}</p>}

            <button
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading || !name.trim() || (mode === 'join' && code.length < 6)}
              className="w-full py-4 rounded-xl bg-gold text-primary-foreground font-semibold text-lg glow-gold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : mode === 'create' ? 'Skapa rum' : 'Gå med'}
            </button>

            <button onClick={() => setMode('home')} className="w-full py-2 text-muted-foreground text-sm">
              ← Tillbaka
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LobbyScreen;
