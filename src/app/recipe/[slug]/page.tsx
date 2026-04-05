import { notFound } from 'next/navigation'
import { getAllRecipes, getRecipeBySlug } from '@/lib/queries'
import { Navbar } from '@/components/navbar'
import { RecipeActions } from '@/components/recipe-actions'
import { NutritionPanel } from '@/components/nutrition-panel'

export const dynamic = 'force-dynamic'

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  if (!recipe) notFound()

  const allRecipes = await getAllRecipes()
  const related = allRecipes
    .filter((r) => r.id !== recipe.id && (r.collection === recipe.collection || r.cuisine === recipe.cuisine))
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Hero */}
      <div className={`w-full aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br ${recipe.gradient} relative`}>
        {recipe.aiGenerated && (
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

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-5">
            {recipe.dietaryTags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium bg-panel border border-line text-ink-dim px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {recipe.moodTags.map((tag) => (
              <a
                key={tag}
                href={`/explore?mood=${tag}`}
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
        <RecipeActions recipeTitle={recipe.title} />

        {/* Body */}
        <div className="py-10 grid md:grid-cols-[1fr_2fr] gap-12 border-b border-line">

          {/* Ingredients */}
          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-6">Ingredients</h2>
            <div className="space-y-6">
              {recipe.ingredients.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold tracking-[0.15em] uppercase text-ink-ghost mb-2">
                    {group.group}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-ink-dim">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ember flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

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
                  <div className={`aspect-video bg-gradient-to-br ${r.gradient}`} />
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
