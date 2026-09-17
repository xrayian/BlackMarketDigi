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
  targetBagOwnerId?: string;
  intendedOutcome?: 'PASS' | 'INSPECT';
  gold: number;
  standCardIds: string[];
  bagCardClaims: { goodType: GoodType | ContrabandType; count: number }[];
  nonBindingTerms?: string;
}

export interface BribeResponseMessage {
  accept: boolean;
  sequenceNumber?: number;
}

export interface SelectStartPlayerMessage {
  playerId: string;
}

export interface SelectInspectMerchantMessage {
  targetPlayerId: string;
}

export interface RevealedCardInfo {
  id: string;
  name: string;
  classification: 'LEGAL' | 'CONTRABAND' | 'ROYAL';
  goodType?: string;
  contrabandType?: string;
  royalGoodType?: string;
  value: number;
  penalty: number;
}

export interface InspectionResultMessage {
  outcome: 'PASS' | 'HONEST' | 'DISHONEST';
  targetPlayerId: string;
  targetPlayerName: string;
  sheriffId: string;
  sheriffName: string;
  declaredGood: string;
  declaredCount: number;
  penaltyAmount: number;
  keptCardsCount: number;
  confiscatedCardsCount: number;
  debtSettled: boolean;
  debtPaidGold: number;
  debtForgiven: number;
  liquidatedLegalCount?: number;
  liquidatedContrabandCount?: number;
  revealedCards?: RevealedCardInfo[];
}

export interface UpdateLobbyOptionsMessage {
  enableRoyalGoods?: boolean;
  enableDeputies?: boolean;
  enableBlackMarket?: boolean;
  maxPlayers?: number;
}

export interface DeputyInspectionMessage {
  type: 'JOINT_PASS' | 'JOINT_INSPECT' | 'SOLO_PASS' | 'SOLO_INSPECT';
  deputyId: string;
  targetPlayerId: string;
}

export interface ClaimBlackMarketMessage {
  contrabandType: ContrabandType;
}

export interface BlackMarketClaimedMessage {
  playerId: string;
  playerName: string;
  orderId: string;
  orderName: string;
  contrabandType: ContrabandType;
  pointsValue: number;
}

export interface ProposeNegotiationOfferMessage {
  targetBagOwnerId: string;
  intendedOutcome?: 'PASS' | 'INSPECT';
  goldOffered: number;
  standLegalGoodsOffered?: string[];
  standContrabandCountOffered?: number;
  bagGoodsCountOffered?: number;
  futureFavorText?: string;
}

export interface AcceptNegotiationOfferMessage {
  offerId: string;
  expectedSequence?: number;
}

export interface DeclineNegotiationOfferMessage {
  offerId: string;
}

export interface WithdrawNegotiationOfferMessage {
  offerId: string;
}

export interface NegotiationDealStruckMessage {
  offerId: string;
  fromPlayerId: string;
  targetBagOwnerId: string;
  forcedOutcome: 'FORCE_INSPECT' | 'FORCE_PASS';
  acceptedByPlayerId: string;
}

