import { Client, Room } from '@colyseus/sdk';
import { useGameStore } from '../state/gameStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:2567';

class NetworkManager {
  private client: Client;
  private room: Room | null = null;

  constructor() {
    this.client = new Client(WS_URL);
  }

  async createRoom(playerName: string, options: Record<string, unknown> = {}) {
    this.room = await this.client.create('nottingham', {
      playerName,
      ...options,
    });
    this.bindRoomEvents();
    return this.room.roomId;
  }

  async joinRoom(roomId: string, playerName: string) {
    this.room = await this.client.joinById(roomId, { playerName });
    this.bindRoomEvents();
    return this.room.roomId;
  }

  private bindRoomEvents() {
    if (!this.room) return;
    const store = useGameStore.getState();

    store.setLocalPlayerId(this.room.sessionId);
    store.setRoomId(this.room.roomId);
    store.setConnected(true);

    // Initial state sync
    if (this.room.state) {
      store.updateGameState(this.room.state);
    }

    // Subscribe to all incremental state updates from Colyseus
    this.room.onStateChange((state: any) => {
      useGameStore.getState().updateGameState(state);
    });

    this.room.onLeave(() => {
      useGameStore.getState().reset();
    });
  }

  send(type: string, data?: any) {
    this.room?.send(type, data);
  }

  async leave() {
    await this.room?.leave();
    this.room = null;
  }

  get sessionId() {
    return this.room?.sessionId;
  }

  get roomId() {
    return this.room?.roomId;
  }

  get currentRoom() {
    return this.room;
  }
}

export const network = new NetworkManager();
