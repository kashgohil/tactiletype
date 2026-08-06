import { accuracyVsSpeed } from './guides/accuracy-vs-speed';
import { codeTypingPractice } from './guides/code-typing-practice';
import { howToImproveTypingSpeed } from './guides/how-to-improve-typing-speed';
import { whatIsWpm } from './guides/what-is-wpm';
import type { ContentPage } from './types';
import { typingTestPage } from './typing-test';

/** Ordered for the hub page: definition first, then method, then niche. */
export const GUIDES: ContentPage[] = [
  whatIsWpm,
  howToImproveTypingSpeed,
  accuracyVsSpeed,
  codeTypingPractice,
];

/** Every data-driven content page, keyed by route path. */
export const CONTENT_PAGES: Record<string, ContentPage> = Object.fromEntries(
  [typingTestPage, ...GUIDES].map((page) => [page.path, page])
);

export function getContentPage(path: string): ContentPage | undefined {
  return CONTENT_PAGES[path];
}

/** Slug → guide, for the `/guides/$slug` route. */
export function getGuideBySlug(slug: string): ContentPage | undefined {
  return GUIDES.find((guide) => guide.path === `/guides/${slug}`);
}

export function guideSlug(guide: ContentPage): string {
  return guide.path.replace('/guides/', '');
}

/** Newest `updated` across the cluster — drives the hub's freshness stamp. */
export function latestGuideUpdate(): string {
  return GUIDES.map((g) => g.updated).sort().at(-1) ?? '';
}
