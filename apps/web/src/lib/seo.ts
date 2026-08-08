import { getContentPage } from '@/content/registry';
import type { ContentPage } from '@/content/types';
import { pageToText, stripLinks } from '@/content/types';

/**
 * Canonical public site origin (no trailing slash).
 *
 * Confirmed 2026-08-07 as the permanent public domain. Everything URL-shaped —
 * canonicals, the sitemap, JSON-LD `@id`s, OG tags — derives from this one
 * constant, so a future move is a single edit plus redirects.
 */
export const SITE_URL = 'https://trytactiletype.com';

export const SITE_NAME = 'tactiletype';

/**
 * Support address — the one inbox the site publishes, on `/contact`, in the
 * privacy policy, and as `Organization.email`. It is a personal Gmail rather
 * than a domain address, so it carries no entity signal for `trytactiletype.com`;
 * a `support@trytactiletype.com` forward would, if the domain ever gets mail.
 */
export const SITE_EMAIL = 'kashyapgohil476@gmail.com';

/**
 * Other URLs that are the same entity as this site.
 *
 * Each one is an independent reference point search engines and answer models
 * use to resolve "tactiletype" into a single thing rather than an unverified
 * domain. Only list profiles that are public, live, and actually ours — a dead
 * link here is worse than an absent one. GitHub is the only one that exists
 * today; there is no X or Discord presence to claim.
 */
export const SAME_AS: string[] = ['https://github.com/kashgohil/tactiletype'];

export const SITE_LOGO = `${SITE_URL}/tactiletype-256x256.png`;

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/** Declared so scrapers can lay the card out before fetching the image. */
export const DEFAULT_OG_IMAGE_SIZE = { width: 1200, height: 630 };

/** 1200×630 clears the 300×157 floor the wide card needs. */
export const TWITTER_CARD_TYPE = 'summary_large_image';

export type PageMeta = {
  title: string;
  description: string;
  /** Path only, e.g. `/practice` — becomes absolute canonical. */
  path: string;
  robots?: string;
  ogType?: string;
};

const INDEX = 'index, follow';
const NOINDEX = 'noindex, nofollow';

/** Static meta for known public and private routes. */
export const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Free Typing Test — Check Your WPM | tactiletype',
    description:
      'Take a free online typing test. Measure words per minute (WPM) and accuracy, then train with drills and play modes. No install — start typing now.',
    path: '/',
    robots: INDEX,
  },
  '/practice': {
    title: 'Typing Practice & Drills | tactiletype',
    description:
      'Targeted typing practice: key drills, bigrams, hard words, and accuracy focus. Turn weak spots into faster, cleaner typing.',
    path: '/practice',
    robots: INDEX,
  },
  '/play': {
    title: 'Typing Games & Training Modes | tactiletype',
    description:
      'Six typing modes — Sudden Death, Ghost Race, Weak Storm, and more — that train speed without the same old timed test.',
    path: '/play',
    robots: INDEX,
  },
  '/daily': {
    title: 'Daily Typing Challenge | tactiletype',
    description:
      'A new shared quote and rotating mode every day. Race the leaderboard and build a real streak.',
    path: '/daily',
    robots: INDEX,
  },
  '/leaderboard': {
    title: 'Typing Leaderboard | tactiletype',
    description: 'See top WPM scores daily, weekly, monthly, and all-time on tactiletype.',
    path: '/leaderboard',
    robots: INDEX,
  },
  '/multiplayer': {
    title: 'Multiplayer Typing Races | tactiletype',
    description: 'Join live typing races, create rooms, and compete in real time.',
    path: '/multiplayer',
    robots: INDEX,
  },
  '/contact': {
    title: 'Contact & Support | tactiletype',
    description: 'Get help with tactiletype: support email, bug reports, feature ideas, and FAQs.',
    path: '/contact',
    robots: INDEX,
  },
  '/privacy': {
    title: 'Privacy Policy | tactiletype',
    description: 'How tactiletype collects, uses, and protects your data.',
    path: '/privacy',
    robots: INDEX,
  },
  '/terms': {
    title: 'Terms of Service | tactiletype',
    description: 'Terms governing use of the tactiletype typing platform.',
    path: '/terms',
    robots: INDEX,
  },
  '/login': {
    title: 'Log in | tactiletype',
    description: 'Log in to tactiletype to save results, track progress, and race others.',
    path: '/login',
    robots: INDEX,
  },
  '/register': {
    title: 'Create account | tactiletype',
    description:
      'Create a free tactiletype account to save WPM history, analytics, and multiplayer progress.',
    path: '/register',
    robots: INDEX,
  },
  // Private app surfaces
  '/settings': {
    title: 'Settings | tactiletype',
    description: 'Typing preferences and account settings.',
    path: '/settings',
    robots: NOINDEX,
  },
  '/analytics': {
    title: 'Analytics | tactiletype',
    description: 'Your personal typing analytics.',
    path: '/analytics',
    robots: NOINDEX,
  },
  '/profile': {
    title: 'Profile | tactiletype',
    description: 'Your tactiletype profile and progress.',
    path: '/profile',
    robots: NOINDEX,
  },
  '/guides': {
    title: 'Typing Guides — Speed, Accuracy & Practice | tactiletype',
    description:
      'Plain-language guides to typing: what WPM measures, how to actually get faster, why accuracy wins, and how code typing differs from prose.',
    path: '/guides',
    robots: INDEX,
  },
};

/**
 * Fallback for paths this table doesn't know. Netlify's SPA rule answers every
 * unknown path with 200 + the shell, so an unrecognised URL is a soft 404 —
 * `noindex` keeps junk paths from self-canonicalising into the index.
 */
const DEFAULT_META: PageMeta = {
  title: 'tactiletype — Free Typing Test & Trainer',
  description:
    'Free typing test and trainer. Measure WPM and accuracy, practice weak spots, play training modes, and race in multiplayer.',
  path: '/',
  robots: NOINDEX,
};

/** Normalize pathname (strip trailing slash except root). */
export function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Resolve page meta for a router pathname.
 * Handles dynamic segments: /play/:mode, /u/:username, rooms, auth.
 */
export function resolvePageMeta(pathname: string): PageMeta {
  const path = normalizePath(pathname);

  if (PAGE_META[path]) return PAGE_META[path];

  // Content pages carry their own title/description so the copy and the SERP
  // entry live in one file and can't drift apart.
  const content = getContentPage(path);
  if (content) {
    return {
      title: content.title,
      description: content.description,
      path,
      robots: INDEX,
      ogType: 'article',
    };
  }

  // /test is redirected to / — keep meta aligned if hit before redirect
  if (path === '/test') return PAGE_META['/'];

  // Play mode detail
  const playMode = path.match(/^\/play\/([^/]+)$/);
  if (playMode) {
    const mode = playMode[1];
    const label = mode
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      title: `${label} — Typing Mode | tactiletype`,
      description: `Play ${label} on tactiletype — a training mode that builds speed and accuracy beyond a basic timer.`,
      path,
      robots: INDEX,
    };
  }

  // Public profile. Noindex until the server can tell us the account is
  // actually public — this resolver only sees the path, so indexing here would
  // publish "This profile is private." and "User not found." shells to search.
  // Lift once profile meta is prerendered/SSR'd (audit item 2.4).
  const profile = path.match(/^\/u\/([^/]+)$/);
  if (profile) {
    const username = decodeURIComponent(profile[1]);
    return {
      title: `${username} — Typing Profile | tactiletype`,
      description: `View ${username}'s typing stats and progress on tactiletype.`,
      path,
      robots: NOINDEX,
    };
  }

  // Multiplayer rooms — ephemeral
  if (path.startsWith('/multiplayer/room')) {
    return {
      title: 'Race Room | tactiletype',
      description: 'Live multiplayer typing race.',
      path,
      robots: NOINDEX,
    };
  }

  // Auth callbacks
  if (path.startsWith('/auth')) {
    return {
      title: 'Signing in | tactiletype',
      description: 'Completing sign-in.',
      path,
      robots: NOINDEX,
    };
  }

  return { ...DEFAULT_META, path };
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${p === '/' ? '/' : p}`;
}

/* -------------------------------------------------------------------------- */
/* JSON-LD                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Schema types are structurally open, so a permissive record beats fighting
 * the type system for a shape that ends up as `JSON.stringify` output anyway.
 */
type Schema = Record<string, unknown>;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema(): Schema {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: SITE_LOGO,
    email: SITE_EMAIL,
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}

export function websiteSchema(): Schema {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
  };
}

export function webApplicationSchema(): Schema {
  return {
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description:
      'Free online typing test and trainer with WPM tracking, practice drills, play modes, and multiplayer races.',
  };
}

export function webPageSchema(meta: { path: string; title: string; description: string }): Schema {
  return {
    '@type': 'WebPage',
    '@id': `${absoluteUrl(meta.path)}#webpage`,
    url: absoluteUrl(meta.path),
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en',
  };
}

/**
 * Only emit this where the questions and answers are actually visible on the
 * page — Google treats FAQ markup that doesn't match rendered content as spam.
 */
export function faqPageSchema(items: { q: string; a: string }[], path: string): Schema {
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(path)}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: stripLinks(item.q),
      acceptedAnswer: { '@type': 'Answer', text: stripLinks(item.a) },
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]): Schema {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

function articleSchema(page: ContentPage): Schema {
  return {
    '@type': 'Article',
    '@id': `${absoluteUrl(page.path)}#article`,
    headline: page.h1,
    description: page.description,
    articleBody: pageToText(page),
    url: absoluteUrl(page.path),
    // No dedicated author entity yet — the organisation stands in, which is
    // accurate and keeps E-E-A-T signals pointing at one resolvable brand.
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    datePublished: page.updated,
    dateModified: page.updated,
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    image: DEFAULT_OG_IMAGE,
    ...(page.sources?.length ? { citation: page.sources.map((s) => s.href) } : {}),
  };
}

/** The sitewide entity graph, inlined in `index.html` for first paint. */
export function defaultGraph(): Schema {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema(), websiteSchema(), webApplicationSchema()],
  };
}

/**
 * Full graph for a data-driven content page: the page itself, its breadcrumb
 * trail, its FAQ (when the page renders one), and the article body.
 */
export function contentPageGraph(
  page: ContentPage,
  trail: { name: string; path: string }[]
): Schema {
  const graph: Schema[] = [webPageSchema(page), articleSchema(page), breadcrumbSchema(trail)];
  if (page.faq?.length) graph.push(faqPageSchema(page.faq, page.path));
  return { '@context': 'https://schema.org', '@graph': graph };
}
