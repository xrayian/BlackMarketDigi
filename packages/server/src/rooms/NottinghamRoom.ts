import { Room, Client } from 'colyseus';
import { GameState, PlayerState } from '../schema/GameState';

function generateRoomCode(): string {
  // Clear, non-confusing uppercase characters (no 0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class NottinghamRoom extends Room<{ state: GameState }> {
  maxClients = 6;

  onCreate(options: any) {
    // Generate a clean 4-character uppercase room code
    this.roomId = generateRoomCode();

    this.setState(new GameState());
    this.state.phase = 'LOBBY';
    this.state.maxPlayers = options?.maxPlayers || 4;
    this.state.enableRoyalGoods = options?.enableRoyalGoods || false;
    this.state.enableDeputies = options?.enableDeputies || false;
    this.state.enableBlackMarket = options?.enableBlackMarket || false;

    this.onMessage('ready', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.ready = !player.ready;
      }
    });
  }

  onJoin(client: Client, options: any) {
    const player = new PlayerState({
      id: client.sessionId,
      name: options?.playerName || `Player ${this.state.players.size + 1}`,
      gold: 50,
      ready: false,
      seatIndex: this.state.players.size,
    });
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  onDispose() {}
}
