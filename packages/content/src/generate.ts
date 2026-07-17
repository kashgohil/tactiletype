import { CODE_SNIPPETS } from './code';
import { QUOTES } from './quotes';
import { REAL_WORLD_LINES, SYMBOL_LINES } from './symbols';
import type { ContentItem, ExercisePack, PackDifficulty } from './types';
import {
  HARD_WORDS,
  TOP_1000_WORDS,
  TOP_200_WORDS,
  uniqueWords,
} from './words';

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function pick<T>(arr: readonly T[], n: number, seed: number): T[] {
  const out: T[] = [];
  const len = arr.length;
  if (len === 0 || n <= 0) return out;
  for (let i = 0; i < n; i++) {
    const idx = Math.abs((seed * 1103515245 + i * 12345) % len);
    out.push(arr[idx]!);
  }
  return out;
}

/** Deterministic-ish passage from a word bank. */
export function generateWordPassage(
  bank: readonly string[],
  count: number,
  seed: number
): string {
  return pick(uniqueWords(bank), count, seed).join(' ');
}

export function buildWordPackItems(
  bank: readonly string[],
  packId: string,
  difficulty: PackDifficulty,
  count: number,
  wordsPerItem: number
): ContentItem[] {
  const items: ContentItem[] = [];
  for (let i = 0; i < count; i++) {
    const content = generateWordPassage(bank, wordsPerItem, i + 1 + wordsPerItem);
    items.push({
      id: `${packId}-${i + 1}`,
      title: `${packId} #${i + 1}`,
      content,
      difficulty,
      language: 'en',
      wordCount: wordCount(content),
      tags: ['words', packId],
    });
  }
  return items;
}

export function buildAllPacks(): ExercisePack[] {
  const top200 = uniqueWords(TOP_200_WORDS);
  const top1k = uniqueWords(TOP_1000_WORDS);
  const hard = uniqueWords(HARD_WORDS);

  const wordsEasy: ExercisePack = {
    id: 'words-top-200',
    title: 'Top 200 English words',
    description: 'High-frequency words for warm-ups and beginners.',
    category: 'words',
    difficulty: 'easy',
    language: 'en',
    tags: ['english', 'words', 'beginner'],
    focus: 'keys',
    items: buildWordPackItems(top200, 'words-top-200', 'easy', 80, 40),
  };

  const wordsMedium: ExercisePack = {
    id: 'words-top-1000',
    title: 'Top 1000 English words',
    description: 'Broader vocabulary for everyday speed practice.',
    category: 'words',
    difficulty: 'medium',
    language: 'en',
    tags: ['english', 'words'],
    focus: 'words',
    items: buildWordPackItems(top1k, 'words-top-1000', 'medium', 100, 50),
  };

  const wordsHard: ExercisePack = {
    id: 'words-hard',
    title: 'Advanced vocabulary',
    description: 'Longer and less common words for precision under load.',
    category: 'words',
    difficulty: 'hard',
    language: 'en',
    tags: ['english', 'words', 'advanced'],
    focus: 'words',
    items: buildWordPackItems(hard, 'words-hard', 'hard', 80, 35),
  };

  const quotesPack: ExercisePack = {
    id: 'quotes-classic',
    title: 'Quotes library',
    description: 'Attributed longer passages for reading-length tests.',
    category: 'quotes',
    difficulty: 'medium',
    language: 'en',
    tags: ['quotes', 'literature'],
    items: QUOTES.map((q, i) => ({
      id: `quotes-classic-${i + 1}`,
      title: q.author,
      content: q.text,
      difficulty: 'medium' as const,
      language: 'en',
      wordCount: wordCount(q.text),
      tags: ['quote', q.author],
    })),
  };

  const symbolsPack: ExercisePack = {
    id: 'symbols-operators',
    title: 'Symbols & operators',
    description: 'Brackets, operators, emails, and paths.',
    category: 'symbols',
    difficulty: 'hard',
    language: 'en',
    tags: ['symbols', 'punctuation', 'code'],
    focus: 'symbols',
    items: SYMBOL_LINES.map((line, i) => ({
      id: `symbols-operators-${i + 1}`,
      title: `Symbols drill ${i + 1}`,
      content: line,
      difficulty: 'hard' as const,
      language: 'en',
      wordCount: wordCount(line),
      tags: ['symbols'],
    })),
  };

  const realWorldPack: ExercisePack = {
    id: 'real-world',
    title: 'Emails, URLs & paths',
    description: 'Real-world hard typing: addresses, links, invoices.',
    category: 'real_world',
    difficulty: 'hard',
    language: 'en',
    tags: ['email', 'url', 'paths'],
    focus: 'symbols',
    items: REAL_WORLD_LINES.map((line, i) => ({
      id: `real-world-${i + 1}`,
      title: `Real-world ${i + 1}`,
      content: line,
      difficulty: 'hard' as const,
      language: 'en',
      wordCount: wordCount(line),
      tags: ['real-world'],
    })),
  };

  const codePack: ExercisePack = {
    id: 'code-starter',
    title: 'Code snippets',
    description: 'JS, Python, SQL, shell, and CSS starter pack.',
    category: 'code',
    difficulty: 'hard',
    language: 'en',
    tags: ['code', 'developer'],
    focus: 'code-lang',
    items: CODE_SNIPPETS.map((s, i) => ({
      id: `code-starter-${i + 1}`,
      title: s.title,
      content: s.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
      difficulty: 'hard' as const,
      language: s.language,
      wordCount: wordCount(s.content),
      tags: ['code', s.language],
    })),
  };

  return [
    wordsEasy,
    wordsMedium,
    wordsHard,
    quotesPack,
    symbolsPack,
    realWorldPack,
    codePack,
  ];
}

export function flattenPackItems(packs: ExercisePack[] = buildAllPacks()): ContentItem[] {
  return packs.flatMap((p) =>
    p.items.map((item) => ({
      ...item,
      tags: [...(item.tags ?? []), p.id, p.category],
    }))
  );
}

export function countPracticeUnits(packs: ExercisePack[] = buildAllPacks()): number {
  return packs.reduce((sum, p) => sum + p.items.length, 0);
}
