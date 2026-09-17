import { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, type ClientPlayer } from '../state/gameStore';
import { network } from '../net/colyseus';
import { Table } from './components/Table';
import { TavernLighting } from './components/TavernLighting';
import { CameraRig } from './components/CameraRig';
import { TavernEffects } from './components/TavernEffects';
import { MarketPanel } from '../ui/MarketPanel';
import { BagLoadingPanel } from '../ui/BagLoadingPanel';
import { DeclarationPanel } from '../ui/DeclarationPanel';
import { ErrorToast } from '../ui/ErrorToast';

export function GameScene() {
  const phase = useGameStore((s) => s.phase);
  const round = useGameStore((s) => s.round);
  const sheriffId = useGameStore((s) => s.sheriffId);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const drawPileCount = useGameStore((s) => s.drawPileCount);
  const discardPile = useGameStore((s) => s.discardPile);
  const playersMap = useGameStore((s) => s.players);

  // Convert players Map to array, ordered by seatIndex
  const players = useMemo(() => {
    const list = Array.from(playersMap.values()).sort(
      (a, b) => a.seatIndex - b.seatIndex
    );

    // If no players are connected yet (e.g. scene preview), provide default 4-player mockup
    if (list.length === 0) {
      const mockups: ClientPlayer[] = [
        {
          id: 'p1',
          sessionId: 'p1',
          name: 'Robin',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 0,
          isSheriff: true,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [
            { id: '1', name: 'Apples', classification: 'LEGAL', goodType: 'APPLE', value: 2, penalty: 2 },
            { id: '2', name: 'Apples', classification: 'LEGAL', goodType: 'APPLE', value: 2, penalty: 2 },
          ],
          standContrabandCount: 2,
          standContraband: [],
          standRoyal: [],
          sheriffCount: 0,
        },
        {
          id: 'p2',
          sessionId: 'p2',
          name: 'Marian',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 1,
          isSheriff: false,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [
            { id: '3', name: 'Cheese', classification: 'LEGAL', goodType: 'CHEESE', value: 3, penalty: 2 },
          ],
          standContrabandCount: 0,
          standContraband: [],
          standRoyal: [],
          sheriffCount: 0,
        },
        {
          id: 'p3',
          sessionId: 'p3',
          name: 'Little John',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 2,
          isSheriff: false,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [
            { id: '4', name: 'Bread', classification: 'LEGAL', goodType: 'BREAD', value: 3, penalty: 2 },
            { id: '5', name: 'Chicken', classification: 'LEGAL', goodType: 'CHICKEN', value: 4, penalty: 2 },
          ],
          standContrabandCount: 1,
          standContraband: [],
          standRoyal: [],
          sheriffCount: 0,
        },
        {
          id: 'p4',
          sessionId: 'p4',
          name: 'Friar Tuck',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 3,
          isSheriff: false,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [],
          standContrabandCount: 0,
          standContraband: [],
          standRoyal: [],
          sheriffCount: 0,
        },
      ];
      return mockups;
    }

    return list;
  }, [playersMap]);

  const sheriffPlayer = players.find((p) => p.isSheriff || p.id === sheriffId);
  const activePlayer = players.find((p) => p.id === activeMerchantId);
  const localPlayer = players.find((p) => p.id === localPlayerId);
  const discardTop = discardPile.length > 0 ? discardPile[discardPile.length - 1] : undefined;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-tavern-bg select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 5.4, 6.8], fov: 46, near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0b0907');
        }}
      >
        <Suspense fallback={null}>
          <CameraRig />
          <TavernLighting />
          <Table
            players={players}
            localPlayerId={localPlayerId}
            activeMerchantId={activeMerchantId}
            drawPileCount={drawPileCount}
            discardPileTop={discardTop}
          />
          <TavernEffects />
        </Suspense>
      </Canvas>

      {/* 2D HUD Top Header Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        {/* Game & Round Info */}
        <div className="flex items-center gap-3 bg-tavern-bg/90 border border-tavern-border px-4 py-2 rounded-xl backdrop-blur-md shadow-2xl">
          <span className="font-display font-black text-gold text-lg tracking-wider">
            NOTTINGHAM
          </span>
          <span className="w-1 h-4 bg-tavern-border rounded-full" />
          <span className="font-display text-sm text-parchment">
            Round <span className="font-bold text-gold">{round || 1}</span>
          </span>
          {sheriffPlayer && (
            <>
              <span className="w-1 h-4 bg-tavern-border rounded-full" />
              <span className="font-display text-xs text-gold flex items-center gap-1.5 bg-gold/15 px-2.5 py-1 rounded-md border border-gold/30">
                <span>⭐ Sheriff:</span>
                <span className="font-bold text-white">{sheriffPlayer.name}</span>
              </span>
            </>
          )}
        </div>

        {/* Current Phase Banner */}
        <div className="flex items-center gap-2 bg-tavern-bg/95 border border-gold/70 px-6 py-2 rounded-xl backdrop-blur-md shadow-2xl">
          <span className="font-display text-xs text-gold-muted uppercase tracking-widest">Phase:</span>
          <span className="font-display font-black text-sm text-gold tracking-widest uppercase">
            {phase?.replace('_', ' ') || 'MARKET'}
          </span>
          {activePlayer && (
            <span className="ml-2 text-xs font-display px-2 py-0.5 rounded bg-emerald/20 border border-emerald/50 text-emerald font-bold animate-pulse">
              {activePlayer.name}'s Turn
            </span>
          )}
        </div>

        {/* Right Action Menu */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => network.leave()}
            className="px-3.5 py-1.5 rounded-lg bg-tavern-bg/85 border border-tavern-border text-gold-muted hover:text-crimson hover:border-crimson/60 transition-colors font-display text-xs tracking-wider uppercase backdrop-blur-md shadow-lg"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Phase 4: Core Loop UI Panels */}
      <MarketPanel />
      <BagLoadingPanel />
      <DeclarationPanel />
      <ErrorToast />

      {/* Local Player Quick Stats Bar at Bottom Center */}
      {localPlayer && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-tavern-bg/95 border border-tavern-border px-6 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display text-gold-muted uppercase tracking-wider">Your Stand:</span>
            <span className="font-display font-bold text-white text-sm">{localPlayer.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gold font-display font-bold text-sm">
            <span>🪙</span>
            <span>{localPlayer.gold} Gold</span>
          </div>
          <div className="flex items-center gap-1.5 text-parchment font-display text-sm">
            <span>🃏</span>
            <span>{localPlayer.handCount} Cards in Hand</span>
          </div>
        </div>
      )}
    </div>
  );
}
