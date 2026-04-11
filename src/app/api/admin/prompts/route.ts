import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { promptTemplates, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function requireAdmin(userId: string | null) {
  if (!userId) return false
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return rows[0]?.role === 'admin'
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await db.select().from(promptTemplates)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { persona, systemPrompt } = await req.json()
  if (!persona || !systemPrompt) {
    return NextResponse.json({ error: 'persona and systemPrompt required' }, { status: 400 })
  }

  await db
    .insert(promptTemplates)
    .values({ persona, systemPrompt })
    .onConflictDoUpdate({
      target: promptTemplates.persona,
      set: { systemPrompt, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
