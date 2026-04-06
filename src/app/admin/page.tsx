import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users, recipes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getAllCollections } from '@/lib/queries'
import { Navbar } from '@/components/navbar'
import { AdminDashboard } from '@/components/admin-dashboard'
import { AdminGenerator } from '@/components/admin-generator'
import { AdminPublishedRecipes } from '@/components/admin-published-recipes'
import { AdminCollections } from '@/components/admin-collections'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') redirect('/')

  const published = await db.select({
    id: recipes.id,
    title: recipes.title,
    slug: recipes.slug,
    cuisine: recipes.cuisine,
    collection: recipes.collection,
    isFeatured: recipes.isFeatured,
    viewCount: recipes.viewCount,
    saveCount: recipes.saveCount,
    imageUrl: recipes.imageUrl,
    createdAt: recipes.createdAt,
  }).from(recipes).where(eq(recipes.status, 'published')).orderBy(desc(recipes.createdAt))

  const allCollections = await getAllCollections()

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">
            Admin
          </p>
          <h1 className="font-display text-4xl font-bold text-ink mb-2">
            Content Studio
          </h1>
          <p className="text-ink-dim">
            Generate and publish recipes. Review pending submissions.
          </p>
        </div>

        <AdminGenerator />

        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-ink mb-1">Pending submissions</h2>
          <p className="text-sm text-ink-ghost">User and generated recipes awaiting your decision.</p>
        </div>

        <AdminDashboard />

        <div className="mt-16 mb-6">
          <h2 className="font-display text-xl font-bold text-ink mb-1">Published recipes</h2>
          <p className="text-sm text-ink-ghost">Manage featured status and Today&apos;s Pick.</p>
        </div>

        <AdminPublishedRecipes initialRecipes={published} />

        <div className="mt-16 mb-6">
          <h2 className="font-display text-xl font-bold text-ink mb-1">Collections</h2>
          <p className="text-sm text-ink-ghost">Manage collection names, descriptions, and gradients. Add new ones here.</p>
        </div>

        <AdminCollections initialCollections={allCollections} />
      </div>

      <footer className="border-t border-line bg-panel mt-20">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <span className="font-display font-bold text-ink-dim">Cookbookverse</span>
          <span className="text-xs text-ink-ghost">v2 in progress</span>
        </div>
      </footer>
    </div>
  )
}
