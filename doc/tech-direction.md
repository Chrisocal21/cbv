# Cookbookverse — Tech Direction
> Last updated: April 12, 2026

The actual current stack. No aspirational notes — what is running in production.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR/SSG, API routes — everything in one deployment |
| **Language** | TypeScript | Strict throughout |
| **Styling** | Tailwind CSS | Design tokens in `globals.css`, dark/light mode via CSS custom properties |
| **Database** | Neon (serverless Postgres) | Free tier, connects directly from Next.js |
| **ORM** | Drizzle | Schema in `src/lib/db/schema.ts`, migrations in `src/lib/db/migrations/` |
| **Auth** | Clerk | Email + social login, admin role gating |
| **AI** | OpenAI GPT-4o / GPT-4o-mini | Court of Chefs uses mini, generation uses 4o |
| **Image storage** | Vercel Blob | Two routes: `generate-image/` and `generate-collection-image/` — R2 migration pending |
| **Deployment** | Vercel | Pushes from main, API routes as serverless functions |
| **Domain/DNS** | Cloudflare | DNS only — all traffic routes to Vercel |

---

## Project Structure

```
src/
  app/              <- Next.js App Router pages
    api/            <- All backend logic — no separate server
      admin/        <- Admin operations (protected by Clerk admin role)
      user/         <- Authenticated user actions
      ai/           <- AI chat, grocery list, save/submit from chat
      cron/         <- Vercel Cron jobs (weekly run)
  components/       <- All UI components
  lib/
    db/
      schema.ts     <- Single source of truth for all DB types
      index.ts      <- Drizzle client
    staff.ts        <- AI persona configs, skill prompts, buildStaffPrompt()
    queries.ts      <- Shared DB query helpers
    data.ts         <- Static recipe data helpers
```

---

## AI Layer

### The AI Staff — 5 Personas

All persona configs, craft knowledge, and skill prompts live in `src/lib/staff.ts`. The `buildStaffPrompt(persona, skill)` function assembles the full prompt: identity ? voice ? craft knowledge ? task skill.

| Persona | Primary Role | Skills |
|---|---|---|
| **Marco** | Executive Chef — generation + technique review | 13 skills |
| **Céleste** | Pastry & Baking Lead — baking generation + review | 11 skills |
| **Nadia** | Dietary & Wellness — homecook review + chat + grocery | 11 skills |
| **Theo** | Editorial Director — synthesis review + editorial writing | 10 skills |
| **Soren** | Global Kitchen — street food generation + wild suggestions | 10 skills |

### Court of Chefs

Every recipe (AI-generated or user-submitted) runs through 5 sequential AI passes before reaching the admin queue:

```
Technique review (Marco)
Flavour review (Céleste)
Home cook review (Nadia)
Critic pass (Nadia:critic)
Synthesis + confidence score (Theo)
```

Returns structured JSON: per-judge verdict + notes + overall confidence score + recommended action.

### AI Chat Routing

The `/api/ai` route uses `routeChat()` to detect topic from the last user message and route to the correct persona. Baking ? Céleste, technique/heat ? Marco, fermentation/global ? Soren, cultural context ? Theo, nutrition/dietary ? Nadia. Default: Nadia.

---

## Database

Schema is single-file in `src/lib/db/schema.ts`. Key tables:

| Table | Purpose |
|---|---|
| `recipes` | Full recipe content — all fields, status, staffAuthor |
| `users` | Clerk user data + savedRecipes (JSON), fridgeIngredients (JSON), cookedLog (JSON), preferences |
| `submissions` | Court of Chefs verdicts + admin decision per recipe |
| `collections` | Admin-managed recipe collections with gradient/image |
| `userCollections` | User-created named collections (recipe lists) |
| `notifications` | User event notifications (requires `0010_notifications.sql` migration on Neon) |
| `staff_activity` | Every AI call log — persona, action, tokens, outcome |
| `settings` | Admin config — token budget, automation toggles, per-persona prompt overrides |
| `prompts` | Custom prompt templates (editable from admin Settings tab) |

Migrations are in `src/lib/db/migrations/`. Run with Drizzle Kit. **Pending: `0010_notifications.sql` must be applied to Neon before notifications work.**

---

## Auth

Clerk handles all auth. Admin gating in API routes:

```ts
const { userId } = await auth()
const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

---

## Cron

**`POST /api/cron/weekly-run`** — triggered by Vercel Cron (config in `vercel.json`). Runs Ellis's weekly digest: collection gap detection, token spend summary, staff activity log. Can also trigger batch creation jobs.

---

## Image Storage (Current + Planned)

**Current:** Vercel Blob. Two routes write images:
- `src/app/api/admin/generate-image/route.ts`
- `src/app/api/admin/generate-collection-image/route.ts`

**Planned migration to Cloudflare R2** (when Vercel Blob limits are approached — 1 GB / 2k ops / 10 GB transfer):
1. Create R2 bucket `cbv-images`, add custom domain
2. Add env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
3. Install `@aws-sdk/client-s3`, swap `put()` for `PutObjectCommand` in both routes
4. One-time script to migrate existing blob URLs in the DB

---

## Environment Variables

Required to run the app:
```
DATABASE_URL           <- Neon connection string
NEXT_PUBLIC_CLERK_...  <- Clerk publishable key
CLERK_SECRET_KEY       <- Clerk secret
OPENAI_API_KEY         <- OpenAI
BLOB_READ_WRITE_TOKEN  <- Vercel Blob
CRON_SECRET            <- Header token for verifying cron requests
```
