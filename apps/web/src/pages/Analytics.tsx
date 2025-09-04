import type {
  AccuracyHeatmap,
  AnalyticsDashboard,
  UserGoal,
  UserRecommendation,
} from '@tactile/types';
import React, { useEffect, useState } from 'react';
import { ErrorHeatmap } from '../components/analytics/ErrorHeatmap';
import { GoalTracker } from '../components/analytics/GoalTracker';
import { ProgressChart } from '../components/analytics/ProgressChart';
import { RecommendationsPanel } from '../components/analytics/RecommendationsPanel';
import { ReportGenerator } from '../components/analytics/ReportGenerator';
import { useAuth } from '../contexts';
import { analyticsApi } from '../services/analyticsApi';

// Mock data for development - will be replaced with API calls
const mockDashboardData: AnalyticsDashboard = {
  overview: {
    totalTests: 127,
    totalTimeSpent: 18420, // seconds
    averageWpm: 68.5,
    averageAccuracy: 94.2,
    improvementRate: 12.3,
    consistencyScore: 78.9,
    currentStreak: 7,
    longestStreak: 23,
  },
  progressCharts: [
    {
      type: 'wpm',
      timeframe: 'weekly',
      data: [
        { date: '2024-01-01', value: 62 },
        { date: '2024-01-02', value: 64 },
        { date: '2024-01-03', value: 66 },
        { date: '2024-01-04', value: 68 },
        { date: '2024-01-05', value: 70 },
        { date: '2024-01-06', value: 69 },
        { date: '2024-01-07', value: 72 },
      ],
      trend: 'improving',
      trendPercentage: 16.1,
    },
    {
      type: 'accuracy',
      timeframe: 'weekly',
      data: [
        { date: '2024-01-01', value: 92 },
        { date: '2024-01-02', value: 93 },
        { date: '2024-01-03', value: 94 },
        { date: '2024-01-04', value: 95 },
        { date: '2024-01-05', value: 94 },
        { date: '2024-01-06', value: 96 },
        { date: '2024-01-07', value: 95 },
      ],
      trend: 'improving',
      trendPercentage: 3.3,
    },
    {
      type: 'consistency',
      timeframe: 'weekly',
      data: [
        { date: '2024-01-01', value: 75 },
        { date: '2024-01-02', value: 77 },
        { date: '2024-01-03', value: 79 },
        { date: '2024-01-04', value: 78 },
        { date: '2024-01-05', value: 80 },
        { date: '2024-01-06', value: 82 },
        { date: '2024-01-07', value: 81 },
      ],
      trend: 'improving',
      trendPercentage: 8.0,
    },
  ],
  errorAnalysis: {
    mostProblematicChars: [
      {
        character: 'q',
        errorCount: 12,
        errorRate: 8.5,
        suggestions: ['Practice Q finger placement'],
      },
      {
        character: 'z',
        errorCount: 8,
        errorRate: 6.2,
        suggestions: ['Use pinky finger for Z'],
      },
    ],
    mostProblematicWords: [
      {
        word: 'the',
        errorCount: 5,
        errorRate: 2.1,
        commonMistakes: ['teh', 'hte'],
      },
    ],
    commonPatterns: [],
    improvementAreas: ['Focus on Q and Z keys', 'Practice common words'],
  },
  recommendations: [],
  achievements: [],
  goals: [],
};

const mockHeatmapData: AccuracyHeatmap = {
  characters: [
    { character: 'a', accuracy: 96.5, frequency: 120, color: '#22c55e' },
    { character: 's', accuracy: 94.2, frequency: 98, color: '#22c55e' },
    { character: 'd', accuracy: 92.8, frequency: 87, color: '#22c55e' },
    { character: 'f', accuracy: 95.1, frequency: 76, color: '#22c55e' },
    { character: 'g', accuracy: 89.3, frequency: 65, color: '#fbbf24' },
    { character: 'h', accuracy: 91.7, frequency: 89, color: '#22c55e' },
    { character: 'j', accuracy: 88.4, frequency: 45, color: '#fbbf24' },
    { character: 'k', accuracy: 90.2, frequency: 52, color: '#22c55e' },
    { character: 'l', accuracy: 93.6, frequency: 78, color: '#22c55e' },
    { character: 'q', accuracy: 67.8, frequency: 23, color: '#ef4444' },
    { character: 'w', accuracy: 85.9, frequency: 67, color: '#fbbf24' },
    { character: 'e', accuracy: 97.2, frequency: 145, color: '#22c55e' },
    { character: 'r', accuracy: 94.8, frequency: 89, color: '#22c55e' },
    { character: 't', accuracy: 96.1, frequency: 112, color: '#22c55e' },
    { character: 'y', accuracy: 87.3, frequency: 43, color: '#fbbf24' },
    { character: 'u', accuracy: 92.4, frequency: 67, color: '#22c55e' },
    { character: 'i', accuracy: 95.7, frequency: 89, color: '#22c55e' },
    { character: 'o', accuracy: 94.3, frequency: 98, color: '#22c55e' },
    { character: 'p', accuracy: 88.9, frequency: 54, color: '#fbbf24' },
    { character: 'z', accuracy: 72.1, frequency: 18, color: '#f97316' },
    { character: 'x', accuracy: 79.6, frequency: 25, color: '#f97316' },
    { character: 'c', accuracy: 91.8, frequency: 67, color: '#22c55e' },
    { character: 'v', accuracy: 86.4, frequency: 34, color: '#fbbf24' },
    { character: 'b', accuracy: 89.7, frequency: 45, color: '#fbbf24' },
    { character: 'n', accuracy: 93.2, frequency: 78, color: '#22c55e' },
    { character: 'm', accuracy: 95.4, frequency: 67, color: '#22c55e' },
    { character: ' ', accuracy: 98.9, frequency: 234, color: '#22c55e' },
  ],
  maxValue: 98.9,
  minValue: 67.8,
};

const mockGoals: UserGoal[] = [
  {
    id: '1',
    userId: 'user1',
    goalType: 'wpm',
    targetValue: 80,
    currentValue: 72,
    targetDate: '2024-02-15',
    isActive: true,
    isAchieved: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    userId: 'user1',
    goalType: 'accuracy',
    targetValue: 98,
    currentValue: 95,
    isActive: true,
    isAchieved: false,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

const mockRecommendations: UserRecommendation[] = [
  {
    id: '1',
    userId: 'user1',
    type: 'practice_focus',
    title: 'Focus on Q and Z Keys',
    description:
      'Your accuracy with Q and Z keys is below average. Practice these characters to improve overall accuracy.',
    priority: 4,
    isRead: false,
    isApplied: false,
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '2',
    userId: 'user1',
    type: 'goal_suggestion',
    title: 'Set a Consistency Goal',
    description:
      'Your typing rhythm varies significantly. Consider setting a consistency goal to improve your typing flow.',
    priority: 3,
    isRead: true,
    isApplied: false,
    createdAt: '2024-01-18T00:00:00Z',
  },
];

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboard | null>(
    null
  );
  const [heatmapData, setHeatmapData] = useState<AccuracyHeatmap | null>(null);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'daily' | 'weekly' | 'monthly'
  >('weekly');

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch real analytics data
        const [
          overview,
          trends,
          errorAnalysis,
          goals,
          recommendations,
          heatmap,
        ] = await Promise.allSettled([
          analyticsApi.getOverview(),
          analyticsApi.getTrends({ timeframe: selectedTimeframe }),
          analyticsApi.getErrorAnalysis(),
          analyticsApi.getGoals(),
          analyticsApi.getRecommendations(),
          analyticsApi.getAccuracyHeatmap({
            timeframe:
              selectedTimeframe === 'daily'
                ? 'week'
                : selectedTimeframe === 'weekly'
                  ? 'month'
                  : 'all',
          }),
        ]);

        // Handle overview data
        if (overview.status === 'fulfilled') {
          const dashboardData: AnalyticsDashboard = {
            overview: overview.value,
            progressCharts: trends.status === 'fulfilled' ? trends.value : [],
            errorAnalysis:
              errorAnalysis.status === 'fulfilled'
                ? errorAnalysis.value
                : {
                    mostProblematicChars: [],
                    mostProblematicWords: [],
                    commonPatterns: [],
                    improvementAreas: [],
                  },
            recommendations:
              recommendations.status === 'fulfilled'
                ? recommendations.value
                : [],
            achievements: [], // TODO: Implement achievements
            goals: goals.status === 'fulfilled' ? goals.value : [],
          };
          setDashboardData(dashboardData);
        } else {
          console.error('Failed to fetch overview:', overview.reason);
          // Fallback to mock data if API fails
          setDashboardData(mockDashboardData);
        }

        // Handle other data
        if (goals.status === 'fulfilled') {
          setGoals(goals.value);
        } else {
          console.error('Failed to fetch goals:', goals.reason);
          setGoals(mockGoals);
        }

        if (recommendations.status === 'fulfilled') {
          setRecommendations(recommendations.value);
        } else {
          console.error(
            'Failed to fetch recommendations:',
            recommendations.reason
          );
          setRecommendations(mockRecommendations);
        }

        if (heatmap.status === 'fulfilled') {
          setHeatmapData(heatmap.value);
        } else {
          console.error('Failed to fetch heatmap:', heatmap.reason);
          setHeatmapData(mockHeatmapData);
        }
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        // Fallback to mock data on error
        setDashboardData(mockDashboardData);
        setHeatmapData(mockHeatmapData);
        setGoals(mockGoals);
        setRecommendations(mockRecommendations);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [user, selectedTimeframe]);

  const handleCreateGoal = async (goalData: {
    goalType: 'wpm' | 'accuracy' | 'consistency' | 'daily_tests';
    targetValue: number;
    targetDate?: string;
  }) => {
    try {
      const newGoal = await analyticsApi.createGoal(goalData);
      setGoals([...goals, newGoal]);
    } catch (error) {
      console.error('Failed to create goal:', error);
      // Fallback to local state update if API fails
      const fallbackGoal: UserGoal = {
        id: Date.now().toString(),
        userId: user!.id,
        ...goalData,
        currentValue: 0,
        isActive: true,
        isAchieved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setGoals([...goals, fallbackGoal]);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await analyticsApi.deleteGoal(goalId);
      setGoals(goals.filter((goal) => goal.id !== goalId));
    } catch (error) {
      console.error('Failed to delete goal:', error);
      // Still remove from local state even if API call fails
      setGoals(goals.filter((goal) => goal.id !== goalId));
    }
  };

  const handleMarkRecommendationAsRead = async (recommendationId: string) => {
    try {
      await analyticsApi.markRecommendationAsRead(recommendationId);
      setRecommendations(
        recommendations.map((rec) =>
          rec.id === recommendationId ? { ...rec, isRead: true } : rec
        )
      );
    } catch (error) {
      console.error('Failed to mark recommendation as read:', error);
      // Still update local state even if API call fails
      setRecommendations(
        recommendations.map((rec) =>
          rec.id === recommendationId ? { ...rec, isRead: true } : rec
        )
      );
    }
  };

  const handleMarkRecommendationAsApplied = async (
    recommendationId: string
  ) => {
    try {
      await analyticsApi.markRecommendationAsApplied(recommendationId);
      setRecommendations(
        recommendations.map((rec) =>
          rec.id === recommendationId ? { ...rec, isApplied: true } : rec
        )
      );
    } catch (error) {
      console.error('Failed to mark recommendation as applied:', error);
      // Still update local state even if API call fails
      setRecommendations(
        recommendations.map((rec) =>
          rec.id === recommendationId ? { ...rec, isApplied: true } : rec
        )
      );
    }
  };

  const handleDismissRecommendation = (recommendationId: string) => {
    setRecommendations(
      recommendations.filter((rec) => rec.id !== recommendationId)
    );
  };

  const handleExportData = async (format: 'csv' | 'json') => {
    try {
      await analyticsApi.exportData(format);
      console.log(`Data exported successfully in ${format} format`);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to view your typing analytics.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"
              ></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          No analytics data available. Complete some typing tests to see your
          progress!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-8">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Timeframe:
          </label>
          <select
            value={selectedTimeframe}
            onChange={(e) =>
              setSelectedTimeframe(
                e.target.value as 'daily' | 'weekly' | 'monthly'
              )
            }
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Tests
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardData.overview.totalTests}
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average WPM
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dashboardData.overview.averageWpm}
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Accuracy
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {dashboardData.overview.averageAccuracy}%
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Time Spent
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatTime(dashboardData.overview.totalTimeSpent)}
              </p>
            </div>
            <div className="text-3xl">⏱️</div>
          </div>
        </div>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {dashboardData.progressCharts.map((chart, index) => (
          <ProgressChart key={index} chart={chart} height={250} />
        ))}
      </div>

      {/* Error Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Character Accuracy Heatmap */}
        {heatmapData && (
          <div className="lg:col-span-2">
            <ErrorHeatmap heatmapData={heatmapData} />
          </div>
        )}
      </div>

      {/* Improvement Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Problematic Characters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Characters to Improve
          </h3>
          <div className="space-y-3">
            {dashboardData.errorAnalysis.mostProblematicChars
              .slice(0, 5)
              .map((char, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {char.character}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {char.errorCount} errors
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {char.errorRate.toFixed(1)}% error rate
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {char.suggestions[0]}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Improvement Suggestions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Improvement Areas
          </h3>
          <div className="space-y-3">
            {dashboardData.errorAnalysis.improvementAreas.map((area, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
              >
                <div className="text-blue-500 dark:text-blue-400 mt-0.5">
                  💡
                </div>
                <p className="text-gray-900 dark:text-white">{area}</p>
              </div>
            ))}

            {/* Additional improvement suggestions */}
            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-green-500 dark:text-green-400 mt-0.5">
                🎯
              </div>
              <p className="text-gray-900 dark:text-white">
                Your consistency score is{' '}
                {dashboardData.overview.consistencyScore.toFixed(1)}%. Try to
                maintain steady typing rhythm.
              </p>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-purple-500 dark:text-purple-400 mt-0.5">
                📈
              </div>
              <p className="text-gray-900 dark:text-white">
                You're improving at{' '}
                {dashboardData.overview.improvementRate.toFixed(1)}% rate. Keep
                up the great work!
              </p>
            </div>
          </div>
        </div>

        {/* Goals and Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GoalTracker
            goals={goals}
            onCreateGoal={handleCreateGoal}
            onDeleteGoal={handleDeleteGoal}
          />

          <RecommendationsPanel
            recommendations={recommendations}
            onMarkAsRead={handleMarkRecommendationAsRead}
            onMarkAsApplied={handleMarkRecommendationAsApplied}
            onDismiss={handleDismissRecommendation}
          />
        </div>

        {/* Report Generator */}
        <div className="mb-8">
          <ReportGenerator
            overview={dashboardData.overview}
            progressCharts={dashboardData.progressCharts}
            onExportData={handleExportData}
          />
        </div>
      </div>
    </div>
  );
};
