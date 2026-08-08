/**
 * Lightweight Web Audio beeps — no asset files.
 * Off by default; called only when preferences enable sound.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

function beep(frequency: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.04) {
  const audio = getCtx();
  if (!audio) return;

  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audio.destination);

  const now = audio.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export function playKeyClick() {
  beep(620, 30, 'square', 0.025);
}

export function playErrorBeep() {
  beep(180, 90, 'sawtooth', 0.05);
}

export function playCompleteChime() {
  beep(523, 80, 'sine', 0.04);
  setTimeout(() => beep(659, 100, 'sine', 0.04), 90);
}
