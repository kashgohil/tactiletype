# TactileType — Product Improvement Plan

Canonical plan for redesigning the **profile**, expanding **typing exercises**, and improving the product end-to-end. Use this document to prioritize work, write design specs, and guide implementation PRs.

**Related docs**

| Doc | Role |
|-----|------|
| [setup.md](./setup.md) | Local development setup |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | Historical phase roadmap |
| [feedback.md](./feedback.md) | User-reported issues |
| [README.md](./README.md) | Project overview |

**Positioning**

> TactileType = a beautiful free typing test **plus** a coach-like profile that turns mistakes into exercises — especially code and real-world text.

---

## 1. Current state

### 1.1 What exists

| Area | Status |
|------|--------|
| Typing engine (WPM, accuracy, keystrokes) | Solid |
| Test modes | Timer / words |
| Test types | Text, punctuation, numbers, quotes |
| Difficulty | Easy / medium / hard |
| Auth (email + OAuth hooks) | Working |
| Profile | Basic: identity fields, flat stats, heatmap, results table |
| Seed content | ~10 short passages |
| Analytics UI pieces | Heatmap, charts, goals components (partially wired) |
| Schema foresight | Goals, achievements, practice sessions, recommendations already modeled |
| Multiplayer / social | Scaffolded; not the retention bottleneck yet |

### 1.2 Gaps that hurt most

1. **Profile is a data dump**, not a progress home (no hierarchy, no next action).
2. **Content is thin** — modes exist, curriculum does not.
3. **No closed loop** from errors → recommended drill → retest.
4. **Open UX feedback**: hard to distinguish typed vs untyped characters; limited test-screen customizability.
5. **Profile schema underused**: display name, bio, country, keyboard, `isPublic`.
6. **Results lack rich metadata** for filtering (mode, type, duration, pack id) on the profile.

### 1.3 Existing assets to leverage

- `user_profiles`, `user_goals`, `achievements`, `practice_sessions`, analytics tables in `packages/database`
- Practice / goal / achievement types in `packages/types`
- Analytics components under `apps/web/src/components/analytics/`
- Typing engine + test page modes in `apps/web/src/pages/TypingTest.tsx`

Prefer **wiring and expanding** these over inventing parallel systems.

---

## 2. Goals & non-goals

### 2.1 Goals

- Make the **profile** the user’s home base: identity, progress, weak spots, next action.
- Grow **exercise content and types** so practice feels endless and purposeful.
- Close the loop: **test → insight → drill → retest**.
- Keep the **test feel** excellent (clarity, customizability, speed of restart).
- Differentiate via **code / real-world typing** and personalization, not only multiplayer.

### 2.2 Non-goals (for this plan’s primary phases)

- Full social network / forums
- Native mobile apps (PWA later is fine)
- Replacing the core engine with a rewrite
- Shipping every gamification idea before the solo loop is sticky

---

## 3. Design principles

1. **One primary CTA** on profile (e.g. “Practice weak keys” or “Today’s challenge”).
2. **Numbers with context** (“72 WPM · +4 vs last week”), not bare metrics.
3. **Less chrome, more type** — profile should feel like a sibling of the test UI (same tokens, mono, restrained motion).
4. **Empty states teach** — first visit shows structure + “complete 3 tests to unlock insights”.
5. **Insight → action** every time analytics surface a problem.
6. **Accessibility** — focus, reduced motion, high contrast options.
7. **Don’t spam** — streaks and badges reward; they don’t nag.

---

## 4. Profile redesign

### 4.1 Problems with the current profile

- Identity is admin-ish (email, member since) rather than public-facing.
- Stats are equal-weight cards; nothing visual hierarchy.
- Recent results are a dense table without story or filters.
- Heatmap has no narrative (streak, goals, weak spots).
- No path from profile → next practice session.

### 4.2 Target information architecture

```
┌─────────────────────────────────────────────────────────┐
│ Hero: avatar | display name @username | country | kb     │
│        [Edit profile]  [Share]  [Public / Private]       │
│  big WPM  ·  accuracy  ·  streak  ·  tests · rank badge  │
└─────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────┐
│ Goals        │  Progress (WPM / accuracy over time)      │
│ + next goal  │  30-day chart / sparkline                 │
├──────────────┴──────────────────────────────────────────┤
│ Activity heatmap (year) + streak summary                 │
├─────────────────────────────┬───────────────────────────┤
│ Weak spots                  │ Recommended next exercise │
│ (keys / words / bigrams)    │ → one-click start         │
├─────────────────────────────┴───────────────────────────┤
│ Recent activity (cards + optional list/table view)       │
│ filters: mode · type · difficulty · date · pack          │
├─────────────────────────────────────────────────────────┤
│ Achievements / badges (starter set)                      │
└─────────────────────────────────────────────────────────┘
```

**Settings vs profile**

| Profile (public-oriented) | Settings (private) |
|---------------------------|--------------------|
| Avatar, display name, bio | Email, password |
| Country, keyboard, language | Connected OAuth |
| Public / private toggle | Danger zone / delete |
| Shareable `/u/:username` | Notification prefs (later) |

### 4.3 Feature breakdown

| Feature | Description | Depends on |
|---------|-------------|------------|
| Hero identity | Avatar, display name, bio, country, keyboard | Profile API + optional upload |
| Metric hierarchy | Primary: best WPM, avg accuracy, streak; secondary: totals | Existing stats API |
| Goals widget | Progress bars for WPM / accuracy / daily tests | `user_goals` wiring |
| Progress chart | 30-day WPM & accuracy | Aggregated results endpoint |
| Heatmap + streak copy | Narrative under existing heatmap | Minor UI only |
| Weak spots panel | Top missed keys / words from analytics | Keystroke / error analytics |
| Recommended exercise CTA | Deep-link into Practice hub | Exercise packs (Phase D) |
| Result cards | WPM badge, accuracy, mode chips, relative time | Result metadata (Phase B) |
| Result detail | Existing timeline chart on click | Already partially built |
| Filters & views | Cards vs table; filter by mode/type/difficulty | Result metadata |
| Public profile | `/u/:username`, honor `isPublic` | Route + API |
| Empty states | CTA to first test / first exercise | Frontend only |

### 4.4 Visual / UX notes

- Align with existing theme tokens (`accent`, `text`, dark/light).
- Skeleton loaders for stats, heatmap, results.
- Mobile-first stacking: hero → goals → heatmap → weak spots → recent.
- Shareable result / profile cards (OG image) can follow public profiles.

---

## 5. Exercises & content

Modes already exist on the test page. This section expands **content**, **exercise types**, and a **Practice hub**.

### 5.1 Content packs (expand the library)

| Pack | Purpose |
|------|---------|
| English word lists (top 200 / 1k / 5k) | Infinite common-word practice |
| Quotes library (attributed, longer) | Engaging reading-length tests |
| Code packs (JS, Python, SQL, shell) | Developer differentiation |
| Symbols / operators | `; { } [ ] ( ) => && \|\|` drills |
| Emails, URLs, file paths | Real-world hard typing |
| Non-English (start with 1–2 languages) | Growth; schema already has `language` |

**Target:** hundreds of passages / generators, not ~10 static seeds.

**Pipeline**

- Content as versioned JSON or TS modules under e.g. `packages/database` or `packages/content`.
- Seed / import scripts (`bun run db:seed` extended or `db:seed:packs`).
- Prefer word-bank generation + curated packs over hand-writing every string.

### 5.2 Exercise types (Practice hub)

Separate **free Test** (sandbox) from **Practice / Exercises** (guided):

| Exercise | Description | Primary user |
|----------|-------------|--------------|
| Key drills | Focus on weak / target keys (home row, pinkies, etc.) | Beginners + analytics loop |
| Bigram / trigram drills | `th`, `ion`, `ing`, `tion` | Speed bottlenecks |
| Word drills | Repeat hardest words from user history | Personalization |
| Punctuation / numbers | Short dedicated bursts | Jobs, coding |
| Code typing | Real snippets; optional syntax highlight | Developers |
| Accuracy challenge | Fail under e.g. 98% accuracy | Quality over speed |
| Consistency challenge | Penalize speed spikes | Rhythm |
| Endurance | 3 / 5 / 10 minute runs | Stamina |
| Blind / zen | Hide live WPM until end | Focus |
| Lesson path | Ordered curriculum: home row → full keyboard | Onboarding |
| Daily challenge | Same text for everyone that day | Social / leaderboard |
| Custom paste | User pastes email, essay, code | Power users |

### 5.3 Data model direction

Lean on existing practice types; introduce packs if missing:

```text
ExercisePack
  id, title, category, difficulty, tags[]
  items[]          # words, sentences, or passages
  focus            # keys | bigrams | code-lang | symbols | ...
  language

UserExerciseProgress
  userId, packId
  bestWpm, bestAccuracy, attempts
  completedLessons / lastPracticedAt
```

Store on each completed session (tests + exercises):

- `mode`, `type`, `duration` or `wordCount`
- optional `exercisePackId`, `exerciseKind`
- language, difficulty

So profile filters and recommendations stay accurate.

### 5.4 Recommendation engine (simple first)

**v1 rules (no ML):**

1. If error heatmap has clear weak keys → key drill for those keys.
2. Else if low accuracy last 5 tests → accuracy challenge.
3. Else if no practice in 24h and streak at risk → short 30s test / daily challenge.
4. Else → next lesson in curriculum or random pack at current difficulty.

Surface as a single **Recommended next exercise** card on profile.

---

## 6. Broader product improvements

### 6.1 P0 — Feel right every session

| Item | Notes |
|------|--------|
| Clear typed vs untyped characters | Open item in `feedback.md` |
| Test UI customizability | Caret, font size, hide live WPM, smooth caret, theme |
| Optional sound / error feedback | Off by default |
| Keyboard layout awareness | QWERTY / Colemak / Dvorak for heatmaps & drills |
| Guest → account continuity | Keep last N local results; merge on signup |

### 6.2 P1 — Retention loop

| Item | Notes |
|------|--------|
| Redesigned profile | Section 4 |
| Exercise hub + content packs | Section 5 |
| Goals + streaks | Wire existing schema; gentle UX |
| Starter achievements | First 100 WPM, 7-day streak, 50 tests, etc. |
| Daily challenge | Shared text + small leaderboard |

### 6.3 P2 — Differentiation

| Item | Notes |
|------|--------|
| Code typing + language packs | Core differentiator |
| Multiplayer polish | After solo loop is sticky (see roadmap Phase 3) |
| Shareable result cards | Image / OG for social |
| Custom paste / personal playlists | Power users |

### 6.4 P3 — Growth & social

| Item | Notes |
|------|--------|
| Public profiles, follow, activity feed | |
| Clubs / company leaderboards | |
| Tournaments / seasons | |
| PWA / offline practice | |

### 6.5 Engineering hygiene

| Item | Notes |
|------|--------|
| Result metadata on `completed_tests` | Enables profile filters & charts |
| Content pipeline | Packs + seed scripts |
| Aggregated analytics endpoints | Don’t over-fetch raw keystrokes for charts |
| A11y & reduced motion | |
| Port / env consistency | See `setup.md` |

---

## 7. Phased delivery plan

Each phase should be shippable alone and leave the product better.

### Phase A — Profile UI redesign (mostly frontend)

**Outcome:** Profile looks intentional and hierarchical using existing APIs.

- Hero layout + metric hierarchy
- Goals placeholder or read-only if API partial
- Heatmap + streak copy
- Result cards (best-effort with current fields)
- Empty states + loading skeletons
- Split Settings vs Profile routes/sections

**Exit criteria:** Logged-in user sees a redesigned profile that is usable on mobile; no regression in stats load.

### Phase B — Result metadata

**Outcome:** Every completed test stores enough context for filtering and charts.

- Extend schema / submit payload: mode, type, duration or word target, language, difficulty
- Migrate or default legacy rows
- Profile filters + progress chart over last 30 days

**Exit criteria:** New results filterable by mode/type; chart shows real trend data.

### Phase C — Content packs

**Outcome:** Library no longer feels empty.

- Word lists, quotes, symbols, initial code pack
- Seed / import pipeline
- Test page can draw from packs (or random generators)

**Exit criteria:** ≥ hundreds of distinct practice units available in dev seed; test page never feels “same 10 strings”.

### Phase D — Practice hub + weak-key drills

**Outcome:** Insight → action loop works.

- `/practice` (or equivalent) hub listing exercise types & packs
- Key / bigram / word drills
- Weak spots panel on profile deep-links into a drill
- Recommended next exercise card (v1 rules)

**Exit criteria:** From profile, user can start a drill targeting a weak key in one click; completion updates progress.

### Phase E — Goals, badges, daily challenge

**Outcome:** Light retention hooks.

- Wire create/update goals + progress UI
- Starter achievements
- Daily challenge + minimal leaderboard

**Exit criteria:** User can set a WPM goal and see progress; daily challenge completes and ranks.

### Phase F — Differentiation & social foundation

**Outcome:** Clear niche + shareability.

- Code packs + optional syntax highlighting
- Public `/u/:username`
- Shareable result cards
- Multiplayer polish only if solo metrics look healthy

**Exit criteria:** Code exercise pack live; public profile shareable; optional multiplayer milestone defined separately.

### Phase G — Growth (later)

- Follow/feed, clubs, tournaments, PWA — see §6.4 and `DEVELOPMENT_ROADMAP.md`.

---

## 8. Implementation notes for agents

### 8.1 Suggested code touchpoints

| Area | Paths |
|------|--------|
| Profile UI | `apps/web/src/pages/Profile.tsx`, layout/components under `apps/web/src/components/` |
| Analytics widgets | `apps/web/src/components/analytics/*` |
| Typing test | `apps/web/src/pages/TypingTest.tsx`, `apps/web/src/utils/typingEngine.ts` |
| APIs | `apps/api/src/routes/users.ts`, `tests.ts`, `analytics.ts` |
| Schema | `packages/database/src/schema.ts`, migrations |
| Types | `packages/types/src/index.ts` |
| Seed content | `packages/database/src/seed.ts`, `testTexts.ts` (evolve into packs) |

### 8.2 Working agreements

1. Prefer extending existing schema/types over duplicate tables.
2. Migrations via Drizzle (`bun run db:generate` / `db:migrate`); document seed changes in `setup.md` if workflow changes.
3. Keep API responses typed in `@tactile/types`.
4. Feature flags optional; prefer shippable vertical slices (Phase A–F).
5. Update `feedback.md` when user-facing issues are resolved.
6. Do not commit secrets; local setup stays in `setup.md`.

### 8.3 Testing checklist (per phase)

- [ ] Happy path: complete test → appears on profile with correct stats
- [ ] Empty state: new user with zero tests
- [ ] Auth required vs public profile behavior
- [ ] Mobile layout smoke check
- [ ] Migrate + seed still work on clean DB

---

## 9. Success metrics

| Metric | Why |
|--------|-----|
| Tests per user per week | Core engagement |
| % users who return D1 / D7 | Retention |
| % sessions that start from “recommended exercise” | Loop health |
| Avg accuracy / WPM trend for active users | Product value |
| Completion rate of daily challenge | Habit formation |
| Signup conversion from guest (if guest mode ships) | Growth |

Instrument simply at first (server-side counts + basic event logs); avoid heavy analytics SDKs until needed.

---

## 10. Open decisions

Track and resolve before or during the relevant phase:

| Decision | Options | Suggested default |
|----------|---------|-------------------|
| Avatar storage | Local FS / S3 / OAuth-only | OAuth + gravatar fallback first |
| Content license for quotes | Public domain / user-generated only | Public domain + original packs |
| Code highlighting | None / lightweight CSS / full highlighter | Lightweight first |
| Practice vs Test navigation | Separate nav item vs tabs on home | Separate **Practice** nav when Phase D ships |
| Daily challenge time zone | UTC vs user local | UTC for v1 fairness |
| Guest mode | Local-only vs anonymous server results | Local-only first |

---

## 11. Priority summary

```text
P0  Test clarity + customizability (feel)
P1  Profile redesign (home base)
P1  Result metadata (foundation for filters/charts)
P1  Content packs + Practice hub + weak-key loop
P2  Goals, badges, daily challenge
P2  Code packs, public profiles, share cards
P3  Multiplayer polish, social graph, PWA
```

**Recommended build order:** A → B → C → D → E → F → G  
(Profile UI can start immediately; content and drills unlock the product story.)

---

## 12. Quick reference — phase checklist

```text
[x] Phase A  Profile UI redesign
[x] Phase B  Result metadata + filters/charts
[ ] Phase C  Content packs + seed pipeline
[ ] Phase D  Practice hub + weak-key drills + recommendations
[ ] Phase E  Goals, achievements, daily challenge
[ ] Phase F  Code packs, public profiles, share cards
[ ] Phase G  Social / multiplayer / PWA growth features
```

---

*Last updated: 2026-07-17. Update this file when phases complete or priorities change.*
