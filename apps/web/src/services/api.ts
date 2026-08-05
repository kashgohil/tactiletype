import { VITE_API_URL } from '@/constants';
import { ensureCsrfToken, refreshCsrfToken } from '@/utils/csrf';
import type { Difficulty } from '@tactile/types';
import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: VITE_API_URL,
  // The API is a separate origin, so without this the csrf-token cookie is
  // neither stored nor sent and every write is rejected with 403.
  withCredentials: true,
});

const SAFE_METHODS = new Set(['get', 'head', 'options']);

const needsCsrf = (config: InternalAxiosRequestConfig): boolean =>
  !SAFE_METHODS.has((config.method ?? 'get').toLowerCase());

// Add auth token to requests if available
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  if (needsCsrf(config)) {
    config.headers['X-CSRF-Token'] = (await ensureCsrfToken()) ?? '';
  }
  return config;
});

// A cookie that expired mid-session should cost one silent retry, not a lost result.
api.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as
    | (InternalAxiosRequestConfig & { _csrfRetried?: boolean })
    | undefined;

  const isCsrfRejection =
    error?.response?.status === 403 &&
    typeof error.response.data?.error === 'string' &&
    error.response.data.error.includes('CSRF');

  if (!config || config._csrfRetried || !isCsrfRejection) {
    throw error;
  }

  const token = await refreshCsrfToken();
  if (!token) {
    throw error;
  }

  config._csrfRetried = true;
  config.headers = AxiosHeaders.from(config.headers);
  config.headers.set('X-CSRF-Token', token);
  return api.request(config);
});

export interface TestText {
  id: string;
  title: string;
  content: string;
  language: string;
  difficulty: Difficulty;
  wordCount: number;
  createdAt: string;
}

export interface TestResult {
  id: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  mode?: string | null;
  testType?: string | null;
  modeTarget?: number | null;
  exercisePackId?: string | null;
  exerciseKind?: string | null;
  completedAt: string;
  testText: {
    title: string;
    content: string;
    language: string;
    difficulty: string;
  };
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  testCount: number;
}

export interface SubmitResultData {
  // Test text data
  title: string;
  content: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  wordCount: number;
  // Session metadata
  mode?: 'timer' | 'words' | string;
  testType?: string;
  modeTarget?: number;
  exercisePackId?: string;
  exerciseKind?: string;
  // Test results data
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
}

export interface ProgressPoint {
  date: string;
  avgWpm: number;
  avgAccuracy: number;
  testCount: number;
}

export interface UserStats {
  totalTests: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  totalTime: number;
  currentStreak: number;
  longestStreak: number;
}

// Test Results API
export const testResultsApi = {
  submit: async (data: SubmitResultData) => {
    const response = await api.post('/api/tests/results', data);
    return response.data;
  },

  getUserResults: async (params?: {
    limit?: number;
    offset?: number;
    mode?: string;
    testType?: string;
    difficulty?: string;
  }) => {
    const response = await api.get('/api/tests/results', { params });
    return {
      results: response.data.results as TestResult[],
      totalCount: response.data.totalCount as number,
    };
  },

  getUserResultsPage: async (
    page: number,
    pageSize: number = 10,
    filters?: { mode?: string; testType?: string; difficulty?: string }
  ) => {
    const offset = (page - 1) * pageSize;
    const response = await api.get('/api/tests/results', {
      params: { limit: pageSize, offset, ...filters },
    });
    return {
      results: response.data.results as TestResult[],
      totalCount: response.data.totalCount as number,
    };
  },

  getProgress: async (days: number = 30) => {
    const response = await api.get('/api/tests/progress', {
      params: { days },
    });
    return {
      days: response.data.days as number,
      series: response.data.series as ProgressPoint[],
    };
  },
};

export interface UserProfileData {
  userId: string;
  displayName?: string | null;
  bio?: string | null;
  country?: string | null;
  keyboard?: string | null;
  preferredLanguage?: string | null;
  isPublic?: boolean | null;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  country?: string;
  keyboard?: string;
  preferredLanguage?: string;
  isPublic?: boolean;
}

// Users API
export const usersApi = {
  getUserStats: async () => {
    const response = await api.get('/api/users/stats');
    return response.data.stats as UserStats | null;
  },

  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return {
      user: response.data.user as {
        id: string;
        email: string;
        username: string;
        createdAt: string;
        profile?: UserProfileData | null;
      },
      profile: (response.data.user?.profile ?? null) as UserProfileData | null,
    };
  },

  updateProfile: async (data: UpdateProfilePayload) => {
    const response = await api.put('/api/users/profile', data);
    return response.data.profile as UserProfileData;
  },
};

// Leaderboard API
export const leaderboardApi = {
  get: async (params?: {
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all';
    limit?: number;
  }) => {
    const response = await api.get('/api/tests/leaderboard', { params });
    return response.data.leaderboard as LeaderboardEntry[];
  },

  getPage: async (params?: {
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all';
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/api/tests/leaderboard', { params });
    return {
      leaderboard: response.data.leaderboard as LeaderboardEntry[],
      totalCount: response.data.totalCount as number,
    };
  },
};

export default api;
