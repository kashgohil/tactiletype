import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface TestText {
  id: string;
  title: string;
  content: string;
  language: string;
  difficulty: string;
  wordCount: number;
  createdAt: string;
}

export interface TestResult {
  id: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  completedAt: string;
  testText?: {
    title: string;
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
  testTextId: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
}

// Test Texts API
export const testTextsApi = {
  getAll: async (params?: { language?: string; difficulty?: string; limit?: number }) => {
    const response = await api.get('/api/tests/texts', { params });
    return response.data.texts as TestText[];
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/tests/texts/${id}`);
    return response.data.text as TestText;
  },
};

// Test Results API
export const testResultsApi = {
  submit: async (data: SubmitResultData) => {
    const response = await api.post('/api/tests/results', data);
    return response.data;
  },

  getUserResults: async (params?: { limit?: number; offset?: number }) => {
    const response = await api.get('/api/tests/results', { params });
    return response.data.results as TestResult[];
  },
};

// Leaderboard API
export const leaderboardApi = {
  get: async (params?: { timeframe?: 'daily' | 'weekly' | 'monthly' | 'all'; limit?: number }) => {
    const response = await api.get('/api/tests/leaderboard', { params });
    return response.data.leaderboard as LeaderboardEntry[];
  },
};

export default api;