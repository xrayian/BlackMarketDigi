import { CardDefinition } from './types';

export const CARD_DEFINITIONS: CardDefinition[] = [
  {
    name: 'Apples',
    classification: 'LEGAL',
    goodType: 'APPLE',
    value: 2,
    penalty: 2,
    count3Player: 48,
    count4PlusPlayer: 48,
    fourPlusOnly: false
  },
  {
    name: 'Cheese',
    classification: 'LEGAL',
    goodType: 'CHEESE',
    value: 3,
    penalty: 2,
    count3Player: 36,
    count4PlusPlayer: 36,
    fourPlusOnly: false
  },
  {
    name: 'Bread',
    classification: 'LEGAL',
    goodType: 'BREAD',
    value: 3,
    penalty: 2,
    count3Player: 0,
    count4PlusPlayer: 36,
    fourPlusOnly: true
  },
  {
    name: 'Chickens',
    classification: 'LEGAL',
    goodType: 'CHICKEN',
    value: 4,
    penalty: 2,
    count3Player: 24,
    count4PlusPlayer: 24,
    fourPlusOnly: false
  },
  {
    name: 'Pepper',
    classification: 'CONTRABAND',
    contrabandType: 'PEPPER',
    value: 6,
    penalty: 4,
    count3Player: 18,
    count4PlusPlayer: 22,
    fourPlusOnly: false
  },
  {
    name: 'Mead',
    classification: 'CONTRABAND',
    contrabandType: 'MEAD',
    value: 7,
    penalty: 4,
    count3Player: 16,
    count4PlusPlayer: 21,
    fourPlusOnly: false
  },
  {
    name: 'Silk',
    classification: 'CONTRABAND',
    contrabandType: 'SILK',
    value: 8,
    penalty: 4,
    count3Player: 9,
    count4PlusPlayer: 12,
    fourPlusOnly: false
  },
  {
    name: 'Crossbow',
    classification: 'CONTRABAND',
    contrabandType: 'CROSSBOW',
    value: 9,
    penalty: 4,
    count3Player: 5,
    count4PlusPlayer: 5,
    fourPlusOnly: false
  },
  {
    name: 'Green Apples',
    classification: 'ROYAL',
    royalGoodType: 'GREEN_APPLE',
    baseGood: 'APPLE',
    royalBonusCount: 2,
    value: 4,
    penalty: 3,
    count3Player: 2,
    count4PlusPlayer: 2,
    fourPlusOnly: false
  },
  {
    name: 'Golden Apples',
    classification: 'ROYAL',
    royalGoodType: 'GOLDEN_APPLE',
    baseGood: 'APPLE',
    royalBonusCount: 3,
    value: 6,
    penalty: 4,
    count3Player: 1,
    count4PlusPlayer: 2,
    fourPlusOnly: false
  },
  {
    name: 'Gouda Cheese',
    classification: 'ROYAL',
    royalGoodType: 'GOUDA_CHEESE',
    baseGood: 'CHEESE',
    royalBonusCount: 2,
    value: 6,
    penalty: 4,
    count3Player: 2,
    count4PlusPlayer: 2,
    fourPlusOnly: false
  },
  {
    name: 'Blue Cheese',
    classification: 'ROYAL',
    royalGoodType: 'BLUE_CHEESE',
    baseGood: 'CHEESE',
    royalBonusCount: 3,
    value: 9,
    penalty: 5,
    count3Player: 0,
    count4PlusPlayer: 1,
    fourPlusOnly: true
  },
  {
    name: 'Rye Bread',
    classification: 'ROYAL',
    royalGoodType: 'RYE_BREAD',
    baseGood: 'BREAD',
    royalBonusCount: 2,
    value: 6,
    penalty: 4,
    count3Player: 0,
    count4PlusPlayer: 2,
    fourPlusOnly: true
  },
  {
    name: 'Pumpernickel Bread',
    classification: 'ROYAL',
    royalGoodType: 'PUMPERNICKEL_BREAD',
    baseGood: 'BREAD',
    royalBonusCount: 3,
    value: 9,
    penalty: 5,
    count3Player: 0,
    count4PlusPlayer: 1,
    fourPlusOnly: true
  },
  {
    name: 'Royal Rooster',
    classification: 'ROYAL',
    royalGoodType: 'ROYAL_ROOSTER',
    baseGood: 'CHICKEN',
    royalBonusCount: 2,
    value: 8,
    penalty: 4,
    count3Player: 1,
    count4PlusPlayer: 2,
    fourPlusOnly: false
  }
];
