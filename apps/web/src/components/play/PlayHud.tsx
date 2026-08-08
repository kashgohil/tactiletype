import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_OUT, uiTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { isActiveDailyForMode } from '@/utils/dailyRun';
import type { PlayModeId } from '@/utils/playModes';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';
import React, { useEffect } from 'react';

export function PlayStat({
  label,
  value,
  accent,
  large,
  dim,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  large?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="flex flex-col items-center min-w-[4.25rem]">
      <span
        className={cn(
          'font-mono font-semibold tabular-nums tracking-tight',
          large ? 'text-3xl sm:text-4xl' : 'text-xl',
          accent ? 'text-accent' : dim ? 'text-text/50' : 'text-text'
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-text/40 mt-1 font-medium">
        {label}
      </span>
    </div>
  );
}

export function PlayShell({
  title,
  subtitle,
  children,
  onExit,
  dailyBadge,
  modeId,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onExit?: () => void;
  dailyBadge?: boolean;
  /** When set, auto-shows Daily ranked badge if this mode is the active daily run */
  modeId?: PlayModeId | string;
}) {
  const reduced = usePrefersReducedMotion();
  const isDaily =
    dailyBadge === true ||
    (modeId != null && isActiveDailyForMode(modeId));

  return (
    <motion.div
      className="space-y-6"
      initial={reduced ? false : { opacity: 0, transform: 'translateY(6px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={uiTransition(reduced, 0.22)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            {isDaily && (
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold px-2.5 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">
                Daily ranked
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-text/50 mt-1 max-w-lg leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm text-text/45 hover:text-text',
              'transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
              'rounded-lg px-2 py-1.5 hover:bg-accent/10 active:scale-[0.97]'
            )}
          >
            <ArrowLeft className="size-3.5 opacity-70" />
            All modes
          </button>
        )}
      </header>
      {children}
    </motion.div>
  );
}

export function PlayResultCard({
  title,
  stats,
  isNewBest,
  onRetry,
  onExit,
  hint,
}: {
  title: string;
  stats: { label: string; value: string | number }[];
  isNewBest?: boolean;
  onRetry: () => void;
  onExit: () => void;
  hint?: string;
}) {
  const reduced = usePrefersReducedMotion();

  // Enter / r to retry. Armed on a delay: the keystroke that ends a run is
  // still bubbling to `window` when this card mounts, so a run submitted with
  // enter — or the stray keys a player types after the run is already over —
  // would otherwise retry instantly and the result would never be seen.
  useEffect(() => {
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, 400);
    const onKey = (e: KeyboardEvent) => {
      if (!armed) return;
      if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        e.preventDefault();
        onRetry();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(arm);
      window.removeEventListener('keydown', onKey);
    };
  }, [onRetry]);

  return (
    <motion.div
      className="rounded-lg bg-accent/30 p-8 sm:p-10 space-y-7 text-center"
      initial={
        reduced ? false : { opacity: 0, transform: 'translateY(10px) scale(0.98)' }
      }
      animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
      transition={{ duration: reduced ? 0 : 0.28, ease: EASE_OUT }}
    >
      <div>
        <AnimatePresence mode="wait">
          {isNewBest ? (
            <motion.p
              key="pb"
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] font-semibold text-accent mb-3"
            >
              <Sparkles className="size-3.5" />
              New personal best
            </motion.p>
          ) : (
            <p
              key="done"
              className="text-[10px] uppercase tracking-[0.2em] text-text/40 mb-3 font-medium"
            >
              Run complete
            </p>
          )}
        </AnimatePresence>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        {hint && (
          <p className="mt-2 text-sm text-text/45 max-w-sm mx-auto leading-relaxed">
            {hint}
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-6 sm:gap-10 py-4 border-y border-text/10">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.22,
              delay: reduced ? 0 : 0.04 + i * 0.04,
              ease: EASE_OUT,
            }}
          >
            <PlayStat label={s.label} value={s.value} large accent={i === 0} />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={onRetry} className="gap-2 min-w-[8.5rem]">
          <RotateCcw className="size-4 opacity-80" />
          Play again
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onExit}
          className="min-w-[8.5rem]"
        >
          Other modes
        </Button>
      </div>
      <p className="text-[11px] font-mono text-text/45">
        press{' '}
        <kbd className="rounded-md border border-line bg-accent/10 px-1.5 py-0.5 text-text/65">
          enter
        </kbd>{' '}
        to retry
      </p>
    </motion.div>
  );
}
