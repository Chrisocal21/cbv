import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

type GroceryItem = { id: string; text: string; checked: boolean }
type GroceryList = { id: string; name: string; items: GroceryItem[] }

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Try to fetch groceryLists if column exists
    const rows = await db
      .select({ groceryLists: users.groceryLists })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const groceryLists = (rows[0]?.groceryLists as GroceryList[]) ?? []
    return NextResponse.json({ lists: groceryLists })
  } catch {
    // Column doesn't exist, return empty array
    return NextResponse.json({ lists: [] })
  }
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lists } = (await req.json()) as { lists: GroceryList[] }

  try {
    // Try to save to groceryLists if column exists
    await db.update(users).set({ groceryLists: lists }).where(eq(users.id, userId))
    return NextResponse.json({ success: true })
  } catch {
    // Column doesn't exist, silently fail for now
    return NextResponse.json({ success: false, error: 'groceryLists column not migrated yet' })
  }
}
