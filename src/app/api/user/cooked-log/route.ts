import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookedLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/user/cooked-log  — fetch the user's cook history
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(cookedLog)
    .where(eq(cookedLog.userId, userId))
    .orderBy(desc(cookedLog.cookedAt))
    .limit(200)

  return NextResponse.json({ entries: rows })
}

// POST /api/user/cooked-log  — log a cook
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipeId, recipeSlug, servings, notes } = await req.json()
  if (!recipeId || !recipeSlug) return NextResponse.json({ error: 'recipeId and recipeSlug required' }, { status: 400 })

  const entry = {
    id: randomUUID(),
    userId,
    recipeId: String(recipeId),
    recipeSlug: String(recipeSlug),
    servings: Number(servings) || 1,
    notes: String(notes || ''),
  }

  await db.insert(cookedLog).values(entry)

  return NextResponse.json({ ok: true, entry })
}

// DELETE /api/user/cooked-log?id=...  — remove an entry
export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const [row] = await db.select().from(cookedLog).where(eq(cookedLog.id, id)).limit(1)
  if (!row || row.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(cookedLog).where(eq(cookedLog.id, id))

  return NextResponse.json({ ok: true })
}
