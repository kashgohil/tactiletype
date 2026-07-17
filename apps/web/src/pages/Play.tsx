import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_OUT, uiTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { beginDailyRun, clearDailyRun } from '@/utils/dailyRun';
import { loadPlayBests, PLAY_MODES, type PlayModeId } from '@/utils/playModes';
import { getDailyModeForDate } from '@tactile/content';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Brain,
  Calendar,
  ChevronRight,
  Crosshair,
  Flame,
  Ghost,
  GraduationCap,
  Swords,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useMemo } from 'react';

const ICONS: Record<PlayModeId, LucideIcon> = {
  'sudden-death': Swords,
  'word-storm': Zap,
  'memory-flash': Brain,
  'ghost-race': Ghost,
  'lesson-path': GraduationCap,
  'weak-storm': Flame,
};

const ACCENT_RING: Record<string, string> = {
  rose: 'hover:border-rose-400/35 hover:bg-rose-500/[0.06]',
  amber: 'hover:border-amber-400/35 hover:bg-amber-500/[0.06]',
  violet: 'hover:border-violet-400/35 hover:bg-violet-500/[0.06]',
  sky: 'hover:border-sky-400/35 hover:bg-sky-500/[0.06]',
  emerald: 'hover:border-emerald-400/35 hover:bg-emerald-500/[0.06]',
};

const ACCENT_ICON: Record<string, string> = {
  rose: 'text-rose-400 bg-rose-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  violet: 'text-violet-400 bg-violet-500/10',
  sky: 'text-sky-400 bg-sky-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
};

export const Play: React.FC = () => {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const bests = useMemo(() => loadPlayBests(), []);
  const daily = useMemo(() => getDailyModeForDate(), []);
  const DailyIcon = ICONS[daily.modeId as PlayModeId] ?? Calendar;

  const playDaily = () => {
    beginDailyRun(daily);
    navigate({ to: '/play/$mode', params: { mode: daily.modeId } });
  };

  const cardEnter = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, transform: 'translateY(8px)' },
          animate: { opacity: 1, transform: 'translateY(0px)' },
          transition: {
            duration: 0.28,
            delay: 0.04 + i * 0.035,
            ease: EASE_OUT,
          },
        };

  return (
    <div className="pt-2 pb-14 max-w-5xl mx-auto space-y-9">
      <motion.header
        className="space-y-3 max-w-2xl"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={uiTransition(reduced, 0.25)}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold">
          Play modes
        </p>
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Train speed in ways a timer can&apos;t
        </h1>
        <p className="text-text/50 leading-relaxed text-[15px]">
          Different rules. Different pressure. Same goal — type faster without
          falling apart.
        </p>
      </motion.header>

      {/* Mode of the day */}
      <motion.button
        type="button"
        onClick={playDaily}
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0, transform: 'translateY(8px)' },
              animate: { opacity: 1, transform: 'translateY(0px)' },
              transition: { duration: 0.28, delay: 0.05, ease: EASE_OUT },
            })}
        className={cn(
          'group w-full text-left rounded-2xl border border-indigo-400/25',
          'bg-gradient-to-r from-indigo-500/[0.12] via-accent/[0.08] to-transparent',
          'p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4',
          'transition-[border-color,transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'hover:border-indigo-400/45 active:scale-[0.995]'
        )}
      >
        <div className="flex items-start gap-3.5">
          <div className="size-11 rounded-xl bg-indigo-400/15 flex items-center justify-center shrink-0 text-indigo-300">
            <DailyIcon className="size-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-300/85 font-semibold">
              Mode of the day · {daily.date}
            </p>
            <h2 className="text-lg sm:text-xl font-semibold mt-0.5 tracking-tight">
              {daily.title.replace(/^Daily mode · /, '')}
            </h2>
            <p className="text-sm text-text/50 mt-1">{daily.tagline}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent shrink-0 sm:pr-1 group-hover:gap-1.5 transition-[gap] duration-150">
          Play ranked
          <ChevronRight className="size-4 opacity-70" />
        </span>
      </motion.button>

      <div className="grid sm:grid-cols-2 gap-3.5">
        {PLAY_MODES.map((mode, i) => {
          const Icon = ICONS[mode.id];
          const best = bests[mode.id];
          return (
            <motion.div key={mode.id} {...cardEnter(i)}>
              <Link
                to="/play/$mode"
                params={{ mode: mode.id }}
                onClick={() => clearDailyRun()}
                className={cn(
                  'group rounded-2xl border border-accent/12 bg-accent/[0.04] p-5 sm:p-6',
                  'transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                  'block relative h-full active:scale-[0.99]',
                  mode.featured && 'ring-1 ring-accent/15',
                  ACCENT_RING[mode.accent] ?? 'hover:border-accent/30'
                )}
              >
                {mode.featured && (
                  <span className="absolute top-3.5 right-3.5 text-[9px] uppercase tracking-[0.16em] text-accent/65 font-semibold">
                    Core
                  </span>
                )}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className={cn(
                      'size-10 rounded-xl flex items-center justify-center',
                      ACCENT_ICON[mode.accent] ?? 'text-accent bg-accent/10'
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-text/35 font-medium pr-7 pt-1">
                    {mode.skill}
                  </span>
                </div>
                <h2 className="text-lg font-semibold mb-1 tracking-tight group-hover:text-accent transition-colors duration-150">
                  {mode.title}
                </h2>
                <p className="text-sm font-medium text-text/65 mb-1.5">
                  {mode.tagline}
                </p>
                <p className="text-sm text-text/40 leading-relaxed mb-4 line-clamp-3">
                  {mode.description}
                </p>
                {best ? (
                  <p className="text-xs font-mono text-accent/75">
                    Best · {best.label}
                  </p>
                ) : (
                  <p className="text-xs text-text/28">No runs yet</p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.section
        className="rounded-2xl border border-accent/12 bg-accent/[0.04] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.25, delay: 0.2, ease: EASE_OUT },
            })}
      >
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Crosshair className="size-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Need targeted drills?</h3>
            <p className="text-sm text-text/45 mt-1 max-w-md leading-relaxed">
              Weak keys, bigrams, and accuracy focus — generated for a skill, not
              random categories.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/practice">Open practice</Link>
        </Button>
      </motion.section>
    </div>
  );
};
