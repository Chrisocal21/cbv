# Cookbookverse v2 — Feature Map

> Features by phase. Phase 1 is the launch build. Everything earns its place.
> 
> `[x]` = done · `[%]` = partial/in progress · `[ ]` = not started

---

## Phase 1 — MVP: The World Opens

*Goal: A beautiful, discoverable, cookable platform with real AI interaction and a quality-controlled submission pipeline.*

---

### Discovery & Browsing
- [x] Homepage — editorial, curated, not a feed. Featured recipe, collections, moods, new additions
- [x] Explore page — full browse with filters (cuisine, dietary, difficulty, mood/collection)
- [x] Search — keyword search across titles, ingredients, tags, descriptions
- [x] Collection pages — data-driven, DB-backed, auto-creates from new recipes
- [x] "Today's pick" — admin-curated featured recipe, pinned from admin dashboard
- [x] Tag/mood browsing — dietary and mood tags on recipe pages link to filtered explore

---

### Recipe Detail Page
- [x] Hero — full-width gradient, AI badge, editorial feel
- [x] Title, subtitle/tagline, short description
- [x] At-a-glance bar — prep time, cook time, servings, difficulty
- [x] Ingredients list — grouped by component (metric/imperial toggle)
- [x] Step-by-step instructions — numbered, cookable layout
- [x] Nutrition panel — collapsible
- [x] Origin story — cultural/historical context paragraph
- [x] "You might also like" — related recipes by cuisine or mood tag
- [x] Save button — wired to user account, toggles saved state
- [x] Share button — native share / copy link
- [x] AI badge — labeled clearly on generated recipes
- [x] Submit for review — appears on user-owned draft recipes
- [x] Print view — clean, no UI chrome
- [x] "Cooked It" button — logs the cook to user's cook log on their profile
- [x] Submit variation — create your own take on a published recipe

---

### AI Interaction
- [x] Dedicated AI page — first-class destination in nav
- [x] Mode 1: Ingredient mode — "What can I make with X, Y, Z?"
- [x] Mode 2: Mood/craving mode — "I want something cozy and spicy"
- [x] Mode 3: Dietary adaptation — "Make this vegan" / "I'm gluten-free"
- [x] AI results clearly labeled — "Found in our library" vs. "Generated for you"
- [x] Save AI-generated recipe — saves as user-owned draft from chat
- [x] Submit AI-generated recipe — submits for review directly from chat
- [x] Conversational UI — natural language, not a form

---

### User Accounts
- [x] Sign up / login via Clerk (email + social)
- [x] Saved recipes list — personal library (profile Saved tab)
- [x] User profile page ("My Kitchen") — My recipes / Saved / Submissions tabs
- [x] Submission status tracking — see Court of Chefs verdict + admin decision
- [ ] Create named collections — "Weeknight dinners", "Dinner party ideas", etc.
- [x] Account settings — display name, bio, dietary preferences
- [x] Dietary preferences feed into AI suggestions automatically

---

### Recipe Submission
- [x] Submit a recipe form — title, description, ingredients, steps, tags, cuisine, dietary, difficulty, times
- [x] **Court of Chefs** — 3 parallel AI judges + synthesis pass
  - Technique Judge, Flavour Judge, Home Cook Judge — run simultaneously
  - Synthesis: aggregate verdicts, confidence score, structured report
  - Returns: approved for admin review / flagged / rejected
- [x] Submission status visible on user profile
- [x] Admin approval queue — full Court of Chefs report + publish/reject decision
- [x] Re-run review — admin can re-trigger Court of Chefs for stuck submissions
- [x] Reject feedback — judge notes shown to submitter on profile Submissions tab
- [x] Resubmit flow — after rejection, user can edit and resubmit for review

---

### Admin
- [x] Admin dashboard — submission review queue with full court report
- [x] Admin recipe generator — generate, preview, chat-edit, re-review, then publish/reject
- [x] Publish / reject with optional admin notes
- [x] Edit published recipes — AI-assisted inline edit from admin published recipes panel
- [x] "Feature this recipe" — pin to homepage as Today's Pick from admin dashboard
- [x] Collections management — create, edit name/description/gradient, auto-creates on new recipe value
- [x] Basic analytics — page views per recipe, most saved (simple, no third-party) — shown in admin panel
- [x] "From the Archive" generator button — pick a v1 dish concept, regenerate it fresh with v2 AI

---

### Design System & UX
- [x] Full design system — typography, color tokens, spacing, component library
- [x] Day / night mode — system default + manual toggle, persisted
- [x] Terracotta accent (`#C2603A`) — consistent across both modes
- [x] Warm off-white light mode, deep warm charcoal dark mode
- [x] Recipe cards — gradient, title, tags, time, difficulty at a glance
- [x] Responsive — mobile nav hamburger menu, layout works across breakpoints
- [x] No infinite scroll on browse — "load more" with count of remaining results
- [x] Print view for recipes
- [x] Cook log tab on profile — full history of what the user has cooked
- [x] Fridge mode — persistent ingredient list, feeds into AI chat automatically *(built early from Phase 3)*
- [x] Recipe variations — submit your own take on a published recipe *(built early from Phase 3)*

---

## Phase 1 — What's Left

**Phase 1 is complete.** 🎉

---

## Phase 2 — Community Layer

*Goal: Users feel like they belong to something, not just consume from it.*

- [ ] Public user profiles — bio, published recipes, public collections
- [ ] Public collections — shareable "cookbooks" anyone can follow
- [ ] Recipe ratings — simple save-based popularity or optional 5-star
- [ ] AI grocery list generator — from any recipe or collection
- [ ] "Cook this week" — select recipes, AI generates a weekly meal plan with grocery list
- [ ] Comments on recipes — moderated, quality-first
- [ ] "Trending this week" surface on explore page
- [ ] Notification system — your recipe was published, someone saved your recipe

---

## Phase 3 — Intelligence Layer

*Goal: Cookbookverse learns what you love and surfaces things you didn't know you wanted.*

- [ ] Personalized homepage — based on saved recipes, dietary prefs, AI history
- [x] Fridge mode — persistent ingredient list, AI always knows what you have *(built early, see Phase 1)*
- [ ] Nutrition tracking — log what you cooked this week, see nutritional summary
- [ ] "Because you saved X" — similarity-based recommendations
- [ ] Weekly email digest via Resend — new recipes matching your taste profile
- [x] Recipe versioning — submit variations of existing recipes ("my take on this") *(built early, see Phase 1)*

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

