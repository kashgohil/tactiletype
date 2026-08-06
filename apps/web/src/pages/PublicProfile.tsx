import { MetricHierarchy } from '@/components/profile';
import { Button } from '@/components/ui/button';
import { ShareResultCard } from '@/components/profile/ShareResultCard';
import type { UserStats } from '@/services/api';
import api from '@/services/api';
import { formatTime } from '@/utils/typingEngine';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Globe, Keyboard } from 'lucide-react';
import React, { useState } from 'react';

export const PublicProfile: React.FC = () => {
  const { username } = useParams({ strict: false }) as { username: string };
  const [shareOpen, setShareOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['publicProfile', username],
    queryFn: async () => {
      const res = await api.get(`/api/users/u/${encodeURIComponent(username)}`);
      return res.data as {
        user: {
          id: string;
          username: string;
          avatarUrl?: string;
          createdAt: string;
          profile?: {
            displayName?: string;
            bio?: string;
            country?: string;
            keyboard?: string;
          } | null;
        };
        stats: UserStats;
        recentResults: Array<{
          id: string;
          wpm: number;
          accuracy: number;
          timeTaken: number;
          title: string;
          mode?: string;
          testType?: string;
          completedAt: string;
        }>;
      };
    },
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="text-center py-16 text-text/50">Loading profile…</div>
    );
  }

  if (isError || !data) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-text/60">
          {status === 403
            ? 'This profile is private.'
            : status === 404
              ? 'User not found.'
              : 'Failed to load profile.'}
        </p>
        <Button asChild variant="outline">
          <a href="/">Home</a>
        </Button>
      </div>
    );
  }

  const { user, stats, recentResults } = data;
  const displayName = user.profile?.displayName || user.username;

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="size-20 rounded-full bg-accent/30 flex items-center justify-center text-2xl font-bold text-accent">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-text/50">@{user.username}</p>
            {user.profile?.bio && (
              <p className="text-sm text-text/80 leading-relaxed">
                {user.profile.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-text/50">
              {user.profile?.country && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3.5" />
                  {user.profile.country}
                </span>
              )}
              {user.profile?.keyboard && (
                <span className="inline-flex items-center gap-1">
                  <Keyboard className="size-3.5" />
                  {user.profile.keyboard}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
          >
            Share card
          </Button>
        </div>
      </section>

      <MetricHierarchy stats={stats} />

      {recentResults?.length > 0 && (
        <section className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-5">
          <h2 className="text-lg font-semibold mb-3">Recent results</h2>
          <ul className="space-y-2">
            {recentResults.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm bg-accent/10 rounded-lg px-3 py-2"
              >
                <span className="truncate text-text/70">{r.title}</span>
                <span className="font-mono text-accent">
                  {Math.round(r.wpm)} WPM
                </span>
                <span className="font-mono text-text/50">
                  {r.accuracy.toFixed(1)}%
                </span>
                <span className="text-text/40">{formatTime(r.timeTaken)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shareOpen && (
        <ShareResultCard
          username={user.username}
          displayName={displayName}
          bestWpm={stats.bestWpm}
          avgAccuracy={stats.avgAccuracy}
          totalTests={stats.totalTests}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
};
