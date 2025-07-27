import React from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../contexts';

export const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Tactile
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Improve your typing speed and accuracy with our advanced typing test platform
        </p>
        
        <div className="flex justify-center gap-4">
          <Link
            to="/test"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Start Typing Test
          </Link>
          
          <Link
            to="/leaderboard"
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            View Leaderboard
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Real-time Testing
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Get instant feedback on your typing speed and accuracy with our advanced metrics
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Multiplayer Races
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Compete with other typists in real-time multiplayer typing races
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Detailed Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Track your progress with comprehensive statistics and performance insights
          </p>
        </div>
      </div>

      {!user && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
            Ready to get started?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create an account to track your progress, compete in multiplayer races, and climb the leaderboards!
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};