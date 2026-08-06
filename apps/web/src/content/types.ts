/**
 * Content pages are authored as data, not JSX.
 *
 * The reason is SEO, not tidiness: the same tree has to render as React for
 * users, as plain text for the `<noscript>` mirror the prerender step writes
 * into `dist/`, and as JSON-LD for search and answer engines. Authoring in JSX
 * would mean maintaining three drifting copies of every sentence.
 *
 * Inline links use a minimal `[label](/path)` syntax — see `RichText`.
 */

export type Block =
  /** A paragraph. The workhorse. */
  | { kind: 'p'; text: string }
  /** Unordered list of short points. */
  | { kind: 'list'; items: string[] }
  /** Numbered, titled steps — renders as an ordered list. */
  | { kind: 'steps'; items: { title: string; text: string }[] }
  /** Figure row. Keep to 2–4; these are the numbers answer engines quote. */
  | { kind: 'stat'; items: { value: string; label: string }[] }
  /** Set-apart aside. Use sparingly — one per section at most. */
  | { kind: 'note'; text: string };

export type Section = {
  /** Anchor id; also the deep-link target. */
  id: string;
  heading: string;
  blocks: Block[];
};

export type FaqItem = { q: string; a: string };

export type Source = { label: string; href: string };

export type ContentPage = {
  /** Route path, e.g. `/guides/what-is-wpm`. */
  path: string;
  /** `<title>`; keep to ~60 chars. */
  title: string;
  /** `<meta name="description">`; keep to ~155 chars. */
  description: string;
  /** Visible H1. Should differ from `title` — one is a headline, one is a SERP entry. */
  h1: string;
  /**
   * The answer-first paragraph. Answer engines quote this more than anything
   * else on the page, so it must stand alone without the heading above it.
   */
  intro: string;
  sections: Section[];
  faq?: FaqItem[];
  /** ISO date. Drives `dateModified` in schema and the visible freshness stamp. */
  updated: string;
  /** Outbound citations. GEO research is consistent that these raise citation rate. */
  sources?: Source[];
  /** Cards rendered at the foot of the page for internal linking. */
  related?: { label: string; to: string; hint: string }[];
};

/** Flattens a page to plain text for the prerendered `<noscript>` mirror. */
export function blockToText(block: Block): string {
  switch (block.kind) {
    case 'p':
    case 'note':
      return block.text;
    case 'list':
      return block.items.join(' ');
    case 'steps':
      return block.items.map((i) => `${i.title}. ${i.text}`).join(' ');
    case 'stat':
      return block.items.map((i) => `${i.value} ${i.label}`).join(' ');
  }
}

/** Strips the inline `[label](/path)` syntax down to its label. */
export function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
}

/** Plain-text rendering of a whole page, used by the prerenderer and by schema. */
export function pageToText(page: ContentPage): string {
  const parts = [page.h1, page.intro];
  for (const section of page.sections) {
    parts.push(section.heading);
    for (const block of section.blocks) parts.push(blockToText(block));
  }
  for (const item of page.faq ?? []) parts.push(item.q, item.a);
  return parts.map(stripLinks).join('\n\n');
}
