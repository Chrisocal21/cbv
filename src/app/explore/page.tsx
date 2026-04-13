import { getAllRecipes, getTrendingRecipes } from '@/lib/queries'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { Navbar } from '@/components/navbar'
import { ExploreFilters } from '@/components/explore-filters'

export const dynamic = 'force-dynamic'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; collection?: string; dietary?: string; mood?: string; difficulty?: string; cuisine?: string }>
}) {
  const [recipes, trending] = await Promise.all([getAllRecipes(), getTrendingRecipes(6)])
  const params = await searchParams

  // Build a lookup map of user-authored recipes' authors
  const userAuthorIds = [...new Set(recipes.filter((r) => r.authorId && !r.staffAuthor).map((r) => r.authorId!))]
  const authorRows = userAuthorIds.length > 0
    ? await db.select({ id: users.id, username: users.username, displayName: users.displayName })
        .from(users).where(inArray(users.id, userAuthorIds))
    : []
  const userAuthors = Object.fromEntries(
    authorRows.filter((a) => a.username).map((a) => [a.id, { username: a.username!, displayName: a.displayName }])
  )

  const initialFilters = {
    search: params.search ?? '',
    collection: (params.collection ?? 'all') as 'all',
    dietary: params.dietary ?? 'all',
    mood: params.mood ?? 'all',
    difficulty: params.difficulty ?? 'all',
    cuisine: params.cuisine ?? 'all',
  }

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">
            Browse
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink mb-3">
            Explore recipes
          </h1>
          <p className="text-ink-dim text-lg max-w-xl">
            {recipes.length} recipes and counting. Filter by what you are looking for, or just wander.
          </p>
        </div>

        {/* Trending this week */}
        {trending.length > 0 && (
          <section className="mb-12">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Trending this week</h2>
                <p className="text-sm text-ink-ghost mt-0.5">What people are cooking right now</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {trending.map((recipe) => (
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
                    <p className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-ghost mb-1 truncate">
                      {recipe.collection}
                    </p>
                    <h3 className="font-display text-sm font-bold text-ink group-hover:text-ember transition-colors leading-snug line-clamp-2">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-ink-ghost mt-1.5">{recipe.totalTime}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <ExploreFilters recipes={recipes} initialFilters={initialFilters} userAuthors={userAuthors} />
      </div>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <span className="font-display font-bold text-ink-dim">Cookbookverse</span>
          <span className="text-xs text-ink-ghost">v2 in progress</span>
        </div>
      </footer>
    </div>
  )
}
