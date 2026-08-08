import {
  generateBigramDrill,
  generateKeyDrill,
  TOP_200_WORDS,
  uniqueWords,
} from '@tactile/content';

export type LessonMechanic =
  /** Only keys from allowed set appear in the text. */
  | 'keys_only'
  /** Run fails if accuracy drops below floor after minChars. */
  | 'accuracy_gate'
  /** Backspace disabled - forces commitment. */
  | 'no_backspace'
  /** Must land N consecutive correct chars (resets on error). */
  | 'char_streak'
  /** Pass if finish with min WPM + accuracy. */
  | 'speed_check'
  /** Complete the passage with min accuracy (standard). */
  | 'standard';

export interface LessonDef {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  mechanic: LessonMechanic;
  /** Human-readable win condition */
  passRule: string;
  minAccuracy?: number;
  minWpm?: number;
  minChars?: number;
  streakTarget?: number;
  wordCount?: number;
  allowedKeys?: string;
  focusKeys?: string[];
  /** Generate the lesson text */
  generate: () => string;
}

const HOME = 'asdfghjkl;';
const HOME_TOP = 'qwertyuiopasdfghjkl;';
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

function wordsFromCharset(charset: string, count: number): string {
  const letters = charset.replace(/[^a-z]/gi, '').toLowerCase();
  const bank = uniqueWords(TOP_200_WORDS).filter((w) => [...w].every((c) => letters.includes(c)));
  const pool = bank.length >= 8 ? bank : fabricateWords(letters, 30);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  return out.join(' ');
}

function fabricateWords(letters: string, n: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < n; i++) {
    const len = 3 + Math.floor(Math.random() * 3);
    let w = '';
    for (let j = 0; j < len; j++) {
      w += letters[Math.floor(Math.random() * letters.length)]!;
    }
    words.push(w);
  }
  return words;
}

function numberPassage(count: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.4) {
      parts.push(String(Math.floor(Math.random() * 1000)));
    } else {
      const bank = uniqueWords(TOP_200_WORDS);
      parts.push(bank[Math.floor(Math.random() * bank.length)]!);
    }
  }
  return parts.join(' ');
}

function symbolishPassage(count: number): string {
  const symbols = [
    '@',
    '#',
    '$',
    '%',
    '&',
    '*',
    '(',
    ')',
    '-',
    '_',
    '=',
    '+',
    '[',
    ']',
    '{',
    '}',
    ';',
    ':',
    ',',
    '.',
    '/',
    '?',
  ];
  const bank = uniqueWords(TOP_200_WORDS);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.35) {
      const s = symbols[Math.floor(Math.random() * symbols.length)]!;
      const w = bank[Math.floor(Math.random() * bank.length)]!;
      parts.push(Math.random() < 0.5 ? `${w}${s}` : `${s}${w}`);
    } else {
      parts.push(bank[Math.floor(Math.random() * bank.length)]!);
    }
  }
  return parts.join(' ');
}

export const CURRICULUM: LessonDef[] = [
  {
    id: 'home-row',
    index: 0,
    title: 'Home row',
    subtitle: 'Fingers rest here - build the foundation.',
    mechanic: 'keys_only',
    passRule: 'Finish with ≥92% accuracy',
    minAccuracy: 92,
    wordCount: 25,
    allowedKeys: HOME,
    focusKeys: HOME.split(''),
    generate: () => wordsFromCharset(HOME, 25),
  },
  {
    id: 'home-top',
    index: 1,
    title: 'Reach up',
    subtitle: 'Home row + top row without looking down.',
    mechanic: 'keys_only',
    passRule: 'Finish with ≥92% accuracy',
    minAccuracy: 92,
    wordCount: 30,
    allowedKeys: HOME_TOP,
    generate: () => wordsFromCharset(HOME_TOP, 30),
  },
  {
    id: 'full-alpha',
    index: 2,
    title: 'Full alphabet',
    subtitle: 'Every letter in play - still keep it clean.',
    mechanic: 'standard',
    passRule: 'Finish with ≥93% accuracy',
    minAccuracy: 93,
    wordCount: 35,
    generate: () => wordsFromCharset(ALPHA, 35),
  },
  {
    id: 'bigram-flow',
    index: 3,
    title: 'Bigram flow',
    subtitle: 'Common pairs (th, ing, er…) that bottleneck speed.',
    mechanic: 'accuracy_gate',
    passRule: 'Stay ≥94% accuracy after 15 chars; finish the drill',
    minAccuracy: 94,
    minChars: 15,
    generate: () => generateBigramDrill(undefined, 35).content,
  },
  {
    id: 'no-backspace',
    index: 4,
    title: 'No erase',
    subtitle: 'Backspace is disabled. Commit to every key.',
    mechanic: 'no_backspace',
    passRule: 'Finish with ≥90% accuracy - no corrections',
    minAccuracy: 90,
    wordCount: 28,
    generate: () => wordsFromCharset(ALPHA, 28),
  },
  {
    id: 'char-streak',
    index: 5,
    title: 'Clean streak',
    subtitle: 'Hit 80 correct characters in a row without a miss.',
    mechanic: 'char_streak',
    passRule: 'Reach an 80-character perfect streak',
    streakTarget: 80,
    generate: () => {
      // Long enough stream for streak attempts
      const a = generateKeyDrill(['e', 't', 'a', 'o', 'i', 'n', 's', 'r'], 50).content;
      const b = generateKeyDrill(['h', 'l', 'd', 'c', 'u', 'm'], 50).content;
      return `${a} ${b}`;
    },
  },
  {
    id: 'numbers',
    index: 6,
    title: 'Number mix',
    subtitle: 'Digits mixed into words - real-world chaos.',
    mechanic: 'standard',
    passRule: 'Finish with ≥92% accuracy',
    minAccuracy: 92,
    wordCount: 30,
    generate: () => numberPassage(30),
  },
  {
    id: 'symbols',
    index: 7,
    title: 'Symbol stretch',
    subtitle: 'Punctuation and operators under light pressure.',
    mechanic: 'accuracy_gate',
    passRule: 'Stay ≥90% after 12 chars; finish the passage',
    minAccuracy: 90,
    minChars: 12,
    generate: () => symbolishPassage(28),
  },
  {
    id: 'speed-40',
    index: 8,
    title: 'Speed check · 40',
    subtitle: 'Accuracy still matters - now add pace.',
    mechanic: 'speed_check',
    passRule: 'Finish ≥40 WPM and ≥94% accuracy',
    minAccuracy: 94,
    minWpm: 40,
    wordCount: 40,
    generate: () => wordsFromCharset(ALPHA, 40),
  },
  {
    id: 'graduation',
    index: 9,
    title: 'Graduation',
    subtitle: 'Longer run. Prove the path stuck.',
    mechanic: 'speed_check',
    passRule: 'Finish ≥45 WPM and ≥95% accuracy on 50 words',
    minAccuracy: 95,
    minWpm: 45,
    wordCount: 50,
    generate: () => {
      const bank = uniqueWords(TOP_200_WORDS);
      const out: string[] = [];
      for (let i = 0; i < 50; i++) {
        out.push(bank[Math.floor(Math.random() * bank.length)]!);
      }
      return out.join(' ');
    },
  },
];

const PROGRESS_KEY = 'tactile_curriculum_progress';

export type CurriculumProgress = {
  /** Highest lesson index unlocked (0 = first lesson available) */
  unlockedThrough: number;
  /** Lesson ids completed (passed) */
  completed: string[];
  /** Best stats per lesson id */
  bests: Record<string, { accuracy: number; wpm: number; at: string }>;
};

export function loadCurriculumProgress(): CurriculumProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { unlockedThrough: 0, completed: [], bests: {} };
    const p = JSON.parse(raw) as CurriculumProgress;
    return {
      unlockedThrough: p.unlockedThrough ?? 0,
      completed: p.completed ?? [],
      bests: p.bests ?? {},
    };
  } catch {
    return { unlockedThrough: 0, completed: [], bests: {} };
  }
}

export function saveCurriculumProgress(p: CurriculumProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function isLessonUnlocked(lesson: LessonDef, progress: CurriculumProgress): boolean {
  return lesson.index <= progress.unlockedThrough;
}

export function isLessonComplete(lesson: LessonDef, progress: CurriculumProgress): boolean {
  return progress.completed.includes(lesson.id);
}

export function markLessonPassed(
  lesson: LessonDef,
  stats: { accuracy: number; wpm: number }
): CurriculumProgress {
  const p = loadCurriculumProgress();
  if (!p.completed.includes(lesson.id)) {
    p.completed.push(lesson.id);
  }
  const prev = p.bests[lesson.id];
  if (!prev || stats.wpm > prev.wpm || (stats.wpm === prev.wpm && stats.accuracy > prev.accuracy)) {
    p.bests[lesson.id] = {
      accuracy: stats.accuracy,
      wpm: stats.wpm,
      at: new Date().toISOString(),
    };
  }
  // Unlock next
  const nextIndex = lesson.index + 1;
  if (nextIndex < CURRICULUM.length && nextIndex > p.unlockedThrough) {
    p.unlockedThrough = nextIndex;
  }
  // If all complete, unlock stays at last
  if (lesson.index === CURRICULUM.length - 1) {
    p.unlockedThrough = CURRICULUM.length - 1;
  }
  saveCurriculumProgress(p);
  // Fire-and-forget server sync when available
  void pushCurriculumToServer(p);
  return p;
}

/** Merge two progress blobs - take the furthest unlock and union of completed. */
export function mergeCurriculumProgress(
  a: CurriculumProgress,
  b: CurriculumProgress
): CurriculumProgress {
  const completed = [...new Set([...a.completed, ...b.completed])];
  const bests: CurriculumProgress['bests'] = { ...a.bests };
  for (const [id, best] of Object.entries(b.bests)) {
    const prev = bests[id];
    if (!prev || best.wpm > prev.wpm || (best.wpm === prev.wpm && best.accuracy > prev.accuracy)) {
      bests[id] = best;
    }
  }
  // Unlock at least as far as furthest completed lesson
  let unlockedThrough = Math.max(a.unlockedThrough, b.unlockedThrough);
  for (const id of completed) {
    const lesson = CURRICULUM.find((l) => l.id === id);
    if (lesson) {
      unlockedThrough = Math.max(
        unlockedThrough,
        Math.min(lesson.index + 1, CURRICULUM.length - 1)
      );
    }
  }
  return { unlockedThrough, completed, bests };
}

export async function pullCurriculumFromServer(
  fetcher: () => Promise<CurriculumProgress | null>
): Promise<CurriculumProgress> {
  const local = loadCurriculumProgress();
  try {
    const remote = await fetcher();
    if (!remote) return local;
    const merged = mergeCurriculumProgress(local, remote);
    saveCurriculumProgress(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function pushCurriculumToServer(
  progress: CurriculumProgress,
  putter?: (p: CurriculumProgress) => Promise<void>
): Promise<void> {
  if (!putter) {
    // Lazy import to avoid circular deps at module load
    try {
      const { challengesApi } = await import('@/services/challengesApi');
      await challengesApi.putCurriculum(progress);
    } catch {
      /* guest or offline */
    }
    return;
  }
  try {
    await putter(progress);
  } catch {
    /* ignore */
  }
}

export function getLesson(id: string): LessonDef | undefined {
  return CURRICULUM.find((l) => l.id === id);
}

export function curriculumCompletionPercent(progress: CurriculumProgress): number {
  return Math.round((progress.completed.length / CURRICULUM.length) * 100);
}
