import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomRecord {
  partyCode: string;
  mode: string;
  hostId: string;
  mapSeed: number;
  layoutVariant: string;
  players: Map<string, Record<string, unknown>>;
  clients: Map<WebSocket, string>;
  worldSnapshot?: unknown;
  processedEventIds: Set<string>;
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const rooms = new Map<string, RoomRecord>();

  const broadcastToRoom = (
    room: RoomRecord,
    payload: unknown,
    excludeSocket?: WebSocket
  ) => {
    const raw = JSON.stringify(payload);
    for (const client of room.clients.keys()) {
      if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  };

  const broadcastRoomState = (room: RoomRecord) => {
    const playersList = Array.from(room.players.values()).map((p) => ({
      ...p,
      isHost: (p as { id?: string }).id === room.hostId,
    }));
    const msg = {
      kind: 'ROOM_STATE',
      partyCode: room.partyCode,
      mode: room.mode,
      hostId: room.hostId,
      mapSeed: room.mapSeed,
      layoutVariant: room.layoutVariant,
      players: playersList,
      worldSnapshot: room.worldSnapshot,
    };
    broadcastToRoom(room, msg);
  };

  wss.on('connection', (ws) => {
    let joinedPartyCode: string | null = null;
    let joinedPlayerId: string | null = null;

    ws.on('message', (data) => {
      try {
        const env = JSON.parse(String(data));
        const partyCode = String(env.partyCode || '').slice(0, 8);
        if (!partyCode) return;

        if (env.kind === 'JOIN_ROOM' && env.player) {
          const playerId = String(env.player.id);
          joinedPartyCode = partyCode;
          joinedPlayerId = playerId;

          let room = rooms.get(partyCode);
          if (!room) {
            room = {
              partyCode,
              mode: env.mode || 'COOP_SQUAD',
              hostId: playerId,
              mapSeed: Number(env.mapSeed) || 2026,
              layoutVariant: env.layoutVariant || 'l_compound',
              players: new Map(),
              clients: new Map(),
              processedEventIds: new Set(),
            };
            rooms.set(partyCode, room);
          } else if (room.hostId === playerId) {
            room.mode = env.mode || room.mode;
            room.mapSeed = Number(env.mapSeed) || room.mapSeed;
            room.layoutVariant = env.layoutVariant || room.layoutVariant;
          }

          room.clients.set(ws, playerId);
          room.players.set(playerId, {
            ...env.player,
            isHost: room.hostId === playerId,
            lastUpdated: Date.now(),
          });

          broadcastRoomState(room);
          return;
        }

        const room = rooms.get(partyCode);
        if (!room) return;

        if (env.kind === 'ROOM_STATE' && env.worldSnapshot) {
          room.worldSnapshot = env.worldSnapshot;
          broadcastToRoom(room, env, ws);
          return;
        }

        if (env.kind === 'LEAVE_ROOM') {
          const pid = String(env.playerId || joinedPlayerId || '');
          room.players.delete(pid);
          room.clients.delete(ws);
          if (room.players.size === 0) {
            rooms.delete(partyCode);
          } else {
            if (room.hostId === pid) {
              room.hostId = Array.from(room.players.keys())[0];
            }
            broadcastRoomState(room);
          }
          return;
        }

        if (env.kind === 'PLAYER_POSE' && env.player) {
          const pid = String(env.player.id);
          room.players.set(pid, {
            ...env.player,
            isHost: room.hostId === pid,
            lastUpdated: Date.now(),
          });
          broadcastToRoom(room, env, ws);
          return;
        }

        if (env.kind === 'WORLD_EVENT' && env.event) {
          const eventId = String(env.event.eventId || '');
          if (eventId) {
            if (room.processedEventIds.has(eventId)) return;
            room.processedEventIds.add(eventId);
            if (room.processedEventIds.size > 500) {
              const first = room.processedEventIds.values().next().value;
              if (first) room.processedEventIds.delete(first);
            }
          }
          if (env.event.type === 'MATCH_SYNC') {
            room.mode = env.event.mode || room.mode;
            room.mapSeed = Number(env.event.mapSeed) || room.mapSeed;
            room.layoutVariant = env.event.layoutVariant || room.layoutVariant;
            if (env.event.worldSnapshot) {
              room.worldSnapshot = env.event.worldSnapshot;
            }
          }
          broadcastToRoom(room, env, ws);
          return;
        }

        if (env.kind === 'PING') {
          ws.send(
            JSON.stringify({
              kind: 'PONG',
              partyCode,
              targetId: env.senderId,
              sentAt: env.sentAt,
            })
          );
          return;
        }

        if (env.kind === 'PONG') {
          broadcastToRoom(room, env, ws);
          return;
        }
      } catch {
        // Ignore malformed message
      }
    });

    ws.on('close', () => {
      if (joinedPartyCode && joinedPlayerId) {
        const room = rooms.get(joinedPartyCode);
        if (room) {
          room.clients.delete(ws);
          room.players.delete(joinedPlayerId);
          if (room.players.size === 0) {
            rooms.delete(joinedPartyCode);
          } else {
            if (room.hostId === joinedPlayerId) {
              room.hostId = Array.from(room.players.keys())[0];
            }
            broadcastRoomState(room);
          }
        }
      }
    });
  });

  app.get('/api/rooms/:partyCode', (req, res) => {
    const code = String(req.params.partyCode || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.json({ exists: false, partyCode: code, players: [] });
      return;
    }
    res.json({
      exists: true,
      partyCode: room.partyCode,
      mode: room.mode,
      hostId: room.hostId,
      mapSeed: room.mapSeed,
      layoutVariant: room.layoutVariant,
      players: Array.from(room.players.values()),
      worldSnapshot: room.worldSnapshot,
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Zero Hour CQB Tactical Server + WebSocket (/ws) listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
