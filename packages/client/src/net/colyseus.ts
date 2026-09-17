import { Client, Room } from '@colyseus/sdk';
import type { InspectionResultMessage } from '@sheriff/shared';
import { useGameStore } from '../state/gameStore';
import { soundManager } from '../audio/soundManager';

function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in development (e.g. Vite dev server on 5173 or 3000), connect to port 2567
    if (window.location.port === '5173' || window.location.port === '3000') {
      return `${protocol}//${window.location.hostname}:2567`;
    }
    // In production behind reverse proxy (port 80 / 443), connect through current host and protocol
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost:2567';
}

const WS_URL = getWsUrl();

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

    // Listen for server-sent validation error messages
    this.room.onMessage('error', (data: { message: string }) => {
      useGameStore.getState().setError(data.message);
    });

    // Listen for inspection outcome broadcasts
    this.room.onMessage('inspection_result', (result: InspectionResultMessage) => {
      useGameStore.getState().setLastInspectionResult(result);
      if (result.outcome === 'HONEST') {
        soundManager.playHonestFanfare();
      } else if (result.outcome === 'DISHONEST') {
        soundManager.playDishonestStinger();
      } else {
        soundManager.playPassChime();
      }
    });

    // Listen for cross-bag negotiation toast broadcasts
    this.room.onMessage('negotiation_cross_bag_toast', (data: any) => {
      useGameStore.getState().setCrossBagToast({
        ...data,
        timestamp: Date.now(),
      });
      setTimeout(() => {
        const current = useGameStore.getState().crossBagToast;
        if (current && Date.now() - current.timestamp >= 4900) {
          useGameStore.getState().setCrossBagToast(null);
        }
      }, 5000);
    });

    // Listen for deal struck announcements
    this.room.onMessage('negotiation_deal_struck', (deal: any) => {
      useGameStore.getState().setDealStruckBanner({
        ...deal,
        timestamp: Date.now(),
      });
      soundManager.playSnap();
      setTimeout(() => {
        const current = useGameStore.getState().dealStruckBanner;
        if (current && Date.now() - current.timestamp >= 3400) {
          useGameStore.getState().setDealStruckBanner(null);
        }
      }, 3500);
    });

    // Listen for negotiation reconciliation records (Honor Among Thieves)
    this.room.onMessage('negotiation_reconciled', (record: any) => {
      useGameStore.getState().addReconciliationRecord(record);
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
