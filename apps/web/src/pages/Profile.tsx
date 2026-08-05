import { GoalTracker } from '@/components/analytics/GoalTracker';
import {
  AchievementsPanel,
  ProfileEmptyState,
  RecommendedExerciseCard,
  ResultCards,
  WeakSpotsPanel,
  type ResultFilters,
} from '@/components/profile';
import { ProfileProgressChart } from '@/components/profile/ProfileProgressChart';
import { Button } from '@/components/ui/button';
import { buildRecommendation } from '@/utils/recommendations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { ActivityHeatmap } from '../components/analytics/ActivityHeatmap';
import { useAuth } from '../contexts';
import { analyticsApi } from '../services/analyticsApi';
import { challengesApi } from '../services/challengesApi';
import { testResultsApi, usersApi } from '../services/api';
import { formatTime } from '../utils/typingEngine';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ResultFilters>({});
  const pageSize = 10;

  const {
    data: testResultsData,
    isFetching: isFetchingResults,
    isLoading: isLoadingResults,
    isError: isErrorResults,
  } = useQuery({
    queryKey: ['userTestResults', user?.id, currentPage, filters],
    queryFn: () =>
      testResultsApi.getUserResultsPage(currentPage, pageSize, filters),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: statsData,
    isLoading: isLoadingStats,
    isError: isErrorStats,
  } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => usersApi.getUserStats(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: progressData, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['userProgress', user?.id, 30],
    queryFn: () => testResultsApi.getProgress(30),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: errorAnalysis, isLoading: isLoadingErrors } = useQuery({
    queryKey: ['userErrorAnalysis', user?.id],
    queryFn: () => analyticsApi.getErrorAnalysis(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: goals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['userGoals', user?.id],
    queryFn: () => analyticsApi.getGoals(),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: achievements = [], isLoading: isLoadingAchievements } =
    useQuery({
      queryKey: ['userAchievements', user?.id],
      queryFn: () => challengesApi.getAchievements(),
      enabled: !!user,
      staleTime: 60 * 1000,
    });

  const createGoalMutation = useMutation({
    mutationFn: analyticsApi.createGoal,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['userGoals', user?.id] }),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: analyticsApi.deleteGoal,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['userGoals', user?.id] }),
  });

  const recommendation = useMemo(
    () =>
      buildRecommendation({
        errorAnalysis,
        recentAvgAccuracy: statsData ? Number(statsData.avgAccuracy) : null,
        currentStreak: statsData?.currentStreak ?? 0,
        lastPracticeHoursAgo: null,
      }),
    [errorAnalysis, statsData]
  );

  const currentYear = new Date().getFullYear();
  const testResults = testResultsData?.results || [];
  const totalCount = testResultsData?.totalCount || 0;
  const stats = statsData || null;

  const isLoading = isLoadingResults || isLoadingStats;
  const isError = isErrorResults || isErrorStats;

  const handleFiltersChange = (next: ResultFilters) => {
    setFilters(next);
    setCurrentPage(1);
  };

  if (!user) {
    return <ProfileEmptyState variant="login" />;
  }

  return (
    <div className="pt-4 pb-8">
      <div className="flex flex-col gap-8 mb-8">
        {/* User Info */}
        <div className="bg-accent/10 rounded-lg space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <label className="block text-sm font-medium text-text/50">
                Username
              </label>
              <p className="text-lg">{user.username}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <a href="/settings">Settings</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/u/${user.username}`}>Public profile</a>
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text/50">
              Email
            </label>
            <p className="text-lg">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text/50">
              Member Since
            </label>
            <p className="text-lg">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmap year={currentYear} />

        {/* Statistics */}
        <div className="lg:col-span-2">
          {isLoading && (
            <div className="bg-accent/10 rounded-lg p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <p className="mt-4 text-text/40">Loading statistics...</p>
            </div>
          )}

          {isError && (
            <div className="bg-destructive/10 rounded-lg p-6 text-center">
              <p className="text-destructive">Failed to load test results</p>
              <Button
                onClick={() => window.location.reload()}
                variant="destructive"
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && !isError && !stats && (
            <div className="bg-accent/10 rounded-lg p-12 text-center">
              <p className="text-xl text-text/50 mb-4">
                No typing tests completed yet
              </p>
              <p className="text-text/50">
                Take your first typing test to see your statistics here!
              </p>
            </div>
          )}

          {!isLoading && !isError && stats && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {stats.bestWpm}
                  </div>
                  <div className="text-sm text-text/50">Best WPM</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {stats.avgWpm}
                  </div>
                  <div className="text-sm text-text/50">Avg WPM</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {stats.avgAccuracy}%
                  </div>
                  <div className="text-sm text-text/50">Avg Accuracy</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {stats.totalTests}
                  </div>
                  <div className="text-sm text-text/50">Tests Taken</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-accent">
                    {formatTime(stats.totalTime)}
                  </div>
                  <div className="text-sm text-text/50">
                    Total Time Practiced
                  </div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {stats.currentStreak}
                  </div>
                  <div className="text-sm text-text/50">Current Streak</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {stats.longestStreak}
                  </div>
                  <div className="text-sm text-text/50">Longest Streak</div>
                </div>
              </div>

              <div className="mb-8">
                <RecommendedExerciseCard recommendation={recommendation} />
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                <Button asChild variant="outline" size="sm">
                  <a href="/daily">Daily challenge</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="/practice">Practice hub</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="/play">Play modes</a>
                </Button>
              </div>

              <div className="grid lg:grid-cols-3 gap-4 mb-8">
                <div className="lg:col-span-1">
                  {isLoadingGoals ? (
                    <div className="bg-accent/10 rounded-lg p-6 text-sm text-text/40">
                      Loading goals...
                    </div>
                  ) : (
                    <GoalTracker
                      goals={goals}
                      onCreateGoal={(data) => createGoalMutation.mutate(data)}
                      onDeleteGoal={(id) => deleteGoalMutation.mutate(id)}
                    />
                  )}
                </div>
                <div className="lg:col-span-2 bg-accent/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-1">Progress</h3>
                  <p className="text-sm text-text/50 mb-4">
                    Daily average WPM and accuracy over the last 30 days.
                  </p>
                  <ProfileProgressChart
                    series={progressData?.series ?? []}
                    isLoading={isLoadingProgress}
                    days={30}
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4 mb-8">
                <WeakSpotsPanel
                  errorAnalysis={errorAnalysis}
                  isLoading={isLoadingErrors}
                />
                <AchievementsPanel
                  achievements={achievements}
                  isLoading={isLoadingAchievements}
                />
              </div>

              {/* Recent Test Results */}
              <ResultCards
                results={testResults}
                totalCount={totalCount}
                currentPage={currentPage}
                pageSize={pageSize}
                isFetching={isFetchingResults}
                isLoading={isLoadingResults}
                filters={filters}
                onPageChange={setCurrentPage}
                onFiltersChange={handleFiltersChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
