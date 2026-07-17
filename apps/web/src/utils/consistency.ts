import type { DetailedKeystrokeEvent } from '@tactile/types';

/**
 * Keystroke rhythm consistency, 0–100.
 * Derived from the coefficient of variation of inter-keystroke intervals:
 * steadier timing → higher score. Mirrors the "consistency" metric typists expect.
 */
export function computeConsistency(events: DetailedKeystrokeEvent[]): number {
  const intervals = events
    .filter(
      (e) =>
        !e.isBackspace &&
        typeof e.timeSincePrevious === 'number' &&
        e.timeSincePrevious > 0 &&
        // Ignore long pauses (>2s) so a mid-test hesitation doesn't dominate
        e.timeSincePrevious < 2000
    )
    .map((e) => e.timeSincePrevious as number);

  if (intervals.length < 3) return 100;

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean === 0) return 100;
  const variance =
    intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / mean;

  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}
