import { Github } from '@/assets/github';
import { Google } from '@/assets/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { useAuth } from '../contexts';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(email, username, password);
      navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setError('');
    setIsOAuthLoading(provider);

    try {
      const response = await api.get(`/api/auth/sso/${provider}`);

      const data = await response.data;
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth login failed');
      setIsOAuthLoading(null);
    }
  };

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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <Input
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <Input
            type="text"
            id="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <Input
            type="password"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full  font-semibold py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Or sign up with
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleOAuthLogin('google')}
            disabled={isOAuthLoading !== null}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {isOAuthLoading === 'google' ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <Google />
            )}
            Google
          </Button>

          <Button
            onClick={() => handleOAuthLogin('github')}
            disabled={isOAuthLoading !== null}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {isOAuthLoading === 'github' ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Github />
            )}
            GitHub
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </motion.div>
  );
};
