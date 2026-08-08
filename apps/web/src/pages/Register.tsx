import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'motion/react';
import type React from 'react';
import { useState } from 'react';
import { Github } from '@/assets/github';
import { Google } from '@/assets/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { panelSurface } from '@/components/ui/panel';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { authCardEnter } from '@/lib/motion';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { useAuth } from '../contexts';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const card = authCardEnter(reducedMotion);

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
      initial={card.initial}
      animate={card.animate}
      exit={card.exit}
      transition={card.transition}
      className={cn(panelSurface, 'max-w-md w-full my-auto mx-auto p-8')}
    >
      <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-center mb-8">
        <img src="/tactiletype-256x256.png" alt="tactiletype" height={36} width={36} />
        <span>tactiletype</span>
      </h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg mb-4">
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
            className="w-full px-3 py-2"
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
            className="w-full px-3 py-2"
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
            className="w-full px-3 py-2"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full font-semibold py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6">
        {/* Two rules either side of the label, rather than one rule masked by an
            opaque chip — the card fill is translucent, so a mask would show. */}
        <div className="flex items-center gap-3 text-sm">
          <span className="h-px flex-1 bg-line" />
          <span className="text-muted">Or sign up with</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleOAuthLogin('google')}
            disabled={isOAuthLoading !== null}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-line rounded-md hover:bg-surface-2 transition-colors"
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
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-line rounded-md hover:bg-surface-2 transition-colors"
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
