import api from './api';
import type {
  AnalyticsOverview,
  ProgressChart,
  ErrorAnalysisSummary,
  UserGoal,
  UserRecommendation,
  KeystrokeAnalytics,
} from '@tactile/types';

export const analyticsApi = {
  // Get analytics overview
  getOverview: async (): Promise<AnalyticsOverview> => {
    const response = await api.get('/api/analytics/overview');
    return response.data.overview;
  },

  // Get performance trends
  getTrends: async (params?: {
    timeframe?: 'daily' | 'weekly' | 'monthly';
    limit?: number;
  }): Promise<ProgressChart[]> => {
    const response = await api.get('/api/analytics/trends', { params });
    return response.data.progressCharts;
  },

  // Get error analysis
  getErrorAnalysis: async (params?: {
    limit?: number;
  }): Promise<ErrorAnalysisSummary> => {
    const response = await api.get('/api/analytics/errors', { params });
    return response.data.errorAnalysis;
  },

  // Get keystroke analytics for a specific test result
  getKeystrokeAnalytics: async (testResultId: string): Promise<KeystrokeAnalytics> => {
    const response = await api.get(`/api/analytics/keystrokes/${testResultId}`);
    return response.data.keystrokeAnalytics;
  },

  // Get user goals
  getGoals: async (): Promise<UserGoal[]> => {
    const response = await api.get('/api/analytics/goals');
    return response.data.goals;
  },

  // Create a new goal
  createGoal: async (goalData: {
    goalType: 'wpm' | 'accuracy' | 'consistency' | 'daily_tests';
    targetValue: number;
    targetDate?: string;
  }): Promise<UserGoal> => {
    const response = await api.post('/api/analytics/goals', goalData);
    return response.data.goal;
  },

  // Get recommendations
  getRecommendations: async (): Promise<UserRecommendation[]> => {
    const response = await api.get('/api/analytics/recommendations');
    return response.data.recommendations;
  },

  // Process test result for analytics (called after test submission)
  processTestResult: async (testResultId: string): Promise<void> => {
    await api.post(`/api/analytics/process-result/${testResultId}`);
  },

  // Mark recommendation as read
  markRecommendationAsRead: async (recommendationId: string): Promise<void> => {
    await api.patch(`/api/analytics/recommendations/${recommendationId}/read`);
  },

  // Mark recommendation as applied
  markRecommendationAsApplied: async (recommendationId: string): Promise<void> => {
    await api.patch(`/api/analytics/recommendations/${recommendationId}/applied`);
  },

  // Update goal progress
  updateGoalProgress: async (goalId: string, currentValue: number): Promise<UserGoal> => {
    const response = await api.patch(`/api/analytics/goals/${goalId}`, { currentValue });
    return response.data.goal;
  },

  // Delete goal
  deleteGoal: async (goalId: string): Promise<void> => {
    await api.delete(`/api/analytics/goals/${goalId}`);
  },

  // Get detailed statistics for a date range
  getDetailedStats: async (params: {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }) => {
    const response = await api.get('/api/analytics/detailed-stats', { params });
    return response.data;
  },

  // Get accuracy heatmap data
  getAccuracyHeatmap: async (params?: {
    timeframe?: 'week' | 'month' | 'all';
  }) => {
    const response = await api.get('/api/analytics/accuracy-heatmap', { params });
    return response.data.heatmap;
  },

  // Get typing rhythm analysis
  getTypingRhythm: async (testResultId?: string) => {
    const url = testResultId 
      ? `/api/analytics/typing-rhythm/${testResultId}`
      : '/api/analytics/typing-rhythm';
    const response = await api.get(url);
    return response.data.rhythmAnalysis;
  },

  // Get personal bests
  getPersonalBests: async () => {
    const response = await api.get('/api/analytics/personal-bests');
    return response.data.personalBests;
  },

  // Export analytics data
  exportData: async (format: 'csv' | 'json' = 'csv') => {
    const response = await api.get(`/api/analytics/export?format=${format}`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `typing-analytics.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Generate practice session based on weaknesses
  generatePracticeSession: async (focusArea?: 'speed' | 'accuracy' | 'specific_chars' | 'words') => {
    const response = await api.post('/api/analytics/generate-practice', { focusArea });
    return response.data.practiceSession;
  },

  // Submit practice session results
  submitPracticeSession: async (sessionData: {
    focusArea: string;
    targetContent?: string;
    duration: number;
    results: Array<{
      exerciseIndex: number;
      wpm: number;
      accuracy: number;
      errors: number;
      timeTaken: number;
    }>;
  }) => {
    const response = await api.post('/api/analytics/practice-sessions', sessionData);
    return response.data.session;
  },
};

export default analyticsApi;