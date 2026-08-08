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
  type LucideIcon,
  Swords,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import type React from 'react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_OUT, uiTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { beginDailyRun, clearDailyRun } from '@/utils/dailyRun';
import { loadPlayBests, PLAY_MODES, type PlayModeId } from '@/utils/playModes';

const ICONS: Record<PlayModeId, LucideIcon> = {
  'sudden-death': Swords,
  'word-storm': Zap,
  'memory-flash': Brain,
  'ghost-race': Ghost,
  'lesson-path': GraduationCap,
  'weak-storm': Flame,
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
            delay: 0.06 + i * 0.035,
            ease: EASE_OUT,
          },
        };

  return (
    <div className="space-y-8">
      <motion.header
        className="space-y-2.5 max-w-2xl"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={uiTransition(reduced, 0.25)}
      >
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Typing games a timer can&apos;t teach
        </h1>
        <p className="text-text/50 leading-relaxed text-[15px]">
          Six modes, six different rules. Same goal — type faster without falling apart.
        </p>
      </motion.header>

      {/* Mode of the day — same slab as the test panel, so the ranked run
          reads as the main event on this page. */}
      <motion.button
        type="button"
        onClick={playDaily}
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0, transform: 'translateY(8px)' },
              animate: { opacity: 1, transform: 'translateY(0px)' },
              transition: { duration: 0.28, delay: 0.04, ease: EASE_OUT },
            })}
        className={cn(
          'group w-full text-left rounded-lg bg-accent/30 p-6 sm:p-7',
          'flex flex-col sm:flex-row sm:items-center justify-between gap-5',
          'transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'hover:bg-accent/40 active:scale-[0.995]'
        )}
      >
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-lg bg-accent/[0.06] flex items-center justify-center shrink-0">
            <DailyIcon className="size-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-text/55 font-semibold">
              Mode of the day · {daily.date}
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-1 tracking-tight">
              {daily.title.replace(/^Daily mode · /, '')}
            </h2>
            <p className="text-sm text-text/60 mt-1">{daily.tagline}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/45 px-4 py-2.5 text-sm font-semibold shrink-0 group-hover:gap-2.5 transition-[gap] duration-150">
          Play ranked
          <ChevronRight className="size-4 opacity-70" />
        </span>
      </motion.button>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight">All modes</h2>
          <p className="text-sm text-text/40">Bests are saved on this device</p>
        </div>

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
                    'group flex flex-col h-full rounded-2xl p-5 sm:p-6',
                    'border border-accent/15 bg-accent/[0.05]',
                    'hover:bg-accent/10 hover:border-accent/30',
                    'transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                    'active:scale-[0.99]',
                    mode.featured && 'ring-1 ring-accent/15'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <Icon className="size-5 text-accent" />
                      <span className="font-mono text-xs text-text/30 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-text/35 font-medium text-right">
                      {mode.featured ? 'Core · ' : ''}
                      {mode.skill}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold tracking-tight group-hover:text-accent transition-colors duration-150">
                    {mode.title}
                  </h3>
                  <p className="text-sm font-medium text-text/65 mt-0.5">{mode.tagline}</p>
                  <p className="text-sm text-text/40 leading-relaxed mt-2 line-clamp-2">
                    {mode.description}
                  </p>

                  {/* The rule that makes this mode different — authored per
                      mode, previously never shown. */}
                  {mode.howToPlay[1] && (
                    <p className="text-xs font-mono text-text/40 mt-3 leading-relaxed">
                      <span className="text-accent/70">rule ·</span> {mode.howToPlay[1]}
                    </p>
                  )}

                  <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                    {best ? (
                      <p className="text-xs font-mono text-accent/75 truncate">
                        Best · {best.label}
                      </p>
                    ) : (
                      <p className="text-xs text-text/30">No runs yet</p>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-text/45 group-hover:text-accent group-hover:gap-1.5 transition-[color,gap] duration-150 shrink-0">
                      Play
                      <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <motion.section
        className="rounded-2xl border border-accent/15 bg-accent/[0.05] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.25, delay: 0.28, ease: EASE_OUT },
            })}
      >
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Crosshair className="size-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Need targeted drills?</h3>
            <p className="text-sm text-text/45 mt-1 max-w-md leading-relaxed">
              Weak keys, bigrams, and accuracy focus — generated for a skill, not random categories.
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
