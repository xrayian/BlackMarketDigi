import { schema, t } from '@colyseus/schema';

export const PlayerState = schema({
  id: t.string(),
  name: t.string(),
  gold: t.number().default(50),
  ready: t.boolean().default(false),
  seatIndex: t.number().default(0),
}, 'PlayerState');
export type PlayerState = InstanceType<typeof PlayerState>;

export const GameState = schema({
  phase: t.string().default('LOBBY'),
  round: t.number().default(0),
  sheriffId: t.string().default(''),
  maxPlayers: t.number().default(4),
  enableRoyalGoods: t.boolean().default(false),
  enableDeputies: t.boolean().default(false),
  enableBlackMarket: t.boolean().default(false),
  players: t.map(PlayerState),
}, 'GameState');
export type GameState = InstanceType<typeof GameState>;
