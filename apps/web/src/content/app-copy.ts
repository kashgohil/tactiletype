/**
 * Prose that belongs to an interactive app route rather than to a content page.
 *
 * `/multiplayer` is the case that forced this to exist: signed out, the page
 * was a single "Authentication Required" card, which is what every crawler and
 * every first-time visitor saw of an indexable URL. The copy has to render in
 * the app *and* mirror into the prerendered `<noscript>` block, so it lives
 * here rather than inside the component, on the same principle as
 * `content/types.ts`: one set of sentences, three renderings.
 *
 * Keep this small. A route that grows past an intro and a list of steps has
 * become a content page and belongs in `content/registry.ts`.
 */
export type AppPageCopy = {
  path: string;
  /** Visible H1. */
  h1: string;
  /** Answer-first paragraph, rendered under the H1. */
  intro: string;
  steps?: { heading: string; items: string[] };
};

export const APP_COPY: Record<string, AppPageCopy> = {
  '/multiplayer': {
    path: '/multiplayer',
    h1: 'Multiplayer typing races',
    intro:
      'Race other people on the same passage in real time. Everyone sees everyone else’s speed and position as it happens, which turns a typing test into the one thing a solo run cannot simulate: someone else pulling ahead.',
    steps: {
      heading: 'How a race works',
      items: [
        'Create a room or join one from the browser. Every room is built around one passage, so everyone types the same text.',
        'The host starts the race when the room is ready. Racing solo is allowed, and anyone can join an in-progress race as a spectator.',
        'Live WPM and progress update for every racer as they type, so the standings move while the race runs rather than at the end.',
        'The race ends when the passage does. Results are saved to your profile alongside your solo tests.',
      ],
    },
  },
};

export function getAppCopy(path: string): AppPageCopy | undefined {
  return APP_COPY[path];
}
