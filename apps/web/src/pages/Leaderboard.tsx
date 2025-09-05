import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../services/api';
import { leaderboardApi } from '../services/api';

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<
    'daily' | 'weekly' | 'monthly' | 'all'
  >('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await leaderboardApi.get({ timeframe, limit: 50 });
      setLeaderboard(data);
    } catch (err) {
      setError('Failed to load leaderboard data');
      console.error('Leaderboard error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

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
    <div className="py-8">
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
              onClick={() => setTimeframe(tf)}
            >
              {getTimeframeLabel(tf)}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="mt-4 text-text/50">Loading leaderboard...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <Button
            onClick={loadLeaderboard}
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                    Best WPM
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                    Avg WPM
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                    Avg Accuracy
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-text/50 uppercase tracking-wider">
                    Tests
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent/20">
                {leaderboard.map((entry, index) => (
                  <tr key={entry.userId} className={`hover:bg-accent/10`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg font-bold">
                          {getRankIcon(index + 1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {entry.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-accent">
                        {Math.round(entry.bestWpm)} WPM
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {Math.round(entry.avgWpm)} WPM
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {Math.round(entry.avgAccuracy)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text/50">
                        {entry.testCount}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {!isLoading && !error && leaderboard.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-accent">
              {Math.round(leaderboard[0]?.bestWpm || 0)}
            </div>
            <div className="text-sm text-text/50">
              Highest WPM ({getTimeframeLabel(timeframe)})
            </div>
          </div>
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-accent">
              {Math.round(
                leaderboard.reduce((sum, entry) => sum + entry.avgWpm, 0) /
                  leaderboard.length || 0
              )}
            </div>
            <div className="text-sm text-text/50">Average WPM</div>
          </div>
          <div className="bg-accent/10 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-accent">
              {leaderboard.length}
            </div>
            <div className="text-sm text-text/50">Active Players</div>
          </div>
        </div>
      )}
    </div>
  );
};
