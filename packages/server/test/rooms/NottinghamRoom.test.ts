import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom } from 'colyseus';
import { Client, Callbacks } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';

describe('NottinghamRoom (Colyseus 0.18)', () => {
  const TEST_PORT = 2568;
  let server: any;
  let client1: Client;
  let client2: Client;

  beforeAll(async () => {
    server = defineServer({
      rooms: {
        nottingham: defineRoom(NottinghamRoom),
      },
    });
    await server.listen(TEST_PORT);
    client1 = new Client(`http://localhost:${TEST_PORT}`);
    client2 = new Client(`http://localhost:${TEST_PORT}`);
  });

  afterAll(async () => {
    if (server) {
      await server.gracefullyShutdown(false);
    }
  });

  it('allows a player to create a room, receive state, and toggle ready', async () => {
    const room1 = await client1.create('nottingham', {
      playerName: 'Robin',
    });

    expect(room1.roomId).toBeDefined();
    expect(typeof room1.roomId).toBe('string');
    expect(room1.sessionId).toBeDefined();

    // Attach callbacks using the Colyseus 0.18 SDK
    const callbacks = Callbacks.get(room1);
    expect(callbacks).toBeDefined();

    // Verify room has state
    expect(room1.state).toBeDefined();

    // Wait for state sync
    await new Promise((resolve) => setTimeout(resolve, 100));

    const playersMap = room1.state.players;
    expect(playersMap.get(room1.sessionId)).toBeDefined();
    expect(playersMap.get(room1.sessionId).name).toBe('Robin');
    expect(playersMap.get(room1.sessionId).ready).toBe(false);

    // Toggle ready
    room1.send('ready');
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(playersMap.get(room1.sessionId).ready).toBe(true);

    // Second player joins room by ID
    const room2 = await client2.joinById(room1.roomId, {
      playerName: 'Marian',
    });

    expect(room2.roomId).toBe(room1.roomId);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(room1.state.players.size).toBe(2);
    expect(room2.state.players.size).toBe(2);

    await room1.leave();
    await room2.leave();
  });
});
