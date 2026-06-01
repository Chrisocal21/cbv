import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Navbar } from '@/components/navbar'
import { MultiListGrocery } from '@/components/multi-list-grocery'
import { FridgeMatchesSidebar } from '@/components/fridge-matches-sidebar'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Grocery list — Cookbookverse',
  description: 'Add what you need and check it off as you shop.',
}

type GroceryItem = { id: string; text: string; checked: boolean }
type GroceryList = { id: string; name: string; items: GroceryItem[] }

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export default async function FridgePage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  // Try to fetch both groceryItems and groceryLists, but groceryLists might not exist yet
  let groceryItems: GroceryItem[] = []
  let groceryLists: GroceryList[] = []
  
  try {
    const rows = await db
      .select({ groceryItems: users.groceryItems, groceryLists: users.groceryLists })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    if (rows.length === 0) {
      // User doesn't exist yet, create with minimal fields
      await db.insert(users).values({
        id: userId,
        role: 'user',
        savedRecipes: [],
        dietaryPreferences: [],
        weekPlan: [],
        groceryItems: [],
        createdAt: new Date(),
      }).onConflictDoNothing()
    } else {
      groceryItems = (rows[0]?.groceryItems as GroceryItem[]) ?? []
      groceryLists = (rows[0]?.groceryLists as GroceryList[]) ?? []
    }
  } catch (e) {
    // If groceryLists column doesn't exist yet, just fetch groceryItems
    const rows = await db
      .select({ groceryItems: users.groceryItems })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    if (rows.length === 0) {
      // User doesn't exist, create with minimal fields
      await db.insert(users).values({
        id: userId,
        role: 'user',
        savedRecipes: [],
        dietaryPreferences: [],
        weekPlan: [],
        groceryItems: [],
        createdAt: new Date(),
      }).onConflictDoNothing()
    } else {
      groceryItems = (rows[0]?.groceryItems as GroceryItem[]) ?? []
    }
  }
  
  // Migration: if no lists but has old groceryItems, migrate them to first list
  if (groceryLists.length === 0 && groceryItems.length > 0) {
    groceryLists = [{ id: uid(), name: 'Main list', items: groceryItems }]
    // Try to save migrated data (will fail if column doesn't exist, that's ok)
    try {
      await db.update(users).set({ groceryLists }).where(eq(users.id, userId))
    } catch (e) {
      // Column doesn't exist yet, that's fine
    }
  }

  // For sidebar matches, collect all unchecked items from all lists
  const allItems = groceryLists.flatMap((list) => list.items)

  return (
    <div className="h-screen bg-page flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Grocery lists (full width on mobile, left column on desktop) */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <header className="mb-8">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-[1.05] mb-3">Grocery list</h1>
              <p className="text-ink-dim text-base leading-relaxed max-w-md">
                Add what you need and check it off as you shop. It saves on its own.
              </p>
            </header>
            <MultiListGrocery initialLists={groceryLists} />
            
            {/* Mobile: Show matches inline below list */}
            <div className="md:hidden mt-12">
              <FridgeMatchesSidebar initialItems={allItems} mobile />
            </div>
          </div>
        </div>

        {/* Right: Recipe matches sidebar (desktop only) */}
        <div className="hidden md:block">
          <FridgeMatchesSidebar initialItems={allItems} />
        </div>
      </div>
    </div>
  )
}
