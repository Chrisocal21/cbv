import { getRecipesBySlugs } from '@/lib/queries'
import { Navbar } from '@/components/navbar'
import { GroceryListClient } from './grocery-list-client'

export const dynamic = 'force-dynamic'

export default async function GroceryListPage({
  searchParams,
}: {
  searchParams: Promise<{ recipes?: string }>
}) {
  const params = await searchParams
  const slugs = (params.recipes ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20) // cap at 20 recipes

  const recipes = slugs.length > 0 ? await getRecipesBySlugs(slugs) : []

  // Merge all ingredients across recipes
  type IngredientGroup = { group: string; items: string[] }
  const mergedGroups = new Map<string, Set<string>>()

  for (const recipe of recipes) {
    for (const group of recipe.ingredients as IngredientGroup[]) {
      if (!mergedGroups.has(group.group)) mergedGroups.set(group.group, new Set())
      for (const item of group.items) {
        mergedGroups.get(group.group)!.add(item)
      }
    }
  }

  const groups = Array.from(mergedGroups.entries()).map(([group, items]) => ({
    group,
    items: Array.from(items),
  }))

  // Flat list for copy-to-clipboard (no groups)
  const allItems = groups.flatMap((g) => g.items)

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">
            Shopping
          </p>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">Grocery list</h1>
          {recipes.length > 0 ? (
            <p className="text-ink-dim text-lg">
              {allItems.length} items from{' '}
              {recipes.length === 1
                ? `"${recipes[0].title}"`
                : `${recipes.length} recipes`}
            </p>
          ) : (
            <p className="text-ink-dim text-lg">No recipes selected.</p>
          )}
        </div>

        {recipes.length > 0 && (
          <>
            {/* Recipe source list */}
            <div className="mb-8 flex flex-wrap gap-2">
              {recipes.map((r) => (
                <a
                  key={r.id}
                  href={`/recipe/${r.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-panel border border-line text-ink-dim hover:text-ember hover:border-ember px-3 py-1.5 rounded-full transition-colors"
                >
                  {r.title}
                </a>
              ))}
            </div>

            <GroceryListClient groups={groups} allItems={allItems} />
          </>
        )}

        {recipes.length === 0 && (
          <div className="text-center py-20 text-ink-ghost">
            <svg className="w-10 h-10 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-sm">Head to your <a href="/profile?tab=saved" className="text-ember hover:underline">saved recipes</a> and generate a list from there.</p>
          </div>
        )}
      </div>
    </div>
  )
}
