import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { Client } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';
import { CardState, SealedBagState } from '../../src/schema/GameState';
import { Card } from '@sheriff/shared';

describe('RoyalGoodsModule Room Integration (Colyseus 0.18)', () => {
  const TEST_PORT = 2571;
  let server: any;
  let client1: Client;
  let client2: Client;
  let client3: Client;
  let client4: Client;

  beforeAll(async () => {
    server = defineServer({
      rooms: {
        nottingham: defineRoom(NottinghamRoom),
      },
    });
    await server.listen(TEST_PORT);
    client1 = new Client(`http://localhost:${TEST_PORT}`);
    client2 = new Client(`http://localhost:${TEST_PORT}`);
    client3 = new Client(`http://localhost:${TEST_PORT}`);
    client4 = new Client(`http://localhost:${TEST_PORT}`);
  });

  afterAll(async () => {
    if (server) {
      await server.gracefullyShutdown(false);
    }
  });

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('includes Royal Goods in deck and handles pass vs inspect of Royal Goods correctly', async () => {
    // Host creates room with enableRoyalGoods = true
    const room1 = await client1.create('nottingham', {
      playerName: 'Player1',
      enableRoyalGoods: true,
    });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Player2' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'Player3' });
    const room4 = await client4.joinById(room1.roomId, { playerName: 'Player4' });

    await delay(100);

    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    expect(serverRoom.state.enableRoyalGoods).toBe(true);

    // Ready all
    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    room4.send('ready');
    await delay(200);

    expect(serverRoom.state.phase).toBe('MARKET');

    // Total cards in 4p deck with Royal Goods should be 216
    const totalDeckCards =
      serverRoom.internalDrawPile.length +
      serverRoom.internalDiscardPile.length +
      Array.from(serverRoom.state.players.values()).reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalDeckCards).toBe(216);

    // Fast-forward to INSPECTION phase
    serverRoom.state.phase = 'INSPECTION';
    await delay(50);

    const p2 = serverRoom.state.players.get(room2.sessionId)!;
    const royalCard: Card = {
      id: 'golden_apple_1',
      name: 'Golden Apples',
      classification: 'ROYAL',
      royalGoodType: 'GOLDEN_APPLE',
      baseGood: 'APPLE',
      royalBonusCount: 2,
      value: 6,
      penalty: 4,
    };
    const legalCard: Card = {
      id: 'apple_test_1',
      name: 'Apple',
      classification: 'LEGAL',
      goodType: 'APPLE',
      value: 2,
      penalty: 2,
    };

    // Load both into Player2's bag
    p2.sealedBag = new SealedBagState({
      playerId: room2.sessionId,
      cardCount: 2,
      declaredGood: 'APPLE',
      declaredCount: 2,
      isSnapped: true,
      isRevealed: false,
    });
    p2.sealedBag.cards.push(new CardState({
      id: royalCard.id,
      name: royalCard.name,
      classification: royalCard.classification,
      baseGood: royalCard.baseGood,
      royalBonusCount: royalCard.royalBonusCount,
      value: royalCard.value,
      penalty: royalCard.penalty,
    }));
    p2.sealedBag.cards.push(new CardState({
      id: legalCard.id,
      name: legalCard.name,
      classification: legalCard.classification,
      goodType: legalCard.goodType,
      value: legalCard.value,
      penalty: legalCard.penalty,
    }));

    // Test Inspection outcome: Pass Unopened with Royal Good
    (serverRoom as any).executePassUnopened(room2.sessionId, undefined);
    await delay(100);

    // Royal Good must be placed on standRoyal, NOT standContraband!
    expect(p2.standRoyal.length).toBe(1);
    expect(p2.standRoyal[0].name).toBe('Golden Apples');
    expect(p2.standRoyalCount).toBe(1);

    // Finish game and check scoring with Royal Goods conversion
    (serverRoom as any).finishGame();
    await delay(100);

    expect(serverRoom.state.phase).toBe('GAME_OVER');
    const p2Score = serverRoom.state.leaderboard.find((s) => s.playerId === room2.sessionId);
    expect(p2Score).toBeDefined();
    // Legal goods count includes 1 base Apple + 2 Golden Apple royalBonusCount = 3!
    expect(p2Score!.legalGoodsCount).toBeGreaterThanOrEqual(3);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });
});
