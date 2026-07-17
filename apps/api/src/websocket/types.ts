/** Minimal socket interface (Bun ServerWebSocket or ws). */
export interface SocketLike {
  send(data: string): void;
  readyState?: number;
  close?: (code?: number, reason?: string) => void;
  data?: Record<string, unknown>;
}

export interface WSMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export type RoomRole = 'racer' | 'spectator';

export interface WSConnection {
  id: string;
  socket: SocketLike;
  userId?: string;
  username?: string;
  roomId?: string;
  role?: RoomRole;
  isAlive: boolean;
  lastPing: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  at: number;
  role: RoomRole;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  testTextId: string;
  maxPlayers: number;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  participants: Map<string, ParticipantState>;
  /** Spectators keyed by userId */
  spectators: Map<string, SpectatorState>;
  chat: ChatMessage[];
  startTime?: number;
  countdownStartTime?: number;
  createdAt: number;
}

export interface ParticipantState {
  userId: string;
  username: string;
  connectionId: string;
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  finished: boolean;
  finishedAt?: number;
  lastUpdate: number;
}

export interface SpectatorState {
  userId: string;
  username: string;
  connectionId: string;
  joinedAt: number;
}

export interface JoinRoomMessage extends WSMessage {
  type: 'join_room';
  data: {
    roomId: string;
    userId: string;
    username: string;
    /** Join as spectator (watch only). Default racer. */
    spectate?: boolean;
  };
}

export interface TypingProgressMessage extends WSMessage {
  type: 'typing_progress';
  data: {
    roomId: string;
    userId: string;
    progress: number;
    wpm: number;
    accuracy: number;
    errors: number;
  };
}

export interface ChatMessagePayload extends WSMessage {
  type: 'chat_message';
  data: {
    roomId: string;
    text: string;
  };
}
