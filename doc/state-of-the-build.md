# Cookbookverse — State of the Build
> Last updated: April 14, 2026

---

## What This Is

A single-source-of-truth document that maps where the platform actually is, what's been built, what's in progress, and what comes next — in order of priority. Use this to orient at the start of any session.

---

## Overall Progress

| Phase | What | Progress |
|-------|------|----------|
| Phase 1 | MVP — the world opens | **100%** ✅ |
| AI Staff | 5 personas, 55 skills + craft layer + chat routing | **100%** ✅ |
| Admin Studio | Tabbed, navigable | **100%** ✅ |
| Phase 2 | Community + personal kitchen layer | **55%** 🔄 |
| Phase 3 | Intelligence layer | **15%** ⬜ |
| Infrastructure | R2 image storage migration | **0%** ⬜ |

---

## The Platform at a Glance

Cookbookverse is a discovery-first recipe platform with:
- A curated, quality-controlled recipe library (AI-generated + user-submitted)
- A full AI staff of 5 personas who write, review, and manage content
- An automated Court of Chefs review pipeline for every recipe before publish
- A personal kitchen layer (fridge mode, saved recipes, cook log, AI chat)
- An admin studio where one person runs the whole content operation

**Stack:** Next.js App Router · TypeScript · Tailwind · Drizzle ORM · Neon (Postgres) · Clerk auth · OpenAI · Vercel

---

## Phase 1 — 100% Complete ✅

Everything in Phase 1 shipped. The platform is live and functional.

| Feature | Status |
|---------|--------|
| Homepage, Explore, Collections, Recipe detail pages (SSR, indexable) | ✅ Done |
| Full design system — terracotta accent, dark/light mode, typography | ✅ Done |
| AI chat page — ingredient mode, mood mode, dietary adaptation | ✅ Done |
| Recipe generation pipeline — generate → court review → admin decision → publish | ✅ Done |
| Court of Chefs — 5 judges (Marco, Céleste, Nadia, Nadia:critic, Theo synthesis) | ✅ Done |
| User accounts — saved recipes, cook log, submissions, fridge mode, profile | ✅ Done |
| Submission flow — submit → Court → admin queue → publish or reject with feedback | ✅ Done |
| Admin studio — tabbed interface (Overview / Generate / Review / Published / Collections / Settings) | ✅ Done |
| Ellis dashboard — weekly digest: recipe counts, token spend, collection gaps, persona activity | ✅ Done |
| Rex monitor — signal-based alerts when persona quality drifts or budget spikes | ✅ Done |
| Variation system — users can submit their take on any published recipe | ✅ Done |

---

## AI Staff — 85% Complete 🔄

> Prompts are fully enriched for all 5 personas (55 skills total). The gap is wiring — several skills are defined but no API route calls them yet.

### Skill Definitions — 100% ✅

| Persona | Role | Skills | Prompts |
|---------|------|--------|---------|
| **Marco** | Executive Chef | 13 — generate, review:technique, review:flavour, chef-note, scaling, storage-note, make-ahead, equipment-alt, seasonal-swap, dietary-adapt, technique-note, suggest, feature-recipe | ✅ Enriched |
| **Céleste** | Pastry & Baking Lead | 11 — generate:baking, review:technique, review:flavour, chef-note, dietary-adapt, technique-note, scaling, storage-note, make-ahead, equipment-alt, seasonal-swap | ✅ Enriched |
| **Nadia** | Dietary & Wellness | 11 — review:homecook, review:critic, suggest, chat, grocery-list, dietary-adapt, budget-note, leftover-note, weeknight-adapt, batch-plan | ✅ Enriched |
| **Theo** | Editorial Director | 10 — review:synthesis, review:cultural, origin-story, editorial-intro, collection-intro, recipe-headline, feature-pitch, digest:write, chef-note, trend-note | ✅ Enriched |
| **Soren** | Global Kitchen | 10 — generate:street, suggest:wild, review:cultural, origin-story, trend-note, market-source, fusion-guide, seasonal-swap, chef-note, batch-plan | ✅ Enriched |

### Route Wiring — 65% 🔄

| Skill | Route | Status |
|-------|-------|--------|
| Marco `generate` | `POST /api/admin/generate` | ✅ Wired |
| Céleste `generate:baking` | `POST /api/admin/generate` (baking attribution) | ✅ Wired |
| Marco/Céleste/Nadia `review:*` | Court of Chefs pipeline | ✅ Wired |
| Theo `review:synthesis` | Court of Chefs synthesis pass | ✅ Wired |
| Theo `digest:write` | `GET /api/admin/digest` | ✅ Wired |
| Nadia `chat` | `POST /api/ai` | ✅ Wired |
| Nadia `grocery-list` | `POST /api/ai/grocery-list` | ✅ Wired |
| Theo + Soren in admin generator attribution | admin-generator.tsx | ✅ Wired |
| Theo + Soren in prompt tuner | prompt-tuner.tsx | ✅ Wired |
| Soren `generate:street` | needs route detection in `/api/admin/generate` | ✅ Wired |
| Soren `suggest:wild` | needs mode in `/api/admin/suggest-recipe` | ✅ Wired |
| Theo `origin-story` | needs call in `/api/admin/generate` after recipe creation | ✅ Wired |
| Theo `recipe-headline` | needs admin tool button on Published tab | ✅ Wired |
| Theo `editorial-intro` | needs admin tool for Today's Pick | ✅ Wired |
| Theo `collection-intro` | needs call in admin collections panel | ✅ Wired |
| Theo `feature-pitch` | needs admin tool on Published tab | ✅ Wired |
| Theo `trend-note` | needs admin tool on Published tab | ⬜ Not wired |

---

## Admin Studio — 100% Complete ✅

The admin is now a clean tabbed interface. Six tabs:

| Tab | Contents | Status |
|-----|----------|--------|
| **Overview** | Ellis weekly digest + Rex quality monitor | ✅ Done |
| **Generate** | Prompt, attribution (all 5 personas), suggestions, court review, publish/reject | ✅ Done |
| **Review** | Pending submission queue — full Court of Chefs reports, admin decision | ✅ Done |
| **Published** | All published recipes — feature toggle, Today's Pick, image gen, inline edit | ✅ Done |
| **Collections** | Collection management — name, description, gradient, collection image | ✅ Done |
| **Settings** | Token budget config + automation · Staff prompt overrides (all 5 personas) | ✅ Done |

---

## Phase 2 — Community Layer — 20% 🔄

*Goal: Users feel like they belong to something, not just consume from it.*

| Feature | Status | Notes |
|---------|--------|-------|
| Recipe ratings (save-based popularity) | ✅ Done | Shown on cards + detail page |
| AI grocery list generator | ✅ Done | Button on recipe detail page |
| "Trending this week" on explore page | ✅ Done | |
| Notification system | ✅ Done | `0010_notifications.sql` applied to Neon |
| **Named user collections** | ✅ Done | Full CRUD API, profile Collections tab, UserCollections component |
| **Smart week plan** | ✅ Done | DB schema, API routes, profile tab, recipe callouts, AI context, grocery list |
| Public user profiles | ⬜ Not started | Data exists, mostly a display build |
| Public collections (shareable cookbooks) | ⬜ Not started | Depends on named collections |
| Comments on recipes | ⬜ Not started | Moderated, quality-first |

---

## Phase 3 — Intelligence Layer — 15% 🔄

*Goal: Cookbookverse learns what you love and surfaces things you didn't know you wanted.*

| Feature | Status | Notes |
|---------|--------|-------|
| Fridge mode | ✅ Done | Built early in Phase 1 |
| Recipe versioning / variations | ✅ Done | Built early in Phase 1 |
| Personalized homepage | ⬜ Not started | Based on saves, dietary prefs, AI history |
| Nutrition tracking | ⬜ Not started | Log what you cooked, see weekly summary |
| "Because you saved X" recommendations | ⬜ Not started | Similarity-based |
| Weekly email digest via Resend | ⬜ Not started | New recipes matching taste profile |

---

## Infrastructure — 0% ⬜

| Task | Status | Notes |
|------|--------|-------|
| ⚠️ Apply `0010_notifications.sql` to Neon DB | ⬜ Pending | Notifications 500 until done — do this first |
| Migrate image storage: Vercel Blob → Cloudflare R2 | ⬜ Not started | Two files to change. Not urgent until library grows. |

---

## What's Next — In Order

### 1. Smart Week Plan — Phase 2 · Flagship feature
**Status:** ✅ Complete

Users can save recipes to a personal weekly plan. Platform surfaces ingredient overlaps across plan recipes, generates a deduplicated grocery list cross-referenced against the fridge, and briefs the AI chat on what the user is already cooking.

**Build checklist:**
- [x] Schema migration: add `weekPlan` (JSON) + `groceryList` (text) to users table
- [x] `POST /api/user/week-plan` — add/remove/clear recipe
- [x] `GET /api/user/week-plan` — return with overlap analysis
- [x] "Add to this week" button on recipe detail
- [ ] Browse card overlap indicator (icon on cards with shared non-staple ingredients) — not yet built
- [x] Recipe detail overlap callout ("You're making X this week — both need coconut milk")
- [x] Profile → "This week" tab
- [x] Grocery list generator (Nadia, fridge cross-reference + deduplication)
- [x] Wire week plan into AI chat context
- [x] Monday nudge on This week tab

---

### 2. Public User Profiles — Phase 2 · Small-medium lift · High value
**Status:** ⬜ Not started · Data already exists — this is mostly a display build

**Build checklist:**
- [ ] `GET /api/chef/[slug]` — public profile route
- [ ] `/chef/[slug]` page (path already exists in workspace) — bio, published recipes, public collections
- [ ] Link from recipe cards to author profile

---

### 3. Public Collections — Phase 2 · Medium lift
**Status:** ⬜ Not started · Depends on public user profiles

---

### 4. Craft Knowledge Layer — complete ✅
**Status:** `craft` field on `StaffPersonaConfig`, all 5 blocks written, `buildStaffPrompt()` injects craft; AI chat routes by topic to correct persona

---

### 5. Soren's Generation Routes — complete ✅
**Status:** `generate:street` wired, `suggest:wild` wired, "🌏 Soren's Pick" button added; Céleste's `generate:baking` silent bug also fixed

---

### 6. Theo's Editorial Routes — AI Staff completion · Medium lift · High editorial value
**Status:** 5 of 6 skills now wired

- [x] `origin-story` — auto-calls post-generation (non-fatal try/catch)
- [x] `recipe-headline` — "Suggest headline" in Published edit panel → auto-fills title + subtitle
- [x] `editorial-intro` — "Editorial intro" in Published edit panel
- [x] `collection-intro` — "✍ Theo: Write intro" in Collections edit panel → auto-fills description
- [x] `feature-pitch` — "Feature pitch" in Published edit panel
- [ ] `trend-note` — not yet wired (low priority — no clear trigger moment)

---

### 7. Vercel Blob → Cloudflare R2 — Infrastructure · When library grows
**Status:** ⬜ Not urgent yet

Vercel Blob limits: 1 GB storage / 2k ops / 10 GB transfer. When the recipe library grows this will be hit.

**Two files to change:** `src/app/api/admin/generate-image/route.ts` + `src/app/api/admin/generate-collection-image/route.ts`

Steps documented in `feature-map.md` — create R2 bucket, add env vars, swap `put()` for S3 `PutObjectCommand`.

---

## Open Decisions

Things that need answers before or during the builds above:

| Decision | Urgency | Notes |
|----------|---------|-------|
| ⚠️ `0010_notifications.sql` migration | **Immediate** | 500 error on notifications until applied |
| Court of Chefs threshold calibration | Before scaling submissions | Confidence score cutoffs need real-data tuning |
| OG image generation | Before marketing/sharing push | `/recipe/[slug]` needs proper OG images |
| PWA | Low — but low effort too | Next.js PWA is trivial; high value for cooking use case (offline recipe access) |
| AI rate limiting | Before public launch | Free users: unlimited or capped? |
| AI-generated recipe labeling | Before public launch | How prominently is "AI Generated" called out? |
| Dietary adaptation flow | Before week plan | Does "make this vegan" modify in-place or create a new card? |
| Typography formal decision | Design polish | Font pairing not locked as a formal decision |

---

## The Bigger Picture

---

## Horizon — Capabilities This Platform Is Ready For

These aren't on the immediate roadmap. But the architecture supports every one of them — some could be built in a single session once the foundations above are solid. Each is a genuine product unlock that no mainstream recipe platform has.

---

### AI Chat as a Real Culinary Teacher

Once personas have the craft knowledge layer, the chat can answer cooking *science* questions, not just recipe questions. "Why did my sauce break?" isn't a recipe search — it's a question Marco can answer from first principles of fat emulsification. "My bread didn't rise" → Céleste answers from yeast biology and leavening chemistry. The shift from *recipe discovery assistant* to *culinary education platform* happens at the chat layer with almost no new infrastructure.

**What routing looks like:** Marco handles technique, heat, knife, equipment questions. Céleste handles baking science. Soren handles fermentation, preservation, global sourcing. Nadia handles nutrition, dietary, allergen questions. Theo handles cultural context, food history, naming questions. The system routes by topic. Or the user picks their expert.

*Unlock condition: craft knowledge layer → rethink chat routing away from single-Nadia.*

---

### Court of Chefs Score as a Public Trust Signal

Every published recipe has a confidence score already sitting in the submissions table. "94/100" is a quality certification no other recipe platform has. Surfacing it as a visible badge — *Staff verified · 94%* — turns a backend number into a public trust differentiator. Filtering by confidence score on explore becomes a new way to find only the platform's best-rated content.

*Unlock condition: minor UI addition. Data already collected.*

---

### Theo Giving Every Recipe an Actual Voice

A recipe title and description is informational. A Theo headline + editorial intro is *opinion and curation*. "The dish that rewired how Rome thinks about simplicity." That is editorial authority, not metadata. Right now the platform has beautiful design but neutral copy. Theo's editorial skills would give it a genuine point of view — the difference between a magazine and a database.

*Unlock condition: wire Theo's `recipe-headline` and `editorial-intro` skills (already in What's Next item 6).*

---

### Nadia as a Periodic Personal Health Coach

Nadia has your full cook log: every meal, serving size, and nutrition value. She could synthesise this monthly: *"You cooked 18 times last month. Most of your meals were high-protein. You haven't cooked a vegetable-forward dish in three weeks. Here's one that might change that."* That is a relationship, not a service. Different from every competitor. The data is already being collected — it has nowhere to go.

*Unlock condition: DB query on cookedLog → Nadia `batch-plan` skill → notification or My Kitchen tab card.*

---

### Staff Persona Pages

`/staff/marco` — a page showing everything Marco has generated, his areas of expertise, his style, his vocabulary. Soren's page shows his global street food picks. Theo's page shows his editorial features and headlines. This turns the AI staff from a backend feature into a *public-facing editorial team* with a visible track record. Attribution already exists in the `staffAuthor` field on every recipe.

*Unlock condition: small page build. `/chef/[slug]` path pattern already used for users — same approach for staff.*

---

### The Culinary Curriculum

A collection type with a learning arc — not "Italian recipes" but *"Learn to Braise in 6 Dishes."* Recipe 1 teaches the fundamentals. Recipe 6 is the confident expression of the skill. Marco sequences these by technique progression. Theo writes the arc narrative. This is something cooking schools sell. The platform could surface it as a free, beautiful, AI-curated course — built from the existing library with a new collection flag and ordering field.

*Unlock condition: `collectionType: 'curriculum'` flag + `curriculumStep` ordering field on the recipe-collection join. Marco sequences, Theo narrates.*

---

### Soren's Table — Weekly Global Discovery

One dish, every week, from somewhere most users have never cooked. Soren picks it, writes the source story, flags the sourcing challenge, suggests the adaptation. Not algorithmically ranked — editorially curated. Would make the platform feel alive and globally curious in a way no homepage algorithm achieves. The cron infrastructure that Ellis already runs is the skeleton this needs.

*Unlock condition: extend weekly cron to call Soren `suggest:wild` + `market-source`. Admin approves before live. One new homepage section.*

---

### Seasonal and Cultural Calendar

Soren knows that Lunar New Year has specific dishes by region, and they differ between Cantonese, Vietnamese, and Korean traditions. Theo knows Eid al-Fitr, Diwali, Hanukkah, Nowruz — and the correct, respectful way to write about all of them. The platform could surface timely, culturally accurate content mapped to a real calendar, not just "Spring recipes." This is deeply respectful done carefully, and exactly why Theo's `review:cultural` skill exists.

*Unlock condition: cultural calendar data table (event, date, cuisines, collection slug) + Theo's `review:cultural` accuracy check before anything goes live.*

---

### Personalization Explainability

The homepage already computes a personalised score based on saves, cook history, and dietary preferences. No user knows this is happening. A single line of attribution text — *"Because you saved three Thai recipes this month"* or *"Nadia picked this based on your dietary preferences"* — would transform trust and engagement. The scoring is already computed at request time. The text explaining it does not yet exist.

*Unlock condition: add `surfaceReason: string` computed at request time to each homepage result row. Render as a subtle label under the card.*

---

### The Cook Log as a Culinary Journal

Users are keeping a journal they don't know they're keeping. Every "Cooked It" tap, every free-text cook note ("added extra chilli," "halved the recipe," "kids hated it") is stored in `cookedLog.notes`. Nobody reads it back to them. The cook log tab shows a flat list. The capability sits there untouched: Nadia could write a monthly synthesis, Marco could surface a technique pattern ("you've now made a roux three times — here's how to take it further"), Theo could write a summary of where in the world you've been cooking recently.

*Unlock condition: query cookedLog for a user → pass notes + recipe data to the relevant persona skill. Render as a periodic "From your kitchen" card on My Kitchen.*

---

Phase 1 is complete. The AI staff went from 3 personas with brief prompts to 5 personas with 55 deeply biographical skill prompts. The admin is clean and tabbed.

The platform currently sits at roughly **35% of the full vision** when Phase 1–3 and infrastructure are taken together. Phase 1 is the foundation. Phase 2 is what makes the platform sticky — something people come back to weekly, not just occasionally. Phase 3 is what makes it feel like it knows you.

**The next meaningful milestone:** named collections + week plan. Those two together turn "browse and save" into "actually plan and cook." After that, Soren and Theo's editorial routes bring the AI staff fully online — every recipe gets an origin story, every feature gets editorial copy, every generated recipe gets a headline pass. That's when the platform has a genuine editorial voice, not just a persona badge.
