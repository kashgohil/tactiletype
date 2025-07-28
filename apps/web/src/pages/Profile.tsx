import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts';
import type { TestResult } from '../services/api';
import { testResultsApi } from '../services/api';
import { formatTime } from '../utils/typingEngine';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
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
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Profile
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              User Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <p className="text-lg text-gray-900 dark:text-white">
                  {user.username}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <p className="text-lg text-gray-900 dark:text-white">
                  {user.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Member Since
                </label>
                <p className="text-lg text-gray-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.bestWpm}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Best WPM
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.avgWpm}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg WPM
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.avgAccuracy}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Accuracy
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.totalTests}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Tests Taken
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatTime(stats.totalTime)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Time Practiced
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
                  <div
                    className={`text-xl font-bold ${
                      stats.recentImprovement > 0
                        ? 'text-green-600 dark:text-green-400'
                        : stats.recentImprovement < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {stats.recentImprovement > 0 ? '+' : ''}
                    {stats.recentImprovement} WPM
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Recent Improvement
                  </div>
                </div>
              </div>

              {/* Recent Test Results */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Test Results
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          WPM
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Accuracy
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Test
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {testResults.slice(0, 10).map((result) => (
                        <tr
                          key={result.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(result.completedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                            {result.wpm}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {result.accuracy}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatTime(result.timeTaken)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {result.testText?.title || 'Custom Text'}
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
