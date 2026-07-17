import { Github } from '@/assets/github';
import { Google } from '@/assets/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { fadeEnter } from '@/lib/motion';
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
  const reducedMotion = usePrefersReducedMotion();
  const fade = fadeEnter(reducedMotion);

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
      initial={fade.initial}
      animate={fade.animate}
      exit={fade.exit}
      transition={fade.transition}
      className="max-w-md w-full my-auto mx-auto bg-surface border border-line rounded-2xl shadow-sm p-8"
    >
      <div className="flex flex-col items-center gap-2 mb-8">
        <img
          src="/tactiletype-256x256.png"
          alt="tactiletype"
          height={40}
          width={40}
        />
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-text/50">
          Track progress, unlock insights, climb the board.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="email"
          id="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11"
        />
        <Input
          type="text"
          id="username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="h-11"
        />
        <Input
          type="password"
          id="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="h-11"
        />
        <Button
          type="submit"
          disabled={isLoading}
          size="lg"
          className="w-full font-semibold"
        >
          {isLoading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-line" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="px-3 bg-surface text-text/40">Or sign up with</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleOAuthLogin('google')}
            disabled={isOAuthLoading !== null}
            variant="outline"
            className="w-full gap-2"
          >
            {isOAuthLoading === 'google' ? (
              <div className="w-4 h-4 border-2 border-line border-t-accent rounded-full animate-spin" />
            ) : (
              <Google />
            )}
            Google
          </Button>

          <Button
            onClick={() => handleOAuthLogin('github')}
            disabled={isOAuthLoading !== null}
            variant="outline"
            className="w-full gap-2"
          >
            {isOAuthLoading === 'github' ? (
              <div className="w-4 h-4 border-2 border-line border-t-accent rounded-full animate-spin" />
            ) : (
              <Github />
            )}
            GitHub
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-text/60">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline font-medium">
          Log in
        </Link>
      </div>
    </motion.div>
  );
};
