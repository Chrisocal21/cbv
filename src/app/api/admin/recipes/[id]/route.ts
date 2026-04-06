import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, recipes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return false
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return rows[0]?.role === 'admin'
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const rows = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    title?: string
    subtitle?: string
    description?: string
    collection?: string
    cuisine?: string
    difficulty?: string
    prepTime?: string
    cookTime?: string
    totalTime?: string
    servings?: string
    originStory?: string
    gradient?: string
    moodTags?: string[]
    dietaryTags?: string[]
    ingredients?: { group: string; items: string[] }[]
    steps?: { title: string; body: string }[]
    nutrition?: { calories: number; protein: string; carbs: string; fat: string; fiber: string }
  }

  const allowed = [
    'title', 'subtitle', 'description', 'collection', 'cuisine', 'difficulty',
    'prepTime', 'cookTime', 'totalTime', 'servings', 'originStory', 'gradient',
    'moodTags', 'dietaryTags', 'ingredients', 'steps', 'nutrition',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key as keyof typeof body]
  }

  updates.updatedAt = new Date()

  const [updated] = await db.update(recipes).set(updates as never).where(eq(recipes.id, id)).returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(updated)
}
