import { HARD_WORDS, TOP_200_WORDS, TOP_1000_WORDS, uniqueWords } from '@tactile/content';

/** Unique play modes - each has different rules, not just different text. */
export type PlayModeId =
  | 'sudden-death'
  | 'word-storm'
  | 'memory-flash'
  | 'ghost-race'
  | 'lesson-path'
  | 'weak-storm';

export interface PlayModeMeta {
  id: PlayModeId;
  title: string;
  tagline: string;
  description: string;
  howToPlay: string[];
  skill: string;
  accent: string;
  /** Featured / progression modes sort first */
  featured?: boolean;
}

export const PLAY_MODES: PlayModeMeta[] = [
  {
    id: 'lesson-path',
    title: 'Lesson Path',
    tagline: 'Unlock the keyboard step by step',
    description:
      'Ten lessons with different rules: home-row only, no-backspace, accuracy gates, char streaks, speed checks. Pass to unlock the next - a real curriculum, not more categories.',
    howToPlay: [
      'Open the path map and start the first unlocked lesson',
      'Each lesson has its own pass rule (accuracy, streak, speed…)',
      'Pass to unlock the next lesson permanently (saved locally)',
      'Graduation requires 45 WPM and 95% on 50 words',
    ],
    skill: 'Structured progress',
    accent: 'emerald',
    featured: true,
  },
  {
    id: 'weak-storm',
    title: 'Weak Storm',
    tagline: 'Word Storm aimed at your mistakes',
    description:
      'Same rising-timer heat as Word Storm, but every word is biased toward keys you miss. Gets smarter the more you type.',
    howToPlay: [
      'Your weak keys are tracked from every session',
      'Words are generated to hit those keys hard',
      'Clear them before the timer runs out',
      'Levels speed up - stay alive with 3 lives',
    ],
    skill: 'Adaptive targeting',
    accent: 'rose',
    featured: true,
  },
  {
    id: 'sudden-death',
    title: 'Sudden Death',
    tagline: 'One wrong key ends the run',
    description:
      'Type an endless stream of words. A single mistake kills the run. Survive as long as you can - accuracy under pressure builds real speed.',
    howToPlay: [
      'Start typing; the clock starts on your first key',
      'Any wrong character ends the run immediately',
      'Score = words survived + peak WPM',
      'Optional: play with 3 lives for a gentler version',
    ],
    skill: 'Precision under pressure',
    accent: 'rose',
  },
  {
    id: 'word-storm',
    title: 'Word Storm',
    tagline: 'One word. Rising heat. Don’t miss.',
    description:
      'Words appear one at a time with a shrinking timer. Clear them before time runs out. Levels get faster - trains burst speed and focus.',
    howToPlay: [
      'Only one word is shown at a time',
      'Type it fully before the timer hits zero',
      'Every 5 words the time window shrinks',
      'Miss or timeout costs a life - 3 lives total',
    ],
    skill: 'Burst speed & focus',
    accent: 'amber',
  },
  {
    id: 'memory-flash',
    title: 'Memory Flash',
    tagline: 'See it. Hide it. Type it back.',
    description:
      'A phrase flashes briefly, then vanishes. Type it from memory. Hold it and the next one grows - the longest phrase you can carry is your span.',
    howToPlay: [
      'Memorize the phrase while it is visible',
      'When it hides, type what you remember',
      'Exactly right → the next phrase is a word longer',
      'A word missing → it shrinks and costs a life (3 total)',
    ],
    skill: 'Chunking & recall',
    accent: 'violet',
  },
  {
    id: 'ghost-race',
    title: 'Ghost Race',
    tagline: 'Beat the pace caret',
    description:
      'Race a ghost that types at a fixed target WPM. Stay ahead of the ghost to win. Perfect for pacing practice and PB chases.',
    howToPlay: [
      'Pick a target pace (or use a saved ghost)',
      'Start typing - the ghost advances at that WPM',
      'Finish the passage before the ghost does',
      'Win = finish first; also track your WPM vs target',
    ],
    skill: 'Pacing & consistency',
    accent: 'sky',
  },
];

export function getPlayMode(id: string | undefined): PlayModeMeta | undefined {
  return PLAY_MODES.find((m) => m.id === id);
}

const EASY = uniqueWords(TOP_200_WORDS);
const MED = uniqueWords(TOP_1000_WORDS);
const HARD = uniqueWords([...TOP_1000_WORDS, ...HARD_WORDS]);

export function pickWords(
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): string[] {
  const bank = difficulty === 'easy' ? EASY : difficulty === 'hard' ? HARD : MED;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(bank[Math.floor(Math.random() * bank.length)]!);
  }
  return out;
}

export function pickWord(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): string {
  return pickWords(1, difficulty)[0]!;
}

/** Short phrases for memory flash. */
export function pickPhrase(
  wordCount: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): string {
  return pickWords(wordCount, difficulty).join(' ');
}

/** Passage for ghost race. */
export function pickPassage(
  wordCount = 40,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): string {
  return pickWords(wordCount, difficulty).join(' ');
}

const BEST_KEY = 'tactile_play_bests';

export type PlayBests = Partial<Record<PlayModeId, { score: number; label: string; at: string }>>;

export function loadPlayBests(): PlayBests {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PlayBests;
  } catch {
    return {};
  }
}

export function savePlayBest(mode: PlayModeId, score: number, label: string): boolean {
  const bests = loadPlayBests();
  const prev = bests[mode];
  if (prev && prev.score >= score) return false;
  bests[mode] = { score, label, at: new Date().toISOString() };
  localStorage.setItem(BEST_KEY, JSON.stringify(bests));
  return true;
}

/** Ghost pace targets (WPM). */
export const GHOST_PACES = [40, 60, 80, 100, 120] as const;

export function charsForGhostWpm(wpm: number, elapsedMs: number): number {
  // Standard: 5 chars = 1 word
  const minutes = elapsedMs / 60000;
  return Math.floor(wpm * 5 * minutes);
}
