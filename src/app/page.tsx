import { COLLECTION_META } from '@/lib/data'
import { getFeaturedRecipe, getAllRecipes } from '@/lib/queries'
import { Navbar } from '@/components/navbar'

export const dynamic = 'force-dynamic'

const GRID_SLUGS = ['miso-glazed-salmon', 'lamb-kofta-with-tahini', 'brown-butter-financiers']

function collectionSlug(name: string) {
  return name.toLowerCase().replace(/ & /g, '-and-').replace(/ /g, '-')
}

export default async function HomePage() {
  const [featured, allRecipes] = await Promise.all([getFeaturedRecipe(), getAllRecipes()])
  const gridRecipes = GRID_SLUGS.map((s) => allRecipes.find((r) => r.slug === s)!).filter(Boolean)
  const collections = Object.keys(COLLECTION_META) as (keyof typeof COLLECTION_META)[]

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
            <div className={`md:w-1/2 aspect-video md:aspect-auto bg-gradient-to-br ${featured.gradient} relative min-h-64`}>
              <span className="absolute top-4 left-4 text-xs font-semibold tracking-[0.15em] uppercase bg-ember text-white px-3 py-1.5 rounded-full">
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
            {collections.map((name) => (
              <a
                key={name}
                href={`/collections/${collectionSlug(name)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-line bg-panel hover:bg-panel-raised hover:border-ember text-sm font-medium text-ink-dim hover:text-ink transition-all"
              >
                {name}
              </a>
            ))}
          </div>
        </section>

        {/* Recipe grid */}
        <section className="mx-auto max-w-7xl px-6 mb-24">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-ink">New additions</h2>
            <a href="/explore" className="text-sm text-ember hover:text-ember-deep transition-colors">
              See all
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gridRecipes.map((recipe) => (
              <a
                key={recipe.id}
                href={`/recipe/${recipe.slug}`}
                className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
              >
                <div className={`aspect-[4/3] bg-gradient-to-br ${recipe.gradient}`} />
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
