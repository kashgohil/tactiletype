export type LayoutId = 'qwerty' | 'colemak' | 'dvorak';

/** Physical key positions (row strings, left-to-right). */
const QWERTY_ROWS = [
  '`1234567890-=',
  'qwertyuiop[]\\',
  "asdfghjkl;'",
  'zxcvbnm,./',
];

const COLEMAK_ROWS = [
  '`1234567890-=',
  'qwfpgjluy;[]\\',
  "arstdhneio'",
  'zxcvbkm,./',
];

const DVORAK_ROWS = [
  '`1234567890[]',
  "',.pyfgcrl/=\\",
  'aoeuidhtns-',
  ';qjkxbmwvz',
];

const LAYOUTS: Record<LayoutId, string[]> = {
  qwerty: QWERTY_ROWS,
  colemak: COLEMAK_ROWS,
  dvorak: DVORAK_ROWS,
};

export const LAYOUT_LABELS: Record<LayoutId, string> = {
  qwerty: 'QWERTY',
  colemak: 'Colemak',
  dvorak: 'Dvorak',
};

/** Home-row keys for the given layout (for drills / heatmaps). */
export function getHomeRow(layout: LayoutId): string {
  const row = LAYOUTS[layout][2] ?? LAYOUTS.qwerty[2]!;
  return row.slice(0, 9).toLowerCase();
}

/** All letter keys for layout-aware heatmaps. */
export function getLayoutKeys(layout: LayoutId): string[] {
  return LAYOUTS[layout]
    .join('')
    .toLowerCase()
    .split('')
    .filter((c) => /[a-z]/.test(c));
}

export function getLayoutRows(layout: LayoutId): string[] {
  return LAYOUTS[layout];
}

/**
 * Map a character to a row/column for heatmap positioning.
 * Returns null for unmapped chars.
 */
export function charPosition(
  char: string,
  layout: LayoutId
): { row: number; col: number } | null {
  const c = char.toLowerCase();
  const rows = LAYOUTS[layout];
  for (let r = 0; r < rows.length; r++) {
    const col = rows[r]!.toLowerCase().indexOf(c);
    if (col >= 0) return { row: r, col };
  }
  return null;
}
