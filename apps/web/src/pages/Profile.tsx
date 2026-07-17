import { GoalTracker } from '@/components/analytics/GoalTracker';
import {
  AchievementsPanel,
  ActivitySection,
  MetricHierarchy,
  ProfileEmptyState,
  ProfileHero,
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
import { useAuth } from '../contexts';
import { analyticsApi } from '../services/analyticsApi';
import { challengesApi } from '../services/challengesApi';
import { testResultsApi, usersApi } from '../services/api';

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

  const { data: profileData } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => usersApi.getProfile(),
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
  const rawProfile = profileData?.profile;
  const profile = rawProfile
    ? {
        userId: rawProfile.userId,
        displayName: rawProfile.displayName ?? undefined,
        bio: rawProfile.bio ?? undefined,
        country: rawProfile.country ?? undefined,
        keyboard: rawProfile.keyboard ?? undefined,
        preferredLanguage: rawProfile.preferredLanguage ?? 'en',
        isPublic: rawProfile.isPublic !== false,
      }
    : null;

  const isLoading = isLoadingResults || isLoadingStats;
  const isError = isErrorResults || isErrorStats;
  const hasNoTests =
    !isLoading && !isError && (!stats || stats.totalTests === 0);

  const handleShare = () => {
    window.location.href = `/u/${user?.username}`;
  };

  const handleFiltersChange = (next: ResultFilters) => {
    setFilters(next);
    setCurrentPage(1);
  };

  if (!user) {
    return <ProfileEmptyState variant="login" />;
  }

  return (
    <div className="pt-2 pb-10 space-y-6 md:space-y-8 max-w-5xl mx-auto">
      <ProfileHero user={user} profile={profile} onShare={handleShare} />

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-300">
            Failed to load profile data
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="destructive"
            className="mt-4"
          >
            Try again
          </Button>
        </div>
      )}

      {!isError && (
        <>
          <MetricHierarchy stats={stats} isLoading={isLoadingStats} />

          {hasNoTests ? (
            <ProfileEmptyState variant="no-tests" />
          ) : (
            <>
              <RecommendedExerciseCard recommendation={recommendation} />

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="/daily">Daily challenge</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="/practice">Practice hub</a>
                </Button>
              </div>

              <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-1 space-y-4">
                  {isLoadingGoals ? (
                    <div className="bg-accent/10 rounded-xl p-6 text-sm text-text/40">
                      Loading goals…
                    </div>
                  ) : (
                    <GoalTracker
                      goals={goals}
                      onCreateGoal={(data) => createGoalMutation.mutate(data)}
                      onDeleteGoal={(id) => deleteGoalMutation.mutate(id)}
                    />
                  )}
                </div>
                <div className="lg:col-span-2 space-y-2">
                  <h2 className="text-lg font-semibold px-1">Progress</h2>
                  <p className="text-sm text-text/50 px-1 mb-3">
                    Daily average WPM and accuracy over the last 30 days.
                  </p>
                  <ProfileProgressChart
                    series={progressData?.series ?? []}
                    isLoading={isLoadingProgress}
                    days={30}
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
                <WeakSpotsPanel
                  errorAnalysis={errorAnalysis}
                  isLoading={isLoadingErrors}
                />
                <AchievementsPanel
                  achievements={achievements}
                  isLoading={isLoadingAchievements}
                />
              </div>

              <ActivitySection
                year={currentYear}
                currentStreak={stats?.currentStreak ?? 0}
                longestStreak={stats?.longestStreak ?? 0}
                totalTests={stats?.totalTests ?? 0}
              />

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
        </>
      )}
    </div>
  );
};
