import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Play } from 'lucide-react';

interface PlayerSetupProps {
  onStart: (players: string[]) => void;
}

const PlayerSetup = ({ onStart }: PlayerSetupProps) => {
  const [players, setPlayers] = useState<string[]>(['', '']);
  const [inputValue, setInputValue] = useState('');

  const addPlayer = () => {
    if (inputValue.trim()) {
      setPlayers([...players.filter(p => p), inputValue.trim()]);
      setInputValue('');
    } else {
      setPlayers([...players, '']);
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const updated = [...players];
    updated[index] = name;
    setPlayers(updated);
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const validPlayers = players.filter(p => p.trim());
  const canStart = validPlayers.length >= 2;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-5xl font-bold text-center mb-2 text-gold tracking-tight"
        >
          Vänd Tia
        </motion.h1>
        <p className="text-center text-muted-foreground mb-8">
          Lägg till spelare för att börja
        </p>

        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {players.map((player, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={player}
                    onChange={(e) => updatePlayer(index, e.target.value)}
                    placeholder={`Spelare ${index + 1}`}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                {players.length > 2 && (
                  <button
                    onClick={() => removePlayer(index)}
                    className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={addPlayer}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all mb-6"
        >
          <Plus size={18} />
          Lägg till spelare
        </button>

        <motion.button
          whileHover={{ scale: canStart ? 1.02 : 1 }}
          whileTap={{ scale: canStart ? 0.98 : 1 }}
          onClick={() => canStart && onStart(validPlayers)}
          disabled={!canStart}
          className="w-full py-4 rounded-xl bg-gold text-primary-foreground font-semibold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed glow-gold"
        >
          <span className="flex items-center justify-center gap-2">
            <Play size={20} />
            Starta spelet
          </span>
        </motion.button>

        {!canStart && (
          <p className="text-center text-muted-foreground text-sm mt-3">
            Minst 2 spelare krävs
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default PlayerSetup;
