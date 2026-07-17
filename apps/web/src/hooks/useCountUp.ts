import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 up to `target` with an ease-out curve.
 * Jumps straight to the value when the user prefers reduced motion.
 */
export function useCountUp(
  target: number,
  { durationMs = 900, reducedMotion = false }: {
    durationMs?: number;
    reducedMotion?: boolean;
  } = {}
): number {
  const [value, setValue] = useState(reducedMotion ? target : 0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion || target === 0) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs, reducedMotion]);

  return value;
}
