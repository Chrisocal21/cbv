import { auth } from '@clerk/nextjs/server'
import { getFeaturedRecipe, getAllRecipes, getCollectionsWithSpotlight, getUserProfile, getUserCookedRecipeIds, getTrendingRecipes } from '@/lib/queries'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { Navbar } from '@/components/navbar'
import { HomeGrocery } from '@/components/home-grocery'
import { TimeAwarePicks } from '@/components/time-aware-picks'
import { PantryHeroCta } from '@/components/pantry-hero-cta'
import { STAFF_PERSONAS, isStaffPersona } from '@/lib/staff'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { userId } = await auth()
  const [featured, allRecipes, dbCollections, profile, cookedRecipeIds, trendingRecipes] = await Promise.all([
    getFeaturedRecipe(),
    getAllRecipes(),
    getCollectionsWithSpotlight(),
    userId ? getUserProfile(userId) : null,
    userId ? getUserCookedRecipeIds(userId) : Promise.resolve([] as string[]),
    getTrendingRecipes(6),
  ])

  // Build user author lookup for recipe grids
  const userAuthorIds = [...new Set(allRecipes.filter((r) => r.authorId && !r.staffAuthor).map((r) => r.authorId!))]
  const authorRows = userAuthorIds.length > 0
    ? await db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).where(inArray(users.id, userAuthorIds))
    : []
  const userAuthors = Object.fromEntries(
    authorRows.filter((a) => a.username).map((a) => [a.id, { username: a.username!, displayName: a.displayName }])
  )

  // New additions — most recent 3 published recipes (excluding featured)
  const newAdditions = allRecipes
    .filter((r) => r.status === 'published' && r.id !== featured?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  // Personalised picks — uses saved + cooked history + dietary prefs
  const savedIds = new Set(profile?.savedRecipes ?? [])
  const cookedIds = new Set(cookedRecipeIds)
  const dietaryPrefs = (profile?.dietaryPreferences as string[] | null) ?? []

  const personalisedRecipes = (() => {
    if (!userId || (savedIds.size === 0 && cookedIds.size === 0 && dietaryPrefs.length === 0)) return []

    const savedRecipes = allRecipes.filter((r) => savedIds.has(r.id))
    const cookedRecipes = allRecipes.filter((r) => cookedIds.has(r.id))

    // Build preference vectors — cooked carries more weight than saved
    const favCuisines = new Map<string, number>()
    const favCollections = new Map<string, number>()
    const favMoods = new Map<string, number>()
    for (const r of savedRecipes) {
      favCuisines.set(r.cuisine, (favCuisines.get(r.cuisine) ?? 0) + 1)
      favCollections.set(r.collection, (favCollections.get(r.collection) ?? 0) + 1)
      for (const t of r.moodTags as string[]) favMoods.set(t, (favMoods.get(t) ?? 0) + 0.5)
    }
    for (const r of cookedRecipes) {
      favCuisines.set(r.cuisine, (favCuisines.get(r.cuisine) ?? 0) + 2)
      favCollections.set(r.collection, (favCollections.get(r.collection) ?? 0) + 2)
      for (const t of r.moodTags as string[]) favMoods.set(t, (favMoods.get(t) ?? 0) + 1)
    }

    const alreadySeen = new Set([...savedIds, ...cookedIds])

    return allRecipes
      .filter((r) => r.status === 'published' && !alreadySeen.has(r.id) && r.id !== featured?.id)
      .map((r) => {
        let score = 0
        const reasons: string[] = []

        const cuisineScore = (favCuisines.get(r.cuisine) ?? 0) * 3
        if (cuisineScore > 0) { score += cuisineScore; reasons.push(r.cuisine) }
        score += (favCollections.get(r.collection) ?? 0) * 2
        for (const t of r.moodTags as string[]) score += (favMoods.get(t) ?? 0)

        if (dietaryPrefs.length > 0) {
          const tags = r.dietaryTags as string[]
          const matches = dietaryPrefs.filter((p) => tags.includes(p))
          if (matches.length > 0) { score += 3; reasons.push(...matches) }
        }

        const reason = reasons.slice(0, 2).join(' · ')
        return { recipe: r, score, reason }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  })()

  // Personal grocery checklist (homepage centerpiece) — multi-list support
  type GroceryItem = { id: string; text: string; checked: boolean }
  type GroceryList = { id: string; name: string; items: GroceryItem[] }
  let groceryLists = (profile?.groceryLists as GroceryList[]) ?? []
  
  // Fallback: if no lists but old groceryItems exist, create a default list
  if (groceryLists.length === 0) {
    const oldItems = (profile?.groceryItems as GroceryItem[]) ?? []
    if (oldItems.length > 0) {
      groceryLists = [{ id: 'migrated', name: 'Main list', items: oldItems }]
    }
  }
  
  const allGroceryItems = groceryLists.flatMap(list => list.items ?? [])

  // Signed-in greeting + at-a-glance stats
  const firstName = (profile?.displayName ?? profile?.username ?? '').trim().split(' ')[0]
  const hour = new Date().getHours()
  const itemsToGet = allGroceryItems.filter((i) => !i.checked).length
  const savedCount = profile?.savedRecipes?.length ?? 0
  const weekPlanCount = profile?.weekPlan?.length ?? 0

  // Warm, editorial welcome — reads like a market greeting, not a dashboard.
  const welcomeHeading = firstName ? `Welcome back, ${firstName}` : 'Welcome back'
  const welcomeTagline =
    hour < 12
      ? 'The kitchen\u2019s open — what are we making this morning?'
      : hour < 18
      ? 'Good to see you. Let\u2019s find something worth cooking.'
      : 'Evening. Something good is always worth the effort.'

  // A single warm recommendations row for signed-in users — personalised if we can,
  // otherwise the freshest additions so the page always feels alive.
  const recommendations = personalisedRecipes.length > 0
    ? personalisedRecipes.map((p) => p.recipe)
    : newAdditions

  // Candidate pool for the time-aware picks row. Order matters: personalised
  // first, then trending, then fresh — the client re-ranks by the viewer's
  // local meal window and falls back to this order when nothing matches.
  const pickPoolSource = [
    ...recommendations,
    ...trendingRecipes,
    ...newAdditions,
  ]
  const seenPickIds = new Set<string>()
  const timePickPool = pickPoolSource
    .filter((r) => {
      if (!r || seenPickIds.has(r.id)) return false
      seenPickIds.add(r.id)
      return true
    })
    .slice(0, 12)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      collection: r.collection,
      totalTime: r.totalTime,
      difficulty: r.difficulty,
      imageUrl: r.imageUrl,
      gradient: r.gradient,
      moodTags: (r.moodTags as string[] | null) ?? [],
      ingredients: ((r.ingredients as { group: string; items: string[] }[] | null) ?? [])
        .flatMap((g) => g.items),
    }))
  const pickFallbackHeading = personalisedRecipes.length > 0 ? 'Picked for you' : 'Fresh from the kitchen'

  // Ingredient names from the grocery list — used to boost recipes the user can
  // mostly already make. Kept to non-empty, unchecked-or-checked text.
  const groceryNames = allGroceryItems.map((i) => i.text).filter(Boolean)

  // Season-aware section — derive from current month + mood tags
  const currentMonth = new Date().getMonth() // 0-indexed
  const monthName = new Date().toLocaleString('en-GB', { month: 'long' })
  const seasonMoods: string[][] = [
    ['warming', 'comforting', 'hearty'],           // Jan
    ['warming', 'comforting', 'slow-cook'],         // Feb
    ['spring', 'fresh', 'light'],                   // Mar
    ['spring', 'fresh', 'light'],                   // Apr
    ['fresh', 'light', 'spring'],                   // May
    ['fresh', 'light', 'grilling'],                 // Jun
    ['summer', 'fresh', 'salad', 'grilling'],       // Jul
    ['summer', 'fresh', 'cold'],                    // Aug
    ['autumn', 'harvest', 'hearty'],                // Sep
    ['autumn', 'harvest', 'comforting'],            // Oct
    ['warming', 'cozy', 'hearty'],                  // Nov
    ['warming', 'festive', 'holiday'],              // Dec
  ]
  const seasonTags = new Set(seasonMoods[currentMonth] ?? [])
  const seasonalRecipes = allRecipes
    .filter((r) => r.status === 'published' && (r.moodTags as string[]).some((t) => seasonTags.has(t.toLowerCase())))
    .filter((r) => r.id !== featured?.id)
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <main>
        {/* Grocery list centerpiece — the heart of the app */}
        {userId ? (
          <>
          {/* Editorial masthead — reads like a magazine, not a dashboard */}
          <section className="mx-auto max-w-2xl px-6 pt-12 pb-2">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-ember mb-3">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-[1.05] mb-3">
              {welcomeHeading}.
            </h1>
            <p className="text-lg text-ink-dim mb-5 leading-relaxed">{welcomeTagline}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm border-t border-line pt-4">
              <a href="/grocery-list" className="group inline-flex items-baseline gap-1.5 text-ink-dim hover:text-ember transition-colors">
                <span className="font-display font-bold text-ink group-hover:text-ember tabular-nums">{itemsToGet}</span>
                <span>to buy</span>
              </a>
              <span className="text-line">·</span>
              <a href="/profile?tab=saved" className="group inline-flex items-baseline gap-1.5 text-ink-dim hover:text-ember transition-colors">
                <span className="font-display font-bold text-ink group-hover:text-ember tabular-nums">{savedCount}</span>
                <span>saved</span>
              </a>
              <span className="text-line">·</span>
              <a href="/profile?tab=this-week" className="group inline-flex items-baseline gap-1.5 text-ink-dim hover:text-ember transition-colors">
                <span className="font-display font-bold text-ink group-hover:text-ember tabular-nums">{weekPlanCount}</span>
                <span>this week</span>
              </a>
            </div>
          </section>

          {/* Grocery list */}
          <HomeGrocery initialLists={groceryLists} itemsToGet={itemsToGet} />

          {/* Time-aware picks — re-ranked by the viewer's local meal window */}
          {timePickPool.length > 0 && (
            <TimeAwarePicks pool={timePickPool} fallbackHeading={pickFallbackHeading} groceryItems={groceryNames} />
          )}

          {/* Explore CTA */}
          <section className="mx-auto max-w-2xl px-6 pb-16">
            <div className="mt-6 flex justify-center">
              <a
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ember text-white font-medium text-sm hover:bg-ember-deep transition-colors"
              >
                Explore more recipes
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </section>
          </>
        ) : (
          <>
          <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-5">
              Cook from what you have
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-ink leading-[1.08] mb-6 max-w-3xl">
              Tell us what&rsquo;s in your kitchen. We&rsquo;ll tell you what to cook.
            </h1>
            <p className="text-lg text-ink-dim max-w-xl mb-10 leading-relaxed">
              Keep a living list of what you have at home. Cookbookverse matches it against a curated world of recipes — so dinner is never a guessing game.
            </p>
            <PantryHeroCta />
          </section>

        {/* ── The universe behind it ─────────────────────────────────────── */}

        {/* Today's Pick */}
        {featured && (
        <section className="mx-auto max-w-7xl px-6 mb-14">
          <div className="rounded-2xl overflow-hidden border border-line bg-panel flex flex-col md:flex-row">
            <div className={`md:w-1/2 aspect-video md:aspect-auto relative min-h-64 overflow-hidden ${!featured.imageUrl ? `bg-gradient-to-br ${featured.gradient}` : ''}`}>
              {featured.imageUrl && (
                <img src={featured.imageUrl} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <span className="absolute top-4 left-4 text-xs font-semibold tracking-[0.15em] uppercase bg-ember text-white px-3 py-1.5 rounded-full z-10">
                {"Today's Pick"}
              </span>
            </div>
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-ink-ghost mb-3">
                {featured.collection}
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-4 leading-tight">
                {featured.title}
              </h2>
              <p className="text-ink-dim mb-8 leading-relaxed">
                {featured.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-ink-ghost mb-8">
                <span>{featured.totalTime}</span>
                <span className="w-1 h-1 rounded-full bg-line" />
                <span>{featured.difficulty}</span>
                <span className="w-1 h-1 rounded-full bg-line" />
                <span>Serves {featured.servings}</span>
              </div>
              <a
                href={`/recipe/${featured.slug}`}
                className="self-start inline-flex items-center px-5 py-2.5 rounded-full bg-ember text-white font-medium text-sm hover:bg-ember-deep transition-colors"
              >
                View recipe
              </a>
            </div>
          </div>
        </section>
        )}

        {/* Collections */}
        <section className="mx-auto max-w-7xl px-6 mb-14">
          <h2 className="font-display text-xl font-bold text-ink mb-4">Browse by collection</h2>
          <div className="flex gap-3 flex-wrap">
            {dbCollections.map((c) => (
              <a
                key={c.id}
                href={`/collections/${c.slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-line bg-panel hover:bg-panel-raised hover:border-ember text-sm font-medium text-ink-dim hover:text-ink transition-all"
              >
                {c.name}
              </a>
            ))}
          </div>
        </section>

        {/* Trending this week */}
        {trendingRecipes.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 mb-14">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Trending this week</h2>
                <p className="text-sm text-ink-ghost mt-0.5">What people are actually cooking</p>
              </div>
              <a href="/explore" className="text-sm text-ember hover:text-ember-deep transition-colors">See all</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingRecipes.map((recipe, i) => (
                <a
                  key={recipe.id}
                  href={`/recipe/${recipe.slug}`}
                  className="group flex gap-4 rounded-xl border border-line bg-panel hover:border-ember transition-all p-4"
                >
                  <span className="text-2xl font-display font-bold text-line group-hover:text-ember/40 transition-colors tabular-nums shrink-0 w-7 pt-0.5">{i + 1}</span>
                  <div className="flex gap-4 flex-1 min-w-0">
                    <div className={`w-16 h-16 rounded-lg shrink-0 overflow-hidden relative ${!recipe.imageUrl ? `bg-gradient-to-br ${recipe.gradient}` : ''}`}>
                      {recipe.imageUrl && (
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-ghost mb-1">{recipe.collection}</p>
                      <h3 className="font-display text-sm font-bold text-ink group-hover:text-ember transition-colors leading-snug line-clamp-2">{recipe.title}</h3>
                      <p className="text-xs text-ink-ghost mt-1.5">{recipe.totalTime} · {recipe.difficulty}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Right now — season-aware section */}
        {seasonalRecipes.length >= 3 && (
          <section className="mx-auto max-w-7xl px-6 mb-14">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Right now in {monthName}</h2>
                <p className="text-sm text-ink-ghost mt-0.5">What cooks are reaching for this time of year</p>
              </div>
              <a href="/explore" className="text-sm text-ember hover:text-ember-deep transition-colors">See all</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {seasonalRecipes.map((recipe) => (
                <a
                  key={recipe.id}
                  href={`/recipe/${recipe.slug}`}
                  className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
                >
                  <div className={`aspect-square overflow-hidden relative ${!recipe.imageUrl ? `bg-gradient-to-br ${recipe.gradient}` : ''}`}>
                    {recipe.imageUrl && (
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-ghost mb-1 truncate">{recipe.cuisine}</p>
                    <h3 className="font-display text-sm font-bold text-ink group-hover:text-ember transition-colors leading-snug line-clamp-2">{recipe.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Picked for you */}
        {personalisedRecipes.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 mb-14">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Picked for you</h2>
                <p className="text-sm text-ink-ghost mt-0.5">Based on your taste</p>
              </div>
              <a href="/explore" className="text-sm text-ember hover:text-ember-deep transition-colors">
                See all
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {personalisedRecipes.map(({ recipe, reason }) => (
                <a
                  key={recipe.id}
                  href={`/recipe/${recipe.slug}`}
                  className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
                >
                  <div className={`aspect-[4/3] overflow-hidden relative ${!recipe.imageUrl ? `bg-gradient-to-br ${recipe.gradient}` : ''}`}>
                    {recipe.imageUrl && (
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-ghost mb-1.5">
                      {recipe.collection}
                    </p>
                    <h3 className="font-display text-base font-bold text-ink group-hover:text-ember transition-colors leading-snug">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-ink-ghost">
                        {recipe.totalTime} · {recipe.difficulty}
                      </p>
                      {recipe.saveCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-ink-ghost">
                          <svg className="w-3 h-3 text-ember" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                          {recipe.saveCount}
                        </span>
                      )}
                    </div>
                    {reason && (
                      <p className="text-xs text-ember/80 mt-1.5">Because you love {reason.toLowerCase()}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* New additions */}
        <section className="mx-auto max-w-7xl px-6 mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-xl font-bold text-ink">New additions</h2>
            <a href="/explore" className="text-sm text-ember hover:text-ember-deep transition-colors">
              See all
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {newAdditions.map((recipe) => (
              <a
                key={recipe.id}
                href={`/recipe/${recipe.slug}`}
                className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
              >
                <div className={`aspect-[4/3] overflow-hidden relative ${!recipe.imageUrl ? `bg-gradient-to-br ${recipe.gradient}` : ''}`}>
                  {recipe.imageUrl && (
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-ghost mb-2">
                    {recipe.collection}
                  </p>
                  <h3 className="font-display text-lg font-bold text-ink group-hover:text-ember transition-colors leading-snug mb-2">
                    {recipe.title}
                  </h3>
                  {recipe.staffAuthor && isStaffPersona(recipe.staffAuthor) ? (
                    <span className="text-xs text-ink-ghost mb-2 block">by {STAFF_PERSONAS[recipe.staffAuthor].name}</span>
                  ) : recipe.authorId && userAuthors[recipe.authorId] ? (
                    <span className="text-xs text-ink-ghost mb-2 block">
                      by {userAuthors[recipe.authorId].displayName ?? userAuthors[recipe.authorId].username}
                    </span>
                  ) : null}
                  <p className="text-sm text-ink-dim mb-4 leading-relaxed line-clamp-2">
                    {recipe.description}
                  </p>
                    <div className="flex items-center gap-3 text-xs text-ink-ghost">
                      <span>{recipe.totalTime}</span>
                      <span className="w-1 h-1 rounded-full bg-line" />
                      <span>{recipe.difficulty}</span>
                      {recipe.saveCount > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-line" />
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-ember" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                            {recipe.saveCount}
                          </span>
                        </>
                      )}
                    </div>
                </div>
              </a>
            ))}
          </div>
        </section>
        </>
        )}
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <span className="font-display font-bold text-ink-dim">Cookbookverse</span>
          <span className="text-xs text-ink-ghost">v2 in progress</span>
        </div>
      </footer>
    </div>
  )
}
