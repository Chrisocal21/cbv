import { Navbar } from '@/components/navbar'
import { AIChat } from '@/components/ai-chat'
import { getAllRecipes } from '@/lib/queries'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ask AI — Cookbookverse',
  description: 'Your personal cooking assistant.',
}

export default async function AIPage() {
  const allRecipes = await getAllRecipes()

  // Slim map: slug → preview data (title, image, gradient, first 8 ingredients)
  const recipeMap: Record<string, { title: string; slug: string; imageUrl: string | null; gradient: string; cuisine: string; totalTime: string; ingredients: string[] }> = {}
  for (const r of allRecipes) {
    const groups = r.ingredients as { group: string; items: string[] }[]
    const items = groups.flatMap((g) => g.items).slice(0, 8)
    recipeMap[r.slug] = {
      title: r.title,
      slug: r.slug,
      imageUrl: r.imageUrl ?? null,
      gradient: r.gradient,
      cuisine: r.cuisine,
      totalTime: r.totalTime,
      ingredients: items,
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen bg-page flex flex-col">
      <Navbar />

      {/* Full-width chat */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-5xl mx-auto w-full">
        {/* Fixed header */}
        <div className="flex-shrink-0 px-4 md:px-6 pt-3 md:pt-6 pb-3 border-b border-line bg-page">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-ink mb-1">
            Ask AI
          </h1>
          <p className="text-ink-dim text-xs md:text-sm leading-relaxed">
            Get recipe suggestions, cooking advice, or ideas based on what you have.
          </p>
        </div>

        {/* Scrollable chat */}
        <AIChat recipeMap={recipeMap} className="flex-1" />
      </div>
    </div>
  )
}
