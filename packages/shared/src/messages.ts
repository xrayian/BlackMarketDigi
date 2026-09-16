import type { GoodType, ContrabandType } from './types';

export interface CreateRoomOptions {
  playerName: string;
  maxPlayers: number;
  enableRoyalGoods: boolean;
  enableDeputies: boolean;
  enableBlackMarket: boolean;
}

export interface JoinRoomOptions {
  playerName: string;
}

export interface MarketDiscardMessage {
  cardIds: string[];
}

export interface LoadBagMessage {
  cardIds: string[];
}

export interface DeclarationMessage {
  declaredGood: GoodType;
  declaredCount: number;
}

export interface InspectionAction {
  type: 'PASS' | 'INSPECT';
  targetPlayerId: string;
}

export interface BribeOfferMessage {
  gold: number;
  standCardIds: string[];
  bagCardClaims: { goodType: GoodType | ContrabandType; count: number }[];
  nonBindingTerms?: string;
}

export interface BribeResponseMessage {
  accept: boolean;
}

export interface SelectStartPlayerMessage {
  playerId: string;
}
