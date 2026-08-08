# web

The TactileType front end: a Vite + React SPA, prerendered to one static HTML
file per public route, deployed to Vercel.

## Build

```bash
bun run --filter=web build
```

That runs three steps, and the third is easy to miss:

1. `tsc -b` — typecheck
2. `vite build` — the client bundle, into `dist/`
3. `prerender` — an SSR build into `dist-ssr/`, then `scripts/prerender.mjs`
   rewrites one `dist/<route>/index.html` per public route

Step 3 is why `dist/` contains `practice/index.html`, `guides/what-is-wpm/index.html`,
and so on rather than a single `index.html`. It also generates `sitemap.xml`.
See the header comment in `scripts/prerender.mjs` for why this exists — briefly,
social and AI crawlers read the response body and never run the JavaScript that
would otherwise set per-route titles and descriptions.

## Deployment

Configured by `vercel.json` **at the repository root**, not in this directory.

It lives there deliberately. This app imports `@tactile/content` and
`@tactile/types` from `packages/`, so a build scoped to `apps/web` cannot see
its own dependencies. Keeping the config at the root — with an explicit
`buildCommand` and `outputDirectory` — makes the whole workspace the build
context and avoids depending on Vercel's "include files outside the root
directory" dashboard toggle, which is invisible in code review and easy to lose
when a project is recreated.

### Environment variables

Set in the Vercel dashboard, needed at **build** time (Vite inlines them):

| Variable        | Value                            |
| --------------- | -------------------------------- |
| `VITE_API_URL`  | `https://api.trytactiletype.com` |
| `VITE_WS_URL`   | optional — see below             |

`VITE_WS_URL` can be omitted. `defaultWsUrl()` in `src/services/websocket.ts`
derives `wss://api.trytactiletype.com/ws` from `VITE_API_URL` by swapping the
scheme, which is correct as long as the WebSocket lives on the same host as the
API.

### Routing

`vercel.json` rewrites `/(.*)` to `/index.html` for the SPA. That does **not**
shadow the prerendered pages: Vercel gives the filesystem precedence over
rewrites, so `/practice` resolves to `dist/practice/index.html` and only unknown
paths fall through to the SPA shell.

`/test` and `/test/` 301 to `/`, which is the one canonical typing test. Keep
this in step with `src/lib/seo.ts` and `public/robots.txt`.

## Response headers

`vercel.json` has no comments — JSON — so the reasoning for each header lives
here. Change one, change the other.

- **`X-Content-Type-Options: nosniff`** — stops browsers second-guessing our
  `Content-Type`. Without it, a file served as `text/plain` can be sniffed and
  executed as script.
- **`X-Frame-Options: DENY`** — no reason for this app to be framed; blocks
  clickjacking outright.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — full URL to our own
  origin, bare origin cross-site, nothing on a downgrade to HTTP. Keeps referral
  data useful without leaking paths.
- **`Permissions-Policy`** — the app asks for none of these. Denying them up
  front means a future dependency cannot quietly start asking.
- **`Cross-Origin-Opener-Policy: same-origin`** — isolates this origin's
  browsing-context group from popups it opens.
- **HSTS is not set here.** Vercel adds `Strict-Transport-Security` to
  deployments automatically; duplicating it invites the two copies to disagree.

### Content-Security-Policy

Enforced, not report-only.

`api.trytactiletype.com` appears twice — under `https:` and `wss:` — because
`connect-src` treats them as separate origins, and one directive covers fetch,
XHR, and WebSockets alike. **If `VITE_API_URL` ever moves to another host, this
line has to move with it**: the env var is inlined at build time and this static
config cannot read it.

`'unsafe-inline'` in `style-src` is required, not laziness: React writes inline
`style` attributes, and `ThemeProvider` sets custom properties on
`documentElement`.

OAuth is unaffected. Login sends the browser to the provider with
`window.location.href`, a top-level navigation, which no directive here governs.
`form-action` only bites on real form submissions, and the app has none that
leave the origin.

### Caching

- `/assets/*` — content-hashed by Vite, so `immutable` for a year.
- `/fonts/*` — versioned by filename and effectively never change. Also
  `Access-Control-Allow-Origin: *`, since fonts are fetched with CORS.
- `/robots.txt`, `/sitemap.xml` — one hour. Crawl-control files must never be
  served stale after an edit.
