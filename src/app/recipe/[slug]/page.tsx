import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getAllRecipes, getRecipeBySlug, getUserProfile, getRecipeCookCount, getRecipeVariations } from '@/lib/queries'
import { db } from '@/lib/db'
import { recipes as recipesTable } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { Navbar } from '@/components/navbar'
import { RecipeActions } from '@/components/recipe-actions'
import { NutritionPanel } from '@/components/nutrition-panel'
import { VariationButton } from '@/components/variation-button'
import { IngredientsPanel } from '@/components/ingredients-panel'
import { CookedItButton } from '@/components/cooked-it-button'
import { STAFF_PERSONAS, isStaffPersona } from '@/lib/staff'

import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  if (!recipe) return {}

  const description = recipe.description?.slice(0, 155) ?? `${recipe.cuisine} · ${recipe.totalTime} · ${recipe.difficulty}`
  const images = recipe.imageUrl
    ? [{ url: recipe.imageUrl, width: 1792, height: 1024, alt: recipe.title }]
    : []

  return {
    title: `${recipe.title} — Cookbookverse`,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: 'article',
      images,
    },
    twitter: {
      card: recipe.imageUrl ? 'summary_large_image' : 'summary',
      title: recipe.title,
      description,
      images: recipe.imageUrl ? [recipe.imageUrl] : [],
    },
  }
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()
  const recipe = await getRecipeBySlug(slug)
  if (!recipe) notFound()

  const isOwnerDraft = recipe.status === 'draft' && recipe.authorId === userId
  const isOwnerRejected = recipe.status === 'rejected' && recipe.authorId === userId
  const canEdit = isOwnerDraft || isOwnerRejected

  // Fire-and-forget view count increment for published recipes
  if (recipe.status === 'published') {
    db.update(recipesTable)
      .set({ viewCount: sql`${recipesTable.viewCount} + 1` })
      .where(eq(recipesTable.id, recipe.id))
      .catch(() => {}) // non-blocking, ignore errors
  }

  const [allRecipes, profile, cookCount, variations] = await Promise.all([
    getAllRecipes(),
    userId ? getUserProfile(userId) : null,
    recipe.status === 'published' ? getRecipeCookCount(recipe.id) : Promise.resolve(0),
    recipe.status === 'published' ? getRecipeVariations(recipe.id) : Promise.resolve([]),
  ])
  const related = allRecipes
    .filter((r) => r.id !== recipe.id && r.status === 'published' && (r.collection === recipe.collection || r.cuisine === recipe.cuisine))
    .slice(0, 3)

  // "Because you saved X" — recipes that match what the user has saved before
  const savedIds = new Set(profile?.savedRecipes ?? [])
  const becauseYouSaved = (() => {
    if (savedIds.size === 0) return []
    const savedRecipes = allRecipes.filter((r) => savedIds.has(r.id))
    const favCuisines = new Set(savedRecipes.map((r) => r.cuisine))
    const favCollections = new Set(savedRecipes.map((r) => r.collection))
    const favMoods = new Set(savedRecipes.flatMap((r) => r.moodTags as string[]))
    return allRecipes
      .filter((r) => r.id !== recipe.id && r.status === 'published' && !savedIds.has(r.id))
      .map((r) => {
        let score = 0
        if (favCuisines.has(r.cuisine)) score += 3
        if (favCollections.has(r.collection)) score += 2
        for (const t of r.moodTags as string[]) if (favMoods.has(t)) score++
        return { recipe: r, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.recipe)
  })()

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Hero */}
      <div data-print-hide className={`w-full h-48 md:h-72 relative overflow-hidden ${recipe.imageUrl ? 'bg-black' : `bg-gradient-to-br ${recipe.gradient}`}`}>
        {recipe.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover opacity-90" />
        )}
        {recipe.staffAuthor && isStaffPersona(recipe.staffAuthor) ? (
          <Link href={`/chef/${recipe.staffAuthor}`} className="absolute top-5 left-5 text-xs font-semibold tracking-[0.12em] uppercase bg-black/40 text-white/90 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-black/60 transition-colors">
            By {STAFF_PERSONAS[recipe.staffAuthor].name} · Cookbookverse Kitchen
          </Link>
        ) : recipe.aiGenerated && (
          <span className="absolute top-5 left-5 text-xs font-semibold tracking-[0.12em] uppercase bg-black/40 text-white/90 px-3 py-1.5 rounded-full backdrop-blur-sm">
            AI Generated
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-page/70 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-6">

        {/* Header */}
        <div className="py-10 border-b border-line">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-ember mb-3">
            {recipe.collection} &middot; {recipe.cuisine}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight mb-2">
            {recipe.title}
          </h1>
          <p className="text-xl text-ink-dim font-display italic mb-5">{recipe.subtitle}</p>
          <p className="text-base text-ink-dim leading-relaxed max-w-2xl">{recipe.description}</p>

          {/* Popularity */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3">
            {recipe.saveCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-ink-ghost">
                <svg className="w-3.5 h-3.5 text-ember" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                {recipe.saveCount.toLocaleString()} {recipe.saveCount === 1 ? 'person has' : 'people have'} saved this
              </span>
            )}
            {cookCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-ink-ghost">
                <svg className="w-3.5 h-3.5 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 10.608v2.513M15 19.128v-.003c0-1.113-.425-2.188-1.184-2.995a3.75 3.75 0 00-2.816-1.253 3.75 3.75 0 00-2.816 1.253C7.425 16.94 7 18.015 7 19.128v.003" /></svg>
                {cookCount.toLocaleString()} {cookCount === 1 ? 'person has' : 'people have'} cooked this
              </span>
            )}
          </div>

          {/* Variation of parent */}
          {recipe.isVariation && recipe.parentId && (() => {
            const parent = allRecipes.find((r) => r.id === recipe.parentId)
            if (!parent) return null
            return (
              <p className="text-sm text-ink-ghost mt-3">
                Variation of{' '}
                <Link href={`/recipe/${parent.slug}`} className="text-ink hover:text-ember transition-colors font-medium">
                  {parent.title}
                </Link>
              </p>
            )
          })()}

          {/* Staff attribution */}
          {recipe.staffAuthor && isStaffPersona(recipe.staffAuthor) && (
            <p className="text-sm text-ink-ghost mt-3">
              A recipe by{' '}
              <Link href={`/chef/${recipe.staffAuthor}`} className="text-ink font-medium hover:text-ember transition-colors">
                {STAFF_PERSONAS[recipe.staffAuthor].name}
              </Link>
              {' '}· {STAFF_PERSONAS[recipe.staffAuthor].role} · Cookbookverse Kitchen
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-5">
            {recipe.dietaryTags.map((tag) => (
              <a
                key={tag}
                href={`/explore?dietary=${encodeURIComponent(tag)}`}
                className="text-xs font-medium bg-panel border border-line text-ink-dim hover:text-ember hover:border-ember px-3 py-1 rounded-full transition-colors"
              >
                {tag}
              </a>
            ))}
            {recipe.moodTags.map((tag) => (
              <a
                key={tag}
                href={`/explore?mood=${encodeURIComponent(tag)}`}
                className="text-xs font-medium bg-panel border border-line text-ink-ghost hover:text-ember hover:border-ember px-3 py-1 rounded-full transition-colors"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>

        {/* At-a-glance bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line my-0 border-b border-line">
          {[
            { label: 'Prep', value: recipe.prepTime },
            { label: 'Cook', value: recipe.cookTime },
            { label: 'Serves', value: recipe.servings },
            { label: 'Difficulty', value: recipe.difficulty },
          ].map(({ label, value }) => (
            <div key={label} className="bg-page px-5 py-4 text-center">
              <p className="text-xs text-ink-ghost tracking-widest uppercase mb-1">{label}</p>
              <p className="font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>

        {/* Save / Share */}
        <div data-print-hide>
          <RecipeActions recipeId={recipe.id} recipeTitle={recipe.title} ingredients={recipe.ingredients as { group: string; items: string[] }[]} servings={recipe.servings} isOwnerDraft={isOwnerDraft} />
          <div className="flex flex-wrap gap-2 mt-3">
            {canEdit && (
              <a
                href={`/recipe/${recipe.slug}/edit`}
                className="inline-flex items-center gap-2 text-xs text-ink-dim hover:text-ember border border-line hover:border-ember px-4 py-2 rounded-full transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                Edit recipe
              </a>
            )}
            {userId && recipe.status === 'published' && (
              <VariationButton parentSlug={recipe.slug} />
            )}
            {userId && recipe.status === 'published' && (
              <CookedItButton recipeId={recipe.id} recipeSlug={recipe.slug} recipeTitle={recipe.title} />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="py-10 grid md:grid-cols-[1fr_2fr] gap-12 border-b border-line">

          {/* Ingredients */}
          <IngredientsPanel ingredients={recipe.ingredients} />

          {/* Steps */}
          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-6">Method</h2>
            <ol className="space-y-8">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-5">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ember text-white text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink mb-2">{step.title}</h3>
                    <p className="text-ink-dim leading-relaxed text-sm">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Origin story */}
        {recipe.originStory && (
          <div className="py-10 border-b border-line">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-ink-ghost mb-4">
              Origin story
            </p>
            <p className="text-ink-dim leading-relaxed max-w-2xl italic font-display">
              {recipe.originStory}
            </p>
          </div>
        )}

        {/* Nutrition */}
        <NutritionPanel nutrition={recipe.nutrition} />

        {/* Variations */}
        {variations.length > 0 && (
          <div className="py-10 border-b border-line">
            <h2 className="font-display text-2xl font-bold text-ink mb-1">
              {variations.length} {variations.length === 1 ? 'variation' : 'variations'} of this recipe
            </h2>
            <p className="text-sm text-ink-ghost mb-6">Community riffs on the original</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {variations.map((r) => (
                <Link
                  key={r.id}
                  href={`/recipe/${r.slug}`}
                  className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
                >
                  <div className={`aspect-video overflow-hidden relative ${!r.imageUrl ? `bg-gradient-to-br ${r.gradient}` : ''}`}>
                    {r.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-ghost mb-1">{r.cuisine}</p>
                    <h3 className="font-display font-bold text-ink group-hover:text-ember transition-colors leading-snug text-sm">
                      {r.title}
                    </h3>
                    <p className="text-xs text-ink-ghost mt-1">{r.totalTime} &middot; {r.difficulty}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* You might also like */}
        {related.length > 0 && (
          <div className="py-10">
            <h2 className="font-display text-2xl font-bold text-ink mb-6">You might also like</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <a
                  key={r.id}
                  href={`/recipe/${r.slug}`}
                  className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
                >
                  <div className={`aspect-video bg-gradient-to-br ${r.gradient} overflow-hidden`}>
                    {r.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-ghost mb-1">{r.collection}</p>
                    <h3 className="font-display font-bold text-ink group-hover:text-ember transition-colors leading-snug text-sm">
                      {r.title}
                    </h3>
                    <p className="text-xs text-ink-ghost mt-1">{r.totalTime} &middot; {r.difficulty}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Because you saved — Phase 3: personalised recs */}
        {becauseYouSaved.length > 0 && (
          <div className="py-10 border-t border-line">
            <h2 className="font-display text-2xl font-bold text-ink mb-1">Because of what you&rsquo;ve been saving</h2>
            <p className="text-sm text-ink-ghost mb-6">More recipes matching your taste</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {becauseYouSaved.map((r) => (
                <a
                  key={r.id}
                  href={`/recipe/${r.slug}`}
                  className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
                >
                  <div className={`aspect-video bg-gradient-to-br ${r.gradient} overflow-hidden`}>
                    {r.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-ghost mb-1">{r.collection}</p>
                    <h3 className="font-display font-bold text-ink group-hover:text-ember transition-colors leading-snug text-sm">
                      {r.title}
                    </h3>
                    <p className="text-xs text-ink-ghost mt-1">{r.totalTime} &middot; {r.difficulty}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-line bg-panel mt-10">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <span className="font-display font-bold text-ink-dim">Cookbookverse</span>
          <span className="text-xs text-ink-ghost">v2 in progress</span>
        </div>
      </footer>
    </div>
  )
}
