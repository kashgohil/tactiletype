import { VITE_API_URL } from '@/constants';
import { ensureCsrfToken } from '@/utils/csrf';
import type { MultiplayerRoomWithDetails, TestText } from '@tactile/types';

export interface CreateRoomRequest {
  name: string;
  testTextId?: string;
  maxPlayers?: number;
}

export interface CreateRoomResponse {
  room: {
    id: string;
    name: string;
    hostId: string;
    testTextId: string;
    maxPlayers: number;
    status: string;
    createdAt: string;
    testText: {
      title: string;
      difficulty: string;
      wordCount: number;
    };
  };
}

export interface GetRoomsResponse {
  rooms: MultiplayerRoomWithDetails[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface GetRoomResponse {
  room: {
    id: string;
    name: string;
    hostId: string;
    host: { id: string; username: string };
    testText: {
      id: string;
      title: string;
      content: string;
      difficulty: string;
      wordCount: number;
    };
    maxPlayers: number;
    status: string;
    startedAt?: string;
    finishedAt?: string;
    createdAt: string;
    participants: Array<{
      id: string;
      userId: string;
      username: string;
      joinedAt: string;
      finishedAt?: string;
      finalWpm?: number | null;
      finalAccuracy?: number | null;
    }>;
    liveParticipants?: Array<{
      userId: string;
      username: string;
      progress: number;
      wpm: number;
      accuracy: number;
      errors: number;
      finished: boolean;
    }> | null;
  };
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Writes carry the double-submit CSRF token; reads are exempt server-side, so
// they must not trigger a token fetch just to browse rooms.
async function writeHeaders(): Promise<HeadersInit> {
  return {
    ...authHeaders(),
    'X-CSRF-Token': (await ensureCsrfToken()) ?? '',
  };
}

async function handle<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (body as { error?: string }).error ||
        `HTTP ${response.status}: ${response.statusText}`
    );
  }
  return body as T;
}

class MultiplayerApiService {
  async createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
    const response = await fetch(`${VITE_API_URL}/api/multiplayer/rooms`, {
      method: 'POST',
      headers: await writeHeaders(),
      credentials: 'include',
      body: JSON.stringify(request),
    });
    const result = await handle<{ data: CreateRoomResponse }>(response);
    return result.data;
  }

  async getRooms(
    page = 1,
    limit = 20,
    status: 'waiting' | 'active' | 'live' = 'waiting'
  ): Promise<GetRoomsResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status,
    });
    const response = await fetch(
      `${VITE_API_URL}/api/multiplayer/rooms?${params}`,
      { headers: authHeaders(), credentials: 'include' }
    );
    const result = await handle<{ data: GetRoomsResponse }>(response);
    return result.data;
  }

  async getRoom(roomId: string): Promise<GetRoomResponse> {
    const response = await fetch(
      `${VITE_API_URL}/api/multiplayer/rooms/${roomId}`,
      { headers: authHeaders(), credentials: 'include' }
    );
    const result = await handle<{ data: GetRoomResponse }>(response);
    return result.data;
  }

  async joinRoom(
    roomId: string,
    options?: { spectate?: boolean }
  ): Promise<{ role: 'racer' | 'spectator' }> {
    const response = await fetch(
      `${VITE_API_URL}/api/multiplayer/rooms/${roomId}/join`,
      {
        method: 'POST',
        headers: await writeHeaders(),
        credentials: 'include',
        body: JSON.stringify({ spectate: !!options?.spectate }),
      }
    );
    const result = await handle<{ role?: 'racer' | 'spectator' }>(response);
    return { role: result.role ?? (options?.spectate ? 'spectator' : 'racer') };
  }

  async leaveRoom(roomId: string): Promise<void> {
    const response = await fetch(
      `${VITE_API_URL}/api/multiplayer/rooms/${roomId}/leave`,
      { method: 'POST', headers: await writeHeaders(), credentials: 'include' }
    );
    await handle(response);
  }

  async getTestTexts(): Promise<TestText[]> {
    const response = await fetch(`${VITE_API_URL}/api/tests/texts?limit=50`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    const result = await handle<{ texts: TestText[] }>(response);
    return result.texts ?? [];
  }
}

export const multiplayerApi = new MultiplayerApiService();
