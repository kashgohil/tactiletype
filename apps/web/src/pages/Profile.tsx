import { Button } from '@/components/ui/button';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useAuth } from '../contexts';
import type { TestResult } from '../services/api';
import { testResultsApi, usersApi } from '../services/api';
import { formatTime } from '../utils/typingEngine';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Query for test results
  const {
    data: testResultsData,
    fetchNextPage,
    hasNextPage,
    isFetching: isFetchingResults,
    isLoading: isLoadingResults,
    isError: isErrorResults,
  } = useInfiniteQuery({
    queryKey: ['userTestResults', user?.id],
    queryFn: ({ pageParam = 0 }: { pageParam?: number }) =>
      testResultsApi.getUserResults({
        limit: pageSize,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: TestResult[], allPages: TestResult[][]) => {
      // If we got a full page, there might be more data
      if (lastPage.length === pageSize) {
        return allPages.length * pageSize;
      }
      return undefined;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for user statistics
  const {
    data: statsData,
    isLoading: isLoadingStats,
    isError: isErrorStats,
  } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => usersApi.getUserStats(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages into a single array
  const testResults = testResultsData?.pages.flat() || [];
  const stats = statsData || null;

  // Combined loading and error states
  const isLoading = isLoadingResults || isLoadingStats;
  const isError = isErrorResults || isErrorStats;
  const isFetching = isFetchingResults;

  // Load more pages if needed when currentPage changes
  React.useEffect(() => {
    const totalPages = Math.ceil(testResults.length / pageSize);
    if (currentPage > totalPages && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [
    currentPage,
    testResults.length,
    hasNextPage,
    isFetching,
    fetchNextPage,
    pageSize,
  ]);

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-8">
      <div className="flex flex-col gap-8 mb-8">
        {/* User Info */}
        <div className="bg-accent/10 rounded-lg space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-text/50">
              Username
            </label>
            <p className="text-lg">{user.username}</p>
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

        {/* Statistics */}
        <div className="lg:col-span-2">
          {isLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading statistics...
              </p>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
              <p className="text-red-800 dark:text-red-200">
                Failed to load test results
              </p>
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                No typing tests completed yet
              </p>
              <p className="text-gray-500 dark:text-gray-500">
                Take your first typing test to see your statistics here!
              </p>
            </div>
          )}

          {!isLoading && !isError && stats && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{stats.bestWpm}</div>
                  <div className="text-sm text-text/50">Best WPM</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{stats.avgWpm}</div>
                  <div className="text-sm text-text/50">Avg WPM</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{stats.avgAccuracy}%</div>
                  <div className="text-sm text-text/50">Avg Accuracy</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{stats.totalTests}</div>
                  <div className="text-sm text-text/50">Tests Taken</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold">
                    {formatTime(stats.totalTime)}
                  </div>
                  <div className="text-sm text-text/50">
                    Total Time Practiced
                  </div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {stats.currentStreak}
                  </div>
                  <div className="text-sm text-text/50">Current Streak</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {stats.longestStreak}
                  </div>
                  <div className="text-sm text-text/50">Longest Streak</div>
                </div>
              </div>

              {/* Recent Test Results */}
              <div className="bg-accent/10 rounded-lg">
                <div className="px-6 py-4">
                  <h3 className="text-lg font-semibold">Recent Test Results</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-accent/20">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                          WPM
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                          Accuracy
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                          Test
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-accent/20">
                      {testResults
                        .slice(
                          (currentPage - 1) * pageSize,
                          currentPage * pageSize
                        )
                        .map((result: TestResult, index: number) =>
                          result.id ? (
                            <tr key={result.id} className="hover:bg-accent/5">
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {new Date(
                                  result.completedAt
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-accent">
                                {result.wpm}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {result.accuracy}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {formatTime(result.timeTaken)}
                              </td>
                              <td className="px-6 py-4 text-sm text-text/50 max-w-xs truncate">
                                {result.testText?.content || 'Custom Text'}
                              </td>
                            </tr>
                          ) : (
                            <tr
                              key={`loading-${index}`}
                              className="animate-pulse"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="h-4 bg-accent/20 rounded w-20"></div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="h-4 bg-accent/20 rounded w-12"></div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="h-4 bg-accent/20 rounded w-16"></div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="h-4 bg-accent/20 rounded w-14"></div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="h-4 bg-accent/20 rounded w-24"></div>
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {testResults.length > 0 && (
                  <div className="px-6 py-4 border-t border-accent/20">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-text/50">
                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                        {Math.min(currentPage * pageSize, testResults.length)}{' '}
                        results
                        {isFetching && (
                          <span className="ml-2">(Loading...)</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1 || isFetching}
                          className="px-3 py-1 text-sm border border-accent/20 rounded-md hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        {/* Show available pages based on loaded data */}
                        {Array.from(
                          { length: Math.ceil(testResults.length / pageSize) },
                          (_, i: number) => i + 1
                        ).map((page: number) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            disabled={isFetching}
                            className={`px-3 py-1 text-sm border rounded-md ${
                              currentPage === page
                                ? 'bg-accent text-white border-accent'
                                : 'border-accent/20 hover:bg-accent/10'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          onClick={() => {
                            const nextPage = currentPage + 1;
                            const maxPage = Math.ceil(
                              testResults.length / pageSize
                            );
                            if (nextPage <= maxPage) {
                              setCurrentPage(nextPage);
                            } else if (hasNextPage) {
                              fetchNextPage();
                            }
                          }}
                          disabled={isFetching}
                          className="px-3 py-1 text-sm border border-accent/20 rounded-md hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isFetching ? 'Loading...' : 'Next'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
