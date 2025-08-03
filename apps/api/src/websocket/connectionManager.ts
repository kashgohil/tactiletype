import { WebSocket } from 'ws';
import type {
  ParticipantState,
  RoomState,
  WSConnection,
  WSMessage,
} from './types';

export class ConnectionManager {
  private connections = new Map<string, WSConnection>();
  private rooms = new Map<string, RoomState>();
  private userConnections = new Map<string, string>(); // userId -> connectionId
  private roomConnections = new Map<string, Set<string>>(); // roomId -> Set<connectionId>

  // Connection management
  addConnection(connectionId: string, socket: WebSocket): WSConnection {
    const connection: WSConnection = {
      id: connectionId,
      socket,
      isAlive: true,
      lastPing: Date.now(),
    };

    this.connections.set(connectionId, connection);
    this.setupHeartbeat(connection);

    console.log(`WebSocket connection added: ${connectionId}`);
    return connection;
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from room if connected
    if (connection.roomId) {
      this.leaveRoom(connectionId, connection.roomId);
    }

    // Remove from user mapping
    if (connection.userId) {
      this.userConnections.delete(connection.userId);
    }

    this.connections.delete(connectionId);
    console.log(`WebSocket connection removed: ${connectionId}`);
  }

  getConnection(connectionId: string): WSConnection | undefined {
    return this.connections.get(connectionId);
  }

  getUserConnection(userId: string): WSConnection | undefined {
    const connectionId = this.userConnections.get(userId);
    return connectionId ? this.connections.get(connectionId) : undefined;
  }

  // Authentication
  authenticateConnection(connectionId: string, userId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Remove old connection for this user if exists
    const oldConnectionId = this.userConnections.get(userId);
    if (oldConnectionId && oldConnectionId !== connectionId) {
      this.removeConnection(oldConnectionId);
    }

    connection.userId = userId;
    this.userConnections.set(userId, connectionId);

    console.log(`Connection authenticated: ${connectionId} -> ${userId}`);
    return true;
  }

  // Room management
  createRoom(
    roomId: string,
    name: string,
    hostId: string,
    testTextId: string,
    maxPlayers: number = 10
  ): RoomState {
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

    console.log(`Room created: ${roomId} by ${hostId}`);
    return room;
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(
    connectionId: string,
    roomId: string,
    userId: string,
    username: string
  ): boolean {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room || !connection.userId) {
      return false;
    }

    // Check if room is full
    if (room.participants.size >= room.maxPlayers) {
      return false;
    }

    // Check if race is already active
    if (room.status === 'active' || room.status === 'finished') {
      return false;
    }

    // Add participant to room
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

    // Add connection to room mapping
    let roomConnections = this.roomConnections.get(roomId);
    if (!roomConnections) {
      roomConnections = new Set();
      this.roomConnections.set(roomId, roomConnections);
    }
    roomConnections.add(connectionId);

    console.log(`User ${userId} joined room ${roomId}`);

    // Broadcast room update
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

    if (!connection || !room || !connection.userId) {
      return false;
    }

    const userId = connection.userId;

    // Remove participant from room
    room.participants.delete(userId);
    connection.roomId = undefined;

    // Remove connection from room mapping
    const roomConnections = this.roomConnections.get(roomId);
    if (roomConnections) {
      roomConnections.delete(connectionId);
    }

    console.log(`User ${userId} left room ${roomId}`);

    // If room is empty or host left, clean up room
    if (room.participants.size === 0 || userId === room.hostId) {
      this.cleanupRoom(roomId);
    } else {
      // Broadcast participant left
      this.broadcastToRoom(roomId, {
        type: 'participant_left',
        data: { userId },
        timestamp: Date.now(),
      });

      this.broadcastRoomUpdate(roomId);
    }

    return true;
  }

  // Race management
  startRaceCountdown(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting' || room.participants.size < 2) {
      return false;
    }

    room.status = 'countdown';
    room.countdownStartTime = Date.now();

    // Start 5-second countdown
    let countdown = 5;
    const countdownInterval = setInterval(() => {
      this.broadcastToRoom(roomId, {
        type: 'race_countdown',
        data: { roomId, countdown },
        timestamp: Date.now(),
      });

      countdown--;

      if (countdown < 0) {
        clearInterval(countdownInterval);
        this.startRace(roomId);
      }
    }, 1000);

    return true;
  }

  private startRace(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'active';
    room.startTime = Date.now();

    this.broadcastToRoom(roomId, {
      type: 'race_started',
      data: { roomId, startTime: room.startTime },
      timestamp: Date.now(),
    });

    console.log(`Race started in room ${roomId}`);
  }

  updateTypingProgress(
    connectionId: string,
    progress: number,
    wpm: number,
    accuracy: number,
    errors: number
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.roomId || !connection.userId) {
      return false;
    }

    const room = this.rooms.get(connection.roomId);
    if (!room || room.status !== 'active') {
      return false;
    }

    const participant = room.participants.get(connection.userId);
    if (!participant) {
      return false;
    }

    // Update participant state
    participant.progress = progress;
    participant.wpm = wpm;
    participant.accuracy = accuracy;
    participant.errors = errors;
    participant.lastUpdate = Date.now();

    // Check if participant finished
    if (progress >= 100 && !participant.finished) {
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

      // Check if race is finished (all participants done)
      const allFinished = Array.from(room.participants.values()).every(
        (p) => p.finished
      );
      if (allFinished) {
        this.finishRace(connection.roomId);
      }
    }

    // Broadcast progress update
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

    console.log(`Race finished in room ${roomId}`);

    // Clean up room after 30 seconds
    setTimeout(() => {
      this.cleanupRoom(roomId);
    }, 30000);
  }

  // Broadcasting
  broadcastToRoom(roomId: string, message: WSMessage): void {
    const roomConnections = this.roomConnections.get(roomId);
    if (!roomConnections) return;

    const messageStr = JSON.stringify(message);

    roomConnections.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(messageStr);
      }
    });
  }

  private broadcastRoomUpdate(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participants = Array.from(room.participants.values()).map((p) =>
      this.serializeParticipant(p)
    );

    this.broadcastToRoom(roomId, {
      type: 'room_updated',
      data: {
        room: {
          id: room.id,
          name: room.name,
          status: room.status,
          participants,
        },
      },
      timestamp: Date.now(),
    });
  }

  sendToConnection(connectionId: string, message: WSMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    connection.socket.send(JSON.stringify(message));
    return true;
  }

  // Utility methods
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
      // Notify all connections that room is closing
      roomConnections.forEach((connectionId) => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.roomId = undefined;
          this.sendToConnection(connectionId, {
            type: 'room_left',
            data: { roomId, reason: 'Room closed' },
            timestamp: Date.now(),
          });
        }
      });
    }

    this.rooms.delete(roomId);
    this.roomConnections.delete(roomId);
    console.log(`Room cleaned up: ${roomId}`);
  }

  private setupHeartbeat(connection: WSConnection): void {
    const heartbeatInterval = setInterval(() => {
      if (!connection.isAlive) {
        clearInterval(heartbeatInterval);
        this.removeConnection(connection.id);
        return;
      }

      connection.isAlive = false;
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.ping();
      }
    }, 30000); // 30 second heartbeat

    connection.socket.on('pong', () => {
      connection.isAlive = true;
      connection.lastPing = Date.now();
    });

    connection.socket.on('close', () => {
      clearInterval(heartbeatInterval);
      this.removeConnection(connection.id);
    });
  }

  // Stats
  getStats() {
    return {
      connections: this.connections.size,
      rooms: this.rooms.size,
      authenticatedUsers: this.userConnections.size,
    };
  }
}
