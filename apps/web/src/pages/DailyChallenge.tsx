import { Button } from '@/components/ui/button';
import { challengesApi } from '@/services/challengesApi';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Trophy } from 'lucide-react';
import React from 'react';

export const DailyChallenge: React.FC = () => {
  const { data: challenge, isLoading } = useQuery({
    queryKey: ['dailyChallenge'],
    queryFn: () => challengesApi.getDaily(),
    staleTime: 60 * 60 * 1000,
  });

  const { data: board } = useQuery({
    queryKey: ['dailyLeaderboard'],
    queryFn: () => challengesApi.getDailyLeaderboard(15),
    staleTime: 60 * 1000,
  });

  const start = () => {
    if (!challenge) return;
    sessionStorage.setItem(
      'tactile_practice_drill',
      JSON.stringify({
        content: challenge.content,
        title: challenge.title,
        exerciseKind: 'daily_challenge',
        exercisePackId: `daily-${challenge.date}`,
      })
    );
    window.location.href = '/test?practice=1&type=quotes';
  };

  return (
    <div className="pt-2 pb-10 max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Calendar className="size-7 text-accent" />
          Daily challenge
        </h1>
        <p className="text-text/50">
          Same text for everyone today (UTC). Climb the mini leaderboard.
        </p>
      </header>

      <section className="bg-accent/15 border border-accent/30 rounded-xl p-6 space-y-4">
        {isLoading || !challenge ? (
          <p className="text-sm text-text/40">Loading today&apos;s text…</p>
        ) : (
          <>
            <div className="flex flex-wrap justify-between gap-2">
              <p className="text-sm text-text/50 font-mono">{challenge.date}</p>
              <p className="text-sm text-text/50">
                {challenge.wordCount} words · {challenge.author}
              </p>
            </div>
            <p className="font-mono text-sm leading-relaxed text-text/80">
              {challenge.content}
            </p>
            <Button onClick={start} size="lg">
              Start challenge
            </Button>
          </>
        )}
      </section>

      <section className="bg-accent/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Trophy className="size-5 text-accent" />
          Today&apos;s leaderboard
        </h2>
        {!board?.leaderboard?.length ? (
          <p className="text-sm text-text/50">
            No finishes yet — be the first.
          </p>
        ) : (
          <ol className="space-y-2">
            {board.leaderboard.map((entry, i) => (
              <li
                key={entry.userId}
                className="flex items-center justify-between gap-3 text-sm bg-primary/30 rounded-lg px-3 py-2"
              >
                <span className="font-mono text-text/40 w-6">{i + 1}.</span>
                <span className="flex-1 font-medium truncate">
                  {entry.username}
                </span>
                <span className="font-mono text-accent">
                  {Math.round(entry.wpm)} WPM
                </span>
                <span className="font-mono text-text/50 text-xs">
                  {entry.accuracy.toFixed(1)}%
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};
