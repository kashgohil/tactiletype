import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts';
import type { TestResult } from '../services/api';
import { testResultsApi } from '../services/api';
import { formatTime } from '../utils/typingEngine';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTestResults = React.useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const results = await testResultsApi.getUserResults({ limit: 50 });
      setTestResults(results);
    } catch (err) {
      setError('Failed to load test results');
      console.error('Profile error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTestResults();
  }, [loadTestResults]);

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to view your profile.
        </p>
      </div>
    );
  }

  // Calculate statistics
  const stats =
    testResults.length > 0
      ? {
          totalTests: testResults.length,
          bestWpm: Math.max(...testResults.map((r) => r.wpm)),
          avgWpm: Math.round(
            testResults.reduce((sum, r) => sum + r.wpm, 0) / testResults.length
          ),
          avgAccuracy: Math.round(
            testResults.reduce((sum, r) => sum + r.accuracy, 0) /
              testResults.length
          ),
          totalTime: testResults.reduce((sum, r) => sum + r.timeTaken, 0),
          recentImprovement:
            testResults.length >= 5
              ? Math.round(
                  testResults.slice(0, 5).reduce((sum, r) => sum + r.wpm, 0) /
                    5 -
                    testResults.slice(-5).reduce((sum, r) => sum + r.wpm, 0) / 5
                )
              : 0,
        }
      : null;

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

          {error && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={loadTestResults}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && !stats && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                No typing tests completed yet
              </p>
              <p className="text-gray-500 dark:text-gray-500">
                Take your first typing test to see your statistics here!
              </p>
            </div>
          )}

          {!isLoading && !error && stats && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
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
                      {testResults.slice(0, 10).map((result) => (
                        <tr key={result.id} className="hover:bg-accent/5">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Date(result.completedAt).toLocaleDateString()}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
