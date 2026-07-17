import type {
  ParticipantState,
  RoomState,
  SocketLike,
  WSConnection,
  WSMessage,
} from './types';

const OPEN = 1;

function canSend(socket: SocketLike): boolean {
  if (socket.readyState === undefined) return true;
  return socket.readyState === OPEN;
}

export class ConnectionManager {
  private connections = new Map<string, WSConnection>();
  private rooms = new Map<string, RoomState>();
  private userConnections = new Map<string, string>();
  private roomConnections = new Map<string, Set<string>>();

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
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    this.roomConnections.set(roomId, new Set());
    return room;
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  ensureRoom(
    roomId: string,
    meta: {
      name: string;
      hostId: string;
      testTextId: string;
      maxPlayers: number;
    }
  ): RoomState {
    return (
      this.rooms.get(roomId) ??
      this.createRoom(
        roomId,
        meta.name,
        meta.hostId,
        meta.testTextId,
        meta.maxPlayers
      )
    );
  }

  joinRoom(
    connectionId: string,
    roomId: string,
    userId: string,
    username: string
  ): boolean {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room || !connection.userId) return false;
    if (room.participants.size >= room.maxPlayers) return false;
    if (room.status === 'active' || room.status === 'finished') return false;

    // Re-join / reconnect
    const existing = room.participants.get(userId);
    if (existing) {
      existing.connectionId = connectionId;
      existing.username = username;
      connection.roomId = roomId;
      this.roomConnections.get(roomId)?.add(connectionId);
      this.broadcastRoomUpdate(roomId);
      return true;
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
    return true;
  }

  leaveRoom(connectionId: string, roomId: string): boolean {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);
    if (!connection || !room || !connection.userId) return false;

    const userId = connection.userId;
    room.participants.delete(userId);
    connection.roomId = undefined;
    this.roomConnections.get(roomId)?.delete(connectionId);

    if (room.participants.size === 0) {
      this.cleanupRoom(roomId);
    } else {
      // Transfer host if needed
      if (userId === room.hostId) {
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

  /** Allow solo practice races (1+ players) for polish UX. */
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
    // Immediate first tick
    tick();
    return true;
  }

  private startRace(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'active';
    room.startTime = Date.now();

    // Reset progress
    for (const p of room.participants.values()) {
      p.progress = 0;
      p.wpm = 0;
      p.accuracy = 100;
      p.errors = 0;
      p.finished = false;
      p.finishedAt = undefined;
    }

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
    this.broadcastToRoom(roomId, {
      type: 'race_finished',
      data: { roomId },
      timestamp: Date.now(),
    });
    // Keep room for results; auto-cleanup later
    setTimeout(() => {
      const r = this.rooms.get(roomId);
      if (r?.status === 'finished') this.cleanupRoom(roomId);
    }, 60_000);
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
          // ignore dead sockets
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
