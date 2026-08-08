import type { CountdownMessage, RaceStartedMessage, RoomUpdatedMessage } from '@tactile/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChatMessageData,
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
  hostId?: string;
  testText?: {
    id: string;
    title: string;
    content: string;
    difficulty: string;
    wordCount: number;
  } | null;
  participants: Array<{
    userId: string;
    username: string;
    progress: number;
    wpm: number;
    accuracy: number;
    errors: number;
    finished: boolean;
  }>;
  spectators: Array<{ userId: string; username: string }>;
}

export interface MultiplayerState {
  connectionStatus: WebSocketStatus;
  isConnected: boolean;
  currentRoom: MultiplayerRoom | null;
  isInRoom: boolean;
  isHost: boolean;
  role: 'racer' | 'spectator' | null;
  raceStatus: 'waiting' | 'countdown' | 'active' | 'finished';
  countdown: number | null;
  raceStartTime: number | null;
  chat: ChatMessageData[];
  error: string | null;
}

export interface MultiplayerActions {
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomId: string, userId: string, username: string, spectate?: boolean) => void;
  leaveRoom: () => void;
  startRace: () => void;
  sendTypingProgress: (progress: number, wpm: number, accuracy: number, errors: number) => void;
  sendChat: (text: string) => void;
  clearError: () => void;
}

export const useMultiplayer = (userId?: string): [MultiplayerState, MultiplayerActions] => {
  const ws = useWebSocket();
  const [state, setState] = useState<MultiplayerState>({
    connectionStatus: 'disconnected',
    isConnected: false,
    currentRoom: null,
    isInRoom: false,
    isHost: false,
    role: null,
    raceStatus: 'waiting',
    countdown: null,
    raceStartTime: null,
    chat: [],
    error: null,
  });

  const currentRoomRef = useRef<MultiplayerRoom | null>(null);
  const userIdRef = useRef<string | undefined>(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    currentRoomRef.current = state.currentRoom;
  }, [state.currentRoom]);

  const handleStatusChange = useCallback((status: WebSocketStatus) => {
    setState((prev) => ({
      ...prev,
      connectionStatus: status,
      isConnected: status === 'connected',
      error: status === 'error' ? 'Connection failed' : null,
    }));
  }, []);

  const handleRoomJoined = useCallback((data: RoomJoinedData) => {
    const joined = data.room;
    if (!joined) return;
    const room: MultiplayerRoom = {
      id: joined.id,
      name: joined.name,
      status: joined.status as MultiplayerRoom['status'],
      hostId: joined.hostId,
      testText: joined.testText,
      participants: joined.participants,
      spectators: joined.spectators ?? [],
    };

    setState((prev) => ({
      ...prev,
      currentRoom: room,
      isInRoom: true,
      role: data.role ?? 'racer',
      isHost: room.hostId
        ? room.hostId === userIdRef.current
        : room.participants[0]?.userId === userIdRef.current,
      raceStatus: room.status as MultiplayerState['raceStatus'],
      chat: joined.chat ?? [],
      error: null,
    }));
  }, []);

  const handleRoomLeft = useCallback((data: RoomLeftData) => {
    setState((prev) => ({
      ...prev,
      currentRoom: null,
      isInRoom: false,
      isHost: false,
      role: null,
      raceStatus: 'waiting',
      countdown: null,
      raceStartTime: null,
      chat: [],
      error: data.reason ? `Left room: ${data.reason}` : null,
    }));
  }, []);

  const handleRoomUpdated = useCallback((data: RoomUpdatedMessage['data']) => {
    if (data.room) {
      setState((prev) => {
        const hostId = (data.room as { hostId?: string }).hostId ?? prev.currentRoom?.hostId;
        const spectators =
          (data.room as { spectators?: MultiplayerRoom['spectators'] }).spectators ??
          prev.currentRoom?.spectators ??
          [];
        const room: MultiplayerRoom = {
          id: data.room.id,
          name: data.room.name,
          status: data.room.status as MultiplayerRoom['status'],
          hostId,
          testText: prev.currentRoom?.testText,
          participants: data.room.participants,
          spectators,
        };
        return {
          ...prev,
          currentRoom: room,
          raceStatus: room.status as MultiplayerState['raceStatus'],
          isHost: hostId === userIdRef.current,
        };
      });
    }
  }, []);

  const handleParticipantJoined = useCallback((data: ParticipantJoinedData) => {
    setState((prev) => {
      if (!prev.currentRoom) return prev;
      const updated = [...prev.currentRoom.participants];
      const idx = updated.findIndex((p) => p.userId === data.participant.userId);
      if (idx >= 0) updated[idx] = data.participant;
      else updated.push(data.participant);
      return {
        ...prev,
        currentRoom: { ...prev.currentRoom, participants: updated },
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
          participants: prev.currentRoom.participants.filter((p) => p.userId !== data.userId),
          spectators: prev.currentRoom.spectators.filter((s) => s.userId !== data.userId),
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

  const handleParticipantFinished = useCallback((data: ParticipantFinishedData) => {
    setState((prev) => {
      if (!prev.currentRoom) return prev;
      return {
        ...prev,
        currentRoom: {
          ...prev.currentRoom,
          participants: prev.currentRoom.participants.map((p) =>
            p.userId === data.userId
              ? {
                  ...p,
                  finished: true,
                  wpm: data.wpm,
                  accuracy: data.accuracy,
                }
              : p
          ),
        },
      };
    });
  }, []);

  const handleChatMessage = useCallback((data: { message: ChatMessageData }) => {
    setState((prev) => ({
      ...prev,
      chat: [...prev.chat, data.message].slice(-100),
    }));
  }, []);

  const handleSpectatorJoined = useCallback(
    (data: { spectator: { userId: string; username: string } }) => {
      setState((prev) => {
        if (!prev.currentRoom) return prev;
        const exists = prev.currentRoom.spectators.some((s) => s.userId === data.spectator.userId);
        if (exists) return prev;
        return {
          ...prev,
          currentRoom: {
            ...prev.currentRoom,
            spectators: [...prev.currentRoom.spectators, data.spectator],
          },
        };
      });
    },
    []
  );

  const handleError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

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
      onChatMessage: handleChatMessage,
      onSpectatorJoined: handleSpectatorJoined,
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
    handleChatMessage,
    handleSpectatorJoined,
    handleError,
  ]);

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
    (roomId: string, userId: string, username: string, spectate = false) => {
      if (!ws.isConnected()) {
        setState((prev) => ({ ...prev, error: 'Not connected to server' }));
        return;
      }
      ws.joinRoom(roomId, userId, username, spectate);
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
      ws.sendTypingProgress(currentRoom.id, currentUserId, progress, wpm, accuracy, errors);
    },
    [ws]
  );

  const sendChat = useCallback(
    (text: string) => {
      const currentRoom = currentRoomRef.current;
      if (!currentRoom || !text.trim()) return;
      ws.sendChat(currentRoom.id, text.trim());
    },
    [ws]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      connect,
      disconnect,
      joinRoom,
      leaveRoom,
      startRace,
      sendTypingProgress,
      sendChat,
      clearError,
    },
  ];
};
