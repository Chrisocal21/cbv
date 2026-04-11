import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { STAFF_PERSONAS, isStaffPersona } from '@/lib/staff'
import {
  getUserByUsername,
  getPublishedRecipesByUser,
  getPublishedRecipesByStaff,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

// ─── Staff persona bios ───────────────────────────────────────────────────────

const STAFF_BIOS: Record<string, {
  initial: string
  avatarBg: string
  avatarText: string
  tagline: string
  bio: string
  philosophy: string
  knownFor: string[]
  gradient: string
}> = {
  marco: {
    initial: 'M',
    avatarBg: 'bg-amber-700',
    avatarText: 'text-amber-100',
    tagline: 'Global flavours, confident hands.',
    bio: `I've always believed that the best food tells a story. Whether it's a slow-braised lamb that carries the memory of a Moroccan souk, or a quick weeknight noodle dish that somehow tastes like it took all day — food should feel like it came from somewhere real.\n\nI cook across cuisines because I find boundaries between them arbitrary. A Korean-Mexican taco isn't a gimmick if the flavours actually want to be together. My job is finding those moments.`,
    philosophy: 'Technique is just confidence. The goal is always the table.',
    knownFor: ['Global fusion', 'Flavour-forward cooking', 'Weeknight elevated', 'Rich braises'],
    gradient: 'from-amber-900 to-orange-800',
  },
  celeste: {
    initial: 'C',
    avatarBg: 'bg-rose-700',
    avatarText: 'text-rose-100',
    tagline: 'Baking is chemistry. Also love.',
    bio: `Bread taught me patience. Pastry taught me precision. Chocolate taught me that some things just need the right conditions to become something extraordinary.\n\nI come from a family that baked on Sundays — not for occasions, just because it made the house smell like home. That's what I'm trying to recreate in every recipe I write. The instructions are detailed because baking rewards the careful, not because I don't trust you.`,
    philosophy: 'If the recipe is right, it should work the first time.',
    knownFor: ['Sourdough & bread', 'French pastry', 'Gluten-free baking', 'Chocolate work'],
    gradient: 'from-rose-900 to-amber-800',
  },
  nadia: {
    initial: 'N',
    avatarBg: 'bg-emerald-700',
    avatarText: 'text-emerald-100',
    tagline: 'Delicious first. Everything else follows.',
    bio: `I spent years watching people apologise for eating "healthy" — as if the absence of something automatically meant the presence of virtue. That's not cooking. That's compromise.\n\nMy recipes start from flavour and work backwards to the label. If something is vegan, it's because the ingredients are better that way, not because I removed something. A great chickpea dish isn't a lesser version of a meat dish. It's its own thing.`,
    philosophy: 'A dietary label should describe a recipe, not diminish it.',
    knownFor: ['Plant-forward cooking', 'Allergen-aware', 'Vegan & gluten-free', 'Nutrition-forward'],
    gradient: 'from-emerald-900 to-teal-800',
  },
}

export default async function ChefPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // ── Staff persona ──────────────────────────────────────────────────────────
  if (isStaffPersona(slug)) {
    const persona = STAFF_PERSONAS[slug]
    const bio = STAFF_BIOS[slug]
    const recipes = await getPublishedRecipesByStaff(slug)

    return (
      <div className="min-h-screen bg-page">
        <Navbar />

        {/* Hero */}
        <div className={`w-full py-20 bg-gradient-to-br ${bio.gradient} relative`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative mx-auto max-w-5xl px-6 flex items-end gap-8">
            {/* Avatar */}
            <div className={`w-24 h-24 rounded-full ${bio.avatarBg} flex items-center justify-center flex-shrink-0 border-4 border-white/20 shadow-xl`}>
              <span className={`font-display font-bold text-4xl ${bio.avatarText}`}>{bio.initial}</span>
            </div>
            <div className="pb-1">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/50 mb-1">
                Cookbookverse Kitchen
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-white">{persona.name}</h1>
              <p className="text-white/60 text-sm font-medium mt-1">{persona.role}</p>
              <p className="text-white/80 text-base mt-3 italic">&ldquo;{bio.tagline}&rdquo;</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-14">
          {/* Bio section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-14 border-b border-line">
            <div className="md:col-span-2 space-y-4">
              {bio.bio.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm text-ink-dim leading-relaxed">{para}</p>
              ))}
            </div>
            <div className="space-y-6">
              <div className="border-l-2 border-ember pl-4">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-ink-ghost mb-2">Philosophy</p>
                <p className="text-sm text-ink-dim italic leading-relaxed">{bio.philosophy}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-ink-ghost mb-3">Known for</p>
                <div className="flex flex-wrap gap-2">
                  {bio.knownFor.map((tag) => (
                    <span key={tag} className="text-xs border border-line text-ink-dim px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recipes */}
          <div className="pt-14">
            <div className="flex items-baseline gap-3 mb-8">
              <h2 className="font-display text-2xl font-bold text-ink">Recipes</h2>
              <span className="text-sm text-ink-ghost">{recipes.length} published</span>
            </div>
            {recipes.length === 0 ? (
              <div className="text-center py-24 text-ink-ghost">
                <p className="font-display text-xl">Recipes coming soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                      <p className="text-xs text-ink-ghost font-display italic line-clamp-1">{recipe.subtitle}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-ink-ghost">
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
      </div>
    )
  }

  // ── Real user by username ──────────────────────────────────────────────────
  const user = await getUserByUsername(slug)
  if (!user) notFound()

  const recipes = await getPublishedRecipesByUser(user.id)
  const displayName = user.displayName ?? user.username ?? 'Chef'
  const initial = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Hero */}
      <div className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-6 py-14 flex items-center gap-6">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border-2 border-line"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-ember/20 border-2 border-ember/30 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-ember text-3xl">{initial}</span>
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">{displayName}</h1>
            {user.bio && (
              <p className="text-sm text-ink-dim mt-2 max-w-lg leading-relaxed">{user.bio}</p>
            )}
            <p className="text-xs text-ink-ghost mt-3">
              {recipes.length} published {recipes.length === 1 ? 'recipe' : 'recipes'}
            </p>
          </div>
        </div>
      </div>

      {/* Recipes */}
      <div className="mx-auto max-w-5xl px-6 py-14">
        {recipes.length === 0 ? (
          <div className="text-center py-24 text-ink-ghost">
            <p className="font-display text-xl">No published recipes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipe/${recipe.slug}`}
                className="group block rounded-xl border border-line bg-panel hover:border-ember transition-colors overflow-hidden"
              >
                <div className={`h-28 bg-gradient-to-br ${recipe.gradient}`} />
                <div className="p-4">
                  <h3 className="font-display font-bold text-ink text-sm leading-snug group-hover:text-ember transition-colors line-clamp-2 mb-1">
                    {recipe.title}
                  </h3>
                  <p className="text-xs text-ink-ghost font-display italic line-clamp-1">{recipe.subtitle}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-ink-ghost">
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
