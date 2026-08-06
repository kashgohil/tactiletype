import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { leaderboardApi } from '../services/api';

export const Leaderboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<
    'daily' | 'weekly' | 'monthly' | 'all'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leaderboard', timeframe, currentPage],
    queryFn: () =>
      leaderboardApi.getPage({
        timeframe,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      }),
  });

  const leaderboard = leaderboardData?.leaderboard || [];
  const totalCount = leaderboardData?.totalCount || 0;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case 'daily':
        return 'Today';
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      default:
        return 'All Time';
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Leaderboard
      </h1>

      {/* Timeframe Selector */}
      <div className="mb-8">
        <div className="flex justify-center space-x-2">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'outline'}
              onClick={() => {
                setTimeframe(tf);
                setCurrentPage(1);
              }}
            >
              {getTimeframeLabel(tf)}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-accent/10 rounded-lg overflow-hidden">
          <div>
            <Table>
              <TableHeader className="border-b border-accent/12">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 sm:px-6">Rank</TableHead>
                  <TableHead className="px-5 sm:px-6">Player</TableHead>
                  <TableHead className="px-5 sm:px-6">Best WPM</TableHead>
                  <TableHead className="px-5 sm:px-6">Avg WPM</TableHead>
                  <TableHead className="px-5 sm:px-6">Avg Accuracy</TableHead>
                  <TableHead className="px-5 sm:px-6">Tests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <Skeleton className="h-6 w-8" />
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200">
            {error instanceof Error
              ? error.message
              : 'Failed to load leaderboard data'}
          </p>
          <Button
            onClick={() => refetch()}
            variant="destructive"
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && leaderboard.length === 0 && (
        <div className="bg-accent/10 rounded-lg p-12 text-center">
          <p className="text-xl text-text/50 mb-4">
            No results found for {getTimeframeLabel(timeframe).toLowerCase()}
          </p>
          <p className="text-text/50">
            Be the first to complete a typing test and claim the top spot!
          </p>
        </div>
      )}

      {/* Leaderboard Table */}
      {!isLoading && !error && leaderboard.length > 0 && (
        <div className="bg-accent/10 rounded-lg overflow-hidden">
          <div>
            <Table>
              <TableHeader className="border-b border-accent/12">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 sm:px-6">Rank</TableHead>
                  <TableHead className="px-5 sm:px-6">Player</TableHead>
                  <TableHead className="px-5 sm:px-6">Best WPM</TableHead>
                  <TableHead className="px-5 sm:px-6">Avg WPM</TableHead>
                  <TableHead className="px-5 sm:px-6">Avg Accuracy</TableHead>
                  <TableHead className="px-5 sm:px-6">Tests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, index) => (
                  <TableRow key={entry.userId}>
                    <TableCell className="px-5 sm:px-6 py-3 text-lg font-bold">
                      {getRankIcon(index + 1)}
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <span className="font-medium">{entry.username}</span>
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <span className="font-bold text-accent tabular-nums">
                        {entry.bestWpm} WPM
                      </span>
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <span className="tabular-nums">{entry.avgWpm} WPM</span>
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <span className="tabular-nums">{entry.avgAccuracy}%</span>
                    </TableCell>
                    <TableCell className="px-5 sm:px-6 py-3">
                      <span className="text-text/50 tabular-nums">
                        {entry.testCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {!isLoading && !error && leaderboard.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-accent">
              {leaderboard[0]?.bestWpm || 0}
            </div>
            <div className="text-sm text-text/50">
              Highest WPM ({getTimeframeLabel(timeframe)})
            </div>
          </div>
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-accent">
              {(
                leaderboard.reduce((sum, entry) => sum + entry.avgWpm, 0) /
                  leaderboard.length || 0
              ).toFixed(2)}
            </div>
            <div className="text-sm text-text/50">Average WPM</div>
          </div>
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-accent">{totalCount}</div>
            <div className="text-sm text-text/50">Active Players</div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalCount > pageSize && (
        <div className="mt-8 px-6 py-4 border-t border-accent/20">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text/50">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{' '}
              players
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                size="icon"
                variant="ghost"
                disabled={currentPage === 1}
              >
                <ChevronLeft />
              </Button>

              {/* Show all available pages based on total count */}
              {Array.from(
                { length: Math.ceil(totalCount / pageSize) },
                (_, i: number) => i + 1
              ).map((page: number) => (
                <Button
                  key={page}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  variant={currentPage === page ? 'default' : 'secondary'}
                >
                  {page}
                </Button>
              ))}

              <Button
                onClick={() => {
                  const nextPage = currentPage + 1;
                  const maxPage = Math.ceil(totalCount / pageSize);
                  if (nextPage <= maxPage) {
                    setCurrentPage(nextPage);
                  }
                }}
                size="icon"
                variant="ghost"
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Stats Summary */}
      {isLoading && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
};
