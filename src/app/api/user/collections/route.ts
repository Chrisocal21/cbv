import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userCollections } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/user/collections — list user's collections
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(userCollections).where(eq(userCollections.userId, userId))
  return NextResponse.json(rows)
}

// POST /api/user/collections — create a new collection
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description = '' } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const [created] = await db.insert(userCollections).values({
    id: randomUUID(),
    userId,
    name: name.trim(),
    description,
    recipeIds: [],
  }).returning()

  return NextResponse.json(created, { status: 201 })
}

// PATCH /api/user/collections — update name/description, add/remove recipe
export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, description, addRecipeId, removeRecipeId } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const rows = await db.select().from(userCollections)
    .where(and(eq(userCollections.id, id), eq(userCollections.userId, userId)))
    .limit(1)

  const col = rows[0]
  if (!col) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Partial<typeof col> = { updatedAt: new Date() }
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description

  if (addRecipeId) {
    const ids = col.recipeIds as string[]
    if (!ids.includes(addRecipeId)) updates.recipeIds = [...ids, addRecipeId]
  }
  if (removeRecipeId) {
    updates.recipeIds = (col.recipeIds as string[]).filter((id) => id !== removeRecipeId)
  }

  const [updated] = await db.update(userCollections).set(updates as never).where(eq(userCollections.id, id)).returning()
  return NextResponse.json(updated)
}

// DELETE /api/user/collections — delete a collection
export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await db.delete(userCollections).where(and(eq(userCollections.id, id), eq(userCollections.userId, userId)))
  return NextResponse.json({ ok: true })
}
