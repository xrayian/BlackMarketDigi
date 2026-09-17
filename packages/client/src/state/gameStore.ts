import { create } from 'zustand';
import type { GamePhase, InspectionResultMessage } from '@sheriff/shared';
import { soundManager } from '../audio/soundManager';

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
  standRoyalCount: number;
  standRoyal: ClientCard[];
  hasClaimedBlackMarketThisRound: boolean;
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

export interface ClientBlackMarketOrder {
  id: string;
  name: string;
  contrabandType: string;
  requiredCount: number;
  pointsValue: number;
}

export interface ClientBootyTile {
  gold: number;
  goodsCount: number;
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
  bribeOffers: ClientBribeOffer[];
  winnerId: string | null;
  winningScore: number;

  // Module Expansion State
  enableRoyalGoods: boolean;
  enableDeputies: boolean;
  enableBlackMarket: boolean;
  maxPlayers: number;
  bootyTile?: ClientBootyTile;
  blackMarketPepperPile: ClientBlackMarketOrder[];
  blackMarketMeadPile: ClientBlackMarketOrder[];
  blackMarketSilkPile: ClientBlackMarketOrder[];

  // Phase 4 UI state
  selectedCardIds: string[];
  errorMessage: string | null;
  errorTimestamp: number;

  // Phase 5 Inspection & Bribe state
  lastInspectionResult: InspectionResultMessage | null;
  bribeReactionCooldown: boolean;

  // Phase 7 Settings & Accessibility
  reducedMotion: boolean;
  soundEnabled: boolean;
  ambientEnabled: boolean;

  setPhase: (phase: GamePhase) => void;
  setRoomId: (id: string) => void;
  setLocalPlayerId: (id: string) => void;
  setConnected: (connected: boolean) => void;
  updateGameState: (state: any) => void;
  updatePlayers: (players: Map<string, ClientPlayer>) => void;
  toggleCardSelection: (cardId: string) => void;
  addCardToSelection: (cardId: string) => void;
  removeCardFromSelection: (cardId: string) => void;
  clearSelection: () => void;
  setError: (message: string) => void;
  clearError: () => void;
  setLastInspectionResult: (result: InspectionResultMessage | null) => void;
  setBribeReactionCooldown: (cooldown: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAmbientEnabled: (enabled: boolean) => void;
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
  bribeOffers: [] as ClientBribeOffer[],
  winnerId: null as string | null,
  winningScore: 0,
  enableRoyalGoods: false,
  enableDeputies: false,
  enableBlackMarket: false,
  maxPlayers: 4,
  bootyTile: undefined as ClientBootyTile | undefined,
  blackMarketPepperPile: [] as ClientBlackMarketOrder[],
  blackMarketMeadPile: [] as ClientBlackMarketOrder[],
  blackMarketSilkPile: [] as ClientBlackMarketOrder[],
  selectedCardIds: [] as string[],
  errorMessage: null as string | null,
  errorTimestamp: 0,
  lastInspectionResult: null as InspectionResultMessage | null,
  bribeReactionCooldown: false,
  reducedMotion: false,
  soundEnabled: true,
  ambientEnabled: true,
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
          standRoyalCount: p.standRoyalCount || standRoyal.length,
          standRoyal,
          hasClaimedBlackMarketThisRound: Boolean(p.hasClaimedBlackMarketThisRound),
          sealedBag,
          sheriffCount: p.sheriffCount || 0,
        });
      });
    }

    const discardPile: ClientCard[] = state.discardPile
      ? Array.from(state.discardPile).map(mapCard)
      : [];

    const mapBribe = (b: any): ClientBribeOffer => ({
      id: b.id,
      sequenceNumber: b.sequenceNumber || 1,
      fromPlayerId: b.fromPlayerId,
      toPlayerId: b.toPlayerId,
      gold: b.gold || 0,
      standCardIds: b.standCardIds ? Array.from(b.standCardIds) : [],
      bagCardClaims: b.bagCardClaims ? Array.from(b.bagCardClaims) : [],
      nonBindingTerms: b.nonBindingTerms || '',
      status: b.status || 'PROPOSED',
    });

    let activeBribe: ClientBribeOffer | undefined = undefined;
    if (state.activeBribe) {
      activeBribe = mapBribe(state.activeBribe);
    }

    const bribeOffers: ClientBribeOffer[] = state.bribeOffers
      ? Array.from(state.bribeOffers).map(mapBribe)
      : [];

    let bootyTile: ClientBootyTile | undefined = undefined;
    if (state.bootyTile) {
      bootyTile = {
        gold: state.bootyTile.gold || 0,
        goodsCount: state.bootyTile.goods ? state.bootyTile.goods.length : 0,
      };
    }

    const mapBMOrder = (o: any): ClientBlackMarketOrder => ({
      id: o.id,
      name: o.name,
      contrabandType: o.contrabandType,
      requiredCount: o.requiredCount || 3,
      pointsValue: o.pointsValue || 0,
    });

    const blackMarketPepperPile: ClientBlackMarketOrder[] = state.blackMarketPepperPile
      ? Array.from(state.blackMarketPepperPile).map(mapBMOrder)
      : [];
    const blackMarketMeadPile: ClientBlackMarketOrder[] = state.blackMarketMeadPile
      ? Array.from(state.blackMarketMeadPile).map(mapBMOrder)
      : [];
    const blackMarketSilkPile: ClientBlackMarketOrder[] = state.blackMarketSilkPile
      ? Array.from(state.blackMarketSilkPile).map(mapBMOrder)
      : [];

    const prev = useGameStore.getState();
    const phaseChanged = prev.phase !== state.phase;
    const merchantChanged = prev.activeMerchantId !== state.activeMerchantId;
    const bribeUpdated = Boolean(
      activeBribe &&
      prev.activeBribe &&
      activeBribe.sequenceNumber !== prev.activeBribe.sequenceNumber
    );

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
      bribeOffers,
      winnerId: state.winnerId || null,
      winningScore: state.winningScore || 0,
      enableRoyalGoods: Boolean(state.enableRoyalGoods),
      enableDeputies: Boolean(state.enableDeputies),
      enableBlackMarket: Boolean(state.enableBlackMarket),
      maxPlayers: state.maxPlayers || 4,
      bootyTile,
      blackMarketPepperPile,
      blackMarketMeadPile,
      blackMarketSilkPile,
      selectedCardIds: (phaseChanged || merchantChanged) ? [] : prev.selectedCardIds,
    });

    // Trigger 1.5s reaction buffer lock if active bribe offer terms updated (docs/architecture.md §6.2)
    if (bribeUpdated) {
      set({ bribeReactionCooldown: true });
      setTimeout(() => {
        set({ bribeReactionCooldown: false });
      }, 1500);
    }
  },
  toggleCardSelection: (cardId) =>
    set((s) => {
      const idx = s.selectedCardIds.indexOf(cardId);
      if (idx >= 0) {
        return { selectedCardIds: s.selectedCardIds.filter((id) => id !== cardId) };
      }
      return { selectedCardIds: [...s.selectedCardIds, cardId] };
    }),
  addCardToSelection: (cardId) =>
    set((s) => {
      if (s.selectedCardIds.includes(cardId) || s.selectedCardIds.length >= 5) return s;
      return { selectedCardIds: [...s.selectedCardIds, cardId] };
    }),
  removeCardFromSelection: (cardId) =>
    set((s) => ({
      selectedCardIds: s.selectedCardIds.filter((id) => id !== cardId),
    })),
  clearSelection: () => set({ selectedCardIds: [] }),
  setError: (message) => set({ errorMessage: message, errorTimestamp: Date.now() }),
  clearError: () => set({ errorMessage: null }),
  setLastInspectionResult: (result) => set({ lastInspectionResult: result }),
  setBribeReactionCooldown: (cooldown) => set({ bribeReactionCooldown: cooldown }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setSoundEnabled: (soundEnabled) => {
    soundManager.setEnabled(soundEnabled);
    set({ soundEnabled });
  },
  setAmbientEnabled: (ambientEnabled) => {
    soundManager.setAmbientEnabled(ambientEnabled);
    set({ ambientEnabled });
  },
  reset: () => set(initialState),
}));
