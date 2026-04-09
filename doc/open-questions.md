# Cookbookverse v2 — Open Questions

> Unresolved decisions that need answers before or during the build. Resolve these before writing code.

---

## Design & Identity

- [ ] **Typography** — what font pairing defines the Cookbookverse v2 personality? (This is high-impact — sets the entire tone)
- [ ] **Homepage layout** — editorial hero with one featured recipe? Mosaic grid? Mood-based sections? What does "not a feed, not a database" actually look like on load?
- [ ] **Recipe card design** — image-dominant or text-forward? What's the right information density at the card level?
- [ ] **Logo/wordmark** — does the v1 mark carry over or is this a rebrand top to bottom?
- [ ] **AI interaction visual design** — chat-like interface? A panel? A floating button? Needs to feel native to the product, not like a chatbot bolted on

---

## Content

- [ ] **v1 recipe migration** — which of the ~30 existing recipes get migrated to v2? All of them? Only the best? Who decides?
- [ ] **Image situation** — v1 had no photography. Does v2 launch with AI-generated food imagery, stock photography, or hold recipes without images until photography exists?
- [ ] **"Today's Pick" editorial cadence** — how often does the featured/highlighted content rotate? Daily? Weekly? Who manages it?
- [ ] **Recipe difficulty definition** — Easy / Intermediate / Advanced needs a clear rubric so it's consistent across curated and submitted content

---

## AI

- [ ] **AI-generated recipe labeling** — how prominently is "AI Generated" called out? A subtle badge? A full disclosure section? Needs to be honest without being off-putting
- [x] **Submission AI review model** — Court of Chefs: 4 sequential AI passes (Technique, Flavour, Home Cook, Synthesis). Each judge returns a structured verdict. Synthesis aggregates into a confidence score and recommended action.
- [ ] **Court of Chefs threshold calibration** — what confidence score triggers auto-approve vs. flag vs. reject? Needs fine-tuning against real submissions before going live
- [ ] **Court of Chefs — judge prompt authoring** — the three judge personas need their prompts written carefully. Wrong prompts = wrong verdicts. Worth a dedicated session.
- [ ] **AI rate limiting** — free users get X AI interactions per day/month? Or fully unlimited at MVP?
- [ ] **Dietary adaptation flow** — does "make this vegan" modify the existing recipe in-place, or does it generate a separate new recipe card?

---

## User Accounts & Community

- [ ] **Account required to save?** — confirmed: account needed to save/interact. But does the save prompt feel like a gate or an invitation?
- [ ] **Username policy** — how strict? Profanity filter, uniqueness, display name vs. handle?
- [ ] **Submission limits** — can a new user submit immediately, or is there a cooldown / trust level system?
- [ ] **What happens to a rejected submission?** — submitter gets feedback and can revise? Or just a rejection with reason?

---

## Technical

- [ ] **Auth provider final decision** — Clerk vs. Auth.js (NextAuth)? Clerk is faster, Auth.js is more control. Decide before touching auth code
- [ ] **Image strategy** — AI-generated (DALL-E / Midjourney), stock (Unsplash API), user-uploaded only, or a mix? This affects storage, cost, and visual consistency
- [x] **Cloudflare D1 vs. something else?** — Neon (serverless Postgres) via Drizzle ORM. Connects directly from Next.js, free tier, no Worker proxy needed. D1 requires a Cloudflare Worker in the middle — unnecessary complexity.
- [ ] **PWA?** — should v2 be installable on mobile as a PWA? Low effort with Next.js, high value for cooking use case (offline access to saved recipes)
- [ ] **OG image generation** — Vercel OG library or custom Canvas API approach? Needs to be decided early since it affects deployment config

---

## Ambient Intelligence / Personal Chef Layer

- [x] **Where does the week plan live in the DB?** — `weekPlan` JSON field on the user row. Same pattern as `savedRecipes` and `fridgeIngredients`. Displayed in My Kitchen under "This week" tab.
- [x] **How proactive is too proactive?** — Indicator and insights only surface when 2+ recipes are in the plan. First add is a quiet confirmation only. Overlap shown on browse cards (subtle icon) and on recipe detail page (explicit callout). Frequency rule: ingredients in >30% of recipes are staples and never flagged.
- [x] **Week reset cadence** — manual clear, with a Monday nudge. No auto-wipe (too aggressive mid-week). No history (unnecessary complexity). On Monday, My Kitchen shows a quiet "New week? Start fresh." prompt. User stays in control.
- [x] **Ingredient overlap threshold** — 1 shared special ingredient is enough. Staples are already filtered by frequency rule, so anything that survives the filter is meaningful by definition.
- [x] **Grocery list persistence** — persists on the user row as a `groceryList` text field until cleared or regenerated. Same pattern as `savedRecipes`, `fridgeIngredients`, `weekPlan`. Must survive navigation — users need it at the grocery store on their phone.
- [x] **AI chat context** — the week plan feeds into the AI chat alongside fridge and dietary preferences. The AI is briefed on what's already planned before making new suggestions.
- [x] **Fridge ↔ grocery list** — when generating the combined grocery list, cross-reference the user's fridge. Items already in the fridge are flagged ("you may have this") or removed from the list.

---

## Answered Questions (Archived)

| Question | Decision | Session |
|---|---|---|
| Who is it for? | Broad audience — casual to serious cooks | Session 1 |
| First-time visitor access? | Browse freely, no account required | Session 1 |
| Primary returning user behavior? | Explore and discover new recipes | Session 1 |
| Recipe page vibe? | Between minimal and rich | Session 1 |
| AI — visible or background? | Visible, core, users actively interact with it | Session 1 |
| AI primary use cases? | All three — ingredients, mood/craving, dietary adaptation | Session 1 |
| User-submitted recipes? | Yes, with Court of Chefs AI review (4 passes) + admin approval gate | Session 1 |
| AI review architecture? | Court of Chefs — Technique, Flavour, Home Cook judges + Synthesis pass | Session 2 |
| Database | Neon serverless Postgres + Drizzle ORM. D1 skipped — requires Worker proxy. | Session 2 |
| Hosting | Vercel for Next.js app, Cloudflare for domain DNS + R2 image storage | Session 2 |
| Accent color? | Terracotta / rust — #C2603A | Pre-session |
