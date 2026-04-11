import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { userCollections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Navbar } from '@/components/navbar'
import { getUserProfile, getUserSavedRecipes } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function CookbookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const rows = await db
    .select()
    .from(userCollections)
    .where(eq(userCollections.id, id))
    .limit(1)

  const collection = rows[0]
  if (!collection) notFound()

  const [owner, recipes] = await Promise.all([
    getUserProfile(collection.userId),
    getUserSavedRecipes(collection.recipeIds),
  ])

  const ownerName = owner?.displayName ?? 'A cook'
  const ownerUsername = owner?.username

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Hero */}
      <div className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-ghost mb-3">
            Cookbook
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-ink-dim text-lg leading-relaxed max-w-xl mb-5">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-ink-ghost">
            <span>Curated by</span>
            {ownerUsername ? (
              <Link href={`/chef/${ownerUsername}`} className="text-ember hover:underline font-medium">
                {ownerName}
              </Link>
            ) : (
              <span className="font-medium text-ink">{ownerName}</span>
            )}
            <span>·</span>
            <span>{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</span>
          </div>
        </div>
      </div>

      {/* Recipes */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        {recipes.length === 0 ? (
          <div className="text-center py-24 text-ink-ghost">
            <svg className="w-10 h-10 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="font-display text-xl">This cookbook is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipe/${recipe.slug}`}
                className="group block rounded-xl border border-line bg-panel hover:border-ember transition-colors overflow-hidden"
              >
                <div className={`h-32 relative ${recipe.imageUrl ? 'bg-black' : `bg-gradient-to-br ${recipe.gradient}`}`}>
                  {recipe.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover opacity-90" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display font-bold text-ink text-sm leading-snug group-hover:text-ember transition-colors line-clamp-2 mb-1">
                    {recipe.title}
                  </h3>
                  <p className="text-xs text-ink-ghost italic line-clamp-1 mb-3">{recipe.subtitle}</p>
                  <div className="flex items-center gap-3 text-xs text-ink-ghost">
                    <span>{recipe.cuisine}</span>
                    <span>·</span>
                    <span>{recipe.totalTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
