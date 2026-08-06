import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_OUT, uiTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { challengesApi } from '@/services/challengesApi';
import { beginDailyRun, loadLocalDailyModeBoard } from '@/utils/dailyRun';
import { getDailyModeForDate } from '@tactile/content';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Gamepad2, Quote, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useMemo } from 'react';

function BoardList({
  entries,
  empty,
}: {
  entries: { key: string; rank: number; name: string; wpm: number; accuracy?: number }[];
  empty: string;
}) {
  if (!entries.length) {
    return <p className="text-sm text-text/45 py-2">{empty}</p>;
  }
  return (
    <ol className="space-y-1.5">
      {entries.map((entry) => (
        <li
          key={entry.key}
          className={cn(
            'flex items-center justify-between gap-3 text-sm rounded-xl px-3 py-2.5',
            entry.rank === 1
              ? 'bg-accent/15 border border-accent/20'
              : 'bg-primary/25 border border-transparent'
          )}
        >
          <span
            className={cn(
              'font-mono text-xs w-6 tabular-nums',
              entry.rank === 1 ? 'text-accent font-semibold' : 'text-text/35'
            )}
          >
            {entry.rank}
          </span>
          <span className="flex-1 font-medium truncate">{entry.name}</span>
          <span className="font-mono text-accent tabular-nums">
            {Math.round(entry.wpm)}
            <span className="text-text/35 text-xs ml-1">WPM</span>
          </span>
          {entry.accuracy != null && (
            <span className="font-mono text-text/40 text-xs tabular-nums w-12 text-right">
              {entry.accuracy.toFixed(0)}%
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export const DailyChallenge: React.FC = () => {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const fallbackMode = useMemo(() => getDailyModeForDate(), []);

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['dailyChallenge'],
    queryFn: () => challengesApi.getDaily(),
    staleTime: 60 * 60 * 1000,
  });

  const { data: board } = useQuery({
    queryKey: ['dailyLeaderboard'],
    queryFn: () => challengesApi.getDailyLeaderboard(12),
    staleTime: 60 * 1000,
  });

  const { data: dailyMode } = useQuery({
    queryKey: ['dailyMode'],
    queryFn: () => challengesApi.getDailyMode(),
    staleTime: 60 * 60 * 1000,
    placeholderData: fallbackMode,
  });

  const mode = dailyMode ?? fallbackMode;

  const { data: modeBoard } = useQuery({
    queryKey: ['dailyModeLeaderboard', mode.date],
    queryFn: () => challengesApi.getDailyModeLeaderboard(12),
    staleTime: 60 * 1000,
  });

  const localModeBoard = useMemo(
    () => loadLocalDailyModeBoard(mode.date),
    [mode.date]
  );

  const startText = () => {
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
    navigate({ to: '/test', search: { practice: '1', type: 'quotes' } as never });
  };

  const startMode = () => {
    beginDailyRun(mode);
    navigate({ to: '/play/$mode', params: { mode: mode.modeId } });
  };

  const quoteEntries =
    board?.leaderboard.map((e, i) => ({
      key: e.userId,
      rank: i + 1,
      name: e.username,
      wpm: e.wpm,
      accuracy: e.accuracy,
    })) ?? [];

  const modeEntries = modeBoard?.leaderboard?.length
    ? modeBoard.leaderboard.map((e, i) => ({
        key: e.userId,
        rank: i + 1,
        name: e.username,
        wpm: e.wpm,
        accuracy: e.accuracy,
      }))
    : localModeBoard.map((e, i) => ({
        key: `${e.at}-${i}`,
        rank: i + 1,
        name: 'You (this device)',
        wpm: e.wpm,
        accuracy: e.accuracy,
      }));

  const enter = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, transform: 'translateY(8px)' },
          animate: { opacity: 1, transform: 'translateY(0px)' },
          transition: { duration: 0.26, delay, ease: EASE_OUT },
        };

  return (
    <div className="space-y-8">
      <motion.header
        className="space-y-2.5"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={uiTransition(reduced, 0.22)}
      >
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Two challenges. One day.
        </h1>
        <p className="text-text/50 max-w-2xl leading-relaxed text-[15px]">
          A shared quote race and a rotating play mode — different rules so
          you&apos;re not just replaying the same test.
        </p>
      </motion.header>

      <div className="grid md:grid-cols-2 gap-3">
        <motion.section
          {...enter(0.04)}
          className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.12] to-transparent p-5 sm:p-6 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Quote className="size-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold tracking-tight">Quote challenge</h2>
              <p className="text-[11px] text-text/40 font-mono">Same text for everyone</p>
            </div>
          </div>
          {isLoading || !challenge ? (
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-36 mt-2" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-2 text-[11px] text-text/40 font-mono">
                <span>{challenge.date}</span>
                <span>
                  {challenge.wordCount} words · {challenge.author}
                </span>
              </div>
              <p className="font-mono text-sm leading-relaxed text-text/75 flex-1 line-clamp-5">
                {challenge.content}
              </p>
              <Button onClick={startText} size="lg" className="w-full sm:w-auto self-start">
                Start quote race
              </Button>
            </>
          )}
        </motion.section>

        <motion.section
          {...enter(0.08)}
          className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.12] to-transparent p-5 sm:p-6 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Gamepad2 className="size-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold tracking-tight">Mode of the day</h2>
              <p className="text-[11px] text-text/40 font-mono">{mode.date}</p>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold tracking-tight">
              {mode.title.replace(/^Daily mode · /, '')}
            </h3>
            <p className="text-sm font-medium text-text/65">{mode.tagline}</p>
            <p className="text-sm text-text/45 leading-relaxed">{mode.description}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {mode.params.ghostPace != null && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-text/[0.06] text-text/55 border border-line">
                  Ghost {mode.params.ghostPace} WPM
                </span>
              )}
              {mode.params.lives === 1 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25">
                  Hardcore · 1 life
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                Ranked
              </span>
            </div>
          </div>
          <Button onClick={startMode} size="lg" className="w-full sm:w-auto self-start">
            Play today&apos;s mode
          </Button>
        </motion.section>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <motion.section {...enter(0.12)} className="rounded-2xl border border-accent/12 bg-accent/[0.04] p-5 sm:p-6">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4 tracking-tight">
            <Trophy className="size-4 text-accent" />
            Quote board
          </h2>
          <BoardList
            entries={quoteEntries}
            empty="No finishes yet — be the first."
          />
        </motion.section>

        <motion.section {...enter(0.16)} className="rounded-2xl border border-accent/12 bg-accent/[0.04] p-5 sm:p-6">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-1 tracking-tight">
            <Trophy className="size-4 text-accent" />
            Mode board
          </h2>
          <p className="text-[11px] text-text/35 font-mono mb-4">
            {mode.title.replace(/^Daily mode · /, '')}
          </p>
          <BoardList
            entries={modeEntries}
            empty="No mode finishes yet. Log in to rank globally."
          />
        </motion.section>
      </div>

      <p className="text-sm text-text/38">
        Free practice on{' '}
        <Link
          to="/play"
          className="text-accent hover:underline underline-offset-2 transition-colors"
        >
          Play modes
        </Link>
        .
      </p>
    </div>
  );
};
