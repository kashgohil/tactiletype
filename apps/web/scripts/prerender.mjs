/**
 * Writes one static HTML file per public route into `dist/`.
 *
 * Why this exists: the app is a client-rendered SPA served from a single
 * `index.html`, so before this step every URL shipped the homepage's title,
 * description, canonical, and OG tags. Google renders JavaScript and recovers;
 * social scrapers and most AI crawlers read the response body and never do.
 * Every per-route tag was invisible to them, and every shared link previewed as
 * the homepage.
 *
 * Netlify resolves `/practice` to `dist/practice/index.html` before falling
 * through to the SPA rule, so writing these files is enough - `_redirects`
 * needs no change.
 *
 * This is deliberately NOT full SSR. It rewrites the head and adds a
 * `<noscript>` mirror of the copy; the interactive app still mounts client-side
 * exactly as before. Real SSR (TanStack Start) remains the eventual fix and is
 * tracked as audit item 1.7-phase-3.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = join(root, 'dist');

const { getPrerenderRoutes, buildSitemap, HEAD } = await import(
  new URL('../dist-ssr/entry.js', import.meta.url).href
);

const template = await readFile(join(dist, 'index.html'), 'utf8');

const escAttr = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Attribute values in our template never contain `>`, so matching to the first
 * `>` is safe and avoids a runaway non-greedy match across the whole head.
 */
function replaceMeta(html, attr, key, value) {
  const re = new RegExp(`<meta[^>]*\\s${attr}="${key}"[^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escAttr(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escAttr(title)}</title>`);
}

function replaceCanonical(html, href) {
  const re = /<link[^>]*\srel="canonical"[^>]*>/i;
  return html.replace(re, `<link rel="canonical" href="${escAttr(href)}" />`);
}

/**
 * JSON-LD goes in verbatim - it is already JSON, and escaping it would corrupt
 * it. The one real hazard is a literal `</script>` inside a string value, which
 * would end the block early; `<` is escaped to its unicode form to prevent it.
 */
function upsertJsonLd(html, id, json) {
  const safe = json.replace(/</g, '\\u003c');
  const block = `<script type="application/ld+json" id="${id}">${safe}</script>`;
  const re = new RegExp(
    `<script[^>]*type="application/ld\\+json"[^>]*id="${id}"[^>]*>[\\s\\S]*?</script>`,
    'i'
  );
  return re.test(html)
    ? html.replace(re, block)
    : html.replace('</head>', `    ${block}\n  </head>`);
}

function buildPage(route) {
  const { meta, jsonLd, noscript } = route;
  const canonical = HEAD.absoluteUrl(meta.path);

  let html = template;
  html = replaceTitle(html, meta.title);
  html = replaceMeta(html, 'name', 'description', meta.description);
  html = replaceMeta(html, 'name', 'robots', meta.robots ?? 'index, follow');
  html = replaceCanonical(html, canonical);

  html = replaceMeta(html, 'property', 'og:title', meta.title);
  html = replaceMeta(html, 'property', 'og:description', meta.description);
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'property', 'og:type', meta.ogType ?? 'website');
  html = replaceMeta(html, 'property', 'og:image', HEAD.ogImage);
  html = replaceMeta(html, 'property', 'og:image:width', HEAD.ogImageSize.width);
  html = replaceMeta(html, 'property', 'og:image:height', HEAD.ogImageSize.height);

  html = replaceMeta(html, 'name', 'twitter:card', HEAD.twitterCard);
  html = replaceMeta(html, 'name', 'twitter:title', meta.title);
  html = replaceMeta(html, 'name', 'twitter:description', meta.description);
  html = replaceMeta(html, 'name', 'twitter:image', HEAD.ogImage);

  for (const entry of jsonLd) html = upsertJsonLd(html, entry.id, entry.json);

  // The mirror sits inside #root so it occupies the same slot the app will
  // claim. React's createRoot clears the container on mount, so nothing is
  // left behind for users - and nothing is hidden from crawlers either, since
  // the markup is inside <noscript> rather than styled out of view.
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><noscript>${noscript}</noscript></div>`
  );

  return html;
}

const routes = getPrerenderRoutes();
let written = 0;

for (const route of routes) {
  const html = buildPage(route);
  const outPath =
    route.path === '/'
      ? join(dist, 'index.html')
      : join(dist, route.path.replace(/^\//, ''), 'index.html');

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');
  written++;
}

// Generated rather than checked in, so it can't fall behind the route list.
const sitemap = buildSitemap(routes);
await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8');
const listed = routes.filter((r) => r.sitemap).length;

console.log(`prerender: wrote ${written} pages, sitemap with ${listed} urls`);
for (const route of routes) {
  console.log(`  ${route.sitemap ? '+' : ' '} ${route.path}`);
}
