/**
 * Data source for the prerender step.
 *
 * Built with `vite build --ssr` so it can share the app's TypeScript, path
 * aliases, and - critically - the exact same `lib/seo.ts` and `content/*`
 * modules the runtime uses. Anything that regenerated this list independently
 * would drift from the app within a release or two.
 *
 * Nothing here imports React. The content model is plain data, so the static
 * HTML is produced by string building rather than by rendering the app, which
 * keeps the step fast and immune to browser-only globals.
 */
import { GUIDES, latestGuideUpdate } from '@/content/registry';
import type { Block, ContentPage } from '@/content/types';
import { typingTestPage } from '@/content/typing-test';
import {
  absoluteUrl,
  contentPageGraph,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_SIZE,
  defaultGraph,
  type PageMeta,
  resolvePageMeta,
  SITE_NAME,
  TWITTER_CARD_TYPE,
} from '@/lib/seo';

export type PrerenderRoute = {
  /** Route path, e.g. `/guides/what-is-wpm`. */
  path: string;
  meta: PageMeta;
  /** Serialized JSON-LD graphs, keyed by the script `id` they occupy. */
  jsonLd: { id: string; json: string }[];
  /** HTML for the `<noscript>` mirror, already escaped. */
  noscript: string;
  /** Sitemap entry. Omitted for pages that shouldn't be listed. */
  sitemap?: { changefreq: string; priority: string; lastmod: string };
};

/**
 * Bump by hand when an app page's content materially changes.
 *
 * Deliberately not a build timestamp: rewriting every `lastmod` on each deploy
 * tells Google the whole site changed when it didn't, and it learns to ignore
 * the signal. Content pages carry their own `updated` date instead.
 */
const APP_LASTMOD = '2026-08-07';

/** Per-path sitemap weighting. Absent = crawlable but not advertised. */
const SITEMAP: Record<string, { changefreq: string; priority: string }> = {
  '/': { changefreq: 'weekly', priority: '1.0' },
  '/typing-test': { changefreq: 'monthly', priority: '0.9' },
  '/practice': { changefreq: 'weekly', priority: '0.9' },
  '/play': { changefreq: 'weekly', priority: '0.9' },
  '/guides': { changefreq: 'weekly', priority: '0.8' },
  '/daily': { changefreq: 'daily', priority: '0.8' },
  '/leaderboard': { changefreq: 'daily', priority: '0.7' },
  '/multiplayer': { changefreq: 'weekly', priority: '0.7' },
  '/contact': { changefreq: 'monthly', priority: '0.5' },
  // Indexed on purpose (decision 2026-08-07): they catch brand intent like
  // "tactiletype login" / "sign up for tactiletype". Low priority because they
  // are entry doors, not content - being listed matters more than being ranked.
  '/login': { changefreq: 'monthly', priority: '0.4' },
  '/register': { changefreq: 'monthly', priority: '0.4' },
  '/privacy': { changefreq: 'yearly', priority: '0.3' },
  '/terms': { changefreq: 'yearly', priority: '0.3' },
};

/** Guides all share one weighting. */
const GUIDE_SITEMAP = { changefreq: 'monthly', priority: '0.8' };

function sitemapFor(path: string, lastmod: string): PrerenderRoute['sitemap'] {
  if (path.startsWith('/guides/')) return { ...GUIDE_SITEMAP, lastmod };
  const entry = SITEMAP[path];
  return entry ? { ...entry, lastmod } : undefined;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Mirrors `RichText`: `[label](/path)` → anchor, `` `code` `` → <code>. */
function inline(text: string): string {
  return esc(text)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_m, label: string, href: string) => `<a href="${href}">${label}</a>`
    )
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function blockHtml(block: Block): string {
  switch (block.kind) {
    case 'p':
      return `<p>${inline(block.text)}</p>`;
    case 'note':
      return `<blockquote><p>${inline(block.text)}</p></blockquote>`;
    case 'list':
      return `<ul>${block.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;
    case 'steps':
      return `<ol>${block.items
        .map((i) => `<li><strong>${inline(i.title)}</strong> ${inline(i.text)}</li>`)
        .join('')}</ol>`;
    case 'stat':
      return `<ul>${block.items
        .map((i) => `<li><strong>${esc(i.value)}</strong> - ${esc(i.label)}</li>`)
        .join('')}</ul>`;
  }
}

/**
 * The `<noscript>` mirror of a content page.
 *
 * This is the honest half of the trade-off documented in the audit: without
 * SSR, a crawler that doesn't execute JavaScript sees an empty `#root`. The
 * mirror gives those crawlers - most AI/answer engines among them - the same
 * words a human reads, generated from the same source, so the two cannot
 * disagree. Google renders the real page and ignores this entirely.
 */
function contentNoscript(page: ContentPage): string {
  const parts = [
    `<h1>${esc(page.h1)}</h1>`,
    `<p>${inline(page.intro)}</p>`,
    ...page.sections.map(
      (s) => `<section><h2>${esc(s.heading)}</h2>${s.blocks.map(blockHtml).join('')}</section>`
    ),
  ];

  if (page.faq?.length) {
    parts.push(
      `<section><h2>Frequently asked questions</h2>${page.faq
        .map((f) => `<h3>${esc(f.q)}</h3><p>${inline(f.a)}</p>`)
        .join('')}</section>`
    );
  }

  if (page.sources?.length) {
    parts.push(
      `<section><h2>Sources</h2><ul>${page.sources
        .map((s) => `<li><a href="${esc(s.href)}" rel="noopener">${esc(s.label)}</a></li>`)
        .join('')}</ul></section>`
    );
  }

  if (page.related?.length) {
    parts.push(
      `<nav><h2>Keep reading</h2><ul>${page.related
        .map((r) => `<li><a href="${r.to}">${esc(r.label)}</a></li>`)
        .join('')}</ul></nav>`
    );
  }

  return parts.join('');
}

/** Minimal mirror for interactive app routes, which have no prose to mirror. */
function appNoscript(meta: PageMeta): string {
  return [
    `<h1>${esc(meta.title.split('|')[0].trim())}</h1>`,
    `<p>${esc(meta.description)}</p>`,
    `<p>tactiletype is an interactive typing trainer and needs JavaScript to run the test itself. These pages explain how it works without it:</p>`,
    `<ul>`,
    `<li><a href="/typing-test">What a typing test measures</a></li>`,
    `<li><a href="/guides/what-is-wpm">What WPM means</a></li>`,
    `<li><a href="/guides/how-to-improve-typing-speed">How to improve typing speed</a></li>`,
    `<li><a href="/guides">All guides</a></li>`,
    `</ul>`,
  ].join('');
}

/** Public, indexable routes. Anything `noindex` is deliberately absent. */
const APP_ROUTES = [
  '/',
  '/practice',
  '/play',
  '/daily',
  '/leaderboard',
  '/multiplayer',
  '/contact',
  '/privacy',
  '/terms',
  '/login',
  '/register',
];

const CONTENT_ROUTES: ContentPage[] = [typingTestPage, ...GUIDES];

export function getPrerenderRoutes(): PrerenderRoute[] {
  const routes: PrerenderRoute[] = [];

  for (const path of APP_ROUTES) {
    const meta = resolvePageMeta(path);
    routes.push({
      path,
      meta,
      jsonLd: [{ id: 'jsonld-default', json: JSON.stringify(defaultGraph()) }],
      noscript: appNoscript(meta),
      sitemap: sitemapFor(path, APP_LASTMOD),
    });
  }

  for (const page of CONTENT_ROUTES) {
    const meta = resolvePageMeta(page.path);
    const trail =
      page.path === '/typing-test'
        ? [
            { name: 'Home', path: '/' },
            { name: 'Typing test explained', path: '/typing-test' },
          ]
        : [
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: page.h1, path: page.path },
          ];
    routes.push({
      path: page.path,
      meta,
      jsonLd: [
        { id: 'jsonld-default', json: JSON.stringify(defaultGraph()) },
        {
          id: 'jsonld-content',
          json: JSON.stringify(contentPageGraph(page, trail)),
        },
      ],
      noscript: contentNoscript(page),
      sitemap: sitemapFor(page.path, page.updated),
    });
  }

  // The guides hub: a listing, so it has meta and schema but no article body.
  const hubMeta = resolvePageMeta('/guides');
  routes.push({
    path: '/guides',
    meta: hubMeta,
    jsonLd: [
      { id: 'jsonld-default', json: JSON.stringify(defaultGraph()) },
      {
        id: 'jsonld-content',
        json: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              '@id': `${absoluteUrl('/guides')}#webpage`,
              url: absoluteUrl('/guides'),
              name: hubMeta.title,
              description: hubMeta.description,
              inLanguage: 'en',
            },
            {
              '@type': 'ItemList',
              itemListElement: GUIDES.map((g, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: g.h1,
                url: absoluteUrl(g.path),
              })),
            },
          ],
        }),
      },
    ],
    noscript: [
      `<h1>Typing guides</h1>`,
      `<p>What the numbers mean, what actually makes you faster, and what to ignore.</p>`,
      `<ul>${GUIDES.map(
        (g) => `<li><a href="${g.path}">${esc(g.h1)}</a> - ${esc(g.description)}</li>`
      ).join('')}</ul>`,
    ].join(''),
    sitemap: sitemapFor('/guides', latestGuideUpdate()),
  });

  return routes;
}

/**
 * The sitemap is generated, not hand-written, so it cannot fall behind the
 * routes. `/test` is absent because it 301s to `/`; every `noindex` surface is
 * absent because listing a page you've told Google to ignore is a contradiction.
 */
export function buildSitemap(routes: PrerenderRoute[]): string {
  const entries = routes
    .filter((r) => r.sitemap)
    .sort((a, b) => Number(b.sitemap!.priority) - Number(a.sitemap!.priority))
    .map(
      (r) =>
        `  <url>\n` +
        `    <loc>${absoluteUrl(r.path)}</loc>\n` +
        `    <lastmod>${r.sitemap!.lastmod}</lastmod>\n` +
        `    <changefreq>${r.sitemap!.changefreq}</changefreq>\n` +
        `    <priority>${r.sitemap!.priority}</priority>\n` +
        `  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

/** Head constants the writer needs but shouldn't re-derive. */
export const HEAD = {
  siteName: SITE_NAME,
  ogImage: DEFAULT_OG_IMAGE,
  ogImageSize: DEFAULT_OG_IMAGE_SIZE,
  twitterCard: TWITTER_CARD_TYPE,
  absoluteUrl,
};
