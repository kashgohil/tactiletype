import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ConnectionManager } from './connectionManager.js';
import type { WSMessage, JoinRoomMessage, TypingProgressMessage } from './types.js';
import { verify } from 'jsonwebtoken';
import type { JWTPayload } from '@tactile/types';

export class WebSocketHandler {
  private wss: WebSocketServer;
  private connectionManager: ConnectionManager;

  constructor(server: any) {
    this.connectionManager = new ConnectionManager();
    
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('WebSocket server initialized on /ws');
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    // Allow connections from localhost during development
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
    return allowedOrigins.includes(info.origin) || process.env.NODE_ENV === 'development';
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const connectionId = this.generateConnectionId();
    const connection = this.connectionManager.addConnection(connectionId, socket);

    console.log(`New WebSocket connection: ${connectionId}`);

    // Set up message handling
    socket.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        this.handleMessage(connectionId, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
        this.sendError(connectionId, 'Invalid message format');
      }
    });

    socket.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
    });

    socket.on('close', () => {
      console.log(`WebSocket connection closed: ${connectionId}`);
      this.connectionManager.removeConnection(connectionId);
    });

    // Send connection confirmation
    this.sendMessage(connectionId, {
      type: 'connected',
      data: { connectionId },
      timestamp: Date.now(),
    });
  }

  private handleMessage(connectionId: string, message: WSMessage): void {
    switch (message.type) {
      case 'ping':
        this.handlePing(connectionId);
        break;
      
      case 'authenticate':
        this.handleAuthenticate(connectionId, message);
        break;
      
      case 'join_room':
        this.handleJoinRoom(connectionId, message as JoinRoomMessage);
        break;
      
      case 'leave_room':
        this.handleLeaveRoom(connectionId, message);
        break;
      
      case 'start_race':
        this.handleStartRace(connectionId, message);
        break;
      
      case 'typing_progress':
        this.handleTypingProgress(connectionId, message as TypingProgressMessage);
        break;
      
      default:
        console.warn(`Unknown message type: ${message.type}`);
        this.sendError(connectionId, `Unknown message type: ${message.type}`);
    }
  }

  private handlePing(connectionId: string): void {
    this.sendMessage(connectionId, {
      type: 'pong',
      timestamp: Date.now(),
    });
  }

  private handleAuthenticate(connectionId: string, message: WSMessage): void {
    try {
      const { token } = message.data;
      if (!token) {
        this.sendError(connectionId, 'Token required');
        return;
      }

      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const payload = verify(token, jwtSecret) as JWTPayload;
      
      const success = this.connectionManager.authenticateConnection(connectionId, payload.userId);
      
      if (success) {
        this.sendMessage(connectionId, {
          type: 'authenticated',
          data: { userId: payload.userId, username: payload.username },
          timestamp: Date.now(),
        });
      } else {
        this.sendError(connectionId, 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendError(connectionId, 'Invalid token');
    }
  }

  private handleJoinRoom(connectionId: string, message: JoinRoomMessage): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.userId) {
      this.sendError(connectionId, 'Not authenticated');
      return;
    }

    const { roomId, userId, username } = message.data;
    
    // Verify the userId matches the authenticated connection
    if (connection.userId !== userId) {
      this.sendError(connectionId, 'User ID mismatch');
      return;
    }

    const success = this.connectionManager.joinRoom(connectionId, roomId, userId, username);
    
    if (success) {
      const room = this.connectionManager.getRoom(roomId);
      this.sendMessage(connectionId, {
        type: 'room_joined',
        data: { 
          roomId,
          room: room ? {
            id: room.id,
            name: room.name,
            status: room.status,
            participants: Array.from(room.participants.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              progress: p.progress,
              wpm: p.wpm,
              accuracy: p.accuracy,
              errors: p.errors,
              finished: p.finished,
            })),
          } : null,
        },
        timestamp: Date.now(),
      });
    } else {
      this.sendError(connectionId, 'Failed to join room');
    }
  }

  private handleLeaveRoom(connectionId: string, message: WSMessage): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.roomId) {
      this.sendError(connectionId, 'Not in a room');
      return;
    }

    const success = this.connectionManager.leaveRoom(connectionId, connection.roomId);
    
    if (success) {
      this.sendMessage(connectionId, {
        type: 'room_left',
        data: { roomId: connection.roomId },
        timestamp: Date.now(),
      });
    } else {
      this.sendError(connectionId, 'Failed to leave room');
    }
  }

  private handleStartRace(connectionId: string, message: WSMessage): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.roomId || !connection.userId) {
      this.sendError(connectionId, 'Not in a room or not authenticated');
      return;
    }

    const room = this.connectionManager.getRoom(connection.roomId);
    if (!room || room.hostId !== connection.userId) {
      this.sendError(connectionId, 'Only room host can start the race');
      return;
    }

    const success = this.connectionManager.startRaceCountdown(connection.roomId);
    
    if (!success) {
      this.sendError(connectionId, 'Cannot start race (need at least 2 players)');
    }
  }

  private handleTypingProgress(connectionId: string, message: TypingProgressMessage): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.roomId || !connection.userId) {
      this.sendError(connectionId, 'Not in a room or not authenticated');
      return;
    }

    const { progress, wpm, accuracy, errors } = message.data;
    
    const success = this.connectionManager.updateTypingProgress(
      connectionId,
      progress,
      wpm,
      accuracy,
      errors
    );

    if (!success) {
      this.sendError(connectionId, 'Failed to update progress');
    }
  }

  private sendMessage(connectionId: string, message: WSMessage): boolean {
    return this.connectionManager.sendToConnection(connectionId, message);
  }

  private sendError(connectionId: string, error: string): void {
    this.sendMessage(connectionId, {
      type: 'error',
      data: { error },
      timestamp: Date.now(),
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for HTTP API integration
  public createRoom(roomId: string, name: string, hostId: string, testTextId: string, maxPlayers: number = 10) {
    return this.connectionManager.createRoom(roomId, name, hostId, testTextId, maxPlayers);
  }

  public getRoom(roomId: string) {
    return this.connectionManager.getRoom(roomId);
  }

  public getRoomParticipants(roomId: string) {
    const room = this.connectionManager.getRoom(roomId);
    if (!room) return null;

    return Array.from(room.participants.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      progress: p.progress,
      wpm: p.wpm,
      accuracy: p.accuracy,
      errors: p.errors,
      finished: p.finished,
    }));
  }

  public getStats() {
    return this.connectionManager.getStats();
  }
}