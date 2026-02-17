import { useState } from 'react';
import PlayerSetup from '@/components/PlayerSetup';
import GameBoard from '@/components/GameBoard';
import { dealGame, GameState } from '@/lib/gameEngine';

const Index = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  if (!gameState) {
    return (
      <PlayerSetup
        onStart={(players) => setGameState(dealGame(players))}
      />
    );
  }

  return (
    <GameBoard
      initialState={gameState}
      onReset={() => setGameState(null)}
    />
  );
};

export default Index;
