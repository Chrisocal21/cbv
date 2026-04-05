# Cookbookverse v2 — Tech Direction

> Stack, architecture, and integration decisions for the v2 rebuild. No code — direction and rationale only.

---

## Guiding Principle

v2 fixes the two biggest technical failures of v1: **invisible to search engines** (pure CSR) and **no frontend investment**. The new architecture prioritizes SSR for discoverability, a design-forward frontend, and a clean AI integration layer that users actually touch.

---

## Stack Overview

### Frontend
**Next.js + Tailwind + TypeScript**

- Next.js is the right call here — SSR/SSG means recipe pages are indexable by Google, shareable on social with proper OG tags, and accessible to screen readers
- App Router for clean page structure (home, explore, recipe detail, AI, profile, submit, admin)
- Tailwind for fast, systematic styling — critical when the design bar is high and you're building solo
- TypeScript catches data model issues early — recipe schema is complex enough to warrant it

### Backend / API Layer
**Cloudflare Workers**

- Handles all API calls server-side (keeps AI API keys off the client)
- Recipe CRUD, user management, submission workflow, AI proxy
- Edge-native, zero cold starts, near-zero cost at personal/small scale

### Database
**Neon (serverless Postgres)**

- Postgres fits the recipe data model well — structured, relational, powerful filtering
- Neon's free tier covers this project comfortably through growth
- Connects directly from Next.js — no proxy layer needed
- Drizzle ORM for type-safe queries and migrations

> Note: Cloudflare D1 was considered but requires a Worker proxy between Next.js and the DB — extra complexity for no user-facing benefit.

### File / Image Storage
**Cloudflare R2**

- Recipe photography, user-uploaded images for submissions
- S3-compatible, cheap, already ecosystem-native
- Images served via Cloudflare CDN — fast globally

### Image Optimization
**Cloudflare Images** or **Next.js Image component + R2**

- Next.js Image handles optimization automatically when configured with R2 as the source
- Resize, compress, and serve WebP automatically — critical for a visual platform

### Auth
**Clerk** (recommended over Cloudflare Access for this use case)

- Cookbookverse has real users — not just you behind an internal tool
- Clerk's free tier covers a growing user base
- Beautiful pre-built UI components that can be styled to match
- Handles social login (Google, Apple) which matters for a broad consumer audience
- Alternatively: Auth.js (NextAuth) if you want more control with less vendor dependency

### Deployment
**Vercel** (frontend + API routes) + **Cloudflare** (domain, R2 for images)

- Vercel is purpose-built for Next.js — zero config, instant deploys, edge functions
- Cloudflare manages the `cookbookverse.com` domain via DNS record pointing at Vercel
- Cloudflare R2 for recipe image storage (already paid, S3-compatible, CDN-served)

---

## AI Layer

### Primary Model
**OpenAI GPT-4o**

- Powers all three user-facing AI interactions:
  1. **Generate from ingredients** — "I have chicken, lemon, and capers. What can I make?"
  2. **Mood/craving matching** — "I want something cozy and spicy for a rainy night"
  3. **Dietary adaptation** — "Make this vegan" / "I'm gluten-free, can this work?"
- GPT-4o handles open-ended conversational prompts better than structured-only models
- Responses should return structured JSON (recipe format) or matched recipe IDs from the DB

### Content & Submission Review — "Court of Chefs"
**OpenAI GPT-4o-mini** (4 sequential passes per submission)

Every submitted recipe — whether from a user or AI-generated for the library — runs through four sequential AI judge passes before admin review. This catches the core failure mode of AI-generated recipes: they are *technically assembled* but not *cooked-forward*.

| Pass | Persona | Focus |
|---|---|---|
| 1 | **Technique Judge** | Will this actually work? Times, temps, method, order of operations |
| 2 | **Flavour Judge** | Salt, acid, fat, heat in balance? Does this taste like something real? |
| 3 | **Home Cook Judge** | Can a real person follow this? Equipment, clarity, missing steps, substitutions |
| 4 | **Synthesis** | Aggregate all three verdicts, assign confidence score, produce structured report |

- Returns structured JSON: per-judge verdict, flagged issues, overall confidence score, recommended action
- Admin sees the full court report alongside the recipe — not just a pass/fail
- Estimated cost: ~$0.02–0.05 per recipe at gpt-4o-mini pricing
- **Does not apply to the AI Kitchen chat** — that stays single-pass and exploratory by design
- Also handles: generating recipe metadata (tags, difficulty, cuisine type) from raw submission text

### AI Interaction Model (UX)
- Dedicated AI panel/page — not buried in a settings menu
- Conversational interface — user types naturally, AI responds with recipe suggestions or a generated recipe
- If a match exists in the DB, surface it. If not, generate one with clear "AI Generated" label
- Generated recipes can be saved to user's collection but are not published to the platform without review

---

## Data Model (conceptual)

### Recipe
```
id, title, subtitle, description
cuisine, mood_tags[], dietary_tags[], difficulty
prep_time, cook_time, total_time, servings
ingredients[] (name, amount, unit, group, optional)
steps[] (order, title, body)
nutrition (calories, protein, carbs, fat, fiber)
origin_story, conclusion
image_url, gallery_urls[]
status (published / pending_review / rejected / draft)
author_id (null = platform/admin)
ai_generated (boolean)
created_at, updated_at, published_at
```

### User
```
id, clerk_id, username, display_name
avatar_url, bio
saved_recipes[], submitted_recipes[]
role (user / admin)
created_at
```

### Submission
```
id, recipe_id, submitted_by
court_technique_verdict, court_technique_notes
court_flavour_verdict, court_flavour_notes
court_homecook_verdict, court_homecook_notes
court_confidence_score (0–100), court_recommended_action (approve/flag/reject)
admin_reviewed (boolean), admin_decision, admin_notes
submitted_at, reviewed_at
```

### Collection (user-curated)
```
id, user_id, name, recipe_ids[]
is_public (boolean)
created_at
```

---

## Content Architecture (from v1)

The five-book framework from v1 is worth preserving as the organizational backbone — not as a literal "books" UI metaphor, but as a tagging/category system:

| Collection | Vibe |
|---|---|
| Culinary Journeys | Global, fusion, street food, cultural exploration |
| Seasonal Sensations | Time-of-year cooking, holidays, garden-to-plate |
| Gourmet Guerillas | Elevated home cooking, technique-forward |
| Quick & Creative | Fast, clever, minimal ingredients |
| Baking Alchemy | Bread, pastry, sweets |

These map naturally to browsing filters and AI mood prompts.

---

## SEO & Discoverability

v1's biggest technical failure — fix it completely in v2:

- **SSR/SSG via Next.js App Router** — recipe pages pre-rendered, fully crawlable
- **JSON-LD schema markup** on every recipe page (Recipe schema type) — Google rich results
- **Dynamic OG images** — auto-generated per recipe for social sharing (Vercel OG or custom via Canvas API)
- **Sitemap.xml** — auto-generated from published recipe list
- **Semantic HTML** — proper heading hierarchy, alt text on images, accessible form labels

---

## Day / Night Mode

- CSS custom properties for all color values — single source of truth
- System preference detection via `prefers-color-scheme`
- Manual toggle persisted to localStorage (and user account if logged in)
- Terracotta/rust accent (`#C2603A`) works in both modes — adjust background and surface colors, keep the accent consistent
- No pure white (#FFF) in light mode — use warm off-whites. No pure black (#000) in dark mode — use deep warm charcoals

---

## Phases

### Phase 1 — MVP (v2 launch)
- Next.js frontend with SSR, day/night mode, full design system
- Recipe browsing and discovery (curated content from v1 + new)
- Recipe detail page (clean, cookable, rich)
- Basic search and filter (cuisine, dietary, difficulty, time)
- AI interaction panel (all three modes)
- User accounts via Clerk (save recipes, create collections)
- Recipe submission flow with AI review + admin approval queue
- Admin dashboard (review queue, publish/reject)

### Phase 2 — Community Layer
- User profiles (public-facing, shows their published recipes + collections)
- Public collections (shareable recipe lists)
- Recipe ratings (simple — save/unsave or 5-star, TBD)
- AI-generated grocery lists from any recipe or collection
- "Cook this week" meal planning from saved/filtered recipes

### Phase 3 — Intelligence Layer
- Personalized discovery based on saved recipes and AI history
- "What's in my fridge" persistent ingredient tracking
- Nutrition tracking across meals/week
- Recipe similarity suggestions ("if you liked this, try...")
- Email digest (Resend) — weekly new recipes matching your taste profile
