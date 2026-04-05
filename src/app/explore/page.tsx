import { getAllRecipes } from '@/lib/queries'
import { Navbar } from '@/components/navbar'
import { ExploreFilters } from '@/components/explore-filters'

export const dynamic = 'force-dynamic'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; collection?: string; dietary?: string; mood?: string; difficulty?: string }>
}) {
  const recipes = await getAllRecipes()
  const params = await searchParams

  const initialFilters = {
    search: params.search ?? '',
    collection: (params.collection ?? 'all') as 'all',
    dietary: params.dietary ?? 'all',
    mood: params.mood ?? 'all',
    difficulty: params.difficulty ?? 'all',
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

        <ExploreFilters recipes={recipes} initialFilters={initialFilters} />
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
