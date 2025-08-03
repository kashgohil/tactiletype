import type {
  CountdownMessage,
  RaceStartedMessage,
  RoomUpdatedMessage,
} from '@tactile/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ParticipantFinishedData,
  ParticipantJoinedData,
  ParticipantLeftData,
  RoomJoinedData,
  RoomLeftData,
  WebSocketStatus,
} from '../services/websocket';
import { useWebSocket } from '../services/websocket';

export interface MultiplayerRoom {
  id: string;
  name: string;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  participants: Array<{
    userId: string;
    username: string;
    progress: number;
    wpm: number;
    accuracy: number;
    errors: number;
    finished: boolean;
  }>;
}

export interface MultiplayerState {
  // Connection state
  connectionStatus: WebSocketStatus;
  isConnected: boolean;

  // Room state
  currentRoom: MultiplayerRoom | null;
  isInRoom: boolean;
  isHost: boolean;

  // Race state
  raceStatus: 'waiting' | 'countdown' | 'active' | 'finished';
  countdown: number | null;
  raceStartTime: number | null;

  // Error state
  error: string | null;
}

export interface MultiplayerActions {
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomId: string, userId: string, username: string) => void;
  leaveRoom: () => void;
  startRace: () => void;
  sendTypingProgress: (
    progress: number,
    wpm: number,
    accuracy: number,
    errors: number
  ) => void;
  clearError: () => void;
}

export const useMultiplayer = (
  userId?: string
): [MultiplayerState, MultiplayerActions] => {
  const ws = useWebSocket();
  const [state, setState] = useState<MultiplayerState>({
    connectionStatus: 'disconnected',
    isConnected: false,
    currentRoom: null,
    isInRoom: false,
    isHost: false,
    raceStatus: 'waiting',
    countdown: null,
    raceStartTime: null,
    error: null,
  });

  const currentRoomRef = useRef<MultiplayerRoom | null>(null);
  const userIdRef = useRef<string | undefined>(userId);

  // Update refs when props change
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    currentRoomRef.current = state.currentRoom;
  }, [state.currentRoom]);

  // WebSocket event handlers
  const handleStatusChange = useCallback((status: WebSocketStatus) => {
    setState((prev) => ({
      ...prev,
      connectionStatus: status,
      isConnected: status === 'connected',
      error: status === 'error' ? 'Connection failed' : null,
    }));
  }, []);

  const handleRoomJoined = useCallback((data: RoomJoinedData) => {
    if (data.room) {
      const room: MultiplayerRoom = {
        id: data.room.id,
        name: data.room.name,
        status: data.room.status as MultiplayerRoom['status'],
        participants: data.room.participants,
      };

      setState((prev) => ({
        ...prev,
        currentRoom: room,
        isInRoom: true,
        isHost:
          room.participants.some((p) => p.userId === userIdRef.current) &&
          room.participants[0]?.userId === userIdRef.current,
        raceStatus: room.status,
        error: null,
      }));
    }
  }, []);

  const handleRoomLeft = useCallback((data: RoomLeftData) => {
    setState((prev) => ({
      ...prev,
      currentRoom: null,
      isInRoom: false,
      isHost: false,
      raceStatus: 'waiting',
      countdown: null,
      raceStartTime: null,
      error: data.reason ? `Left room: ${data.reason}` : null,
    }));
  }, []);

  const handleRoomUpdated = useCallback((data: RoomUpdatedMessage['data']) => {
    if (data.room) {
      const room: MultiplayerRoom = {
        id: data.room.id,
        name: data.room.name,
        status: data.room.status as MultiplayerRoom['status'],
        participants: data.room.participants,
      };

      setState((prev) => ({
        ...prev,
        currentRoom: room,
        raceStatus: room.status,
        isHost:
          room.participants.some((p) => p.userId === userIdRef.current) &&
          room.participants[0]?.userId === userIdRef.current,
      }));
    }
  }, []);

  const handleParticipantJoined = useCallback((data: ParticipantJoinedData) => {
    setState((prev) => {
      if (!prev.currentRoom) return prev;

      const updatedParticipants = [...prev.currentRoom.participants];
      const existingIndex = updatedParticipants.findIndex(
        (p) => p.userId === data.participant.userId
      );

      if (existingIndex >= 0) {
        updatedParticipants[existingIndex] = data.participant;
      } else {
        updatedParticipants.push(data.participant);
      }

      return {
        ...prev,
        currentRoom: {
          ...prev.currentRoom,
          participants: updatedParticipants,
        },
      };
    });
  }, []);

  const handleParticipantLeft = useCallback((data: ParticipantLeftData) => {
    setState((prev) => {
      if (!prev.currentRoom) return prev;

      return {
        ...prev,
        currentRoom: {
          ...prev.currentRoom,
          participants: prev.currentRoom.participants.filter(
            (p) => p.userId !== data.userId
          ),
        },
      };
    });
  }, []);

  const handleRaceCountdown = useCallback((data: CountdownMessage['data']) => {
    setState((prev) => ({
      ...prev,
      raceStatus: 'countdown',
      countdown: data.countdown,
    }));
  }, []);

  const handleRaceStarted = useCallback((data: RaceStartedMessage['data']) => {
    setState((prev) => ({
      ...prev,
      raceStatus: 'active',
      countdown: null,
      raceStartTime: data.startTime,
    }));
  }, []);

  const handleRaceFinished = useCallback(() => {
    setState((prev) => ({
      ...prev,
      raceStatus: 'finished',
      countdown: null,
    }));
  }, []);

  const handleParticipantFinished = useCallback(
    (data: ParticipantFinishedData) => {
      setState((prev) => {
        if (!prev.currentRoom) return prev;

        const updatedParticipants = prev.currentRoom.participants.map((p) =>
          p.userId === data.userId
            ? { ...p, finished: true, wpm: data.wpm, accuracy: data.accuracy }
            : p
        );

        return {
          ...prev,
          currentRoom: {
            ...prev.currentRoom,
            participants: updatedParticipants,
          },
        };
      });
    },
    []
  );

  const handleError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  // Set up WebSocket event handlers
  useEffect(() => {
    ws.setEventHandlers({
      onStatusChange: handleStatusChange,
      onRoomJoined: handleRoomJoined,
      onRoomLeft: handleRoomLeft,
      onRoomUpdated: handleRoomUpdated,
      onParticipantJoined: handleParticipantJoined,
      onParticipantLeft: handleParticipantLeft,
      onRaceCountdown: handleRaceCountdown,
      onRaceStarted: handleRaceStarted,
      onRaceFinished: handleRaceFinished,
      onParticipantFinished: handleParticipantFinished,
      onError: handleError,
    });
  }, [
    ws,
    handleStatusChange,
    handleRoomJoined,
    handleRoomLeft,
    handleRoomUpdated,
    handleParticipantJoined,
    handleParticipantLeft,
    handleRaceCountdown,
    handleRaceStarted,
    handleRaceFinished,
    handleParticipantFinished,
    handleError,
  ]);

  // Actions
  const connect = useCallback(
    async (token: string) => {
      try {
        await ws.connect(token);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Connection failed',
        }));
      }
    },
    [ws]
  );

  const disconnect = useCallback(() => {
    ws.disconnect();
  }, [ws]);

  const joinRoom = useCallback(
    (roomId: string, userId: string, username: string) => {
      if (!ws.isConnected()) {
        setState((prev) => ({
          ...prev,
          error: 'Not connected to server',
        }));
        return;
      }

      ws.joinRoom(roomId, userId, username);
    },
    [ws]
  );

  const leaveRoom = useCallback(() => {
    ws.leaveRoom();
  }, [ws]);

  const startRace = useCallback(() => {
    if (!state.isHost) {
      setState((prev) => ({
        ...prev,
        error: 'Only the host can start the race',
      }));
      return;
    }

    ws.startRace();
  }, [ws, state.isHost]);

  const sendTypingProgress = useCallback(
    (progress: number, wpm: number, accuracy: number, errors: number) => {
      const currentRoom = currentRoomRef.current;
      const currentUserId = userIdRef.current;

      if (!currentRoom || !currentUserId) return;

      ws.sendTypingProgress(
        currentRoom.id,
        currentUserId,
        progress,
        wpm,
        accuracy,
        errors
      );
    },
    [ws]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const actions: MultiplayerActions = {
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    startRace,
    sendTypingProgress,
    clearError,
  };

  return [state, actions];
};
