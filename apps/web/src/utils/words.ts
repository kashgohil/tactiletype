/**
 * Word banks and quotes — re-exported from @tactile/content packs.
 * Kept as a thin adapter so existing imports continue to work.
 */
import {
  HARD_WORDS as CONTENT_HARD,
  QUOTE_STRINGS,
  TOP_200_WORDS,
  TOP_1000_WORDS,
  uniqueWords,
} from '@tactile/content';

export const COMMON_WORDS = uniqueWords([...TOP_200_WORDS, ...TOP_1000_WORDS]);
export const HARD_WORDS = uniqueWords([...CONTENT_HARD]);
export const QUOTES = QUOTE_STRINGS;
export const TOP_200 = uniqueWords([...TOP_200_WORDS]);
