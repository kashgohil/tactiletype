/**
 * Guest → account continuity: store last N local results, merge on signup/login.
 */

const STORAGE_KEY = 'tactile-guest-results';
const MAX_GUEST_RESULTS = 20;
const MAX_RETRIES = 3;

export interface GuestResult {
  id: string;
  title: string;
  content: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  wordCount: number;
  mode?: string;
  testType?: string;
  modeTarget?: number;
  exerciseKind?: string;
  exercisePackId?: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
  completedAt: string;
}

export interface MergeResult {
  attempted: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

export function loadGuestResults(): GuestResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestResult(
  result: Omit<GuestResult, 'id' | 'completedAt'> & {
    id?: string;
    completedAt?: string;
  }
): GuestResult {
  const entry: GuestResult = {
    ...result,
    id: result.id ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    completedAt: result.completedAt ?? new Date().toISOString(),
  };
  const existing = loadGuestResults();
  const next = [entry, ...existing].slice(0, MAX_GUEST_RESULTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export function clearGuestResults() {
  localStorage.removeItem(STORAGE_KEY);
}

export function countGuestResults(): number {
  return loadGuestResults().length;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function submitWithRetry(
  submit: (data: GuestResult) => Promise<unknown>,
  r: GuestResult
): Promise<boolean> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await submit({
        ...r,
        timeTaken: Math.max(1, r.timeTaken),
      });
      return true;
    } catch (err) {
      lastErr = err;
      // Exponential backoff: 400ms, 800ms, 1600ms
      if (attempt < MAX_RETRIES - 1) {
        await sleep(400 * 2 ** attempt);
      }
    }
  }
  console.warn('Guest result upload failed after retries', r.id, lastErr);
  return false;
}

/**
 * Upload guest results to the API after login/register.
 * Retries each item; continues on failure (keeps failed items).
 */
export async function mergeGuestResults(
  submit: (data: {
    title: string;
    content: string;
    language: string;
    difficulty: 'easy' | 'medium' | 'hard';
    wordCount: number;
    mode?: string;
    testType?: string;
    modeTarget?: number;
    exerciseKind?: string;
    exercisePackId?: string;
    wpm: number;
    accuracy: number;
    errors: number;
    timeTaken: number;
    keystrokeData?: string;
  }) => Promise<unknown>
): Promise<MergeResult> {
  const pending = loadGuestResults();
  if (!pending.length) {
    return { attempted: 0, succeeded: 0, failed: 0, remaining: 0 };
  }

  // Oldest first
  const ordered = [...pending].reverse();
  const failed: GuestResult[] = [];
  let succeeded = 0;

  for (const r of ordered) {
    const ok = await submitWithRetry(
      (row) =>
        submit({
          title: row.title,
          content: row.content,
          language: row.language,
          difficulty: row.difficulty,
          wordCount: row.wordCount,
          mode: row.mode,
          testType: row.testType,
          modeTarget: row.modeTarget,
          exerciseKind: row.exerciseKind,
          exercisePackId: row.exercisePackId,
          wpm: row.wpm,
          accuracy: row.accuracy,
          errors: row.errors,
          timeTaken: Math.max(1, row.timeTaken),
          keystrokeData: row.keystrokeData,
        }),
      r
    );
    if (ok) succeeded++;
    else failed.push(r);
  }

  if (failed.length === 0) {
    clearGuestResults();
  } else {
    // Keep failed (newest first for storage convention)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...failed].reverse()));
  }

  return {
    attempted: ordered.length,
    succeeded,
    failed: failed.length,
    remaining: failed.length,
  };
}
