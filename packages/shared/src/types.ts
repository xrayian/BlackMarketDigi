export type GoodType = 'APPLE' | 'CHEESE' | 'BREAD' | 'CHICKEN';
export type ContrabandType = 'PEPPER' | 'MEAD' | 'SILK' | 'CROSSBOW';
export type RoyalGoodType = 'GREEN_APPLE' | 'GOLDEN_APPLE' | 'GOUDA_CHEESE' | 'BLUE_CHEESE' | 'RYE_BREAD' | 'PUMPERNICKEL_BREAD' | 'ROYAL_ROOSTER';
export type CardClassification = 'LEGAL' | 'CONTRABAND' | 'ROYAL';
export type GamePhase = 'LOBBY' | 'MARKET' | 'LOAD_BAG' | 'DECLARATION' | 'INSPECTION' | 'ROUND_END' | 'GAME_OVER';
export type BribeStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';

export interface CardDefinition {
  name: string;
  classification: CardClassification;
  goodType?: GoodType;
  contrabandType?: ContrabandType;
  royalGoodType?: RoyalGoodType;
  baseGood?: GoodType;
  royalBonusCount?: number;
  value: number;
  penalty: number;
  count3Player: number;
  count4PlusPlayer: number;
  fourPlusOnly: boolean;
}
