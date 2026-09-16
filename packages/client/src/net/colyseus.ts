import { Client, Callbacks, Room } from '@colyseus/sdk';
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

    const callbacks = Callbacks.get(this.room);

    callbacks.listen('phase', (value: string) => {
      useGameStore.getState().setPhase(value as any);
    });

    callbacks.onAdd('players', (player: any) => {
      this.syncPlayers();
      callbacks.listen(player, 'ready', () => this.syncPlayers());
      callbacks.listen(player, 'name', () => this.syncPlayers());
    });

    callbacks.onRemove('players', () => {
      this.syncPlayers();
    });

    this.room.onStateChange(() => {
      this.syncPlayers();
    });

    this.room.onLeave(() => {
      useGameStore.getState().reset();
    });
  }

  private syncPlayers() {
    if (!this.room || !this.room.state) return;
    const players = new Map<string, any>();
    const state = this.room.state as any;
    if (state.players && typeof state.players.forEach === 'function') {
      state.players.forEach((player: any, key: string) => {
        players.set(key, {
          id: player.id,
          name: player.name,
          gold: player.gold,
          ready: player.ready,
          seatIndex: player.seatIndex,
        });
      });
    }
    useGameStore.getState().updatePlayers(players);
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
