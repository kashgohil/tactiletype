import { useAuth } from '@/contexts';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

export const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/sso/callback' });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { token, isNew } = search as { token?: string; isNew?: string };

        if (!token) {
          throw new Error('No authentication token received');
        }

        // Handle OAuth callback through AuthContext
        await handleOAuthCallback(token);

        // Redirect based on whether it's a new user or not
        if (isNew === 'true') {
          navigate({ to: '/profile' }); // New users should complete their profile
        } else {
          navigate({ to: '/' }); // Existing users go to home
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [search, navigate, handleOAuthCallback]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: '-30%' }}
        animate={{ opacity: 1, y: '-40%' }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="max-w-md w-full my-auto mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8"
      >
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-center mb-8">
          <img
            src="/tactiletype-256x256.png"
            alt="tactiletype"
            height={36}
            width={36}
          />
          <span>tactiletype</span>
        </h1>

        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="font-semibold mb-2">Authentication Error</h2>
          <p>{error}</p>
        </div>

        <button
          onClick={() => navigate({ to: '/login' })}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
          Back to Login
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '-30%' }}
      animate={{ opacity: 1, y: '-40%' }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="max-w-md w-full my-auto mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8"
    >
      <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-center mb-8">
        <img
          src="/tactiletype-256x256.png"
          alt="tactiletype"
          height={36}
          width={36}
        />
        <span>tactiletype</span>
      </h1>

      <div className="text-center">
        <div className="mb-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Completing Sign In</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we finish setting up your account...
        </p>
      </div>
    </motion.div>
  );
};
