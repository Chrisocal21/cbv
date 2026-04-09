import { auth } from '@clerk/nextjs/server'
import { getFeaturedRecipe, getAllRecipes, getCollectionsWithSpotlight, getUserProfile } from '@/lib/queries'
import { Navbar } from '@/components/navbar'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { userId } = await auth()
  const [featured, allRecipes, dbCollections, profile] = await Promise.all([
    getFeaturedRecipe(),
    getAllRecipes(),
    getCollectionsWithSpotlight(),
    userId ? getUserProfile(userId) : null,
  ])

  // New additions — most recent 3 published recipes (excluding featured)
  const newAdditions = allRecipes
    .filter((r) => r.status === 'published' && r.id !== featured?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  // Personalised picks — only compute when user has saved recipes
  const savedIds = new Set(profile?.savedRecipes ?? [])
  const dietaryPrefs = (profile?.dietaryPreferences as string[] | null) ?? []
  const personalisedRecipes = (() => {
    if (!userId || savedIds.size === 0) return []
    const savedRecipes = allRecipes.filter((r) => savedIds.has(r.id))
    // Build preference vectors from saved recipes
    const favCuisines = new Map<string, number>()
    const favCollections = new Map<string, number>()
    const favMoods = new Map<string, number>()
    for (const r of savedRecipes) {
      favCuisines.set(r.cuisine, (favCuisines.get(r.cuisine) ?? 0) + 1)
      favCollections.set(r.collection, (favCollections.get(r.collection) ?? 0) + 1)
      for (const t of r.moodTags as string[]) favMoods.set(t, (favMoods.get(t) ?? 0) + 1)
    }
    // Score unsaved published recipes
    return allRecipes
      .filter((r) => r.status === 'published' && !savedIds.has(r.id) && r.id !== featured?.id)
      .map((r) => {
        let score = 0
        score += (favCuisines.get(r.cuisine) ?? 0) * 3
        score += (favCollections.get(r.collection) ?? 0) * 2
        for (const t of r.moodTags as string[]) score += (favMoods.get(t) ?? 0)
        // Dietary preference boost
        if (dietaryPrefs.length > 0) {
          const tags = r.dietaryTags as string[]
          if (dietaryPrefs.some((p) => tags.includes(p))) score += 2
        }
        return { recipe: r, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.recipe)
  })()

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-6">
            Discover something new
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-ink leading-[1.08] mb-8 max-w-3xl">
            A world of recipes worth making.
          </h1>
          <p className="text-lg text-ink-dim max-w-xl mb-12 leading-relaxed">
            Not a database. Not a feed. A place you come to find something new and leave ready to cook.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="/explore"
              className="inline-flex items-center px-6 py-3 rounded-full bg-ember text-white font-medium hover:bg-ember-deep transition-colors"
            >
              Start exploring
            </a>
            <a
              href="/ai"
              className="inline-flex items-center px-6 py-3 rounded-full border border-line text-ink font-medium hover:bg-panel transition-colors"
            >
              Ask the AI
            </a>
          </div>
        </section>

        {/* Today's Pick */}
        {featured && (
        <section className="mx-auto max-w-7xl px-6 mb-20">
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
        <section className="mx-auto max-w-7xl px-6 mb-20">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">Browse by collection</h2>
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

        {/* Picked for you — Phase 3: personalised recs */}
        {personalisedRecipes.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 mb-20">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Picked for you</h2>
                <p className="text-sm text-ink-ghost mt-1">Based on what you&rsquo;ve been saving</p>
              </div>
              <a href="/explore" className="text-sm text-ember hover:text-ember-deep transition-colors">
                See all
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {personalisedRecipes.map((recipe) => (
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
                    <p className="text-xs text-ink-ghost mt-2">
                      {recipe.totalTime} · {recipe.difficulty}
                      {recipe.saveCount > 0 && <span> · <span className="text-ember">♥</span> {recipe.saveCount}</span>}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* New additions */}
        <section className="mx-auto max-w-7xl px-6 mb-24">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-ink">New additions</h2>
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
                        <span><span className="text-ember">♥</span> {recipe.saveCount}</span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
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
