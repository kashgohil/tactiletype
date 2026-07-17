import api from './api';

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

  getAchievements: async () => {
    const response = await api.get('/api/challenges/achievements');
    return response.data.achievements as AchievementItem[];
  },
};
