import type { DailyModeChallenge } from '@tactile/content';
import { getDailyModeForDate } from '@tactile/content';

const DAILY_RUN_KEY = 'tactile_daily_run';
const LOCAL_BOARD_KEY = 'tactile_daily_mode_local_board';

export type ActiveDailyRun = {
  date: string;
  modeId: string;
  exercisePackId: string;
  ghostPace?: number;
  lives?: 1 | 3;
};

export function beginDailyRun(mode?: DailyModeChallenge): ActiveDailyRun {
  const m = mode ?? getDailyModeForDate();
  const run: ActiveDailyRun = {
    date: m.date,
    modeId: m.modeId,
    exercisePackId: m.exercisePackId,
    ghostPace: m.params.ghostPace,
    lives: m.params.lives,
  };
  sessionStorage.setItem(DAILY_RUN_KEY, JSON.stringify(run));
  return run;
}

export function peekDailyRun(): ActiveDailyRun | null {
  try {
    const raw = sessionStorage.getItem(DAILY_RUN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveDailyRun;
  } catch {
    return null;
  }
}

/** Clear after a successful daily submit (or abandon). */
export function clearDailyRun() {
  sessionStorage.removeItem(DAILY_RUN_KEY);
}

/** True if current run is today's daily for this mode. */
export function isActiveDailyForMode(modeId: string): boolean {
  const run = peekDailyRun();
  if (!run) return false;
  const today = getDailyModeForDate().date;
  return run.date === today && run.modeId === modeId;
}

export type LocalBoardEntry = {
  date: string;
  modeId: string;
  wpm: number;
  accuracy: number;
  score: number;
  label: string;
  at: string;
  username?: string;
};

export function loadLocalDailyModeBoard(date: string): LocalBoardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOARD_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as LocalBoardEntry[];
    return all
      .filter((e) => e.date === date)
      .sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy)
      .slice(0, 15);
  } catch {
    return [];
  }
}

export function saveLocalDailyModeScore(entry: Omit<LocalBoardEntry, 'at'>) {
  try {
    const raw = localStorage.getItem(LOCAL_BOARD_KEY);
    const all: LocalBoardEntry[] = raw ? JSON.parse(raw) : [];
    all.push({ ...entry, at: new Date().toISOString() });
    // Keep last 60 entries
    localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(all.slice(-60)));
  } catch {
    /* ignore */
  }
}
