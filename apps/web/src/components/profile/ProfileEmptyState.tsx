import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Link } from '@tanstack/react-router';
import { Keyboard, Sparkles } from 'lucide-react';
import React from 'react';

interface ProfileEmptyStateProps {
  variant?: 'no-tests' | 'login';
}

export const ProfileEmptyState: React.FC<ProfileEmptyStateProps> = ({
  variant = 'no-tests',
}) => {
  if (variant === 'login') {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-text/50 mb-4">Please log in to view your profile.</p>
        <Button asChild>
          <Link to="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Panel className="p-8 md:p-12 text-center">
      <div className="inline-flex items-center justify-center size-14 rounded-full bg-accent/20 mb-5">
        <Sparkles className="size-7 text-accent" />
      </div>
      <h2 className="text-xl md:text-2xl font-semibold mb-2">
        Your progress home is ready
      </h2>
      <p className="text-text/50 max-w-md mx-auto mb-2 leading-relaxed">
        Complete a few typing tests to unlock stats, streaks, and activity
        insights. Three tests is enough to start seeing trends.
      </p>
      <p className="text-sm text-text/40 mb-6">
        Structure is here — fill it with practice.
      </p>
      <Button asChild size="lg">
        <Link to="/">
          <Keyboard className="size-4" />
          Take your first test
        </Link>
      </Button>
    </Panel>
  );
};
