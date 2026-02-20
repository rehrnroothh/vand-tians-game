import { useEffect, useState } from 'react';
import LobbyScreen from '@/components/LobbyScreen';
import WaitingRoom from '@/components/WaitingRoom';
import OnlineGameBoard from '@/components/OnlineGameBoard';
import GameBoard from '@/components/GameBoard';
import { GameState, dealGame } from '@/lib/gameEngine';
import { supabase } from '@/integrations/supabase/client';

type Screen = 'lobby' | 'waiting' | 'game' | 'single';

interface RoomInfo {
  roomId: string;
  roomCode: string;
  sessionId: string;
  playerName: string;
  isHost: boolean;
  playerIndex: number;
}

const Index = () => {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [singlePlayerState, setSinglePlayerState] = useState<GameState | null>(null);

  // Handle deep link join codes (?join=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      // Pre-fill the code and switch to join mode by storing it
      localStorage.setItem('vt_pending_join', joinCode);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // If we're in waiting room, check if game already started (rejoin)
  useEffect(() => {
    if (screen === 'waiting' && roomInfo) {
      supabase.from('rooms').select('status').eq('id', roomInfo.roomId).single().then(({ data }) => {
        if (data?.status === 'playing') setScreen('game');
      });
    }
  }, [screen, roomInfo]);

  const handleJoined = (roomId: string, roomCode: string, sessionId: string, playerName: string, isHost: boolean) => {
    setRoomInfo({ roomId, roomCode, sessionId, playerName, isHost, playerIndex: 0 });
    setScreen('waiting');
  };

  const handleGameStart = async () => {
    if (!roomInfo) return;
    // Find our player index from the room
    const { data: players } = await supabase
      .from('room_players')
      .select()
      .eq('room_id', roomInfo.roomId)
      .order('player_index');
    
    const myPlayer = players?.find(p => p.session_id === roomInfo.sessionId);
    const idx = myPlayer?.player_index ?? 0;
    setRoomInfo(prev => prev ? { ...prev, playerIndex: idx } : prev);
    setScreen('game');
  };

  const handleSinglePlayerStart = (playerName: string) => {
    const game = dealGame([playerName, 'Robot']);
    setSinglePlayerState(game);
    setScreen('single');
  };

  if (screen === 'lobby') {
    return <LobbyScreen onJoined={handleJoined} onStartSinglePlayer={handleSinglePlayerStart} />;
  }

  if (screen === 'waiting' && roomInfo) {
    return (
      <WaitingRoom
        roomId={roomInfo.roomId}
        roomCode={roomInfo.roomCode}
        sessionId={roomInfo.sessionId}
        playerName={roomInfo.playerName}
        isHost={roomInfo.isHost}
        onGameStart={handleGameStart}
      />
    );
  }

  if (screen === 'game' && roomInfo) {
    return (
      <OnlineGameBoard
        roomId={roomInfo.roomId}
        sessionId={roomInfo.sessionId}
        playerIndex={roomInfo.playerIndex}
        onReset={() => setScreen('lobby')}
      />
    );
  }

  if (screen === 'single' && singlePlayerState) {
    return (
      <GameBoard
        initialState={singlePlayerState}
        onReset={() => {
          setSinglePlayerState(null);
          setScreen('lobby');
        }}
      />
    );
  }

  return null;
};

export default Index;
