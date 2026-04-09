import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// ─── GET /api/user/notifications — fetch recent notifications for current user

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20)

  const unreadCount = rows.filter((n) => !n.read).length
  return NextResponse.json({ notifications: rows, unreadCount })
}

// ─── PATCH /api/user/notifications — mark all notifications as read

export async function PATCH() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

  return NextResponse.json({ ok: true })
}
