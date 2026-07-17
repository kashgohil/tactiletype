import {
  ActivitySection,
  GoalsPlaceholder,
  MetricHierarchy,
  ProfileEmptyState,
  ProfileHero,
  ResultCards,
} from '@/components/profile';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useAuth } from '../contexts';
import { testResultsApi, usersApi } from '../services/api';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    data: testResultsData,
    isFetching: isFetchingResults,
    isLoading: isLoadingResults,
    isError: isErrorResults,
  } = useQuery({
    queryKey: ['userTestResults', user?.id, currentPage],
    queryFn: () => testResultsApi.getUserResultsPage(currentPage, pageSize),
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
  const hasNoTests = !isLoading && !isError && (!stats || stats.totalTests === 0);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${user?.username} on TactileType`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // user cancelled share
    }
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
              <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-1">
                  <GoalsPlaceholder
                    bestWpm={stats ? Number(stats.bestWpm) : 0}
                    avgAccuracy={stats ? Number(stats.avgAccuracy) : 0}
                    currentStreak={stats?.currentStreak ?? 0}
                  />
                </div>
                <div className="lg:col-span-2 space-y-2">
                  <h2 className="text-lg font-semibold px-1">Progress</h2>
                  <p className="text-sm text-text/50 px-1 mb-3">
                    30-day trends unlock after a few more tests. For now, your
                    best numbers live above.
                  </p>
                  <div className="bg-accent/10 rounded-xl p-6 min-h-[140px] flex items-center justify-center">
                    <p className="text-sm text-text/40 text-center max-w-sm">
                      Charts arrive with richer result metadata. Keep practicing
                      — history is already saving.
                    </p>
                  </div>
                </div>
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
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};
