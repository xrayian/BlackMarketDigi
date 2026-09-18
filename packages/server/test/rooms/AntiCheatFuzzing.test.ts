import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { Client } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';

describe('AntiCheatFuzzing & Security Hardening (Colyseus 0.18)', () => {
  const TEST_PORT = 2575;
  let server: any;
  let client1: Client;
  let client2: Client;
  let client3: Client;

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
  });

  afterAll(async () => {
    if (server) {
      await server.gracefullyShutdown(false);
    }
  });

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('rejects out-of-phase client messages and preserves game state', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Player1' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Player2' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'Player3' });

    await delay(100);

    const errorsRoom2: string[] = [];
    room2.onMessage('error', (err: any) => {
      errorsRoom2.push(err.message);
    });

    // In LOBBY: try to send MARKET / LOAD_BAG / DECLARATION / INSPECTION actions
    room2.send('market_exchange', { cardIds: [] });
    room2.send('load_bag', { cardIds: ['fake1'] });
    room2.send('declaration', { declaredGood: 'APPLES', declaredCount: 1 });
    room2.send('bribe_propose', { gold: 5 });
    room2.send('bribe_respond', { accept: true });
    room2.send('inspection_action', { targetPlayerId: room1.sessionId, type: 'PASS' });

    await delay(150);

    expect(errorsRoom2.length).toBeGreaterThanOrEqual(6);
    expect(errorsRoom2.some((m) => m.includes('MARKET'))).toBe(true);
    expect(errorsRoom2.some((m) => m.includes('LOAD_BAG'))).toBe(true);
    expect(errorsRoom2.some((m) => m.includes('DECLARATION'))).toBe(true);
    expect(errorsRoom2.some((m) => m.includes('INSPECTION'))).toBe(true);

    // Ready all to start game -> transitions to MARKET
    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    await delay(200);

    expect(room1.state.phase).toBe('MARKET');

    // While in MARKET: try LOBBY actions
    const errorsRoom1: string[] = [];
    room1.onMessage('error', (err: any) => {
      errorsRoom1.push(err.message);
    });

    room1.send('ready');
    room1.send('startGame');
    room1.send('update_lobby_options', { maxPlayers: 4 });

    await delay(150);

    expect(errorsRoom1.length).toBe(3);
    expect(errorsRoom1.some((m) => m.includes('ready'))).toBe(true);
    expect(errorsRoom1.some((m) => m.includes('started'))).toBe(true);
    expect(errorsRoom1.some((m) => m.includes('lobby options'))).toBe(true);

    await room1.leave();
    await room2.leave();
    await room3.leave();
  });

  it('rejects adversarial inputs: spoofed cards, bad bag loads, tampered declarations, negative bribes', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Sheriff' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Merchant1' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'Merchant2' });

    await delay(100);

    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    await delay(200);

    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    expect(serverRoom).toBeDefined();

    const errorsRoom2: string[] = [];
    room2.onMessage('error', (err: any) => {
      errorsRoom2.push(err.message);
    });

    // 1. Spoofed card ID in market_exchange
    const activeMerchant = serverRoom.state.activeMerchantId;
    const activeClientRoom = activeMerchant === room2.sessionId ? room2 : room3;
    const clientErrors: string[] = [];
    activeClientRoom.onMessage('error', (err: any) => clientErrors.push(err.message));

    activeClientRoom.send('market_exchange', { cardIds: ['completely_bogus_card_999'] });
    await delay(100);
    expect(clientErrors.some((m) => m.includes('not present in player hand'))).toBe(true);

    // 2. Market exchange > 5 cards
    activeClientRoom.send('market_exchange', {
      cardIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
    });
    await delay(100);
    expect(clientErrors.some((m) => m.includes('Cannot discard more than 5 cards'))).toBe(true);

    // Skip market phase for both merchants
    room2.send('market_exchange', { cardIds: [] });
    await delay(100);
    room3.send('market_exchange', { cardIds: [] });
    await delay(200);

    expect(serverRoom.state.phase).toBe('LOAD_BAG');

    // 3. Spoofed card in load_bag
    room2.send('load_bag', { cardIds: ['non_existent_card_abc'] });
    await delay(100);
    expect(errorsRoom2.some((m) => m.includes('not present in player hand'))).toBe(true);

    // 4. Loading 0 cards or > 5 cards
    room2.send('load_bag', { cardIds: [] });
    await delay(100);
    expect(errorsRoom2.some((m) => m.includes('between 1 and 5'))).toBe(true);

    // Legitimate load 2 cards for Merchant 1
    const player2Hand = serverRoom.state.players.get(room2.sessionId)!.hand;
    const p2CardIds = [player2Hand[0].id, player2Hand[1].id];
    room2.send('load_bag', { cardIds: p2CardIds });
    await delay(100);

    expect(serverRoom.state.players.get(room2.sessionId)!.sealedBag?.isSnapped).toBe(true);

    // 5. Attempting to modify/load bag after it is already sealed
    room2.send('load_bag', { cardIds: [player2Hand[0].id] });
    await delay(100);
    expect(errorsRoom2.some((m) => m.includes('already sealed shut'))).toBe(true);

    // Sheriff attempting to load bag
    const errorsSheriff: string[] = [];
    room1.onMessage('error', (err: any) => errorsSheriff.push(err.message));
    room1.send('load_bag', { cardIds: ['some_card'] });
    await delay(100);
    expect(errorsSheriff.some((m) => m.includes('Sheriff does not pack'))).toBe(true);

    // Legitimate load for Merchant 2 to trigger Declaration phase
    const player3Hand = serverRoom.state.players.get(room3.sessionId)!.hand;
    room3.send('load_bag', { cardIds: [player3Hand[0].id] });
    await delay(200);

    expect(serverRoom.state.phase).toBe('DECLARATION');

    // 6. Declaration tampering
    const declaringRoom = room2;
    const nonDeclaringRoom = room3;
    const decErrors: string[] = [];
    declaringRoom.onMessage('error', (err: any) => decErrors.push(err.message));

    // Player attempting to declare with unsnapped bag
    const nonDecPlayer = serverRoom.state.players.get(nonDeclaringRoom.sessionId)!;
    nonDecPlayer.sealedBag!.isSnapped = false;
    const nonDecErrors: string[] = [];
    nonDeclaringRoom.onMessage('error', (err: any) => nonDecErrors.push(err.message));
    nonDeclaringRoom.send('declaration', { declaredGood: 'APPLE', declaredCount: 1 });
    await delay(100);
    expect(nonDecErrors.some((m) => m.includes('Must snap bag before declaring'))).toBe(true);
    nonDecPlayer.sealedBag!.isSnapped = true;

    // Declaring player: count mismatch (declared 4 but loaded 2 or 1)
    declaringRoom.send('declaration', { declaredGood: 'APPLE', declaredCount: 4 });
    await delay(100);
    expect(decErrors.some((m) => m.includes('does not match exact bag card count'))).toBe(true);

    // Declaring contraband good
    const validCount = serverRoom.state.players.get(declaringRoom.sessionId)!.sealedBag!.cardCount;
    declaringRoom.send('declaration', { declaredGood: 'PEPPER' as any, declaredCount: validCount });
    await delay(100);
    expect(decErrors.some((m) => m.includes('not a valid legal good'))).toBe(true);

    // Submit valid declarations for both merchants to enter INSPECTION
    room2.send('declaration', { declaredGood: 'APPLE', declaredCount: 2 });
    await delay(50);
    room3.send('declaration', { declaredGood: 'CHEESE', declaredCount: 1 });
    await delay(200);

    expect(serverRoom.state.phase).toBe('INSPECTION');

    // 7. Bribe tampering
    // Negative gold
    room2.send('bribe_propose', { gold: -5 });
    await delay(100);
    expect(errorsRoom2.some((m) => m.includes('non-negative integer'))).toBe(true);

    // Gold > balance (balance is 50)
    room2.send('bribe_propose', { gold: 9999 });
    await delay(100);
    expect(errorsRoom2.some((m) => m.includes('more gold than you currently hold'))).toBe(true);

    // Stand card not in standLegal
    room2.send('bribe_propose', { gold: 5, standCardIds: ['fake_stand_card_id'] });
    await delay(100);
    expect(errorsRoom2.some((m) => m.includes('not on your legal stand'))).toBe(true);

    // 8. Responding to bribe when none is proposed
    room1.send('bribe_respond', { accept: true });
    await delay(100);
    expect(errorsSheriff.some((m) => m.includes('No active bribe offer'))).toBe(true);

    // Merchant proposing valid bribe
    room2.send('bribe_propose', { gold: 10 });
    await delay(100);

    // Merchant attempting to respond to own bribe
    room2.send('bribe_respond', { accept: true });
    await delay(100);
    expect(errorsRoom2.some((m) => m.includes('Cannot respond to your own bribe'))).toBe(true);

    // 9. Non-authority attempting to inspect
    room3.send('inspection_action', { targetPlayerId: room2.sessionId, type: 'INSPECT' });
    await delay(100);
    expect(nonDecErrors.some((m) => m.includes('Only the Sheriff or Deputy'))).toBe(true);

    await room1.leave();
    await room2.leave();
    await room3.leave();
  });

  it('enforces zero-knowledge state isolation and restores private state on client reconnection', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Alice' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Bob' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'Charlie' });

    await delay(100);

    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    await delay(200);

    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    expect(serverRoom.state.phase).toBe('MARKET');

    // Alice (room1) can see own hand, but Bob (room2) cannot see Alice's hand
    const aliceInRoom1 = room1.state.players.get(room1.sessionId);
    const aliceInRoom2 = room2.state.players.get(room1.sessionId);
    expect(aliceInRoom1.hand.length).toBe(6);
    expect(aliceInRoom2.hand?.length ?? 0).toBe(0);
    expect(aliceInRoom2.handCount).toBe(6);

    // Fast-forward to sealed bags
    serverRoom.state.phase = 'LOAD_BAG';
    const bob = serverRoom.state.players.get(room2.sessionId)!;
    const charlie = serverRoom.state.players.get(room3.sessionId)!;

    // Bob loads 3 cards into bag
    room2.send('load_bag', { cardIds: [bob.hand[0].id, bob.hand[1].id, bob.hand[2].id] });
    await delay(100);

    // Bob can see his own bag cards
    const bobInRoom2 = room2.state.players.get(room2.sessionId);
    expect(bobInRoom2.sealedBag?.cards.length).toBe(3);

    // Alice (Sheriff) and Charlie cannot see Bob's bag cards
    const bobInRoom1 = room1.state.players.get(room2.sessionId);
    const bobInRoom3 = room3.state.players.get(room2.sessionId);
    expect(bobInRoom1.sealedBag?.cards?.length ?? 0).toBe(0);
    expect(bobInRoom3.sealedBag?.cards?.length ?? 0).toBe(0);
    expect(bobInRoom1.sealedBag?.cardCount).toBe(3); // Public count visible

    // Test client reconnection: Bob simulates connection drop and reconnects
    const token = room2.reconnectionToken;
    expect(token).toBeDefined();

    await room2.leave(false); // Simulate ungraceful close
    await delay(100);

    expect(serverRoom.state.players.get(bob.id)!.connected).toBe(false);

    // Reconnect with client2 using token
    const reconnectedRoom2 = await client2.reconnect(token);
    await delay(150);

    expect(serverRoom.state.players.get(bob.id)!.connected).toBe(true);

    // Bob's private hand and bag are restored on reconnected socket
    const restoredBob = reconnectedRoom2.state.players.get(bob.id);
    expect(restoredBob.hand.length).toBe(3);
    expect(restoredBob.sealedBag?.cards.length).toBe(3);

    // Charlie still cannot see Bob's cards
    const bobFromCharlie = room3.state.players.get(bob.id);
    expect(bobFromCharlie.sealedBag?.cards?.length ?? 0).toBe(0);
    expect(bobFromCharlie.hand?.length ?? 0).toBe(0);

    await room1.leave();
    await reconnectedRoom2.leave();
    await room3.leave();
  });

  it('verifies room onDispose cleans up internal state and prevents memory leaks', async () => {
    const room1 = await client1.create('nottingham', { playerName: 'Host' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'P2' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'P3' });

    await delay(100);
    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    await delay(200);

    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    expect(serverRoom).toBeDefined();

    // Verify internal state is populated
    expect(serverRoom['internalDrawPile'].length).toBeGreaterThan(0);
    expect(serverRoom['tableSeatIds'].length).toBe(3);

    // Trigger room disposal
    serverRoom.onDispose();

    // Verify clean disposal
    expect(serverRoom['internalDrawPile'].length).toBe(0);
    expect(serverRoom['internalDiscardPile'].length).toBe(0);
    expect(serverRoom['tableSeatIds'].length).toBe(0);
    expect(serverRoom['inspectedMerchantIds'].size).toBe(0);
    expect(serverRoom['declarationOrder'].length).toBe(0);
    expect(serverRoom['marketState']).toBeUndefined();
    expect(serverRoom['deputiesEngineState']).toBeUndefined();
    expect(serverRoom['blackMarketEngineState']).toBeUndefined();

    await room1.leave();
    await room2.leave();
    await room3.leave();
  });
});
