import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { Client } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';
import { CardState, SealedBagState } from '../../src/schema/GameState';

describe('AllModules6Player Room Integration (Colyseus 0.18)', () => {
  const TEST_PORT = 2574;
  let server: any;
  let clients: Client[] = [];

  beforeAll(async () => {
    server = defineServer({
      rooms: {
        nottingham: defineRoom(NottinghamRoom),
      },
    });
    await server.listen(TEST_PORT);
    for (let i = 0; i < 6; i++) {
      clients.push(new Client(`http://localhost:${TEST_PORT}`));
    }
  });

  afterAll(async () => {
    if (server) {
      await server.gracefullyShutdown(false);
    }
  });

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('completes a 6-player game with Deputies + Royal Goods + Black Market to a correct final score', async () => {
    const hostRoom = await clients[0].create('nottingham', {
      playerName: 'Player1',
      enableRoyalGoods: true,
      enableDeputies: true,
      enableBlackMarket: true,
      maxPlayers: 6,
    });

    const rooms = [hostRoom];
    for (let i = 1; i < 6; i++) {
      const room = await clients[i].joinById(hostRoom.roomId, { playerName: `Player${i + 1}` });
      rooms.push(room);
    }

    await delay(150);

    const serverRoom = matchMaker.getLocalRoomById(hostRoom.roomId) as NottinghamRoom;
    expect(serverRoom.state.enableRoyalGoods).toBe(true);
    expect(serverRoom.state.enableDeputies).toBe(true);
    expect(serverRoom.state.enableBlackMarket).toBe(true);
    expect(serverRoom.state.players.size).toBe(6);

    // Ready all
    for (const r of rooms) r.send('ready');
    await delay(250);

    expect(serverRoom.state.phase).toBe('MARKET');
    expect(serverRoom.state.round).toBe(1);
    expect(serverRoom.state.deputyIds.length).toBe(2);
    expect(serverRoom.state.bootyTile).toBeDefined();
    expect(serverRoom.state.blackMarketPepperPile.length).toBe(2);

    // Simulate inspection phase with Joint and Solo actions
    serverRoom.state.phase = 'INSPECTION';
    const dep1Id = serverRoom.state.deputyIds[0];
    const dep2Id = serverRoom.state.deputyIds[1];
    const merchantIds = serverRoom.tableSeatIds.filter((id) => !serverRoom.state.deputyIds.includes(id));
    expect(merchantIds.length).toBe(4);

    const m1 = serverRoom.state.players.get(merchantIds[0])!;
    const m2 = serverRoom.state.players.get(merchantIds[1])!;
    const m3 = serverRoom.state.players.get(merchantIds[2])!;
    const m4 = serverRoom.state.players.get(merchantIds[3])!;

    // m1: Royal Good (Golden Apples: +2 Apple count, value = 6) & Legal Apple
    m1.sealedBag = new SealedBagState({ playerId: m1.id, cardCount: 2, declaredGood: 'APPLE', declaredCount: 2, isSnapped: true });
    m1.sealedBag.cards.push(new CardState({ id: 'rg1', name: 'Golden Apples', classification: 'ROYAL', baseGood: 'APPLE', royalBonusCount: 2, value: 6, penalty: 4 }));
    m1.sealedBag.cards.push(new CardState({ id: 'app1', name: 'Apples', classification: 'LEGAL', goodType: 'APPLE', value: 2, penalty: 2 }));

    // Joint Pass m1: Royal Goods go to standRoyal
    const depRoom = rooms.find((r) => r.sessionId === dep1Id)!;
    depRoom.send('deputy_inspection', { type: 'JOINT_PASS', deputyId: dep1Id, targetPlayerId: m1.id });
    await delay(50);
    expect(m1.standRoyal.length).toBe(1);

    // m2: 3 Peppers on stand -> Claims Black Market Order (14 points)
    m2.standContraband.push(new CardState({ id: 'pep1', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    m2.standContraband.push(new CardState({ id: 'pep2', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    m2.standContraband.push(new CardState({ id: 'pep3', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    m2.standContrabandCount = 3;

    const m2Room = rooms.find((r) => r.sessionId === m2.id)!;
    m2Room.send('claim_black_market', { contrabandType: 'PEPPER' });
    await delay(50);
    expect(m2.standContraband.length).toBe(1);
    expect(m2.standContraband[0].value).toBe(14);

    // m3: Joint Inspect Honest (2 Bread)
    m3.sealedBag = new SealedBagState({ playerId: m3.id, cardCount: 2, declaredGood: 'BREAD', declaredCount: 2, isSnapped: true });
    m3.sealedBag.cards.push(new CardState({ id: 'br1', name: 'Bread', classification: 'LEGAL', goodType: 'BREAD', value: 3, penalty: 2 }));
    m3.sealedBag.cards.push(new CardState({ id: 'br2', name: 'Bread', classification: 'LEGAL', goodType: 'BREAD', value: 3, penalty: 2 }));
    depRoom.send('deputy_inspection', { type: 'JOINT_INSPECT', deputyId: dep1Id, targetPlayerId: m3.id });
    await delay(50);

    // m4: Joint Pass
    m4.sealedBag = new SealedBagState({ playerId: m4.id, cardCount: 1, declaredGood: 'CHEESE', declaredCount: 1, isSnapped: true });
    m4.sealedBag.cards.push(new CardState({ id: 'ch1', name: 'Cheese', classification: 'LEGAL', goodType: 'CHEESE', value: 3, penalty: 2 }));
    depRoom.send('deputy_inspection', { type: 'JOINT_PASS', deputyId: dep1Id, targetPlayerId: m4.id });
    await delay(50);

    // Finish the game and compute final scores
    (serverRoom as any).finishGame();
    await delay(100);

    expect(serverRoom.state.phase).toBe('GAME_OVER');
    expect(serverRoom.state.leaderboard.length).toBe(6);
    expect(serverRoom.state.winnerId).toBeTruthy();
    expect(serverRoom.state.winningScore).toBeGreaterThan(0);

    // Verify m1's score includes Royal Good bonus count in legalGoodsCount
    const m1Score = serverRoom.state.leaderboard.find((s) => s.playerId === m1.id)!;
    expect(m1Score.legalGoodsCount).toBeGreaterThanOrEqual(3); // 1 base Apple + 2 Golden Apple royalBonusCount

    // Verify m2's score includes Black Market card value
    const m2Score = serverRoom.state.leaderboard.find((s) => s.playerId === m2.id)!;
    expect(m2Score.goodsValue).toBeGreaterThanOrEqual(14);

    for (const r of rooms) {
      await r.leave();
    }
  });
});
