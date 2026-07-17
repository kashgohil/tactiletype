import { TOP_1000_WORDS, uniqueWords } from './words';

const HOME_ROW = 'asdfghjkl';
const TOP_ROW = 'qwertyuiop';
const BOTTOM_ROW = 'zxcvbnm';

/** Weighted random pick favoring target characters. */
function randomFrom(str: string): string {
  return str[Math.floor(Math.random() * str.length)]!;
}

function randomWordContaining(
  targets: string[],
  bank: string[],
  maxAttempts = 50
): string {
  const lowerTargets = targets.map((t) => t.toLowerCase());
  for (let i = 0; i < maxAttempts; i++) {
    const w = bank[Math.floor(Math.random() * bank.length)]!;
    if (lowerTargets.some((t) => w.includes(t))) return w;
  }
  // Fallback: fabricate a short "word" from targets + fillers
  const fillers = 'aeioutrnsl';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out +=
      Math.random() < 0.6
        ? randomFrom(lowerTargets.join('') || fillers)
        : randomFrom(fillers);
  }
  return out;
}

/**
 * Build a practice passage biased toward weak keys.
 * ~70% of words contain at least one target key.
 */
export function generateKeyDrill(
  keys: string[],
  wordCount = 40
): { content: string; title: string; focusKeys: string[] } {
  const targets = [
    ...new Set(
      keys
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .split('')
    ),
  ].slice(0, 8);

  if (targets.length === 0) {
    targets.push(...HOME_ROW.split('').slice(0, 4));
  }

  const bank = uniqueWords(TOP_1000_WORDS);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    if (Math.random() < 0.7) {
      words.push(randomWordContaining(targets, bank));
    } else {
      words.push(bank[Math.floor(Math.random() * bank.length)]!);
    }
  }

  return {
    content: words.join(' '),
    title: `Key drill: ${targets.join(' ').toUpperCase()}`,
    focusKeys: targets,
  };
}

const COMMON_BIGRAMS = [
  'th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd',
  'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar',
  'st', 'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou', 'io', 'le',
  've', 'co', 'me', 'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea',
  'ra', 'ce', 'li', 'ch', 'll', 'be', 'ma', 'si', 'om', 'ur',
];

export function generateBigramDrill(
  bigrams: string[] = COMMON_BIGRAMS.slice(0, 8),
  wordCount = 40
): { content: string; title: string; focusBigrams: string[] } {
  const focus = bigrams
    .map((b) => b.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3))
    .filter((b) => b.length >= 2)
    .slice(0, 10);

  const active = focus.length ? focus : COMMON_BIGRAMS.slice(0, 8);
  const bank = uniqueWords(TOP_1000_WORDS);
  const words: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    if (Math.random() < 0.65) {
      const bg = active[Math.floor(Math.random() * active.length)]!;
      const match = bank.filter((w) => w.includes(bg));
      if (match.length) {
        words.push(match[Math.floor(Math.random() * match.length)]!);
      } else {
        words.push(bg + randomFrom('aeiou') + randomFrom('ntrl'));
      }
    } else {
      words.push(bank[Math.floor(Math.random() * bank.length)]!);
    }
  }

  return {
    content: words.join(' '),
    title: `Bigram drill: ${active.join(' ')}`,
    focusBigrams: active,
  };
}

export function generateWordDrill(
  hardWords: string[],
  repetitions = 3,
  totalWords = 40
): { content: string; title: string; focusWords: string[] } {
  const focus = hardWords
    .map((w) => w.toLowerCase().trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!focus.length) {
    const bank = uniqueWords(TOP_1000_WORDS);
    for (let i = 0; i < 8; i++) {
      focus.push(bank[Math.floor(Math.random() * bank.length)]!);
    }
  }

  const words: string[] = [];
  let i = 0;
  while (words.length < totalWords) {
    const w = focus[i % focus.length]!;
    for (let r = 0; r < repetitions && words.length < totalWords; r++) {
      words.push(w);
    }
    i++;
  }

  return {
    content: words.join(' '),
    title: `Word drill: ${focus.slice(0, 5).join(', ')}${focus.length > 5 ? '…' : ''}`,
    focusWords: focus,
  };
}

export function generateAccuracyChallenge(
  wordCount = 40
): { content: string; title: string; accuracyFloor: number } {
  const bank = uniqueWords(TOP_1000_WORDS).slice(0, 200);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(bank[Math.floor(Math.random() * bank.length)]!);
  }
  return {
    content: words.join(' '),
    title: 'Accuracy challenge (98% target)',
    accuracyFloor: 98,
  };
}

export {
  BOTTOM_ROW,
  COMMON_BIGRAMS,
  HOME_ROW,
  TOP_ROW,
};
