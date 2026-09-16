import 'dotenv/config';
import { defineServer, defineRoom } from 'colyseus';
import { NottinghamRoom } from './rooms/NottinghamRoom';

const port = Number(process.env.SERVER_PORT) || 2567;

const server = defineServer({
  rooms: {
    nottingham: defineRoom(NottinghamRoom),
  },
});

server.listen(port).then(() => {
  console.log(`Colyseus 0.18 game server listening on ws://localhost:${port}`);
});
