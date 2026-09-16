import { schema, t } from '@colyseus/schema';

export const CardState = schema({
  id: t.string(),
  name: t.string(),
  classification: t.string(), // 'LEGAL' | 'CONTRABAND' | 'ROYAL'
  goodType: t.string().default(''),
  contrabandType: t.string().default(''),
  royalGoodType: t.string().default(''),
  baseGood: t.string().default(''),
  royalBonusCount: t.number().default(0),
  value: t.number().default(0),
  penalty: t.number().default(0),
}, 'CardState');
export type CardState = InstanceType<typeof CardState>;

export const SealedBagState = schema({
  playerId: t.string(),
  cardCount: t.number().default(0),
  declaredGood: t.string().default(''),
  declaredCount: t.number().default(0),
  isSnapped: t.boolean().default(false),
  isRevealed: t.boolean().default(false),
  cards: t.array(CardState).view(), // Zero-knowledge: only visible to owner until revealed
}, 'SealedBagState');
export type SealedBagState = InstanceType<typeof SealedBagState>;

export const BribeOfferState = schema({
  id: t.string(),
  sequenceNumber: t.number().default(1),
  fromPlayerId: t.string(),
  toPlayerId: t.string(),
  gold: t.number().default(0),
  standCardIds: t.array('string'),
  bagCardClaims: t.array('string'),
  nonBindingTerms: t.string().default(''),
  status: t.string().default('PROPOSED'), // PROPOSED | ACCEPTED | REJECTED | SUPERSEDED
  createdAt: t.number().default(0),
}, 'BribeOfferState');
export type BribeOfferState = InstanceType<typeof BribeOfferState>;

export const PlayerScoreState = schema({
  playerId: t.string(),
  name: t.string(),
  gold: t.number().default(0),
  goodsValue: t.number().default(0),
  bonusPoints: t.number().default(0),
  totalScore: t.number().default(0),
  legalGoodsCount: t.number().default(0),
  contrabandCount: t.number().default(0),
  rank: t.number().default(1),
}, 'PlayerScoreState');
export type PlayerScoreState = InstanceType<typeof PlayerScoreState>;

export const PlayerState = schema({
  id: t.string(),
  sessionId: t.string().default(''),
  name: t.string(),
  gold: t.number().default(50),
  ready: t.boolean().default(false),
  connected: t.boolean().default(true),
  seatIndex: t.number().default(0),
  isSheriff: t.boolean().default(false),
  isDeputy: t.boolean().default(false),
  handCount: t.number().default(0),
  hand: t.array(CardState).view(), // Zero-knowledge: only visible to owning client
  standLegal: t.array(CardState), // Public faceup on merchant stand
  standContrabandCount: t.number().default(0), // Public count of contraband
  standContraband: t.array(CardState).view(), // Zero-knowledge: identities hidden until endgame
  standRoyal: t.array(CardState).view(), // Zero-knowledge: identities hidden until endgame
  sealedBag: t.ref(SealedBagState).optional(),
  sheriffCount: t.number().default(0),
}, 'PlayerState');
export type PlayerState = InstanceType<typeof PlayerState>;

export const GameState = schema({
  lobbyId: t.string().default(''),
  phase: t.string().default('LOBBY'), // LOBBY | MARKET | LOAD_BAG | DECLARATION | INSPECTION | ROUND_END | GAME_OVER
  round: t.number().default(0),
  sheriffId: t.string().default(''),
  deputyIds: t.array('string'),
  activeMerchantId: t.string().default(''),
  drawPileCount: t.number().default(0),
  discardPile: t.array(CardState),
  players: t.map(PlayerState),
  activeBribe: t.ref(BribeOfferState).optional(),
  leaderboard: t.array(PlayerScoreState),
  winnerId: t.string().default(''),
  winningScore: t.number().default(0),
  maxPlayers: t.number().default(4),
  enableRoyalGoods: t.boolean().default(false),
  enableDeputies: t.boolean().default(false),
  enableBlackMarket: t.boolean().default(false),
}, 'GameState');
export type GameState = InstanceType<typeof GameState>;
