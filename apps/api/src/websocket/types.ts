import { WebSocket } from 'ws';

// WebSocket message types
export interface WSMessage {
  type: string;
  data?: any;
  timestamp: number;
}

// Connection types
export interface WSConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  roomId?: string;
  isAlive: boolean;
  lastPing: number;
}

// Room management types
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

// WebSocket message types
export type WSMessageType = 
  | 'ping'
  | 'pong'
  | 'join_room'
  | 'leave_room'
  | 'room_joined'
  | 'room_left'
  | 'room_updated'
  | 'participant_joined'
  | 'participant_left'
  | 'race_countdown'
  | 'race_started'
  | 'race_finished'
  | 'typing_progress'
  | 'participant_finished'
  | 'error';

// Specific message interfaces
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

export interface RoomUpdatedMessage extends WSMessage {
  type: 'room_updated';
  data: {
    room: {
      id: string;
      name: string;
      status: string;
      participants: Array<{
        userId: string;
        username: string;
        progress: number;
        wpm: number;
        accuracy: number;
        errors: number;
        finished: boolean;
      }>;
    };
  };
}

export interface CountdownMessage extends WSMessage {
  type: 'race_countdown';
  data: {
    roomId: string;
    countdown: number;
  };
}

export interface RaceStartedMessage extends WSMessage {
  type: 'race_started';
  data: {
    roomId: string;
    startTime: number;
  };
}