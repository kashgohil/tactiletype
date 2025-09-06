import { VITE_API_URL } from '@/constants';
import { getCsrfTokenFromCookie } from '@/utils/csrf';
import type { Difficulty } from '@tactile/types';
import axios from 'axios';

const api = axios.create({
  baseURL: VITE_API_URL,
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  config.headers['X-CSRF-Token'] = getCsrfTokenFromCookie() || '';
  return config;
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
  // Test results data
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
}

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
  get: async (params?: {
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all';
    limit?: number;
  }) => {
    const response = await api.get('/api/tests/leaderboard', { params });
    return response.data.leaderboard as LeaderboardEntry[];
  },
};

export default api;
