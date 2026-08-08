/**
 * Word-level recall scoring for Memory Flash.
 *
 * Scoring a memorised phrase character-by-character punishes the wrong thing:
 * drop a single letter early and every later character is offset, so a phrase
 * you remembered almost perfectly scores near zero. Memory works in words, so
 * the alignment does too — a longest-common-subsequence over words, which
 * tolerates a dropped or invented word and keeps the rest in step.
 */

export type RecallMark = 'hit' | 'missed' | 'extra';

export interface RecallWord {
  /** The target word for hit/missed, the invented word for extra. */
  word: string;
  mark: RecallMark;
}

export interface RecallScore {
  /** Target words recalled, in order. */
  hits: number;
  /** Words in the target phrase. */
  total: number;
  /** Words typed that aren't in the phrase. */
  extras: number;
  /** Characters of the recalled words — the basis for recall WPM. */
  hitChars: number;
  /** Whole phrase back with nothing invented. */
  perfect: boolean;
  /** Target and typed merged into one readable line. */
  diff: RecallWord[];
}

const normalize = (word: string) => word.toLowerCase().replace(/[^a-z0-9']/g, '');

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);

export function scoreRecall(target: string, typed: string): RecallScore {
  const targetWords = words(target);
  const typedWords = words(typed);
  const a = targetWords.map(normalize);
  const b = typedWords.map(normalize);
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = matches remaining from target i / typed j onward.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const diff: RecallWord[] = [];
  let hits = 0;
  let extras = 0;
  let hitChars = 0;
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      diff.push({ word: targetWords[i]!, mark: 'hit' });
      hitChars += targetWords[i]!.length;
      hits++;
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      diff.push({ word: targetWords[i]!, mark: 'missed' });
      i++;
    } else {
      diff.push({ word: typedWords[j]!, mark: 'extra' });
      extras++;
      j++;
    }
  }
  for (; i < n; i++) diff.push({ word: targetWords[i]!, mark: 'missed' });
  for (; j < m; j++) {
    diff.push({ word: typedWords[j]!, mark: 'extra' });
    extras++;
  }

  return {
    hits,
    total: n,
    extras,
    // Recalled words carry the space that followed them.
    hitChars: hitChars + Math.max(0, hits - 1),
    perfect: n > 0 && hits === n && extras === 0,
    diff,
  };
}

/** Share of the phrase held, charged for invented words. */
export function recallAccuracy(score: RecallScore): number {
  const denom = score.total + score.extras;
  return denom > 0 ? Math.round((score.hits / denom) * 100) : 0;
}
