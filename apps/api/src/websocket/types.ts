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

export interface WSConnection {
  id: string;
  socket: SocketLike;
  userId?: string;
  username?: string;
  roomId?: string;
  isAlive: boolean;
  lastPing: number;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  testTextId: string;
  maxPlayers: number;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  participants: Map<string, ParticipantState>;
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

export interface JoinRoomMessage extends WSMessage {
  type: 'join_room';
  data: {
    roomId: string;
    userId: string;
    username: string;
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
