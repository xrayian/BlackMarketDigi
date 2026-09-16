import { create } from 'zustand';
import type { GamePhase } from '@sheriff/shared';

interface Player {
  id: string;
  name: string;
  gold: number;
  ready: boolean;
  seatIndex: number;
}

interface GameStore {
  phase: GamePhase | null;
  roomId: string | null;
  localPlayerId: string | null;
  players: Map<string, Player>;
  round: number;
  sheriffId: string | null;
  connected: boolean;

  setPhase: (phase: GamePhase) => void;
  setRoomId: (id: string) => void;
  setLocalPlayerId: (id: string) => void;
  setConnected: (connected: boolean) => void;
  updatePlayers: (players: Map<string, Player>) => void;
  reset: () => void;
}

const initialState = {
  phase: null as GamePhase | null,
  roomId: null as string | null,
  localPlayerId: null as string | null,
  players: new Map<string, Player>(),
  round: 0,
  sheriffId: null as string | null,
  connected: false,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setRoomId: (id) => set({ roomId: id }),
  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  setConnected: (connected) => set({ connected }),
  updatePlayers: (players) => set({ players }),
  reset: () => set(initialState),
}));
