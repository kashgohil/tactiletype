/**
 * Deterministic "mode of the day" rotation (UTC date).
 * Shared by API + web so everyone plays the same challenge.
 */

export const DAILY_MODE_IDS = [
  'sudden-death',
  'word-storm',
  'ghost-race',
  'memory-flash',
  'weak-storm',
] as const;

export type DailyModeId = (typeof DAILY_MODE_IDS)[number];

export type DailyModeChallenge = {
  date: string;
  modeId: DailyModeId;
  title: string;
  tagline: string;
  description: string;
  /** Extra params (e.g. ghost pace) derived from the day seed */
  params: {
    ghostPace?: number;
    lives?: 1 | 3;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  exerciseKind: 'daily_mode';
  exercisePackId: string;
};

const META: Record<DailyModeId, { title: string; tagline: string; description: string }> = {
  'sudden-death': {
    title: 'Sudden Death',
    tagline: 'One wrong key ends the run',
    description: 'Today everyone survives the same pressure: hardcore accuracy.',
  },
  'word-storm': {
    title: 'Word Storm',
    tagline: 'One word. Rising heat.',
    description: 'Clear as many words as you can before the timer eats you.',
  },
  'ghost-race': {
    title: 'Ghost Race',
    tagline: 'Beat today’s pace ghost',
    description: 'Race a ghost at today’s fixed WPM target. Finish first to rank.',
  },
  'memory-flash': {
    title: 'Memory Flash',
    tagline: 'See it. Type it back.',
    description: 'Five rounds of memorize → type. Highest recall accuracy wins ties.',
  },
  'weak-storm': {
    title: 'Weak Storm',
    tagline: 'Your mistakes, on a timer',
    description: 'Adaptive storm - still ranks by WPM so the field stays comparable.',
  },
};

const GHOST_PACES = [50, 60, 70, 80, 90, 100] as const;

/** Simple stable hash of YYYY-MM-DD */
export function daySeed(date = new Date()): { dayKey: string; seed: number } {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayKey = utc.toISOString().slice(0, 10);
  const seed = dayKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return { dayKey, seed };
}

export function getDailyModeForDate(date = new Date()): DailyModeChallenge {
  const { dayKey, seed } = daySeed(date);
  const modeId = DAILY_MODE_IDS[seed % DAILY_MODE_IDS.length]!;
  const meta = META[modeId];
  const params: DailyModeChallenge['params'] = {
    difficulty: 'medium',
  };

  if (modeId === 'ghost-race') {
    params.ghostPace = GHOST_PACES[seed % GHOST_PACES.length];
  }
  if (modeId === 'sudden-death') {
    params.lives = 1;
  }

  return {
    date: dayKey,
    modeId,
    title: `Daily mode · ${meta.title}`,
    tagline: meta.tagline,
    description: meta.description,
    params,
    exerciseKind: 'daily_mode',
    exercisePackId: `daily-mode-${dayKey}`,
  };
}
