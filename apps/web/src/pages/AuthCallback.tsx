import { useNavigate, useSearch } from '@tanstack/react-router';
import { motion } from 'motion/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { panelSurface } from '@/components/ui/panel';
import { useAuth } from '@/contexts';
import { cn } from '@/lib/utils';

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

        // Check if it's a state parameter error and provide helpful message
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        if (errorMessage.includes('state parameter') || errorMessage.includes('Invalid state')) {
          setError('Authentication session expired. Please try logging in again.');
        } else {
          setError(errorMessage);
        }
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
        className={cn(panelSurface, 'max-w-md w-full my-auto mx-auto p-8')}
      >
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-center mb-8">
          <img src="/tactiletype-256x256.png" alt="tactiletype" height={36} width={36} />
          <span>tactiletype</span>
        </h1>

        <div className="bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg mb-4">
          <h2 className="font-semibold mb-1">Authentication error</h2>
          <p className="text-sm">{error}</p>
        </div>

        <Button
          onClick={() => navigate({ to: '/login' })}
          className="w-full font-semibold py-2 px-4"
        >
          Back to login
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '-30%' }}
      animate={{ opacity: 1, y: '-40%' }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(panelSurface, 'max-w-md w-full my-auto mx-auto p-8')}
    >
      <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-center mb-8">
        <img src="/tactiletype-256x256.png" alt="tactiletype" height={36} width={36} />
        <span>tactiletype</span>
      </h1>

      <div className="text-center">
        <div className="mb-4">
          <div className="w-8 h-8 border-2 border-line border-t-accent rounded-full animate-spin mx-auto" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Completing sign in</h2>
        <p className="text-text/50">Please wait while we finish setting up your account...</p>
      </div>
    </motion.div>
  );
};
