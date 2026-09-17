import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { Client } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';
import { CardState } from '../../src/schema/GameState';

describe('BlackMarketModule Room Integration (Colyseus 0.18)', () => {
  const TEST_PORT = 2573;
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

  it('initializes piles, allows 3-contraband trade-in, limits to 1 per round, and resets on round end', async () => {
    const room1 = await client1.create('nottingham', {
      playerName: 'Player1',
      enableBlackMarket: true,
    });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Player2' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'Player3' });
    const room4 = await client4.joinById(room1.roomId, { playerName: 'Player4' });

    await delay(100);

    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    expect(serverRoom.state.enableBlackMarket).toBe(true);

    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    room4.send('ready');
    await delay(200);

    // Verify Black Market piles initialized on GameState schema
    expect(serverRoom.state.blackMarketPepperPile.length).toBe(2);
    expect(serverRoom.state.blackMarketMeadPile.length).toBe(2);
    expect(serverRoom.state.blackMarketSilkPile.length).toBe(2);

    expect(serverRoom.state.blackMarketPepperPile[0].pointsValue).toBe(14);
    expect(serverRoom.state.blackMarketPepperPile[1].pointsValue).toBe(10);

    // Fast-forward to INSPECTION phase
    serverRoom.state.phase = 'INSPECTION';

    // Give Player2 3 Peppers on their stand
    const p2 = serverRoom.state.players.get(room2.sessionId)!;
    p2.standContraband.clear();
    p2.standContraband.push(new CardState({ id: 'pep1', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    p2.standContraband.push(new CardState({ id: 'pep2', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    p2.standContraband.push(new CardState({ id: 'pep3', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    p2.standContrabandCount = 3;

    // Player 2 claims top Pepper order
    room2.send('claim_black_market', { contrabandType: 'PEPPER' });
    await delay(100);

    // Verify 3 peppers consumed, 1 claimed Black Market card added
    expect(p2.standContraband.length).toBe(1);
    expect(p2.standContraband[0].value).toBe(14); // 14 victory points!
    expect(p2.hasClaimedBlackMarketThisRound).toBe(true);
    expect(serverRoom.state.blackMarketPepperPile.length).toBe(1);

    // Verify 3 consumed cards went to discard
    expect(serverRoom.internalDiscardPile.length).toBeGreaterThanOrEqual(3);

    // Attempting a second claim in the same round should be rejected
    let errorReceived = '';
    room2.onMessage('error', (err: any) => {
      errorReceived = err.message;
    });

    p2.standContraband.push(new CardState({ id: 'pep4', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    p2.standContraband.push(new CardState({ id: 'pep5', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));
    p2.standContraband.push(new CardState({ id: 'pep6', name: 'Pepper', classification: 'CONTRABAND', contrabandType: 'PEPPER', value: 6, penalty: 4 }));

    room2.send('claim_black_market', { contrabandType: 'PEPPER' });
    await delay(100);

    expect(errorReceived).toMatch(/already claimed/);

    // Round End resets claim flag
    (serverRoom as any).handleRoundEnd();
    await delay(100);

    expect(p2.hasClaimedBlackMarketThisRound).toBe(false);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });
});
