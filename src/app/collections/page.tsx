import { COLLECTION_META, RECIPES } from '@/lib/data'
import type { Collection } from '@/lib/data'
import { Navbar } from '@/components/navbar'

function collectionSlug(name: string) {
  return name.toLowerCase().replace(/ & /g, '-and-').replace(/ /g, '-')
}

export default function CollectionsPage() {
  const collections = Object.entries(COLLECTION_META) as [
    Collection,
    { description: string; gradient: string },
  ][]

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-12">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">
            Browse
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink mb-4">
            Collections
          </h1>
          <p className="text-ink-dim text-lg max-w-xl leading-relaxed">
            Recipes grouped by the way you want to cook right now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(([name, meta]) => {
            const count = RECIPES.filter((r) => r.collection === name).length
            return (
              <a
                key={name}
                href={`/collections/${collectionSlug(name)}`}
                className="group relative rounded-2xl overflow-hidden border border-line hover:border-ember transition-all"
              >
                {/* Gradient swatch */}
                <div className={`h-36 bg-gradient-to-br ${meta.gradient} relative`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-5">
                    <h2 className="font-display text-xl font-bold text-white leading-snug">
                      {name}
                    </h2>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 bg-panel">
                  <p className="text-sm text-ink-dim leading-relaxed mb-4">
                    {meta.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-ghost">
                      {count} {count === 1 ? 'recipe' : 'recipes'}
                    </span>
                    <span className="text-xs font-medium text-ember group-hover:underline">
                      Browse collection
                    </span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
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
