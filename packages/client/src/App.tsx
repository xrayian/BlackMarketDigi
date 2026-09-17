import { useEffect } from 'react';
import { useGameStore } from './state/gameStore';
import { Lobby } from './ui/Lobby';
import { GameScene } from './scene/GameScene';
import { RulebookModal } from './ui/RulebookModal';
import './index.css';

export function App() {
  const phase = useGameStore((s) => s.phase);
  const isFullscreen = useGameStore((s) => s.isFullscreen);
  const setIsFullscreen = useGameStore((s) => s.setIsFullscreen);
  const isRulebookOpen = useGameStore((s) => s.isRulebookOpen);
  const openRulebook = useGameStore((s) => s.openRulebook);
  const closeRulebook = useGameStore((s) => s.closeRulebook);

  // Synchronize browser fullscreen state (e.g. Esc, F11, or browser controls)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFull = Boolean(
        document.fullscreenElement || (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [setIsFullscreen]);

  // Global hotkeys (? or F1 toggles the Nottingham Codex & Rulebook)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey) || e.key === 'F1') {
        e.preventDefault();
        if (isRulebookOpen) {
          closeRulebook();
        } else {
          openRulebook();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRulebookOpen, openRulebook, closeRulebook]);

  const isLobby = phase === 'LOBBY' || !phase;

  return (
    <div className={`w-full h-full min-h-screen ${isFullscreen ? 'immersive-viewport select-none' : ''}`}>
      {isLobby ? <Lobby /> : <GameScene />}
      <RulebookModal />
    </div>
  );
}
