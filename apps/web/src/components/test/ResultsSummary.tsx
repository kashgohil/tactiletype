import { Button } from "@/components/ui/button";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import type { TypingStats } from "@/utils/typingEngine";
import { formatTime } from "@/utils/typingEngine";
import { motion } from "motion/react";
import { ArrowUpRight, RotateCcw, Sparkles } from "lucide-react";

interface ResultsSummaryProps {
  stats: TypingStats;
  bestCombo: number;
  consistency: number;
  /** Personal best WPM *before* this test (null if this is the first tracked test). */
  previousBest: number | null;
  isNewBest: boolean;
  isGuest: boolean;
  reducedMotion: boolean;
  onRestart: () => void;
}

function SupportingStat({
  value,
  label,
  emphasis,
}: {
  value: string;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "font-mono text-2xl font-medium tabular-nums",
          emphasis ? "text-accent" : "text-text"
        )}
      >
        {value}
      </span>
      <span className="text-xs uppercase tracking-wider text-text/45">
        {label}
      </span>
    </div>
  );
}

export function ResultsSummary({
  stats,
  bestCombo,
  consistency,
  previousBest,
  isNewBest,
  isGuest,
  reducedMotion,
  onRestart,
}: ResultsSummaryProps) {
  const wpm = useCountUp(stats.wpm, { reducedMotion, durationMs: 900 });
  const accuracy = useCountUp(stats.accuracy, {
    reducedMotion,
    durationMs: 900,
  });

  const delta = previousBest !== null ? stats.wpm - previousBest : null;

  const item = (delayFactor: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.5,
            delay: delayFactor,
            ease: [0.23, 1, 0.32, 1] as const,
          },
        };

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8 rounded-2xl border border-accent/20 bg-accent/10 px-8 py-10 text-center">
      {/* Status line */}
      <motion.div {...item(0)} className="flex h-6 items-center">
        {isNewBest ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 font-saira text-sm font-medium text-accent">
            <Sparkles className="size-3.5" />
            New personal best
          </span>
        ) : (
          <span className="font-saira text-sm uppercase tracking-[0.3em] text-text/40">
            Test complete
          </span>
        )}
      </motion.div>

      {/* Hero WPM */}
      <motion.div {...item(0.06)} className="flex flex-col items-center">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[5.5rem] font-semibold leading-none tabular-nums text-text">
            {Math.round(wpm)}
          </span>
          <span className="font-mono text-lg text-text/45">wpm</span>
        </div>

        {delta !== null && (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1 font-mono text-sm",
              delta > 0
                ? "text-accent"
                : delta < 0
                  ? "text-text/40"
                  : "text-text/40"
            )}
          >
            {delta > 0 && <ArrowUpRight className="size-4" />}
            <span>
              {delta > 0 ? "+" : ""}
              {delta} vs your best
              {previousBest !== null && !isNewBest ? ` (${previousBest})` : ""}
            </span>
          </div>
        )}
      </motion.div>

      {/* Accuracy + consistency — the supporting leads */}
      <motion.div
        {...item(0.12)}
        className="grid w-full grid-cols-2 gap-4 border-y border-accent/15 py-6"
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-4xl font-medium tabular-nums text-text">
            {Math.round(accuracy)}
            <span className="text-2xl text-text/40">%</span>
          </span>
          <span className="text-xs uppercase tracking-wider text-text/45">
            Accuracy
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-4xl font-medium tabular-nums text-text">
            {consistency}
            <span className="text-2xl text-text/40">%</span>
          </span>
          <span className="text-xs uppercase tracking-wider text-text/45">
            Consistency
          </span>
        </div>
      </motion.div>

      {/* Secondary detail */}
      <motion.div
        {...item(0.18)}
        className="flex w-full items-start justify-around"
      >
        <SupportingStat value={String(stats.correctChars)} label="Correct" />
        <SupportingStat value={String(bestCombo)} label="Best combo" emphasis />
        <SupportingStat
          value={formatTime(stats.timeElapsed)}
          label="Time"
        />
      </motion.div>

      {/* Restart CTA */}
      <motion.div {...item(0.24)} className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={onRestart}
          className="gap-2 px-8"
          data-allow-transform-motion
        >
          <RotateCcw className="size-4" />
          Next test
        </Button>
        <span className="font-mono text-xs text-text/40">
          press{" "}
          <kbd className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-text/60">
            enter
          </kbd>{" "}
          to go again
        </span>
      </motion.div>

      {isGuest && (
        <motion.p {...item(0.3)} className="text-xs text-text/45">
          Saved on this device.{" "}
          <a href="/login" className="text-accent hover:underline">
            Log in
          </a>{" "}
          to sync your progress.
        </motion.p>
      )}
    </div>
  );
}
