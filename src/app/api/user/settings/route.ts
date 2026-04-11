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

  const { displayName, bio, dietaryPreferences, username } = await req.json()

  // Ensure user row exists
  await db.insert(users).values({ id: userId }).onConflictDoNothing()

  // Validate username: alphanumeric + hyphens, 3-30 chars
  let sanitizedUsername: string | null = null
  if (username !== undefined) {
    const cleaned = String(username).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (cleaned.length >= 3 && cleaned.length <= 30) {
      sanitizedUsername = cleaned
    }
  }

  await db
    .update(users)
    .set({
      displayName: displayName ?? null,
      bio: bio ?? null,
      dietaryPreferences: Array.isArray(dietaryPreferences) ? dietaryPreferences : [],
      ...(sanitizedUsername !== null ? { username: sanitizedUsername } : {}),
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
    username: user?.username ?? '',
  })
}
