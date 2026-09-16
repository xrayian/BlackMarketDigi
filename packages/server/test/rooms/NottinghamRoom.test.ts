import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { Client, Callbacks, Room } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';

describe('NottinghamRoom (Colyseus 0.18)', () => {
  const TEST_PORT = 2569;
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

  it('allows a player to create a room, receive state, and toggle ready', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Robin' });
    expect(room1.roomId).toBeDefined();
    expect(typeof room1.roomId).toBe('string');
    expect(room1.sessionId).toBeDefined();

    await delay(100);

    const playersMap = room1.state.players;
    expect(playersMap.get(room1.sessionId)).toBeDefined();
    expect(playersMap.get(room1.sessionId).name).toBe('Robin');
    expect(playersMap.get(room1.sessionId).ready).toBe(false);

    room1.send('ready');
    await delay(100);

    expect(playersMap.get(room1.sessionId).ready).toBe(true);

    const room2 = await client2.joinById(room1.roomId, { playerName: 'Marian' });
    await delay(100);

    expect(room1.state.players.size).toBe(2);
    expect(room2.state.players.size).toBe(2);

    await room1.leave();
    await room2.leave();
  });

  it('enforces zero-knowledge state isolation: client never receives other players hand or sealed bag cards', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Robin' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Marian' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'LittleJohn' });

    await delay(100);

    // All 3 players ready up to trigger game start
    room1.send('ready');
    room2.send('ready');
    room3.send('ready');

    await delay(200);

    expect(room1.state.phase).toBe('MARKET');
    expect(room2.state.phase).toBe('MARKET');

    // Robin (room1) can see own hand cards
    const robinInRoom1 = room1.state.players.get(room1.sessionId);
    expect(robinInRoom1.hand.length).toBe(6);
    expect(robinInRoom1.hand[0].id).toBeDefined();

    // Marian (room2) CANNOT see Robin's hand cards (zero-knowledge view)
    const robinInRoom2 = room2.state.players.get(room1.sessionId);
    expect(robinInRoom2.hand?.length ?? 0).toBe(0); // View filtering hides cards!
    expect(robinInRoom2.handCount).toBe(6); // Public count remains visible

    // Little John (room3) CANNOT see Robin's hand cards
    const robinInRoom3 = room3.state.players.get(room1.sessionId);
    expect(robinInRoom3.hand?.length ?? 0).toBe(0);

    await room1.leave();
    await room2.leave();
    await room3.leave();
  });

  it('rejects stale bribe acceptance when offer sequence number changes (atomic reaction buffer)', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Robin' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Marian' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'LittleJohn' });

    await delay(100);

    // Start game
    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    await delay(200);

    // Fast-forward to inspection phase directly on room instance
    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    serverRoom.state.phase = 'INSPECTION';

    let errorMessageReceived = '';
    room1.onMessage('error', (data: any) => {
      errorMessageReceived = data.message;
    });

    // Merchant (room2) proposes bribe 1
    room2.send('bribe_propose', { gold: 5 });
    await delay(100);

    const seq1 = serverRoom.state.activeBribe!.sequenceNumber;
    expect(seq1).toBeDefined();

    // Merchant (room2) changes bribe to 10 gold before Sheriff responds
    room2.send('bribe_propose', { gold: 10 });
    await delay(100);

    const seq2 = serverRoom.state.activeBribe!.sequenceNumber;
    expect(seq2).toBeGreaterThan(seq1);

    // Sheriff (room1) tries to accept using stale sequence number (seq1)
    room1.send('bribe_respond', { accept: true, sequenceNumber: seq1 });
    await delay(100);

    // Assert stale acceptance was rejected
    expect(errorMessageReceived).toMatch(/changed before response/);
    expect(serverRoom.state.activeBribe!.status).toBe('PROPOSED'); // Still proposed, not accepted!

    await room1.leave();
    await room2.leave();
    await room3.leave();
  });

  it('simulates a full 4-player game round end-to-end through all phase transitions', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Robin' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Marian' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'LittleJohn' });
    const room4 = await client4.joinById(room1.roomId, { playerName: 'FriarTuck' });

    await delay(100);

    // Phase: LOBBY
    expect(room1.state.phase).toBe('LOBBY');
    expect(room1.state.players.size).toBe(4);

    // Start game
    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    room4.send('ready');
    await delay(200);

    // Phase 1: MARKET
    expect(room1.state.phase).toBe('MARKET');
    expect(room1.state.round).toBe(1);
    expect(room1.state.sheriffId).toBe(room1.sessionId); // Robin is Sheriff

    // Merchants take turns in Market
    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    const roomsMap: Record<string, Room> = {
      [room1.sessionId]: room1,
      [room2.sessionId]: room2,
      [room3.sessionId]: room3,
      [room4.sessionId]: room4,
    };

    // Complete all merchant turns in Market
    for (let i = 0; i < 3; i++) {
      const activeId = serverRoom.state.activeMerchantId;
      expect(activeId).toBeTruthy();
      const activeRoom = roomsMap[activeId];
      // Merchant passes without exchanging (discards 0 cards)
      activeRoom.send('market_exchange', { cardIds: [] });
      await delay(100);
    }

    // Phase 2: LOAD_BAG
    expect(room1.state.phase).toBe('LOAD_BAG');

    // Each merchant loads 2 cards from their hand into bag
    const merchants = [room2, room3, room4];
    for (const mRoom of merchants) {
      const pState = serverRoom.state.players.get(mRoom.sessionId)!;
      const cardIdsToLoad = [pState.hand[0].id, pState.hand[1].id];
      mRoom.send('load_bag', { cardIds: cardIdsToLoad });
      await delay(100);
    }

    // Phase 3: DECLARATION
    expect(room1.state.phase).toBe('DECLARATION');

    // Merchants declare in order
    for (let i = 0; i < 3; i++) {
      const activeId = serverRoom.state.activeMerchantId;
      expect(activeId).toBeTruthy();
      const activeRoom = roomsMap[activeId];
      activeRoom.send('declaration', { declaredGood: 'APPLE', declaredCount: 2 });
      await delay(100);
    }

    // Phase 4: INSPECTION
    expect(room1.state.phase).toBe('INSPECTION');

    // Sheriff (Robin in room1) passes Marian, and inspects John and Tuck
    room1.send('inspection_action', { type: 'PASS', targetPlayerId: room2.sessionId });
    await delay(100);

    room1.send('inspection_action', { type: 'INSPECT', targetPlayerId: room3.sessionId });
    await delay(100);

    room1.send('inspection_action', { type: 'INSPECT', targetPlayerId: room4.sessionId });
    await delay(150);

    // All merchants inspected -> Round concludes!
    // Next round begins or game ends
    expect(serverRoom.state.round).toBeGreaterThanOrEqual(1);
    expect(['MARKET', 'GAME_OVER']).toContain(serverRoom.state.phase);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });
});
