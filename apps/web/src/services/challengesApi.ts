import api from './api';
import type { DailyModeChallenge } from '@tactile/content';
import type { CurriculumProgress } from '@/utils/curriculum';

export interface DailyChallenge {
  date: string;
  title: string;
  content: string;
  author: string;
  language: string;
  difficulty: string;
  wordCount: number;
}

export interface DailyLeaderboardEntry {
  userId: string;
  username: string;
  wpm: number;
  accuracy: number;
}

export interface AchievementItem {
  id: string;
  name: string;
  description: string;
  category: string;
  badgeIcon?: string | null;
  points: number;
  rarity: string;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export const challengesApi = {
  getDaily: async () => {
    const response = await api.get('/api/challenges/daily');
    return response.data.challenge as DailyChallenge;
  },

  getDailyLeaderboard: async (limit = 20) => {
    const response = await api.get('/api/challenges/daily/leaderboard', {
      params: { limit },
    });
    return {
      date: response.data.date as string,
      leaderboard: response.data.leaderboard as DailyLeaderboardEntry[],
    };
  },

  getDailyMode: async () => {
    const response = await api.get('/api/challenges/daily/mode');
    return response.data.mode as DailyModeChallenge;
  },

  getDailyModeLeaderboard: async (limit = 20) => {
    const response = await api.get('/api/challenges/daily/mode/leaderboard', {
      params: { limit },
    });
    return {
      date: response.data.date as string,
      modeId: response.data.modeId as string,
      title: response.data.title as string,
      leaderboard: response.data.leaderboard as DailyLeaderboardEntry[],
    };
  },

  getCurriculum: async () => {
    const response = await api.get('/api/challenges/curriculum');
    return response.data.progress as CurriculumProgress;
  },

  putCurriculum: async (progress: CurriculumProgress) => {
    await api.put('/api/challenges/curriculum', { progress });
  },

  getAchievements: async () => {
    const response = await api.get('/api/challenges/achievements');
    return response.data.achievements as AchievementItem[];
  },
};
