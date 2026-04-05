import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ─── PATCH /api/user/settings ─────────────────────────────────────────────────
// Updates display name, bio, and dietary preferences for the current user.

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { displayName, bio, dietaryPreferences } = await req.json()

  // Ensure user row exists
  await db.insert(users).values({ id: userId }).onConflictDoNothing()

  await db
    .update(users)
    .set({
      displayName: displayName ?? null,
      bio: bio ?? null,
      dietaryPreferences: Array.isArray(dietaryPreferences) ? dietaryPreferences : [],
    })
    .where(eq(users.id, userId))

  return NextResponse.json({ ok: true })
}

// ─── GET /api/user/settings ───────────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  const user = rows[0]

  return NextResponse.json({
    displayName: user?.displayName ?? '',
    bio: user?.bio ?? '',
    dietaryPreferences: user?.dietaryPreferences ?? [],
  })
}
