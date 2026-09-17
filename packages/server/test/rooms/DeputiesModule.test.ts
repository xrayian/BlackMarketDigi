import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { Client } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';
import { CardState, SealedBagState, BribeOfferState } from '../../src/schema/GameState';

describe('DeputiesModule 6-Player Room Integration (Colyseus 0.18)', () => {
  const TEST_PORT = 2572;
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

  it('draws 2 deputies, supports Joint and Solo decisions, and distributes Booty Tile at round end', async () => {
    const hostRoom = await clients[0].create('nottingham', {
      playerName: 'Player1',
      enableDeputies: true,
      maxPlayers: 6,
    });

    const rooms = [hostRoom];
    for (let i = 1; i < 6; i++) {
      const room = await clients[i].joinById(hostRoom.roomId, { playerName: `Player${i + 1}` });
      rooms.push(room);
    }

    await delay(150);

    const serverRoom = matchMaker.getLocalRoomById(hostRoom.roomId) as NottinghamRoom;
    expect(serverRoom.state.enableDeputies).toBe(true);
    expect(serverRoom.state.players.size).toBe(6);

    // Ready up all 6 players
    for (const r of rooms) {
      r.send('ready');
    }
    await delay(250);

    // Phase: MARKET, Round 1
    expect(serverRoom.state.phase).toBe('MARKET');
    expect(serverRoom.state.round).toBe(1);

    // Assert exactly 2 deputies assigned
    expect(serverRoom.state.deputyIds.length).toBe(2);
    const dep1Id = serverRoom.state.deputyIds[0];
    const dep2Id = serverRoom.state.deputyIds[1];
    expect(dep1Id).not.toBe(dep2Id);

    const dep1 = serverRoom.state.players.get(dep1Id)!;
    const dep2 = serverRoom.state.players.get(dep2Id)!;
    expect(dep1.isDeputy).toBe(true);
    expect(dep2.isDeputy).toBe(true);
    expect(dep1.isSheriff).toBe(false);

    // Communal Booty Tile is initialized with 0 gold
    expect(serverRoom.state.bootyTile).toBeDefined();
    expect(serverRoom.state.bootyTile!.gold).toBe(0);

    // Find a merchant (one of the 4 players who is NOT a deputy)
    const merchantId = serverRoom.tableSeatIds.find((id) => !serverRoom.state.deputyIds.includes(id))!;
    const merchant = serverRoom.state.players.get(merchantId)!;

    // Fast-forward to INSPECTION phase
    serverRoom.state.phase = 'INSPECTION';
    serverRoom.inspectedMerchantIds.clear();

    // Prepare merchant bag
    merchant.sealedBag = new SealedBagState({
      playerId: merchantId,
      cardCount: 2,
      declaredGood: 'APPLE',
      declaredCount: 2,
      isSnapped: true,
      isRevealed: false,
    });
    merchant.sealedBag.cards.push(new CardState({ id: 'c1', name: 'Apples', classification: 'LEGAL', goodType: 'APPLE', value: 2, penalty: 2 }));
    merchant.sealedBag.cards.push(new CardState({ id: 'c2', name: 'Apples', classification: 'LEGAL', goodType: 'APPLE', value: 2, penalty: 2 }));

    // Test 1: JOINT_PASS with a bribe (gold goes to Booty Tile)
    merchant.gold = 50;
    serverRoom.state.activeBribe = new BribeOfferState({
      id: 'b1',
      sequenceNumber: 1,
      fromPlayerId: merchantId,
      toPlayerId: dep1Id,
      gold: 10,
      standCardIds: [],
      bagCardClaims: [],
      status: 'PROPOSED',
    });

    const depRoom = rooms.find((r) => r.sessionId === dep1Id)!;
    depRoom.send('deputy_inspection', {
      type: 'JOINT_PASS',
      deputyId: dep1Id,
      targetPlayerId: merchantId,
    });
    await delay(100);

    // Booty tile received 10 gold from bribe!
    expect(serverRoom.state.bootyTile!.gold).toBe(10);
    expect(merchant.gold).toBe(40);
    expect(serverRoom.inspectedMerchantIds.has(merchantId)).toBe(true);

    // Test 2: JOINT_INSPECT Dishonest merchant (Fines go onto Booty Tile)
    const merchant2Id = serverRoom.tableSeatIds.find(
      (id) => !serverRoom.state.deputyIds.includes(id) && id !== merchantId
    )!;
    const merchant2 = serverRoom.state.players.get(merchant2Id)!;
    merchant2.gold = 50;
    merchant2.sealedBag = new SealedBagState({
      playerId: merchant2Id,
      cardCount: 1,
      declaredGood: 'APPLE',
      declaredCount: 1,
      isSnapped: true,
    });
    // Dishonest card: Silk (contraband, penalty = 4)
    merchant2.sealedBag.cards.push(
      new CardState({ id: 'c_silk', name: 'Silk', classification: 'CONTRABAND', contrabandType: 'SILK', value: 8, penalty: 4 })
    );

    depRoom.send('deputy_inspection', {
      type: 'JOINT_INSPECT',
      deputyId: dep1Id,
      targetPlayerId: merchant2Id,
    });
    await delay(100);

    // Fine of 4 gold paid onto Booty Tile (10 + 4 = 14 gold)
    expect(serverRoom.state.bootyTile!.gold).toBe(14);
    expect(merchant2.gold).toBe(46);

    // Test 3: SOLO_INSPECT (Deputy receives or pays fine alone, Booty tile untouched)
    const merchant3Id = serverRoom.tableSeatIds.find(
      (id) => !serverRoom.state.deputyIds.includes(id) && id !== merchantId && id !== merchant2Id
    )!;
    const merchant3 = serverRoom.state.players.get(merchant3Id)!;
    merchant3.gold = 50;
    merchant3.sealedBag = new SealedBagState({
      playerId: merchant3Id,
      cardCount: 1,
      declaredGood: 'APPLE',
      declaredCount: 1,
      isSnapped: true,
    });
    // Dishonest: Pepper (penalty = 4)
    merchant3.sealedBag.cards.push(
      new CardState({ id: 'c_pep', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 })
    );

    const prevBootyGold = serverRoom.state.bootyTile!.gold;
    const prevDep1Gold = dep1.gold;

    depRoom.send('deputy_inspection', {
      type: 'SOLO_INSPECT',
      deputyId: dep1Id,
      targetPlayerId: merchant3Id,
    });
    await delay(100);

    // Booty tile unchanged
    expect(serverRoom.state.bootyTile!.gold).toBe(prevBootyGold);
    // Acting deputy collected the fine directly
    expect(dep1.gold).toBe(prevDep1Gold + 4);

    // Test 4: Booty Tile distribution at Round End
    // 14 gold on Booty Tile -> 7 each to Deputy 1 & Deputy 2
    const d1PreRoundEnd = dep1.gold;
    const d2PreRoundEnd = dep2.gold;

    // Trigger round end directly
    (serverRoom as any).handleRoundEnd();
    await delay(100);

    expect(dep1.gold).toBe(d1PreRoundEnd + 7);
    expect(dep2.gold).toBe(d2PreRoundEnd + 7);
    expect(serverRoom.state.bootyTile!.gold).toBe(0);

    for (const r of rooms) {
      await r.leave();
    }
  });
});
