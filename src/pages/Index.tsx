import { useState } from 'react';
import PlayerSetup from '@/components/PlayerSetup';
import GameBoard from '@/components/GameBoard';

const Index = () => {
  const [players, setPlayers] = useState<string[] | null>(null);

  if (!players) {
    return <PlayerSetup onStart={setPlayers} />;
  }

  return <GameBoard players={players} onReset={() => setPlayers(null)} />;
};

export default Index;
