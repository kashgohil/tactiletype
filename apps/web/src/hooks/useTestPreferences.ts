import { useCallback, useEffect, useState } from 'react';

export type CaretStyle = 'line' | 'block' | 'underline' | 'box';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type KeyboardLayout = 'qwerty' | 'colemak' | 'dvorak';

export interface TestPreferences {
  caretStyle: CaretStyle;
  fontSize: FontSize;
  hideLiveStats: boolean;
  smoothCaret: boolean;
  soundEnabled: boolean;
  errorSoundEnabled: boolean;
  keyboardLayout: KeyboardLayout;
  /** Stronger contrast between typed / untyped */
  highContrastTyped: boolean;
}

// Bumped with the design restore: values saved under the old key carry the
// previous design's defaults (high-contrast typed chars, non-default font
// sizes) and would silently override the restored look.
const STORAGE_KEY = 'tactile-test-preferences-v2';

export const DEFAULT_TEST_PREFERENCES: TestPreferences = {
  caretStyle: 'line',
  fontSize: 'lg',
  hideLiveStats: false,
  smoothCaret: true,
  soundEnabled: false,
  errorSoundEnabled: false,
  keyboardLayout: 'qwerty',
  highContrastTyped: false,
};

function load(): TestPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TEST_PREFERENCES };
    return { ...DEFAULT_TEST_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TEST_PREFERENCES };
  }
}

export function useTestPreferences() {
  const [prefs, setPrefsState] = useState<TestPreferences>(load);

  useEffect(() => {
    setPrefsState(load());
  }, []);

  const setPrefs = useCallback((patch: Partial<TestPreferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEST_PREFERENCES));
    setPrefsState({ ...DEFAULT_TEST_PREFERENCES });
  }, []);

  return { prefs, setPrefs, resetPrefs };
}

export const FONT_SIZE_CLASS: Record<FontSize, string> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};
