import type {
  ChatMessage,
  ParticipantState,
  RoomRole,
  RoomState,
  SocketLike,
  SpectatorState,
  WSConnection,
  WSMessage,
} from './types';

const OPEN = 1;
const MAX_CHAT = 100;

function canSend(socket: SocketLike): boolean {
  if (socket.readyState === undefined) return true;
  return socket.readyState === OPEN;
}

export type RaceFinishCallback = (
  roomId: string,
  results: Array<{
    userId: string;
    wpm: number;
    accuracy: number;
    finishedAt: number | null;
  }>
) => void | Promise<void>;

export type RaceStartCallback = (roomId: string) => void | Promise<void>;

export class ConnectionManager {
  private connections = new Map<string, WSConnection>();
  private rooms = new Map<string, RoomState>();
  private userConnections = new Map<string, string>();
  private roomConnections = new Map<string, Set<string>>();
  private onRaceFinish: RaceFinishCallback | null = null;
  private onRaceStart: RaceStartCallback | null = null;

  setRaceFinishHandler(cb: RaceFinishCallback) {
    this.onRaceFinish = cb;
  }

  setRaceStartHandler(cb: RaceStartCallback) {
    this.onRaceStart = cb;
  }

  addConnection(connectionId: string, socket: SocketLike): WSConnection {
    const connection: WSConnection = {
      id: connectionId,
      socket,
      isAlive: true,
      lastPing: Date.now(),
    };
    this.connections.set(connectionId, connection);
    return connection;
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.roomId) {
      this.leaveRoom(connectionId, connection.roomId);
    }
    if (connection.userId) {
      this.userConnections.delete(connection.userId);
    }
    this.connections.delete(connectionId);
  }

  getConnection(connectionId: string): WSConnection | undefined {
    return this.connections.get(connectionId);
  }

  authenticateConnection(
    connectionId: string,
    userId: string,
    username?: string
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    const oldConnectionId = this.userConnections.get(userId);
    if (oldConnectionId && oldConnectionId !== connectionId) {
      this.removeConnection(oldConnectionId);
    }

    connection.userId = userId;
    connection.username = username;
    this.userConnections.set(userId, connectionId);
    return true;
  }

  createRoom(
    roomId: string,
    name: string,
    hostId: string,
    testTextId: string,
    maxPlayers: number = 10
  ): RoomState {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const room: RoomState = {
      id: roomId,
      name,
      hostId,
      testTextId,
      maxPlayers,
      status: 'waiting',
      participants: new Map(),
      spectators: new Map(),
      chat: [],
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    this.roomConnections.set(roomId, new Set());
    return room;
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(
    connectionId: string,
    roomId: string,
    userId: string,
    username: string,
    spectate = false
  ): { ok: boolean; role?: RoomRole; error?: string } {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room || !connection.userId) {
      return { ok: false, error: 'Not ready' };
    }

    // Force spectator if race already running / finished
    const mustSpectate =
      spectate || room.status === 'active' || room.status === 'finished';

    if (mustSpectate) {
      return this.joinAsSpectator(connectionId, roomId, userId, username);
    }

    if (room.status !== 'waiting' && room.status !== 'countdown') {
      return { ok: false, error: 'Race already started — join as spectator' };
    }

    if (room.participants.size >= room.maxPlayers && !room.participants.has(userId)) {
      return { ok: false, error: 'Room is full' };
    }

    // Leave spectator seat if re-joining as racer
    room.spectators.delete(userId);

    const existing = room.participants.get(userId);
    if (existing) {
      existing.connectionId = connectionId;
      existing.username = username;
      connection.roomId = roomId;
      connection.role = 'racer';
      this.roomConnections.get(roomId)?.add(connectionId);
      this.broadcastRoomUpdate(roomId);
      return { ok: true, role: 'racer' };
    }

    const participant: ParticipantState = {
      userId,
      username,
      connectionId,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      errors: 0,
      finished: false,
      lastUpdate: Date.now(),
    };

    room.participants.set(userId, participant);
    connection.roomId = roomId;
    connection.role = 'racer';

    let roomConnections = this.roomConnections.get(roomId);
    if (!roomConnections) {
      roomConnections = new Set();
      this.roomConnections.set(roomId, roomConnections);
    }
    roomConnections.add(connectionId);

    this.broadcastToRoom(roomId, {
      type: 'participant_joined',
      data: { participant: this.serializeParticipant(participant) },
      timestamp: Date.now(),
    });
    this.broadcastRoomUpdate(roomId);
    return { ok: true, role: 'racer' };
  }

  private joinAsSpectator(
    connectionId: string,
    roomId: string,
    userId: string,
    username: string
  ): { ok: boolean; role?: RoomRole; error?: string } {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);
    if (!connection || !room) return { ok: false, error: 'Room not found' };

    // If they were a racer mid-waiting, remove from racers when spectating intentionally
    // (only if race not active - during active they stay as racer)
    if (room.status === 'waiting' && room.participants.has(userId)) {
      // keep as racer instead
      return this.joinRoom(connectionId, roomId, userId, username, false);
    }

    const spectator: SpectatorState = {
      userId,
      username,
      connectionId,
      joinedAt: Date.now(),
    };
    room.spectators.set(userId, spectator);
    connection.roomId = roomId;
    connection.role = 'spectator';

    let roomConnections = this.roomConnections.get(roomId);
    if (!roomConnections) {
      roomConnections = new Set();
      this.roomConnections.set(roomId, roomConnections);
    }
    roomConnections.add(connectionId);

    this.broadcastToRoom(roomId, {
      type: 'spectator_joined',
      data: {
        spectator: { userId, username },
      },
      timestamp: Date.now(),
    });
    this.broadcastRoomUpdate(roomId);
    return { ok: true, role: 'spectator' };
  }

  leaveRoom(connectionId: string, roomId: string): boolean {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);
    if (!connection || !room || !connection.userId) return false;

    const userId = connection.userId;
    const wasRacer = room.participants.has(userId);
    room.participants.delete(userId);
    room.spectators.delete(userId);
    connection.roomId = undefined;
    connection.role = undefined;
    this.roomConnections.get(roomId)?.delete(connectionId);

    if (
      room.participants.size === 0 &&
      room.spectators.size === 0
    ) {
      this.cleanupRoom(roomId);
    } else {
      if (wasRacer && userId === room.hostId) {
        const next = room.participants.values().next().value as
          | ParticipantState
          | undefined;
        if (next) room.hostId = next.userId;
      }
      this.broadcastToRoom(roomId, {
        type: 'participant_left',
        data: { userId },
        timestamp: Date.now(),
      });
      this.broadcastRoomUpdate(roomId);
    }
    return true;
  }

  addChatMessage(
    connectionId: string,
    text: string
  ): ChatMessage | null {
    const connection = this.connections.get(connectionId);
    if (!connection?.roomId || !connection.userId || !connection.username) {
      return null;
    }
    const room = this.rooms.get(connection.roomId);
    if (!room) return null;

    const cleaned = text.trim().slice(0, 500);
    if (!cleaned) return null;

    const msg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: connection.userId,
      username: connection.username,
      text: cleaned,
      at: Date.now(),
      role: connection.role ?? 'racer',
    };
    room.chat.push(msg);
    if (room.chat.length > MAX_CHAT) {
      room.chat = room.chat.slice(-MAX_CHAT);
    }

    this.broadcastToRoom(connection.roomId, {
      type: 'chat_message',
      data: { message: msg },
      timestamp: Date.now(),
    });
    return msg;
  }

  startRaceCountdown(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting' || room.participants.size < 1) {
      return false;
    }

    room.status = 'countdown';
    room.countdownStartTime = Date.now();

    let countdown = 3;
    const tick = () => {
      this.broadcastToRoom(roomId, {
        type: 'race_countdown',
        data: { roomId, countdown },
        timestamp: Date.now(),
      });
      countdown--;
      if (countdown < 0) {
        this.startRace(roomId);
      } else {
        setTimeout(tick, 1000);
      }
    };
    tick();
    return true;
  }

  private startRace(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'active';
    room.startTime = Date.now();

    for (const p of room.participants.values()) {
      p.progress = 0;
      p.wpm = 0;
      p.accuracy = 100;
      p.errors = 0;
      p.finished = false;
      p.finishedAt = undefined;
    }

    void this.onRaceStart?.(roomId);

    this.broadcastToRoom(roomId, {
      type: 'race_started',
      data: { roomId, startTime: room.startTime },
      timestamp: Date.now(),
    });
    this.broadcastRoomUpdate(roomId);
  }

  updateTypingProgress(
    connectionId: string,
    progress: number,
    wpm: number,
    accuracy: number,
    errors: number
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection?.roomId || !connection.userId) return false;
    if (connection.role === 'spectator') return false;

    const room = this.rooms.get(connection.roomId);
    if (!room || room.status !== 'active') return false;

    const participant = room.participants.get(connection.userId);
    if (!participant) return false;

    participant.progress = Math.min(100, Math.max(0, progress));
    participant.wpm = wpm;
    participant.accuracy = accuracy;
    participant.errors = errors;
    participant.lastUpdate = Date.now();

    if (participant.progress >= 100 && !participant.finished) {
      participant.finished = true;
      participant.finishedAt = Date.now();
      this.broadcastToRoom(connection.roomId, {
        type: 'participant_finished',
        data: {
          userId: connection.userId,
          finishedAt: participant.finishedAt,
          wpm: participant.wpm,
          accuracy: participant.accuracy,
        },
        timestamp: Date.now(),
      });

      // Persist individual finish early
      void this.onRaceFinish?.(connection.roomId, [
        {
          userId: connection.userId,
          wpm: participant.wpm,
          accuracy: participant.accuracy,
          finishedAt: participant.finishedAt,
        },
      ]);

      const allFinished = Array.from(room.participants.values()).every(
        (p) => p.finished
      );
      if (allFinished) this.finishRace(connection.roomId);
    }

    this.broadcastRoomUpdate(connection.roomId);
    return true;
  }

  private finishRace(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.status = 'finished';

    const results = Array.from(room.participants.values()).map((p) => ({
      userId: p.userId,
      wpm: p.wpm,
      accuracy: p.accuracy,
      finishedAt: p.finishedAt ?? null,
    }));

    void this.onRaceFinish?.(roomId, results);

    this.broadcastToRoom(roomId, {
      type: 'race_finished',
      data: { roomId, results },
      timestamp: Date.now(),
    });

    setTimeout(() => {
      const r = this.rooms.get(roomId);
      if (r?.status === 'finished') this.cleanupRoom(roomId);
    }, 120_000);
  }

  broadcastToRoom(roomId: string, message: WSMessage): void {
    const roomConnections = this.roomConnections.get(roomId);
    if (!roomConnections) return;
    const messageStr = JSON.stringify(message);
    for (const connectionId of roomConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && canSend(connection.socket)) {
        try {
          connection.socket.send(messageStr);
        } catch {
          // ignore
        }
      }
    }
  }

  private broadcastRoomUpdate(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.broadcastToRoom(roomId, {
      type: 'room_updated',
      data: {
        room: {
          id: room.id,
          name: room.name,
          status: room.status,
          hostId: room.hostId,
          participants: Array.from(room.participants.values()).map((p) =>
            this.serializeParticipant(p)
          ),
          spectators: Array.from(room.spectators.values()).map((s) => ({
            userId: s.userId,
            username: s.username,
          })),
        },
      },
      timestamp: Date.now(),
    });
  }

  sendToConnection(connectionId: string, message: WSMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !canSend(connection.socket)) return false;
    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  private serializeParticipant(participant: ParticipantState) {
    return {
      userId: participant.userId,
      username: participant.username,
      progress: participant.progress,
      wpm: participant.wpm,
      accuracy: participant.accuracy,
      errors: participant.errors,
      finished: participant.finished,
    };
  }

  private cleanupRoom(roomId: string): void {
    const roomConnections = this.roomConnections.get(roomId);
    if (roomConnections) {
      for (const connectionId of roomConnections) {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.roomId = undefined;
          connection.role = undefined;
          this.sendToConnection(connectionId, {
            type: 'room_left',
            data: { roomId, reason: 'Room closed' },
            timestamp: Date.now(),
          });
        }
      }
    }
    this.rooms.delete(roomId);
    this.roomConnections.delete(roomId);
  }

  getStats() {
    return {
      connections: this.connections.size,
      rooms: this.rooms.size,
      authenticatedUsers: this.userConnections.size,
    };
  }
}
