import { notFound } from 'next/navigation'
import { getCollectionBySlug, getRecipesByCollection } from '@/lib/queries'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { Navbar } from '@/components/navbar'
import { STAFF_PERSONAS, isStaffPersona } from '@/lib/staff'

export const dynamic = 'force-dynamic'

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)
  if (!collection) notFound()

  const recipes = await getRecipesByCollection(collection.name)

  // Build author lookup for user-submitted recipes
  const userAuthorIds = [...new Set(recipes.filter((r) => r.authorId && !r.staffAuthor).map((r) => r.authorId!))]
  const authorRows = userAuthorIds.length > 0
    ? await db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).where(inArray(users.id, userAuthorIds))
    : []
  const userAuthors = Object.fromEntries(
    authorRows.filter((a) => a.username).map((a) => [a.id, { username: a.username!, displayName: a.displayName }])
  )

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Collection hero */}
      <div className={`w-full py-20 md:py-28 relative overflow-hidden ${collection.imageUrl ? 'bg-black' : `bg-gradient-to-br ${collection.gradient}`}`}>
        {collection.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={collection.imageUrl} alt={collection.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/70 mb-4">
            Collection
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-4">
            {collection.name}
          </h1>
          <p className="text-white/80 text-lg max-w-xl leading-relaxed">
            {collection.description}
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
                <div className={`aspect-[4/3] bg-gradient-to-br ${recipe.gradient} relative`}>
                  {recipe.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-ghost mb-2">
                    {recipe.cuisine}
                  </p>
                  <h3 className="font-display text-lg font-bold text-ink group-hover:text-ember transition-colors leading-snug mb-2">
                    {recipe.title}
                  </h3>
                  {recipe.staffAuthor && isStaffPersona(recipe.staffAuthor) ? (
                    <a href={`/chef/${recipe.staffAuthor}`} onClick={(e) => e.stopPropagation()} className="text-xs text-ink-ghost hover:text-ember transition-colors mb-2 block">by {STAFF_PERSONAS[recipe.staffAuthor].name}</a>
                  ) : recipe.authorId && userAuthors[recipe.authorId] ? (
                    <a href={`/chef/${userAuthors[recipe.authorId].username}`} onClick={(e) => e.stopPropagation()} className="text-xs text-ink-ghost hover:text-ember transition-colors mb-2 block">
                      by {userAuthors[recipe.authorId].displayName ?? userAuthors[recipe.authorId].username}
                    </a>
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
