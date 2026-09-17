import { create } from 'zustand';
import type { GamePhase } from '@sheriff/shared';

export interface ClientCard {
  id: string;
  name: string;
  classification: 'LEGAL' | 'CONTRABAND' | 'ROYAL';
  goodType?: string;
  contrabandType?: string;
  royalGoodType?: string;
  baseGood?: string;
  royalBonusCount?: number;
  value: number;
  penalty: number;
}

export interface ClientSealedBag {
  playerId: string;
  cardCount: number;
  declaredGood: string;
  declaredCount: number;
  isSnapped: boolean;
  isRevealed: boolean;
  cards: ClientCard[];
}

export interface ClientPlayer {
  id: string;
  sessionId: string;
  name: string;
  gold: number;
  ready: boolean;
  connected: boolean;
  seatIndex: number;
  isSheriff: boolean;
  isDeputy: boolean;
  handCount: number;
  hand: ClientCard[];
  standLegal: ClientCard[];
  standContrabandCount: number;
  standContraband: ClientCard[];
  standRoyal: ClientCard[];
  sealedBag?: ClientSealedBag;
  sheriffCount: number;
}

export interface ClientBribeOffer {
  id: string;
  sequenceNumber: number;
  fromPlayerId: string;
  toPlayerId: string;
  gold: number;
  standCardIds: string[];
  bagCardClaims: string[];
  nonBindingTerms: string;
  status: string;
}

interface GameStore {
  phase: GamePhase | null;
  roomId: string | null;
  localPlayerId: string | null;
  players: Map<string, ClientPlayer>;
  round: number;
  sheriffId: string | null;
  deputyIds: string[];
  activeMerchantId: string | null;
  drawPileCount: number;
  discardPile: ClientCard[];
  connected: boolean;
  activeBribe?: ClientBribeOffer;
  winnerId: string | null;
  winningScore: number;

  setPhase: (phase: GamePhase) => void;
  setRoomId: (id: string) => void;
  setLocalPlayerId: (id: string) => void;
  setConnected: (connected: boolean) => void;
  updateGameState: (state: any) => void;
  updatePlayers: (players: Map<string, ClientPlayer>) => void;
  reset: () => void;
}

const initialState = {
  phase: null as GamePhase | null,
  roomId: null as string | null,
  localPlayerId: null as string | null,
  players: new Map<string, ClientPlayer>(),
  round: 0,
  sheriffId: null as string | null,
  deputyIds: [] as string[],
  activeMerchantId: null as string | null,
  drawPileCount: 0,
  discardPile: [] as ClientCard[],
  connected: false,
  activeBribe: undefined as ClientBribeOffer | undefined,
  winnerId: null as string | null,
  winningScore: 0,
};

function mapCard(c: any): ClientCard {
  return {
    id: c.id,
    name: c.name,
    classification: c.classification,
    goodType: c.goodType || undefined,
    contrabandType: c.contrabandType || undefined,
    royalGoodType: c.royalGoodType || undefined,
    baseGood: c.baseGood || undefined,
    royalBonusCount: c.royalBonusCount || 0,
    value: c.value,
    penalty: c.penalty,
  };
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setRoomId: (id) => set({ roomId: id }),
  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  setConnected: (connected) => set({ connected }),
  updatePlayers: (players) => set({ players }),
  updateGameState: (state: any) => {
    if (!state) return;
    const players = new Map<string, ClientPlayer>();

    if (state.players && typeof state.players.forEach === 'function') {
      state.players.forEach((p: any, key: string) => {
        const hand: ClientCard[] = p.hand ? Array.from(p.hand).map(mapCard) : [];
        const standLegal: ClientCard[] = p.standLegal ? Array.from(p.standLegal).map(mapCard) : [];
        const standContraband: ClientCard[] = p.standContraband ? Array.from(p.standContraband).map(mapCard) : [];
        const standRoyal: ClientCard[] = p.standRoyal ? Array.from(p.standRoyal).map(mapCard) : [];

        let sealedBag: ClientSealedBag | undefined = undefined;
        if (p.sealedBag) {
          sealedBag = {
            playerId: p.sealedBag.playerId,
            cardCount: p.sealedBag.cardCount,
            declaredGood: p.sealedBag.declaredGood,
            declaredCount: p.sealedBag.declaredCount,
            isSnapped: p.sealedBag.isSnapped,
            isRevealed: p.sealedBag.isRevealed,
            cards: p.sealedBag.cards ? Array.from(p.sealedBag.cards).map(mapCard) : [],
          };
        }

        players.set(key, {
          id: p.id,
          sessionId: p.sessionId || key,
          name: p.name,
          gold: p.gold,
          ready: p.ready,
          connected: p.connected,
          seatIndex: p.seatIndex,
          isSheriff: p.isSheriff,
          isDeputy: p.isDeputy,
          handCount: p.handCount || hand.length,
          hand,
          standLegal,
          standContrabandCount: p.standContrabandCount || 0,
          standContraband,
          standRoyal,
          sealedBag,
          sheriffCount: p.sheriffCount || 0,
        });
      });
    }

    const discardPile: ClientCard[] = state.discardPile
      ? Array.from(state.discardPile).map(mapCard)
      : [];

    let activeBribe: ClientBribeOffer | undefined = undefined;
    if (state.activeBribe) {
      activeBribe = {
        id: state.activeBribe.id,
        sequenceNumber: state.activeBribe.sequenceNumber || 1,
        fromPlayerId: state.activeBribe.fromPlayerId,
        toPlayerId: state.activeBribe.toPlayerId,
        gold: state.activeBribe.gold || 0,
        standCardIds: state.activeBribe.standCardIds ? Array.from(state.activeBribe.standCardIds) : [],
        bagCardClaims: state.activeBribe.bagCardClaims ? Array.from(state.activeBribe.bagCardClaims) : [],
        nonBindingTerms: state.activeBribe.nonBindingTerms || '',
        status: state.activeBribe.status || 'PROPOSED',
      };
    }

    set({
      phase: state.phase as GamePhase,
      round: state.round || 0,
      sheriffId: state.sheriffId || null,
      deputyIds: state.deputyIds ? Array.from(state.deputyIds) : [],
      activeMerchantId: state.activeMerchantId || null,
      drawPileCount: state.drawPileCount || 0,
      discardPile,
      players,
      activeBribe,
      winnerId: state.winnerId || null,
      winningScore: state.winningScore || 0,
    });
  },
  reset: () => set(initialState),
}));
