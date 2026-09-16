import { useGameStore } from './state/gameStore';
import { Lobby } from './ui/Lobby';
import { GameScene } from './scene/GameScene';
import './index.css';

export function App() {
  const phase = useGameStore((s) => s.phase);

  if (phase === 'LOBBY' || !phase) {
    return <Lobby />;
  }

  return <GameScene />;
}
