import React from 'react'
import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { UserCollections } from '@/components/user-collections'
import { AIChat } from '@/components/ai-chat'
import { db } from '@/lib/db'
import { userCollections, cookedLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CookLog } from '@/components/cook-log'
import { WeekPlan } from '@/components/week-plan'
import {
  getUserRecipes,
  getUserSavedRecipes,
  getUserSubmissions,
  getUserProfile,
  getRecipesByIds,
  type RecipeRow,
  type SubmissionRow,
} from '@/lib/queries'
import { recipes as recipesTable } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { computeOverlaps, type IngredientGroup } from '@/lib/ingredients'

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

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="py-16 text-center">
      <div className="flex justify-center mb-4 text-ink-ghost">{icon}</div>
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
  const activeTab = tab ?? 'home'

  const [clerkUser, profile, myRecipes, submissions, myCollections, cookedEntries] = await Promise.all([
    currentUser(),
    getUserProfile(userId),
    getUserRecipes(userId),
    getUserSubmissions(userId),
    db.select().from(userCollections).where(eq(userCollections.userId, userId)),
    db.select().from(cookedLog).where(eq(cookedLog.userId, userId)).orderBy(desc(cookedLog.cookedAt)).limit(200),
  ])

  // Week plan
  const weekPlanIds: string[] = profile?.weekPlan ?? []
  const weekPlanRecipes = weekPlanIds.length > 0
    ? await db.select().from(recipesTable).where(inArray(recipesTable.id, weekPlanIds))
    : []

  // Overlap analysis using the shared utility (same logic as /api/user/week-plan)
  let weekPlanOverlaps: Record<string, string[]> = {}
  if (weekPlanRecipes.length >= 2) {
    const allPublished = await db
      .select({ ingredients: recipesTable.ingredients })
      .from(recipesTable)
      .where(eq(recipesTable.status, 'published'))
    const allIngredients = allPublished.map((r) => r.ingredients as IngredientGroup[])
    const planForOverlap = weekPlanRecipes.map((r) => ({ id: r.id, ingredients: r.ingredients as IngredientGroup[] }))
    weekPlanOverlaps = computeOverlaps(planForOverlap, allIngredients)
  }

  const savedRecipeIds = profile?.savedRecipes ?? []
  const savedRecipes = await getUserSavedRecipes(savedRecipeIds)

  // Fetch all recipes ever cooked (separate from saved — nutrition needs real data)
  const cookedRecipeIds = [...new Set(cookedEntries.map((e) => e.recipeId))]
  const cookedRecipes = await getRecipesByIds(cookedRecipeIds)

  // Split authored recipes by status
  const published = myRecipes.filter((r) => r.status === 'published')
  const drafts     = myRecipes.filter((r) => r.status === 'draft')
  const pending    = myRecipes.filter((r) => r.status === 'pending_review' || r.status === 'flagged')
  const rejected   = myRecipes.filter((r) => r.status === 'rejected')

  const displayName = profile?.displayName ?? clerkUser?.firstName ?? 'Chef'
  const avatarUrl   = profile?.avatarUrl ?? clerkUser?.imageUrl
  const fridgeIngredients = profile?.fridgeIngredients ?? []

  const tabs = [
    { id: 'home',        label: 'Home' },
    { id: 'ai',          label: 'AI Kitchen' },
    { id: 'this-week',   label: 'This week',   count: weekPlanIds.length },
    { id: 'recipes',     label: 'Recipes',     count: myRecipes.length },
    { id: 'saved',       label: 'Saved',       count: savedRecipes.length },
    { id: 'collections', label: 'Collections', count: myCollections.length },
    { id: 'cook-log',    label: 'Cook log',    count: cookedEntries.length },
  ]

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* ── Compact header ─────────────────────────────── */}
      <div className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-12 h-12 rounded-full object-cover border-2 border-line flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-ember/20 border-2 border-ember/30 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-ember text-lg">{displayName[0]?.toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold text-ink leading-none">{displayName}</h1>
            <p className="text-xs text-ink-ghost mt-1">My Kitchen</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {profile?.username && (
              <a href={`/chef/${profile.username}`} className="text-xs text-ink-ghost hover:text-ember transition-colors border border-line rounded-full px-3 py-1.5 hidden sm:block">
                Public profile
              </a>
            )}
            <a href="/settings" className="text-xs text-ink-ghost hover:text-ember transition-colors border border-line rounded-full px-3 py-1.5">
              Settings
            </a>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── scrollable on mobile ─────────────── */}
      <div className="border-b border-line bg-page/90 sticky top-16 z-40 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={`/profile?tab=${t.id}`}
                className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? 'text-ink after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-ember'
                    : 'text-ink-ghost hover:text-ink-dim'
                }`}
              >
                {t.id === 'ai' && (
                  <svg className="w-3.5 h-3.5 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                )}
                {t.label}
                {'count' in t && (t.count ?? 0) > 0 && (
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
      </div>

      {/* ── Tab content ───────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">

        {/* ── Home / Dashboard ── */}
        {activeTab === 'home' && (
          <div className="space-y-10">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Published', value: published.length },
                { label: 'Saved',     value: savedRecipes.length },
                { label: 'Cooked',    value: cookedEntries.length },
              ].map((stat) => (
                <div key={stat.label} className="bg-panel border border-line rounded-xl px-4 py-4 text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-ink">{stat.value}</p>
                  <p className="text-xs text-ink-ghost mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* This week's nutrition */}
            {(() => {
              function parseNum(s: string | undefined) { return s ? parseFloat(s.replace(/[^\d.]/g, '')) || 0 : 0 }
              const now = new Date()
              const day = now.getDay()
              const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1))
              const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
              const recipeMap = Object.fromEntries(cookedRecipes.map((r) => [r.id, r]))
              const thisWeek = cookedEntries.filter((e) => {
                const d = e.cookedAt instanceof Date ? e.cookedAt : new Date(e.cookedAt)
                return d >= weekStart && d < weekEnd
              })
              const totals = thisWeek.reduce((acc, e) => {
                const n = recipeMap[e.recipeId]?.nutrition
                const s = e.servings
                if (!n) return acc
                return {
                  calories: acc.calories + (n.calories || 0) * s,
                  protein:  acc.protein  + parseNum(n.protein)  * s,
                  carbs:    acc.carbs    + parseNum(n.carbs)     * s,
                  fat:      acc.fat      + parseNum(n.fat)       * s,
                }
              }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
              if (thisWeek.length === 0) return null
              return (
                <div className="bg-panel border border-line rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">This week</p>
                    <Link href="/profile?tab=cook-log" className="text-xs text-ember hover:underline">{thisWeek.length} cook{thisWeek.length !== 1 ? 's' : ''}</Link>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      { label: 'Calories', value: Math.round(totals.calories).toLocaleString(), unit: 'kcal' },
                      { label: 'Protein',  value: Math.round(totals.protein),  unit: 'g' },
                      { label: 'Carbs',    value: Math.round(totals.carbs),    unit: 'g' },
                      { label: 'Fat',      value: Math.round(totals.fat),      unit: 'g' },
                    ].map((m) => (
                      <div key={m.label}>
                        <p className="font-display text-xl sm:text-2xl font-bold text-ink">{m.value}<span className="text-xs font-normal text-ink-ghost ml-0.5">{m.unit}</span></p>
                        <p className="text-xs text-ink-ghost mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Quick actions */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Quick actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/profile?tab=ai" className="group flex flex-col items-center gap-2 bg-panel border border-line hover:border-ember rounded-xl px-4 py-5 text-center transition-colors">
                  <svg className="w-6 h-6 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  <span className="text-sm font-semibold text-ink group-hover:text-ember transition-colors">AI Kitchen</span>
                  <span className="text-xs text-ink-ghost">Generate a recipe</span>
                </Link>
                <Link href="/submit" className="group flex flex-col items-center gap-2 bg-panel border border-line hover:border-ember rounded-xl px-4 py-5 text-center transition-colors">
                  <svg className="w-6 h-6 text-ink-ghost group-hover:text-ember transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  <span className="text-sm font-semibold text-ink group-hover:text-ember transition-colors">Submit</span>
                  <span className="text-xs text-ink-ghost">Add your own recipe</span>
                </Link>
                <Link href="/fridge" className="group flex flex-col items-center gap-2 bg-panel border border-line hover:border-ember rounded-xl px-4 py-5 text-center transition-colors">
                  <svg className="w-6 h-6 text-ink-ghost group-hover:text-ember transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h12a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18v-2.25z" /></svg>
                  <span className="text-sm font-semibold text-ink group-hover:text-ember transition-colors">My fridge</span>
                  <span className="text-xs text-ink-ghost">{fridgeIngredients.length > 0 ? `${fridgeIngredients.length} items` : 'What\'s in there?'}</span>
                </Link>
                <Link href="/explore" className="group flex flex-col items-center gap-2 bg-panel border border-line hover:border-ember rounded-xl px-4 py-5 text-center transition-colors">
                  <svg className="w-6 h-6 text-ink-ghost group-hover:text-ember transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" /></svg>
                  <span className="text-sm font-semibold text-ink group-hover:text-ember transition-colors">Explore</span>
                  <span className="text-xs text-ink-ghost">Find new recipes</span>
                </Link>
                {savedRecipes.length > 0 && (
                  <Link href={`/grocery-list?recipes=${savedRecipes.slice(0, 20).map((r) => r.slug).join(',')}`} className="group flex flex-col items-center gap-2 bg-panel border border-line hover:border-ember rounded-xl px-4 py-5 text-center transition-colors">
                    <svg className="w-6 h-6 text-ink-ghost group-hover:text-ember transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
                    <span className="text-sm font-semibold text-ink group-hover:text-ember transition-colors">Grocery list</span>
                    <span className="text-xs text-ink-ghost">From {savedRecipes.length} saved</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Recent recipes */}
            {myRecipes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Recent recipes</h2>
                  <Link href="/profile?tab=recipes" className="text-xs text-ember hover:underline">See all</Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myRecipes.slice(0, 3).map((r) => <RecipeCard key={r.id} recipe={r} showStatus />)}
                </div>
              </div>
            )}

            {/* Recent cook log */}
            {cookedEntries.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Recently cooked</h2>
                  <Link href="/profile?tab=cook-log" className="text-xs text-ember hover:underline">See all</Link>
                </div>
                <div className="space-y-2">
                  {cookedEntries.slice(0, 4).map((entry) => {
                    const recipeTitle = cookedRecipes.find((r) => r.id === entry.recipeId)?.title ?? 'Unknown recipe'
                    return (
                      <Link
                        key={entry.id}
                        href={`/recipe/${entry.recipeSlug}`}
                        className="bg-panel border border-line rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-ember transition-colors block"
                      >
                        <p className="text-sm text-ink font-medium truncate">{recipeTitle}</p>
                        <p className="text-xs text-ink-ghost flex-shrink-0">
                          {new Date(entry.cookedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty welcome */}
            {myRecipes.length === 0 && cookedEntries.length === 0 && (
              <div className="text-center py-16">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-ink-ghost" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 19.128v-.003c0-1.113-.425-2.188-1.184-2.995a3.75 3.75 0 00-2.816-1.253 3.75 3.75 0 00-2.816 1.253C7.425 16.94 7 18.015 7 19.128v.003M12 19.128v-.003M6 14.25h.008v.008H6v-.008zm3.75 0h.008v.008H9.75v-.008zm3.75 0h.008v.008h-.008v-.008z" /></svg>
                </div>
                <p className="font-display text-xl text-ink mb-2">Welcome to your kitchen</p>
                <p className="text-sm text-ink-ghost mb-6">Start by asking the AI to generate a recipe, or submit one you already love.</p>
                <Link href="/profile?tab=ai" className="inline-flex items-center gap-2 bg-ember text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-ember/90 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  Open AI Kitchen
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── AI Kitchen ── */}
        {activeTab === 'ai' && (
          <div>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember">AI Kitchen</p>
              </div>
              <h2 className="font-display text-2xl font-bold text-ink">What do you want to cook?</h2>
              <p className="text-sm text-ink-dim mt-1">Tell it what&apos;s in your fridge. Describe a craving. Ask it to adapt something.</p>
            </div>
            <AIChat />
          </div>
        )}

        {/* ── My Recipes ── */}
        {activeTab === 'recipes' && (
          <div className="space-y-10">
            {myRecipes.length === 0 && (
              <EmptyState icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 19.128v-.003c0-1.113-.425-2.188-1.184-2.995a3.75 3.75 0 00-2.816-1.253 3.75 3.75 0 00-2.816 1.253C7.425 16.94 7 18.015 7 19.128v.003M12 19.128v-.003M6 14.25h.008v.008H6v-.008zm3.75 0h.008v.008H9.75v-.008zm3.75 0h.008v.008h-.008v-.008z" /></svg>} message="No recipes yet. Try the AI Kitchen or submit one manually." />
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
              <EmptyState icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>} message="No saved recipes yet. Hit 'Save recipe' on any recipe page or in the AI Kitchen." />
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-ink-ghost">{savedRecipes.length} {savedRecipes.length === 1 ? 'recipe' : 'recipes'}</p>
                  <a
                    href={`/grocery-list?recipes=${savedRecipes.slice(0, 20).map((r) => r.slug).join(',')}`}
                    className="inline-flex items-center gap-2 text-xs font-medium border border-line hover:border-ember text-ink-dim hover:text-ink px-4 py-2 rounded-full transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    Grocery list
                  </a>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedRecipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Submissions ── */}
        {activeTab === 'submissions' && (
          <div>
            {submissions.length === 0 ? (
              <EmptyState icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>} message="You haven't submitted any recipes for review yet." />
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

        {activeTab === 'this-week' && (
          <WeekPlan
            initialRecipes={weekPlanRecipes.map((r) => ({ id: r.id, slug: r.slug, title: r.title, subtitle: r.subtitle, cuisine: r.cuisine, totalTime: r.totalTime, difficulty: r.difficulty, gradient: r.gradient, imageUrl: r.imageUrl }))}
            initialGroceryList={profile?.groceryList ?? ''}
            overlaps={weekPlanOverlaps}
            fridgeIngredients={fridgeIngredients}
          />
        )}

        {activeTab === 'cook-log' && (
          <CookLog entries={cookedEntries} savedRecipes={cookedRecipes.map((r) => ({ id: r.id, title: r.title, slug: r.slug, nutrition: r.nutrition }))} />
        )}

      </div>
    </div>
  )
}
