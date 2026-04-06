import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { UserCollections } from '@/components/user-collections'
import { db } from '@/lib/db'
import { userCollections, cookedLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CookLog } from '@/components/cook-log'
import {
  getUserRecipes,
  getUserSavedRecipes,
  getUserSubmissions,
  getUserProfile,
  type RecipeRow,
  type SubmissionRow,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(status: RecipeRow['status']) {
  switch (status) {
    case 'published':     return { text: 'Published',       cls: 'bg-green-500/15 text-green-400 border-green-500/30' }
    case 'pending_review': return { text: 'In review',      cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
    case 'flagged':       return { text: 'Flagged',         cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' }
    case 'rejected':      return { text: 'Rejected',        cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
    case 'draft':         return { text: 'Draft',           cls: 'bg-line text-ink-ghost border-line' }
  }
}

function submissionStatusLabel(s: SubmissionRow) {
  if (!s.adminReviewed) {
    return { text: 'Under review', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
  }
  if (s.adminDecision === 'publish') {
    return { text: 'Approved', cls: 'bg-green-500/15 text-green-400 border-green-500/30' }
  }
  return { text: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecipeCard({ recipe, showStatus = false }: { recipe: RecipeRow; showStatus?: boolean }) {
  const badge = showStatus ? statusLabel(recipe.status) : null
  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="group block rounded-xl border border-line bg-panel hover:border-ember transition-colors overflow-hidden"
    >
      <div className={`h-24 bg-gradient-to-br ${recipe.gradient}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-bold text-ink text-sm leading-snug group-hover:text-ember transition-colors line-clamp-2">
            {recipe.title}
          </h3>
          {badge && (
            <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${badge.cls}`}>
              {badge.text}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-ghost font-display italic line-clamp-1">{recipe.subtitle}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-ink-ghost">
          <span>{recipe.cuisine}</span>
          <span>·</span>
          <span>{recipe.totalTime}</span>
          {recipe.aiGenerated && (
            <>
              <span>·</span>
              <span className="text-ember">AI</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-3xl mb-3">{icon}</p>
      <p className="text-sm text-ink-ghost">{message}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const { tab } = await searchParams
  const activeTab = tab ?? 'my-recipes'

  const [clerkUser, profile, myRecipes, submissions, myCollections, cookedEntries] = await Promise.all([
    currentUser(),
    getUserProfile(userId),
    getUserRecipes(userId),
    getUserSubmissions(userId),
    db.select().from(userCollections).where(eq(userCollections.userId, userId)),
    db.select().from(cookedLog).where(eq(cookedLog.userId, userId)).orderBy(desc(cookedLog.cookedAt)).limit(200),
  ])

  const savedRecipeIds = profile?.savedRecipes ?? []
  const savedRecipes = await getUserSavedRecipes(savedRecipeIds)

  // Split authored recipes by status
  const published = myRecipes.filter((r) => r.status === 'published')
  const drafts     = myRecipes.filter((r) => r.status === 'draft')
  const pending    = myRecipes.filter((r) => r.status === 'pending_review' || r.status === 'flagged')
  const rejected   = myRecipes.filter((r) => r.status === 'rejected')

  const displayName = profile?.displayName ?? clerkUser?.firstName ?? 'Chef'
  const avatarUrl   = profile?.avatarUrl ?? clerkUser?.imageUrl

  const tabs = [
    { id: 'my-recipes',   label: 'My recipes',     count: myRecipes.length },
    { id: 'saved',        label: 'Saved',           count: savedRecipes.length },
    { id: 'submissions',  label: 'Submissions',     count: submissions.length },
    { id: 'collections',  label: 'My collections',  count: myCollections.length },
    { id: 'cook-log',     label: 'Cook log',        count: cookedEntries.length },
  ]

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Profile header */}
      <div className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-6 py-10 flex items-center gap-6">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-full object-cover border-2 border-line" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ember/20 border-2 border-ember/30 flex items-center justify-center">
              <span className="font-display font-bold text-ember text-2xl">{displayName[0]?.toUpperCase()}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-ink">{displayName}</h1>
              <a href="/settings" className="text-xs text-ink-ghost hover:text-ember transition-colors border border-line rounded-full px-3 py-1">
                Edit profile
              </a>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-ink-ghost">
              <span>{published.length} published</span>
              <span>·</span>
              <span>{savedRecipes.length} saved</span>
              <span>·</span>
              <span>{submissions.length} submitted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-line bg-page sticky top-16 z-40 backdrop-blur-sm bg-page/90">
        <div className="mx-auto max-w-5xl px-6 flex gap-1">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/profile?tab=${t.id}`}
              className={`relative flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'text-ink after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-ember'
                  : 'text-ink-ghost hover:text-ink-dim'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === t.id ? 'bg-ember/20 text-ember' : 'bg-panel text-ink-ghost'
                }`}>
                  {t.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* ── My Recipes ── */}
        {activeTab === 'my-recipes' && (
          <div className="space-y-10">
            {myRecipes.length === 0 && (
              <EmptyState icon="🍳" message="You haven't created any recipes yet. Try the AI Kitchen or submit one manually." />
            )}

            {published.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Published</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {published.map((r) => <RecipeCard key={r.id} recipe={r} />)}
                </div>
              </section>
            )}

            {pending.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Under review</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pending.map((r) => <RecipeCard key={r.id} recipe={r} showStatus />)}
                </div>
              </section>
            )}

            {drafts.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Drafts</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drafts.map((r) => <RecipeCard key={r.id} recipe={r} showStatus />)}
                </div>
              </section>
            )}

            {rejected.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Rejected</h2>
                <div className="space-y-3">
                  {rejected.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-4 bg-panel border border-line rounded-xl px-5 py-4">
                      <div>
                        <p className="font-semibold text-ink text-sm">{r.title}</p>
                        <p className="text-xs text-ink-dim mt-0.5">{r.subtitle}</p>
                      </div>
                      <a
                        href={`/recipe/${r.slug}/edit`}
                        className="shrink-0 text-xs font-medium bg-ember/10 text-ember border border-ember/30 hover:bg-ember hover:text-white px-4 py-2 rounded-full transition-colors"
                      >
                        Edit &amp; resubmit
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── Saved ── */}
        {activeTab === 'saved' && (
          <div>
            {savedRecipes.length === 0 ? (
              <EmptyState icon="🔖" message="No saved recipes yet. Hit 'Save recipe' on any recipe page or in the AI Kitchen." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedRecipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Submissions ── */}
        {activeTab === 'submissions' && (
          <div>
            {submissions.length === 0 ? (
              <EmptyState icon="📬" message="You haven't submitted any recipes for review yet." />
            ) : (
              <div className="space-y-3">
                {submissions.map((s) => {
                  const badge = submissionStatusLabel(s)
                  const score = s.confidenceScore
                  const scoreColor = score === null ? '' : score >= 85 ? 'text-green-400' : score >= 65 ? 'text-amber-400' : 'text-red-400'
                  return (
                    <div key={s.id} className="rounded-xl border border-line bg-panel p-5 flex items-start gap-5">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${s.recipe.gradient} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <Link href={`/recipe/${s.recipe.slug}`}
                            className="font-display font-bold text-ink hover:text-ember transition-colors leading-tight line-clamp-1">
                            {s.recipe.title}
                          </Link>
                          <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${badge.cls}`}>
                            {badge.text}
                          </span>
                        </div>
                        <p className="text-xs text-ink-ghost mb-3">
                          Submitted {new Date(s.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {s.synthesisNotes && (
                          <p className="text-sm text-ink-dim leading-relaxed line-clamp-2">{s.synthesisNotes}</p>
                        )}
                        {score !== null && (
                          <p className="text-xs text-ink-ghost mt-2">
                            Confidence: <span className={`font-semibold ${scoreColor}`}>{score}</span>
                          </p>
                        )}
                        {s.adminDecision === 'reject' && (
                          <div className="mt-3 space-y-2">
                            {[
                              { label: 'Technique', notes: s.techniqueNotes, verdict: s.techniqueVerdict },
                              { label: 'Flavour', notes: s.flavourNotes, verdict: s.flavourVerdict },
                              { label: 'Home Cook', notes: s.homecookNotes, verdict: s.homecookVerdict },
                            ].filter(j => j.verdict === 'flag' || j.verdict === 'reject').map(j => (
                              <div key={j.label} className="rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2 text-xs">
                                <span className="font-semibold text-red-400 uppercase tracking-wide">{j.label}</span>
                                <span className="text-ink-dim ml-2">{j.notes}</span>
                              </div>
                            ))}
                            {s.adminNotes && (
                              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                                <span className="font-semibold">Admin note: </span>{s.adminNotes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Collections ── */}
        {activeTab === 'collections' && (
          <UserCollections
            initialCollections={myCollections as { id: string; name: string; description: string; recipeIds: string[]; createdAt: Date }[]}
            savedRecipes={savedRecipes.map((r) => ({ id: r.id, title: r.title, slug: r.slug, gradient: r.gradient, cuisine: r.cuisine }))}
          />
        )}

        {activeTab === 'cook-log' && (
          <CookLog entries={cookedEntries} savedRecipes={savedRecipes.map((r) => ({ id: r.id, title: r.title, slug: r.slug, nutrition: r.nutrition }))} />
        )}

      </div>
    </div>
  )
}
