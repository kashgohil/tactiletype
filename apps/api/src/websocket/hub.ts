/**
 * Bun-native WebSocket race hub.
 * Shared singleton used by HTTP multiplayer routes + WS upgrade handler.
 */
import { multiplayerRooms, db, testTexts } from '@tactile/database';
import { eq } from 'drizzle-orm';
import { verify } from 'hono/jwt';
import { JWT_SECRET } from '../constants';
import { ConnectionManager } from './connectionManager';
import type {
  JoinRoomMessage,
  SocketLike,
  TypingProgressMessage,
  WSMessage,
} from './types';

class MultiplayerHub {
  readonly manager = new ConnectionManager();

  createRoom(
    roomId: string,
    name: string,
    hostId: string,
    testTextId: string,
    maxPlayers = 10
  ) {
    return this.manager.createRoom(
      roomId,
      name,
      hostId,
      testTextId,
      maxPlayers
    );
  }

  getRoom(roomId: string) {
    return this.manager.getRoom(roomId);
  }

  getRoomParticipants(roomId: string) {
    const room = this.manager.getRoom(roomId);
    if (!room) return null;
    return Array.from(room.participants.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      progress: p.progress,
      wpm: p.wpm,
      accuracy: p.accuracy,
      errors: p.errors,
      finished: p.finished,
    }));
  }

  getStats() {
    return this.manager.getStats();
  }

  onOpen(connectionId: string, socket: SocketLike) {
    this.manager.addConnection(connectionId, socket);
    this.send(connectionId, {
      type: 'connected',
      data: { connectionId },
      timestamp: Date.now(),
    });
  }

  onClose(connectionId: string) {
    this.manager.removeConnection(connectionId);
  }

  async onMessage(connectionId: string, raw: string | Buffer) {
    try {
      const text = typeof raw === 'string' ? raw : raw.toString();
      const message = JSON.parse(text) as WSMessage;
      await this.handleMessage(connectionId, message);
    } catch {
      this.sendError(connectionId, 'Invalid message format');
    }
  }

  private async handleMessage(connectionId: string, message: WSMessage) {
    switch (message.type) {
      case 'ping':
        this.send(connectionId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'authenticate':
        await this.handleAuth(connectionId, message);
        break;
      case 'join_room':
        await this.handleJoin(connectionId, message as JoinRoomMessage);
        break;
      case 'leave_room':
        this.handleLeave(connectionId);
        break;
      case 'start_race':
        this.handleStart(connectionId);
        break;
      case 'typing_progress':
        this.handleProgress(connectionId, message as TypingProgressMessage);
        break;
      default:
        this.sendError(connectionId, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAuth(connectionId: string, message: WSMessage) {
    try {
      const token = message.data?.token as string | undefined;
      if (!token) {
        this.sendError(connectionId, 'Token required');
        return;
      }
      const payload = (await verify(token, JWT_SECRET)) as {
        userId: string;
        username?: string;
      };
      const ok = this.manager.authenticateConnection(
        connectionId,
        payload.userId,
        payload.username
      );
      if (ok) {
        this.send(connectionId, {
          type: 'authenticated',
          data: {
            userId: payload.userId,
            username: payload.username,
          },
          timestamp: Date.now(),
        });
      } else {
        this.sendError(connectionId, 'Authentication failed');
      }
    } catch {
      this.sendError(connectionId, 'Invalid token');
    }
  }

  private async handleJoin(
    connectionId: string,
    message: JoinRoomMessage
  ) {
    const connection = this.manager.getConnection(connectionId);
    if (!connection?.userId) {
      this.sendError(connectionId, 'Not authenticated');
      return;
    }

    const { roomId, userId, username } = message.data;
    if (connection.userId !== userId) {
      this.sendError(connectionId, 'User ID mismatch');
      return;
    }

    // Ensure in-memory room exists (load from DB if needed)
    if (!this.manager.getRoom(roomId)) {
      const [dbRoom] = await db
        .select()
        .from(multiplayerRooms)
        .where(eq(multiplayerRooms.id, roomId))
        .limit(1);
      if (!dbRoom) {
        this.sendError(connectionId, 'Room not found');
        return;
      }
      this.manager.createRoom(
        dbRoom.id,
        dbRoom.name,
        dbRoom.hostId,
        dbRoom.testTextId,
        dbRoom.maxPlayers ?? 10
      );
    }

    const success = this.manager.joinRoom(
      connectionId,
      roomId,
      userId,
      username
    );
    if (!success) {
      this.sendError(connectionId, 'Failed to join room');
      return;
    }

    const room = this.manager.getRoom(roomId);
    // Attach test content for race clients
    let testText: {
      id: string;
      title: string;
      content: string;
      difficulty: string | null;
      wordCount: number;
    } | null = null;
    if (room) {
      const [tt] = await db
        .select()
        .from(testTexts)
        .where(eq(testTexts.id, room.testTextId))
        .limit(1);
      if (tt) {
        testText = {
          id: tt.id,
          title: tt.title,
          content: tt.content,
          difficulty: tt.difficulty,
          wordCount: tt.wordCount,
        };
      }
    }

    this.send(connectionId, {
      type: 'room_joined',
      data: {
        roomId,
        room: room
          ? {
              id: room.id,
              name: room.name,
              status: room.status,
              hostId: room.hostId,
              testTextId: room.testTextId,
              testText,
              participants: Array.from(room.participants.values()).map(
                (p) => ({
                  userId: p.userId,
                  username: p.username,
                  progress: p.progress,
                  wpm: p.wpm,
                  accuracy: p.accuracy,
                  errors: p.errors,
                  finished: p.finished,
                })
              ),
            }
          : null,
      },
      timestamp: Date.now(),
    });
  }

  private handleLeave(connectionId: string) {
    const connection = this.manager.getConnection(connectionId);
    if (!connection?.roomId) {
      this.sendError(connectionId, 'Not in a room');
      return;
    }
    const roomId = connection.roomId;
    this.manager.leaveRoom(connectionId, roomId);
    this.send(connectionId, {
      type: 'room_left',
      data: { roomId },
      timestamp: Date.now(),
    });
  }

  private handleStart(connectionId: string) {
    const connection = this.manager.getConnection(connectionId);
    if (!connection?.roomId || !connection.userId) {
      this.sendError(connectionId, 'Not in a room');
      return;
    }
    const room = this.manager.getRoom(connection.roomId);
    if (!room || room.hostId !== connection.userId) {
      this.sendError(connectionId, 'Only room host can start the race');
      return;
    }
    const ok = this.manager.startRaceCountdown(connection.roomId);
    if (!ok) {
      this.sendError(connectionId, 'Cannot start race');
    }
  }

  private handleProgress(
    connectionId: string,
    message: TypingProgressMessage
  ) {
    const { progress, wpm, accuracy, errors } = message.data;
    const ok = this.manager.updateTypingProgress(
      connectionId,
      progress,
      wpm,
      accuracy,
      errors
    );
    if (!ok) {
      // Silent during waiting/countdown to avoid spam
    }
  }

  private send(connectionId: string, message: WSMessage) {
    this.manager.sendToConnection(connectionId, message);
  }

  private sendError(connectionId: string, error: string) {
    this.send(connectionId, {
      type: 'error',
      data: { error },
      timestamp: Date.now(),
    });
  }
}

export const multiplayerHub = new MultiplayerHub();
