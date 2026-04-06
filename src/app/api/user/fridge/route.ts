import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function ensureUser(userId: string) {
  await db.insert(users).values({ id: userId }).onConflictDoNothing()
}

// GET /api/user/fridge — return the user's fridge ingredient list
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)
  const rows = await db.select({ fridgeIngredients: users.fridgeIngredients }).from(users).where(eq(users.id, userId)).limit(1)
  return NextResponse.json({ fridgeIngredients: rows[0]?.fridgeIngredients ?? [] })
}

// PATCH /api/user/fridge — set the full fridge list
export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fridgeIngredients } = await req.json()
  if (!Array.isArray(fridgeIngredients)) return NextResponse.json({ error: 'fridgeIngredients must be an array' }, { status: 400 })

  await ensureUser(userId)
  await db.update(users).set({ fridgeIngredients }).where(eq(users.id, userId))
  return NextResponse.json({ ok: true, fridgeIngredients })
}
