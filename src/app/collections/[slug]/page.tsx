import { notFound } from 'next/navigation'
import { COLLECTION_META, getRecipesByCollection } from '@/lib/data'
import type { Collection } from '@/lib/data'
import { Navbar } from '@/components/navbar'

const SLUG_TO_COLLECTION: Record<string, Collection> = {
  'culinary-journeys': 'Culinary Journeys',
  'seasonal-sensations': 'Seasonal Sensations',
  'gourmet-guerillas': 'Gourmet Guerillas',
  'quick-and-creative': 'Quick & Creative',
  'baking-alchemy': 'Baking Alchemy',
}

export function generateStaticParams() {
  return Object.keys(SLUG_TO_COLLECTION).map((slug) => ({ slug }))
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const collection = SLUG_TO_COLLECTION[slug]
  if (!collection) notFound()

  const meta = COLLECTION_META[collection]
  const recipes = getRecipesByCollection(collection)

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Collection hero */}
      <div className={`w-full py-20 md:py-28 bg-gradient-to-br ${meta.gradient} relative`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/70 mb-4">
            Collection
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-4">
            {collection}
          </h1>
          <p className="text-white/80 text-lg max-w-xl leading-relaxed">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm text-ink-ghost mb-8">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
        </p>

        {recipes.length === 0 ? (
          <div className="text-center py-24 text-ink-ghost">
            <p className="font-display text-xl">More recipes coming soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <a
                key={recipe.id}
                href={`/recipe/${recipe.slug}`}
                className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
              >
                <div className={`aspect-[4/3] bg-gradient-to-br ${recipe.gradient}`} />
                <div className="p-5">
                  <p className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-ghost mb-2">
                    {recipe.cuisine}
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
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
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
