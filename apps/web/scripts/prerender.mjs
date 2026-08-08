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
 * Vercel resolves `/practice` to `dist/practice/index.html` before it consults
 * the rewrites in `vercel.json`, so writing these files is enough. The rewrites
 * only have to name the routes that have no file: the private and dynamic ones,
 * which are pointed at the `noindex` `app.html` shell this script also writes.
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

const { getPrerenderRoutes, buildSitemap, buildLlmsTxt, SHELL_PAGES, HEAD } = await import(
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

function removeCanonical(html) {
  return html.replace(/[ \t]*<link[^>]*\srel="canonical"[^>]*>\n?/i, '');
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
  html = route.noCanonical ? removeCanonical(html) : replaceCanonical(html, canonical);

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

// `404.html` and `app.html`: same template, noindex, no canonical, written to
// fixed filenames instead of route directories.
for (const shell of SHELL_PAGES) {
  await writeFile(join(dist, shell.file), buildPage(shell.route), 'utf8');
}

// Both generated rather than checked in, so they can't fall behind the routes.
const sitemap = buildSitemap(routes);
await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8');
const listed = routes.filter((r) => r.sitemap).length;

await writeFile(join(dist, 'llms.txt'), buildLlmsTxt(routes), 'utf8');

console.log(
  `prerender: wrote ${written} pages, ${SHELL_PAGES.length} shells, sitemap with ${listed} urls, llms.txt`
);
for (const route of routes) {
  console.log(`  ${route.sitemap ? '+' : ' '} ${route.path}`);
}
