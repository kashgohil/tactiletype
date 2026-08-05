/** Strong ease-out for UI enter/exit (animations.dev). */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** On-screen morph / panel movement. */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** Tailwind-friendly cubic-bezier string for class names. */
export const EASE_OUT_CSS = 'cubic-bezier(0.23,1,0.32,1)';

/** Shared Motion transition for occasional UI (modals, panels, auth). */
export function uiTransition(reducedMotion: boolean, duration = 0.2) {
  return {
    duration: reducedMotion ? 0 : duration,
    ease: EASE_OUT,
  };
}

/**
 * Auth cards settle upward as they fade in. Drops the travel (but keeps the
 * resting offset) when the user asked for reduced motion.
 */
export function authCardEnter(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: '-40%' },
      exit: { opacity: 1, y: '-40%' },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: '-30%' },
    animate: { opacity: 1, y: '-40%' },
    exit: { opacity: 0, y: -40 },
    transition: { duration: 0.3, ease: EASE_IN_OUT },
  };
}

/** Opacity-only enter for rare page cards when motion is allowed. */
export function fadeEnter(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: uiTransition(false, 0.2),
  };
}
