import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type React from 'react';
import { useMemo, useState } from 'react';
import { GoalTracker } from '@/components/analytics/GoalTracker';
import {
  AchievementsPanel,
  MetricHierarchy,
  ProfileEmptyState,
  ProfileHero,
  RecommendedExerciseCard,
  ResultCards,
  type ResultFilters,
  WeakSpotsPanel,
} from '@/components/profile';
import { ProfileProgressChart } from '@/components/profile/ProfileProgressChart';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { buildRecommendation } from '@/utils/recommendations';
import { ActivityHeatmap } from '../components/analytics/ActivityHeatmap';
import { useAuth } from '../contexts';
import { analyticsApi } from '../services/analyticsApi';
import { testResultsApi, usersApi } from '../services/api';
import { challengesApi } from '../services/challengesApi';

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
    queryFn: () => testResultsApi.getUserResultsPage(currentPage, pageSize, filters),
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

  const { data: achievements = [], isLoading: isLoadingAchievements } = useQuery({
    queryKey: ['userAchievements', user?.id],
    queryFn: () => challengesApi.getAchievements(),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const createGoalMutation = useMutation({
    mutationFn: analyticsApi.createGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userGoals', user?.id] }),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: analyticsApi.deleteGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userGoals', user?.id] }),
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
    <div className="space-y-6">
      <ProfileHero user={user} />

      {isError ? (
        <Panel className="items-center text-center">
          <p className="text-destructive font-medium">Failed to load your stats</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            Try again
          </Button>
        </Panel>
      ) : isLoading ? (
        <div className="space-y-6">
          <MetricHierarchy stats={null} isLoading />
          <div className="grid lg:grid-cols-3 gap-4">
            <Skeleton className="h-[360px] rounded-2xl lg:col-span-2" />
            <Skeleton className="h-[360px] rounded-2xl" />
          </div>
        </div>
      ) : !stats ? (
        <Panel className="items-center text-center py-12">
          <p className="text-lg font-semibold">No tests completed yet</p>
          <p className="text-sm text-text/45 mt-1 max-w-sm">
            Finish a typing test and your stats, trend, and weak spots start filling in here.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Take a test</Link>
          </Button>
        </Panel>
      ) : (
        <>
          {/* Headline numbers first - the reason anyone opens this page. */}
          <MetricHierarchy stats={stats} />

          <RecommendedExerciseCard recommendation={recommendation} />

          <div className="grid lg:grid-cols-3 gap-4">
            <ProfileProgressChart
              series={progressData?.series ?? []}
              isLoading={isLoadingProgress}
              days={30}
              className="lg:col-span-2"
            />
            {isLoadingGoals ? (
              <Skeleton className="h-[360px] rounded-2xl" />
            ) : (
              <GoalTracker
                goals={goals}
                onCreateGoal={(data) => createGoalMutation.mutate(data)}
                onDeleteGoal={(id) => deleteGoalMutation.mutate(id)}
              />
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <WeakSpotsPanel errorAnalysis={errorAnalysis} isLoading={isLoadingErrors} />
            <AchievementsPanel achievements={achievements} isLoading={isLoadingAchievements} />
          </div>

          <ActivityHeatmap year={currentYear} />

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
  );
};
