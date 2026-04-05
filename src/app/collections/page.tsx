import { getCollectionsWithSpotlight } from '@/lib/queries'
import { Navbar } from '@/components/navbar'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage() {
  const collectionsWithSpotlight = await getCollectionsWithSpotlight()

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
          {collectionsWithSpotlight.map(({ spotlight, ...col }) => (
            <a
              key={col.id}
              href={`/collections/${col.slug}`}
              className="group relative rounded-2xl overflow-hidden border border-line hover:border-ember transition-all"
            >
              {/* Gradient swatch */}
              <div className={`h-36 bg-gradient-to-br ${col.gradient} relative`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-5">
                  <h2 className="font-display text-xl font-bold text-white leading-snug">
                    {col.name}
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 bg-panel">
                <p className="text-sm text-ink-dim leading-relaxed mb-4">
                  {col.description}
                </p>

                {/* Spotlight recipe */}
                {spotlight && (
                  <div className="mb-4 p-3 rounded-lg bg-page border border-line">
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-ink-ghost mb-1">
                      Latest
                    </p>
                    <p className="text-sm font-medium text-ink leading-snug line-clamp-1">
                      {spotlight.title}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-ghost">
                    — {/* recipe count shown on detail page */}
                  </span>
                  <span className="text-xs font-medium text-ember group-hover:underline">
                    Browse collection →
                  </span>
                </div>
              </div>
            </a>
          ))}
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
