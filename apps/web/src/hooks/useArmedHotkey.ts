import { useEffect, useMemo, useRef } from 'react';

/**
 * A window-level shortcut that ignores the keystroke still in flight.
 *
 * Play modes hand off between screens on a keypress - submitting a round with
 * enter, dying on a wrong key - and the screen that appears binds its shortcut
 * while that same event is still bubbling to `window`, so it would fire on the
 * key that summoned it. Arming after a beat also absorbs the keys a player is
 * still typing when a run ends under them.
 */
export function useArmedHotkey(
  keys: string[],
  handler: () => void,
  { enabled = true, delayMs = 400 }: { enabled?: boolean; delayMs?: number } = {}
) {
  const latest = useRef(handler);
  // `keys` is rebuilt every render, so the serialised form stands in for it -
  // depending on the array itself would rebind the listener in a loop.
  const signature = JSON.stringify(keys);
  const watched = useMemo(() => new Set<string>(JSON.parse(signature)), [signature]);

  useEffect(() => {
    latest.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, delayMs);

    const onKey = (e: KeyboardEvent) => {
      if (!armed) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!watched.has(e.key)) return;
      e.preventDefault();
      latest.current();
    };

    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(arm);
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled, delayMs, watched]);
}
