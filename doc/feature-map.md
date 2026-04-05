# Cookbookverse v2 — Feature Map

> Features by phase. Phase 1 is the launch build. Everything earns its place.

---

## Phase 1 — MVP: The World Opens

*Goal: A beautiful, discoverable, cookable platform with real AI interaction and a quality-controlled submission pipeline.*

---

### Discovery & Browsing
- [%] Homepage — editorial, curated, not a feed. Featured recipe, collections, moods, new additions
- [%] Explore page — full browse with filters (cuisine, dietary, difficulty, time, mood/collection)
- [ ] Search — keyword search across titles, ingredients, tags, descriptions
- [%] Collection pages — Culinary Journeys, Seasonal Sensations, Gourmet Guerillas, Quick & Creative, Baking Alchemy
- [%] "Today's pick" or "Right now" surface — editorial highlight that rotates (manually curated by admin)
- [ ] Tag/mood browsing — click a tag (e.g., "cozy", "spicy", "30 minutes") and enter a filtered world

---

### Recipe Detail Page
- [%] Hero image — full-width, warm, editorial
- [%] Title, subtitle/tagline, short description
- [%] At-a-glance bar — prep time, cook time, servings, difficulty, dietary flags
- [%] Ingredients list — grouped by component, with toggle for metric/imperial
- [%] Step-by-step instructions — numbered, with bold step titles, cookable layout
- [%] Nutrition panel — collapsible, not in your face
- [%] Origin story — cultural/historical context paragraph (where it exists)
- [%] "You might also like" — related recipes by cuisine or mood tag
- [ ] Save button — adds to user's saved recipes (prompts account creation if not logged in)
- [%] Share button — native share / copy link / OG-ready URL
- [ ] AI badge — if recipe was AI-generated, labeled clearly and tastefully
- [ ] Print view — clean, no UI chrome, just the recipe

---

### AI Interaction
- [%] Dedicated AI page/panel — not buried, a first-class destination
- [%] Mode 1: **Ingredient mode** — "What can I make with X, Y, Z?" → suggests matching DB recipes or generates new one
- [%] Mode 2: **Mood/craving mode** — "I want something cozy and spicy" → curated suggestions + AI picks
- [%] Mode 3: **Dietary adaptation** — "Make this vegan" / "I'm gluten-free, does this work?" → adapts a recipe
- [%] AI results clearly labeled — "Found in our library" vs. "Generated for you"
- [ ] Save AI-generated recipes to personal collection (not published to platform without review)
- [%] Conversational UI — natural language input, not a form

---

### User Accounts
- [ ] Sign up / login via Clerk (email, Google, Apple)
- [ ] Saved recipes list — personal library
- [ ] Create named collections — "Weeknight dinners", "Dinner party ideas", etc.
- [ ] Account settings — username, display name, avatar, dietary preferences
- [ ] Dietary preferences feed into AI suggestions automatically

---

### Recipe Submission
- [ ] Submit a recipe form — structured but not intimidating
  - Title, description, ingredients (grouped), steps, tags, cuisine, dietary flags, difficulty, times
  - Optional: image upload (goes to R2)
- [ ] **Court of Chefs** — multi-agent AI review pipeline (4 sequential passes before admin ever sees it)
  - Pass 1 — Technique Judge: will this actually work? Times, temps, method, order of operations
  - Pass 2 — Flavour Judge: is there balance? Salt, acid, fat, heat in proportion? Does it taste like something?
  - Pass 3 — Home Cook Judge: can a real person follow this? Equipment assumptions, clarity, missing steps, useful substitutions
  - Pass 4 — Synthesis: aggregate notes from all three judges, assign confidence score, produce structured report
  - Returns: approved for admin review / flagged with specific notes / rejected with reason
- [ ] Submission status page — user can see where their recipe is in the pipeline
- [ ] Admin approval queue — admin sees the full Court of Chefs report alongside the recipe
  - Each judge's verdict surfaced clearly, admin makes final call
  - Reject feedback (with judge notes) sent to submitter so they can revise

---

### Admin
- [ ] Admin dashboard — recipe management (publish, edit, archive, feature)
- [ ] Submission review queue — AI report + admin decision UI
- [ ] "Feature this recipe" — pin to homepage, collections, or Today's Pick
- [ ] Basic analytics — page views per recipe, most saved, most searched (simple, no third-party)
- [ ] Bulk import from v1 content — migrate existing recipes into the new data model

---

### Design System & UX
- [%] Full design system — typography, color tokens, spacing, component library
- [%] Day / night mode — system default + manual toggle, persisted
- [ ] Responsive — mobile-first, works beautifully on phone (where most cooking reference happens)
- [%] Terracotta accent (`#C2603A`) — consistent across both modes
- [%] Warm off-white light mode, deep warm charcoal dark mode — no pure white or black
- [%] Recipe cards — image, title, tags, time, difficulty at a glance
- [ ] No infinite scroll on browse — paginated or "load more" with intention

---

## Phase 2 — Community Layer

*Goal: Users feel like they belong to something, not just consume from it.*

- [ ] Public user profiles — bio, published recipes, public collections
- [ ] Public collections — shareable "cookbooks" anyone can follow
- [ ] Recipe ratings — simple save-based popularity or optional 5-star
- [ ] AI grocery list generator — from any recipe or collection, produces a consolidated shopping list
- [ ] "Cook this week" — select recipes, AI generates a weekly meal plan with grocery list
- [ ] Comments on recipes — moderated, quality-first
- [ ] "Trending this week" surface on explore page
- [ ] Notification system — your recipe was published, someone saved your recipe

---

## Phase 3 — Intelligence Layer

*Goal: Cookbookverse learns what you love and surfaces things you didn't know you wanted.*

- [ ] Personalized homepage — based on saved recipes, dietary prefs, AI history
- [ ] Fridge mode — persistent ingredient list, AI always knows what you have
- [ ] Nutrition tracking — log what you cooked this week, see nutritional summary
- [ ] "Because you saved X" — similarity-based recommendations
- [ ] Weekly email digest via Resend — new recipes matching your taste profile
- [ ] Recipe versioning — submit variations of existing recipes ("my take on this")

---

## Features Considered and Cut (for now)

| Feature | Why Cut |
|---|---|
| Real-time collaboration | Out of scope — not a social editing tool |
| Live cooking sessions / video | Complexity, cost, out of scope for v2 |
| Restaurant partnerships | Phase 4+ territory |
| Mobile app (native) | Web + PWA covers it at this stage |
| Subscription/paywall | Build the audience first |
| Leaderboards / gamification | Risks feeling cheap — not the vibe |
| Virtual food tours | Fun but not core — backlog |
