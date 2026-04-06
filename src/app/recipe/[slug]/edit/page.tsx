import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getRecipeBySlug } from '@/lib/queries'
import { Navbar } from '@/components/navbar'
import { RecipeEditForm } from '@/components/recipe-edit-form'

export const dynamic = 'force-dynamic'

export default async function RecipeEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()
  if (!userId) redirect('/')

  const recipe = await getRecipeBySlug(slug)
  if (!recipe) notFound()

  // Only the owner can edit, and only draft/rejected
  if (recipe.authorId !== userId) redirect(`/recipe/${slug}`)
  if (recipe.status !== 'draft' && recipe.status !== 'rejected') redirect(`/recipe/${slug}`)

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <a href={`/recipe/${slug}`} className="text-xs text-ink-ghost hover:text-ember transition-colors">
            ← Back to recipe
          </a>
          <h1 className="font-display text-3xl font-bold text-ink mt-4 mb-1">Edit recipe</h1>
          <p className="text-sm text-ink-dim">
            {recipe.status === 'rejected'
              ? 'Revise your recipe based on the feedback, then resubmit for review.'
              : 'Edit your draft. When ready, submit for review from your profile.'}
          </p>
        </div>
        <RecipeEditForm recipe={recipe} />
      </div>
    </div>
  )
}
