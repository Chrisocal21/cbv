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
- [ ] **Cloudflare D1 vs. something else?** — D1 is the default preference, but at recipe-platform scale with complex filtering, is Postgres (via Supabase or Neon) worth considering?
- [ ] **PWA?** — should v2 be installable on mobile as a PWA? Low effort with Next.js, high value for cooking use case (offline access to saved recipes)
- [ ] **OG image generation** — Vercel OG library or custom Canvas API approach? Needs to be decided early since it affects deployment config

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
| Frontend framework? | Next.js (SSR required — v1 CSR was a failure) | Session 1 |
| Accent color? | Terracotta / rust — #C2603A | Pre-session |
