/**
 * Guest → account continuity: store last N local results, merge on signup/login.
 */

const STORAGE_KEY = 'tactile-guest-results';
const MAX_GUEST_RESULTS = 20;

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

/**
 * Upload guest results to the API after login/register.
 * Returns number successfully submitted.
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
): Promise<number> {
  const pending = loadGuestResults();
  if (!pending.length) return 0;

  let ok = 0;
  // Oldest first so timeline order is natural
  const ordered = [...pending].reverse();
  for (const r of ordered) {
    try {
      await submit({
        title: r.title,
        content: r.content,
        language: r.language,
        difficulty: r.difficulty,
        wordCount: r.wordCount,
        mode: r.mode,
        testType: r.testType,
        modeTarget: r.modeTarget,
        exerciseKind: r.exerciseKind,
        exercisePackId: r.exercisePackId,
        wpm: r.wpm,
        accuracy: r.accuracy,
        errors: r.errors,
        timeTaken: Math.max(1, r.timeTaken),
        keystrokeData: r.keystrokeData,
      });
      ok++;
    } catch {
      // keep remaining on failure; stop to avoid partial chaos
      break;
    }
  }

  if (ok === pending.length) {
    clearGuestResults();
  } else if (ok > 0) {
    // Drop successfully uploaded (oldest ok items)
    const remaining = ordered.slice(ok).reverse();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  }

  return ok;
}
