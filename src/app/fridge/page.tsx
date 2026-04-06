import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Navbar } from '@/components/navbar'
import { FridgeEditor } from '@/components/fridge-editor'

export const dynamic = 'force-dynamic'

export default async function FridgePage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  await db.insert(users).values({ id: userId }).onConflictDoNothing()
  const rows = await db.select({ fridgeIngredients: users.fridgeIngredients }).from(users).where(eq(users.id, userId)).limit(1)
  const fridgeIngredients = (rows[0]?.fridgeIngredients as string[]) ?? []

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">Phase 3</p>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">My fridge</h1>
          <p className="text-ink-dim text-lg max-w-lg">
            Tell us what&rsquo;s in your fridge. The AI will always know, so you can ask &ldquo;what can I make?&rdquo; and get relevant answers.
          </p>
        </div>
        <FridgeEditor initialIngredients={fridgeIngredients} />

        <div className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-lg font-bold text-ink mb-2">How it works</h2>
          <ul className="space-y-2 text-sm text-ink-dim">
            <li className="flex gap-2"><span className="text-ember">→</span> Add whatever you have on hand — be as specific or general as you like</li>
            <li className="flex gap-2"><span className="text-ember">→</span> Head to the <a href="/ai" className="text-ember hover:underline">AI Kitchen</a> and ask &ldquo;What can I make with what I have?&rdquo;</li>
            <li className="flex gap-2"><span className="text-ember">→</span> Your fridge list is automatically included in every AI conversation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
