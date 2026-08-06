import { cn } from '@/lib/utils';
import React from 'react';

/**
 * The single surface recipe for dashboard-style content.
 *
 * Rule: a panel never contains another panel. Anything that needs separating
 * inside one uses spacing, a divider, or type weight — not a second fill.
 */
export const panelSurface = 'rounded-2xl border border-accent/15 bg-accent/[0.05]';

interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Right side of the header row — toggles, counts, links. */
  action?: React.ReactNode;
  /** `accent` lifts a panel out of the stack (used for the "next step" card). */
  tone?: 'default' | 'accent';
  bodyClassName?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  description,
  icon,
  action,
  tone = 'default',
  className,
  bodyClassName,
  children,
  ...rest
}) => {
  const hasHeader = Boolean(title || description || action);

  return (
    <section
      className={cn(
        panelSurface,
        tone === 'accent' && 'border-accent/30 bg-accent/[0.12]',
        'p-5 sm:p-6 flex flex-col',
        className
      )}
      {...rest}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                {icon}
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-text/45 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 flex items-center gap-2">{action}</div>
          )}
        </div>
      )}
      <div className={cn('flex-1 min-w-0', bodyClassName)}>{children}</div>
    </section>
  );
};
