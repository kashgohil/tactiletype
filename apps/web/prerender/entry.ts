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
import { getAppCopy } from '@/content/app-copy';
import { PLAY_MODE_PAGES, type PlayModePage } from '@/content/play-modes';
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
  playModeGraph,
  playModeTrail,
  resolvePageMeta,
  SITE_NAME,
  SITE_URL,
  TWITTER_CARD_TYPE,
} from '@/lib/seo';
import { getPlayMode } from '@/utils/playModes';

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

/**
 * Play modes rank below the hub that links them. They carry real copy now, so
 * they belong in the sitemap; they are still six variations on one idea, so
 * they should not outrank `/play` itself.
 */
const PLAY_MODE_SITEMAP = { changefreq: 'monthly', priority: '0.6' };

function sitemapFor(path: string, lastmod: string): PrerenderRoute['sitemap'] {
  if (path.startsWith('/guides/')) return { ...GUIDE_SITEMAP, lastmod };
  if (path.startsWith('/play/')) return { ...PLAY_MODE_SITEMAP, lastmod };
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

/**
 * Mirror for a `/play/:mode` page.
 *
 * The game itself cannot be mirrored - it is the JavaScript. What can be
 * mirrored is everything the page says about the game, which is the half a
 * crawler was missing entirely before these pages had copy.
 */
function playModeNoscript(page: PlayModePage, h1: string): string {
  const parts = [
    `<h1>${esc(h1)}</h1>`,
    `<p>${inline(page.intro)}</p>`,
    ...page.sections.map(
      (s) => `<section><h2>${esc(s.heading)}</h2>${s.blocks.map(blockHtml).join('')}</section>`
    ),
    `<section><h2>Frequently asked questions</h2>${page.faq
      .map((f) => `<h3>${esc(f.q)}</h3><p>${inline(f.a)}</p>`)
      .join('')}</section>`,
    `<p>${esc(h1)} is an interactive typing game and needs JavaScript to play.</p>`,
    `<nav><h2>Related</h2><ul>${page.related
      .map((r) => `<li><a href="${r.to}">${esc(r.label)}</a> - ${esc(r.hint)}</li>`)
      .join('')}</ul></nav>`,
  ];
  return parts.join('');
}

/**
 * Mirror for interactive app routes.
 *
 * Most have no prose beyond their meta, so the mirror is the title, the
 * description, and a route out to the pages that do. Where a route has
 * authored copy in `content/app-copy.ts`, that copy is used instead - the
 * static HTML then says what the rendered page says rather than a summary of it.
 */
function appNoscript(meta: PageMeta): string {
  const copy = getAppCopy(meta.path);
  const head = copy
    ? [
        `<h1>${esc(copy.h1)}</h1>`,
        `<p>${esc(copy.intro)}</p>`,
        ...(copy.steps
          ? [
              `<section><h2>${esc(copy.steps.heading)}</h2><ol>${copy.steps.items
                .map((i) => `<li>${esc(i)}</li>`)
                .join('')}</ol></section>`,
            ]
          : []),
      ]
    : [`<h1>${esc(meta.title.split('|')[0].trim())}</h1>`, `<p>${esc(meta.description)}</p>`];

  return [
    ...head,
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

  for (const page of PLAY_MODE_PAGES) {
    const meta = resolvePageMeta(page.path);
    // The visible H1 comes from PLAY_MODES via PlayShell; reading it from the
    // same record keeps the static mirror and the mounted app in agreement.
    const h1 = getPlayMode(page.mode)?.title ?? page.mode;
    routes.push({
      path: page.path,
      meta,
      jsonLd: [
        { id: 'jsonld-default', json: JSON.stringify(defaultGraph()) },
        {
          id: 'jsonld-play-mode',
          json: JSON.stringify(playModeGraph(page, playModeTrail(page, h1))),
        },
      ],
      noscript: playModeNoscript(page, h1),
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

/** `Free Typing Test - Check Your WPM | tactiletype` -> `Free Typing Test - Check Your WPM`. */
function shortTitle(title: string): string {
  return title.split('|')[0].trim();
}

/**
 * Sections of `llms.txt`, in the order an unfamiliar reader should meet them.
 * `Optional` is the convention's own name for the tail an assistant may skip
 * when it is short on context, so the trust pages live there rather than
 * competing with the product for attention.
 */
const LLMS_SECTIONS: { heading: string; match: (path: string) => boolean; lead?: string }[] = [
  {
    heading: 'Core pages',
    match: (p) =>
      [
        '/',
        '/typing-test',
        '/practice',
        '/play',
        '/daily',
        '/leaderboard',
        '/multiplayer',
      ].includes(p),
  },
  {
    heading: 'Guides',
    match: (p) => p === '/guides' || p.startsWith('/guides/'),
    // The hub is generated last but reads first: it is the page that explains
    // what the other four are.
    lead: '/guides',
  },
  { heading: 'Play modes', match: (p) => p.startsWith('/play/') },
  {
    heading: 'Optional',
    match: (p) => ['/contact', '/login', '/register', '/privacy', '/terms'].includes(p),
  },
];

/**
 * `llms.txt`: the site in one plain-text file, for assistants that read a page
 * rather than crawl a site.
 *
 * Generated from the same route list as the sitemap for the same reason - a
 * hand-written index of a site that ships weekly is a list of things that used
 * to be true. The format is the llms.txt convention: an H1, a one-paragraph
 * summary, then linked sections with a note on each URL.
 */
export function buildLlmsTxt(routes: PrerenderRoute[]): string {
  const indexable = routes.filter((r) => r.meta.robots !== 'noindex, nofollow');
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    '> A free online typing test and trainer. Measure words per minute and accuracy, drill the keys you actually miss, play six training modes with different rules, and race other people in real time. No account is needed to take a test.',
    '',
    `${SITE_NAME} is a web application, so most URLs below are interactive rather than articles. Each play mode explains its own rules in writing on the same page as the game. The guides are plain-language explainers with cited sources, and each carries a visible last-updated date.`,
    '',
    'Figures quoted across the site come from named research rather than from our own users: the 2018 Aalto University and University of Cambridge study of 136 million keystrokes for the ~52 WPM average, and the long-standing five-characters-per-word convention for how WPM is counted.',
  ];

  for (const section of LLMS_SECTIONS) {
    const matches = indexable
      .filter((r) => section.match(r.path))
      .sort((a, b) => Number(b.path === section.lead) - Number(a.path === section.lead));
    if (!matches.length) continue;
    lines.push('', `## ${section.heading}`, '');
    for (const route of matches) {
      lines.push(
        `- [${shortTitle(route.meta.title)}](${absoluteUrl(route.path)}): ${route.meta.description}`
      );
    }
  }

  lines.push(
    '',
    '## Notes',
    '',
    `- Canonical origin: ${SITE_URL}`,
    `- Full URL list with change dates: ${SITE_URL}/sitemap.xml`,
    '- Crawling policy: all major search and AI crawlers are allowed; private and ephemeral app surfaces (profiles, settings, analytics, race rooms) are disallowed and carry noindex.',
    ''
  );

  return lines.join('\n');
}
/** Head constants the writer needs but shouldn't re-derive. */
export const HEAD = {
  siteName: SITE_NAME,
  ogImage: DEFAULT_OG_IMAGE,
  ogImageSize: DEFAULT_OG_IMAGE_SIZE,
  twitterCard: TWITTER_CARD_TYPE,
  absoluteUrl,
};
