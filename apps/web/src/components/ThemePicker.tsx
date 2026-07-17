import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_OUT } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { LayoutGroup, motion } from 'motion/react';
import React, { useState } from 'react';
import { themes, type Theme } from '../contexts/themes';
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const STAGGER = 0.03;

/** Compact dual-tone orb that reads the theme at a glance. */
function ThemeOrb({
  theme,
  size = 'md',
  className,
}: {
  theme: Theme;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dim =
    size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-9' : 'size-7';

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-sm',
        dim,
        className,
      )}
      style={{ backgroundColor: theme.primaryColor }}
      aria-hidden
    >
      {/* Accent crescent */}
      <span
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from 210deg, ${theme.accentColor} 0 55%, transparent 55% 100%)`,
        }}
      />
      {/* Soft text-color core */}
      <span
        className="relative z-[1] size-[38%] rounded-full shadow-sm"
        style={{ backgroundColor: theme.textColor }}
      />
    </span>
  );
}

export const ThemePicker: React.FC = () => {
  const { currentTheme, themeToApply, setTheme, setPreviewTheme } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setPreviewTheme(null);
  };

  const handleSelect = (theme: Theme) => {
    setTheme(theme);
    // Keep menu open so the selection ring can spring over —
    // dismiss with outside click / Escape. Preview clears to
    // the newly applied theme via themeToApply.
    setPreviewTheme(null);
  };

  return (
    <Tooltip>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="link"
              size="icon"
              className="relative overflow-visible no-underline hover:no-underline"
              aria-label={`Theme: ${currentTheme.name}`}
            >
              <motion.span
                className="flex items-center justify-center"
                animate={
                  reducedMotion
                    ? undefined
                    : open
                      ? { scale: 1.08 }
                      : { scale: 1 }
                }
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 24 }
                }
                data-allow-transform-motion=""
              >
                <ThemeOrb theme={themeToApply} size="md" />
              </motion.span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className={cn(
            'w-[13.5rem] rounded-2xl border-accent/20 bg-primary/95 p-2.5 shadow-xl backdrop-blur-md',
            'duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          )}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseLeave={() => setPreviewTheme(null)}
        >
          {/* Header: quiet label + live theme name */}
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <span className="text-[11px] font-medium tracking-wide text-text/40 uppercase">
              Theme
            </span>
            <motion.span
              key={themeToApply.id}
              initial={
                reducedMotion ? false : { opacity: 0, transform: 'translateY(3px)' }
              }
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: reducedMotion ? 0 : 0.16, ease: EASE_OUT }}
              className="truncate text-[11px] font-medium text-text/70"
            >
              {themeToApply.name}
            </motion.span>
          </div>

          {/* Orb grid */}
          <LayoutGroup id="theme-picker">
            <div
              className="grid grid-cols-4 gap-1"
              onMouseLeave={() => setPreviewTheme(null)}
            >
              {themes.map((theme, index) => {
                const selected = currentTheme.id === theme.id;
                const active = themeToApply.id === theme.id;

                return (
                  <DropdownMenuItem
                    key={theme.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleSelect(theme);
                    }}
                    onMouseEnter={() => setPreviewTheme(theme)}
                    onFocus={() => setPreviewTheme(theme)}
                    className={cn(
                      'relative flex h-auto cursor-pointer flex-col items-center gap-1 rounded-xl p-1.5',
                      'focus:bg-transparent focus:text-inherit',
                      'data-[highlighted]:bg-accent/10 data-[highlighted]:text-inherit',
                      'outline-none select-none',
                    )}
                    aria-label={theme.name}
                    title={theme.name}
                  >
                    <motion.span
                      className="relative flex items-center justify-center rounded-full p-0.5"
                      initial={
                        reducedMotion
                          ? false
                          : { opacity: 0, transform: 'scale(0.92)' }
                      }
                      animate={{ opacity: 1, transform: 'scale(1)' }}
                      transition={{
                        duration: reducedMotion ? 0 : 0.2,
                        delay: reducedMotion ? 0 : index * STAGGER,
                        ease: EASE_OUT,
                      }}
                      whileTap={
                        reducedMotion
                          ? undefined
                          : {
                              scale: 0.92,
                              transition: { duration: 0.1 },
                            }
                      }
                      data-allow-transform-motion=""
                    >
                      {/* Sliding selection ring — the little bit of joy */}
                      {selected && (
                        <motion.span
                          layoutId={reducedMotion ? undefined : 'theme-ring'}
                          className="absolute inset-0 rounded-full ring-2 ring-accent ring-offset-1 ring-offset-primary"
                          transition={
                            reducedMotion
                              ? { duration: 0 }
                              : {
                                  type: 'spring',
                                  stiffness: 500,
                                  damping: 32,
                                  mass: 0.6,
                                }
                          }
                          data-allow-transform-motion=""
                        />
                      )}

                      {/* Hover / preview halo (not selected) */}
                      <span
                        className={cn(
                          'absolute inset-0 rounded-full transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                          active && !selected
                            ? 'opacity-100 ring-1 ring-accent/50 ring-offset-1 ring-offset-primary'
                            : 'opacity-0',
                        )}
                      />

                      <ThemeOrb theme={theme} size="lg" />
                    </motion.span>

                    <span
                      className={cn(
                        'max-w-full truncate text-[9px] leading-none tracking-wide transition-colors duration-150',
                        selected
                          ? 'font-semibold text-text'
                          : active
                            ? 'text-text/70'
                            : 'text-text/40',
                      )}
                    >
                      {theme.name}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </LayoutGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>Themes</TooltipContent>
    </Tooltip>
  );
};
