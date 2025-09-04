import type { AnalyticsDashboard, UserRecommendation } from '@tactile/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { ErrorHeatmap } from '../components/analytics/ErrorHeatmap';
import { GoalTracker } from '../components/analytics/GoalTracker';
import { ProgressChart } from '../components/analytics/ProgressChart';
import { RecommendationsPanel } from '../components/analytics/RecommendationsPanel';
import { ReportGenerator } from '../components/analytics/ReportGenerator';
import { useAuth } from '../contexts';
import { analyticsApi } from '../services/analyticsApi';

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<
    'daily' | 'weekly' | 'monthly'
  >('weekly');

  // Queries for data fetching
  const overviewQuery = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview(),
    enabled: !!user,
  });

  const trendsQuery = useQuery({
    queryKey: ['analytics', 'trends', selectedTimeframe],
    queryFn: () => analyticsApi.getTrends({ timeframe: selectedTimeframe }),
    enabled: !!user,
  });

  const errorAnalysisQuery = useQuery({
    queryKey: ['analytics', 'errorAnalysis'],
    queryFn: () => analyticsApi.getErrorAnalysis(),
    enabled: !!user,
  });

  const goalsQuery = useQuery({
    queryKey: ['analytics', 'goals'],
    queryFn: () => analyticsApi.getGoals(),
    enabled: !!user,
  });

  const recommendationsQuery = useQuery({
    queryKey: ['analytics', 'recommendations'],
    queryFn: () => analyticsApi.getRecommendations(),
    enabled: !!user,
  });

  const heatmapQuery = useQuery({
    queryKey: ['analytics', 'heatmap', selectedTimeframe],
    queryFn: () =>
      analyticsApi.getAccuracyHeatmap({
        timeframe:
          selectedTimeframe === 'daily'
            ? 'week'
            : selectedTimeframe === 'weekly'
              ? 'month'
              : 'all',
      }),
    enabled: !!user,
  });

  // Combine data into dashboardData
  const dashboardData: AnalyticsDashboard | null = React.useMemo(() => {
    if (!overviewQuery.data || !trendsQuery.data || !errorAnalysisQuery.data) {
      return null;
    }

    return {
      overview: overviewQuery.data,
      progressCharts: trendsQuery.data,
      errorAnalysis: errorAnalysisQuery.data,
      recommendations: recommendationsQuery.data || [],
      achievements: [],
      goals: goalsQuery.data || [],
    };
  }, [
    overviewQuery.data,
    trendsQuery.data,
    errorAnalysisQuery.data,
    recommendationsQuery.data,
    goalsQuery.data,
  ]);

  // Mutations
  const createGoalMutation = useMutation({
    mutationFn: analyticsApi.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'goals'] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: analyticsApi.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'goals'] });
    },
  });

  const markRecommendationAsReadMutation = useMutation({
    mutationFn: analyticsApi.markRecommendationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['analytics', 'recommendations'],
      });
    },
  });

  const markRecommendationAsAppliedMutation = useMutation({
    mutationFn: analyticsApi.markRecommendationAsApplied,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['analytics', 'recommendations'],
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: analyticsApi.exportData,
  });

  const handleCreateGoal = (goalData: {
    goalType: 'wpm' | 'accuracy' | 'consistency' | 'daily_tests';
    targetValue: number;
    targetDate?: string;
  }) => {
    createGoalMutation.mutate(goalData);
  };

  const handleDeleteGoal = (goalId: string) => {
    deleteGoalMutation.mutate(goalId);
  };

  const handleMarkRecommendationAsRead = (recommendationId: string) => {
    markRecommendationAsReadMutation.mutate(recommendationId);
  };

  const handleMarkRecommendationAsApplied = (recommendationId: string) => {
    markRecommendationAsAppliedMutation.mutate(recommendationId);
  };

  const handleDismissRecommendation = (recommendationId: string) => {
    // For dismiss, we need to handle it differently since it's not an API call
    // We can use queryClient to update the cache directly
    queryClient.setQueryData(
      ['analytics', 'recommendations'],
      (oldData: UserRecommendation[] | undefined) =>
        oldData?.filter((rec) => rec.id !== recommendationId) || []
    );
  };

  const handleExportData = (format: 'csv' | 'json') => {
    exportDataMutation.mutate(format, {
      onSuccess: () => {
        console.log(`Data exported successfully in ${format} format`);
      },
    });
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

  const isLoading =
    overviewQuery.isLoading ||
    trendsQuery.isLoading ||
    errorAnalysisQuery.isLoading;

  if (isLoading) {
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
        {heatmapQuery.data && (
          <div className="lg:col-span-2">
            <ErrorHeatmap heatmapData={heatmapQuery.data} />
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
            goals={goalsQuery.data || []}
            onCreateGoal={handleCreateGoal}
            onDeleteGoal={handleDeleteGoal}
          />

          <RecommendationsPanel
            recommendations={recommendationsQuery.data || []}
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
