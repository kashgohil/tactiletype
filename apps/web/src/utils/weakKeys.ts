/**
 * Client-side weak-key memory so adaptive modes work for guests
 * and without waiting on full analytics processing.
 */

const STORAGE_KEY = 'tactile_weak_key_stats';
const MAX_CHARS = 64;

export type WeakKeyStat = {
  char: string;
  errors: number;
  total: number;
};

type Store = Record<string, { errors: number; total: number }>;

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function saveStore(store: Store) {
  // Cap size: keep worst offenders + high volume
  const entries = Object.entries(store);
  if (entries.length > MAX_CHARS) {
    entries.sort((a, b) => {
      const ar = a[1].errors / Math.max(1, a[1].total);
      const br = b[1].errors / Math.max(1, b[1].total);
      return br - ar || b[1].errors - a[1].errors;
    });
    const next: Store = {};
    for (const [k, v] of entries.slice(0, MAX_CHARS)) next[k] = v;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Record one keystroke attempt (expected printable char). */
export function recordKeyAttempt(expectedChar: string, correct: boolean) {
  if (expectedChar?.length !== 1) return;
  // Skip pure whitespace tracking noise except space
  if (expectedChar !== ' ' && /\s/.test(expectedChar)) return;

  const store = loadStore();
  const key = expectedChar;
  const cur = store[key] ?? { errors: 0, total: 0 };
  cur.total += 1;
  if (!correct) cur.errors += 1;
  store[key] = cur;
  saveStore(store);
}

/** Bulk record from a keystroke event list (e.g. after a test). */
export function recordFromKeystrokes(
  events: { expectedChar?: string; correct?: boolean; isBackspace?: boolean }[]
) {
  for (const e of events) {
    if (e.isBackspace) continue;
    if (e.expectedChar?.length !== 1) continue;
    recordKeyAttempt(e.expectedChar, e.correct !== false);
  }
}

export function getWeakKeys(limit = 6): WeakKeyStat[] {
  const store = loadStore();
  return Object.entries(store)
    .filter(([, v]) => v.total >= 3 && v.errors >= 1)
    .map(([char, v]) => ({ char, errors: v.errors, total: v.total }))
    .sort((a, b) => {
      const ar = a.errors / a.total;
      const br = b.errors / b.total;
      return br - ar || b.errors - a.errors;
    })
    .slice(0, limit);
}

export function getWeakKeyChars(limit = 6): string[] {
  return getWeakKeys(limit)
    .map((k) => k.char)
    .filter((c) => c !== ' ');
}

/** Merge API error analysis chars with local memory. */
export function mergeWeakKeys(
  apiChars?: { character: string; errorCount: number }[] | null,
  limit = 6
): string[] {
  const scores = new Map<string, number>();
  for (const k of getWeakKeys(12)) {
    scores.set(k.char, (k.errors / Math.max(1, k.total)) * 10 + k.errors);
  }
  for (const c of apiChars ?? []) {
    if (!c.character) continue;
    scores.set(c.character, (scores.get(c.character) ?? 0) + c.errorCount * 2);
  }
  return [...scores.entries()]
    .filter(([ch]) => ch !== ' ' && ch.length === 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ch]) => ch);
}
