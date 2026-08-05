import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';
import React from 'react';

export interface PanelStat {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  tone?: 'default' | 'danger';
}

/** Toolbar-height stat, sized to sit in the panel header like the test toolbar. */
export function PanelStatItem({ label, value, accent, tone }: PanelStat) {
  return (
    <div className="flex flex-col items-center min-w-[3.75rem]">
      <span
        className={cn(
          'font-mono text-lg font-semibold tabular-nums tracking-tight leading-none',
          tone === 'danger'
            ? 'text-rose-400'
            : accent
              ? 'text-accent'
              : 'text-text'
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-text/45 mt-1.5 font-medium">
        {label}
      </span>
    </div>
  );
}

/**
 * The play-mode equivalent of the main test panel: same accent slab, same
 * p-8 toolbar strip, same typing surface underneath. Modes supply stats and
 * an optional meter; the surface itself comes from `TypingSurface`.
 */
export function PlayTestPanel({
  stats,
  actions,
  onRestart,
  meter,
  meterTone = 'accent',
  meterActive = true,
  children,
  className,
}: {
  stats?: PanelStat[];
  actions?: React.ReactNode;
  onRestart?: () => void;
  /** 0..1 remaining — draws the shrinking timer rail under the toolbar. */
  meter?: number | null;
  meterTone?: 'accent' | 'danger';
  meterActive?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-accent/30 rounded-lg w-full', className)}>
      <div className="flex items-center justify-between p-8 pb-6 rounded-lg gap-4 w-full">
        <div className="flex items-center gap-6 sm:gap-9 flex-wrap">
          {stats?.map((s) => (
            <PanelStatItem key={s.label} {...s} />
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {onRestart && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onRestart}>
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Restart</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {meter != null && (
        <div className="mx-8 h-1 rounded-full bg-text/10 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-75 ease-linear',
              meterTone === 'danger' ? 'bg-rose-400' : 'bg-accent'
            )}
            style={{
              width: `${Math.round(Math.max(0, Math.min(1, meter)) * 100)}%`,
              opacity: meterActive ? 1 : 0.35,
            }}
          />
        </div>
      )}

      {children}
    </div>
  );
}

/** Centred hint line under the surface — "type to start", rules, etc. */
export function PanelHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'px-8 pb-7 -mt-3 text-center text-sm text-text/45',
        className
      )}
    >
      {children}
    </p>
  );
}

/** Keycap used inside hints. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-text/20 bg-text/8 px-1.5 py-0.5 font-mono text-xs text-text/65">
      {children}
    </kbd>
  );
}
