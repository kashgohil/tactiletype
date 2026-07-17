/**
 * Word-level combo tracking for the main typing test.
 * Combo = consecutive fully-correct words (no errors in that word).
 */

export type ComboState = {
  current: number;
  best: number;
  /** Multiplier display: 1 + floor(combo/3) capped */
  multiplier: number;
};

export function emptyCombo(): ComboState {
  return { current: 0, best: 0, multiplier: 1 };
}

export function comboMultiplier(combo: number): number {
  return Math.min(5, 1 + Math.floor(combo / 3));
}

/**
 * After a keypress, recompute combo from engine text + typed range.
 * Call when a word boundary is crossed (space typed or test ends).
 */
export function updateComboOnWordBoundary(
  text: string,
  typedLength: number,
  errorIndices: Set<number>,
  prev: ComboState
): ComboState {
  // Find the word that just completed (ends at typedLength - 1, which should be space or end)
  let end = typedLength;
  // If last char is space, word ends before it
  if (end > 0 && text[end - 1] === ' ') {
    end = end - 1;
  }
  if (end <= 0) return prev;

  // Find start of this word
  let start = end - 1;
  while (start > 0 && text[start - 1] !== ' ') start--;
  if (text[start] === ' ') start++;

  // Word range [start, end)
  let clean = true;
  for (let i = start; i < end; i++) {
    if (errorIndices.has(i)) {
      clean = false;
      break;
    }
  }

  if (!clean || end <= start) {
    return { current: 0, best: prev.best, multiplier: 1 };
  }

  const current = prev.current + 1;
  const best = Math.max(prev.best, current);
  return { current, best, multiplier: comboMultiplier(current) };
}

/** Break combo immediately on any incorrect character. */
export function breakCombo(prev: ComboState): ComboState {
  if (prev.current === 0) return prev;
  return { current: 0, best: prev.best, multiplier: 1 };
}
