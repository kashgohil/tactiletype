import type { MultiplayerRoomWithDetails, TestText, ApiResponse } from '@tactile/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface CreateRoomRequest {
  name: string;
  testTextId: string;
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
    host: {
      id: string;
      username: string;
    };
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
      finalWpm?: number;
      finalAccuracy?: number;
    }>;
    liveParticipants?: Array<{
      userId: string;
      username: string;
      progress: number;
      wpm: number;
      accuracy: number;
      errors: number;
      finished: boolean;
    }>;
  };
}

class MultiplayerApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Create a new multiplayer room
  async createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
    const response = await fetch(`${API_BASE_URL}/api/multiplayer/rooms`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    const result = await this.handleResponse<ApiResponse<CreateRoomResponse>>(response);
    return result.data!;
  }

  // Get list of available rooms
  async getRooms(page = 1, limit = 10): Promise<GetRoomsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/api/multiplayer/rooms?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<ApiResponse<GetRoomsResponse>>(response);
    return result.data!;
  }

  // Get specific room details
  async getRoom(roomId: string): Promise<GetRoomResponse> {
    const response = await fetch(`${API_BASE_URL}/api/multiplayer/rooms/${roomId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<ApiResponse<GetRoomResponse>>(response);
    return result.data!;
  }

  // Join a room (creates database record)
  async joinRoom(roomId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/multiplayer/rooms/${roomId}/join`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }

  // Leave a room
  async leaveRoom(roomId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/multiplayer/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }

  // Get WebSocket connection stats (for debugging)
  async getStats(): Promise<{ connections: number; rooms: number; authenticatedUsers: number }> {
    const response = await fetch(`${API_BASE_URL}/api/multiplayer/stats`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<ApiResponse<{ connections: number; rooms: number; authenticatedUsers: number }>>(response);
    return result.data!;
  }

  // Get available test texts for room creation
  async getTestTexts(): Promise<TestText[]> {
    const response = await fetch(`${API_BASE_URL}/api/tests/texts`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await this.handleResponse<ApiResponse<{ texts: TestText[] }>>(response);
    return result.data!.texts;
  }
}

// Singleton instance
export const multiplayerApi = new MultiplayerApiService();