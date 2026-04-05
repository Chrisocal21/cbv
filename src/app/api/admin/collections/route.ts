import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, collections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return rows[0]?.role === 'admin' ? userId : null
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/ & /g, '-and-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// POST — create a new collection
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, gradient } = await req.json() as {
    name: string
    description: string
    gradient: string
  }

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const id = `coll_${Date.now()}`
  const slug = toSlug(name.trim())

  const [row] = await db.insert(collections).values({
    id,
    name: name.trim(),
    slug,
    description: description?.trim() ?? '',
    gradient: gradient?.trim() || 'from-stone-700 to-amber-700',
    sortOrder: 99,
  }).returning()

  return NextResponse.json(row)
}

// PATCH — update an existing collection
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, description, gradient } = await req.json() as {
    id: string
    description?: string
    gradient?: string
  }

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Partial<{ description: string; gradient: string }> = {}
  if (description !== undefined) updates.description = description.trim()
  if (gradient !== undefined) updates.gradient = gradient.trim()

  const [row] = await db.update(collections).set(updates).where(eq(collections.id, id)).returning()
  return NextResponse.json(row)
}
