import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_OUT } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { Theme } from '../contexts/themes';
import { themes } from '../contexts/themes';
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/** Themes author three colors; every other tone is derived — same `color-mix`
 *  ramp `index.css` builds for the live theme, just inline so a swatch can
 *  render a theme that isn't applied yet. */
const mix = (color: string, pct: number, into: string) =>
  `color-mix(in oklab, ${color} ${pct}%, ${into})`;

/** The current theme as a three-wedge disc — the trigger IS a swatch, so the
 *  nav always shows which theme is live (and morphs while previewing). */
const ThemeOrb: React.FC<{ theme: Theme; className?: string }> = ({ theme, className }) => (
  <span
    aria-hidden
    className={cn('block size-5 rounded-full', className)}
    style={{
      background: `conic-gradient(from 200deg, ${theme.primaryColor} 0deg 120deg, ${theme.accentColor} 120deg 240deg, ${theme.textColor} 240deg 360deg)`,
      boxShadow: `inset 0 0 0 1px ${mix(theme.textColor, 22, theme.primaryColor)}`,
    }}
  />
);

/** A miniature of the typing surface, drawn in the theme's own colors: the
 *  accent slab, typed text, the accent caret, and the words still to come. */
const ThemeMiniature: React.FC<{ theme: Theme }> = ({ theme }) => {
  const { textColor: text, accentColor: accent, primaryColor: primary } = theme;
  const slab = mix(accent, 30, primary);
  const pending = mix(text, 32, slab);

  const bar = (width: number, color: string, key: number) => (
    <span key={key} className="h-[5px] rounded-full" style={{ width, background: color }} />
  );

  return (
    <div
      className="h-[3.375rem] rounded-lg px-2.5 flex flex-col justify-center gap-[6px] overflow-hidden"
      style={{
        background: slab,
        boxShadow: `inset 0 0 0 1px ${mix(text, 10, slab)}`,
      }}
    >
      <div className="flex items-center gap-[5px]">
        {[16, 11].map((w, i) => bar(w, text, i))}
        <span className="w-[2px] h-[11px] rounded-full" style={{ background: accent }} />
        {[13, 20].map((w, i) => bar(w, pending, i))}
      </div>
      <div className="flex items-center gap-[5px]">
        {[10, 22, 14, 8].map((w, i) => bar(w, pending, i))}
      </div>
    </div>
  );
};

export const ThemePicker: React.FC = () => {
  const { currentTheme, themeToApply, setTheme, setPreviewTheme } = useTheme();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setPreviewTheme(null);
  };

  const handleSelect = (theme: Theme) => {
    setTheme(theme);
    setPreviewTheme(null);
    setOpen(false);
  };

  // A radiogroup is arrow-navigated, not tabbed. Two columns, so left/right
  // steps one and up/down steps a row; focus carries the live preview with it.
  const cardRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (i + step + themes.length) % themes.length;
    cardRefs.current[next]?.focus();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="link"
              size="icon"
              aria-label="Theme"
              className="group no-underline hover:no-underline"
            >
              <ThemeOrb
                theme={themeToApply}
                className={cn(
                  'transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
                  'group-hover:scale-110 group-hover:rotate-[20deg]',
                  open && 'scale-110 rotate-[20deg]'
                )}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Theme</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[19.5rem] p-0 rounded-2xl border-accent/15 bg-surface-2 shadow-xl shadow-text/5"
        onMouseLeave={() => setPreviewTheme(null)}
      >
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-text/50 font-semibold">
            Theme
          </p>
          {/* Follows the preview, so the name always matches what you're seeing */}
          <p className="text-xs font-medium text-accent truncate">{themeToApply.name}</p>
        </div>

        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2 px-3">
          {themes.map((theme, i) => {
            const active = currentTheme.id === theme.id;
            return (
              <motion.button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onClick={() => handleSelect(theme)}
                onMouseEnter={() => setPreviewTheme(theme)}
                onFocus={() => setPreviewTheme(theme)}
                onBlur={() => setPreviewTheme(null)}
                {...(reduced
                  ? {}
                  : {
                      initial: { opacity: 0, transform: 'translateY(4px)' },
                      animate: { opacity: 1, transform: 'translateY(0px)' },
                      transition: {
                        duration: 0.22,
                        delay: i * 0.025,
                        ease: EASE_OUT,
                      },
                    })}
                className={cn(
                  'group/theme relative text-left rounded-lg p-1.5 cursor-pointer',
                  'ring-1 transition-[background-color,box-shadow,transform] duration-150',
                  'ease-[cubic-bezier(0.23,1,0.32,1)]',
                  'outline-none focus-visible:ring-accent/60 active:scale-[0.985]',
                  active
                    ? 'bg-accent/[0.12] ring-accent/30'
                    : 'ring-transparent hover:bg-accent/10 hover:ring-accent/15'
                )}
              >
                <ThemeMiniature theme={theme} />
                <div className="flex items-center justify-between gap-2 px-0.5 pt-2 pb-0.5">
                  <span className="text-xs font-medium truncate">{theme.name}</span>
                  {active && <Check className="size-3.5 text-accent shrink-0" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="text-[10px] text-text/35 px-4 pt-3 pb-3.5 mt-3 border-t border-line/60">
          Hover a theme to preview it live
        </p>
      </PopoverContent>
    </Popover>
  );
};
