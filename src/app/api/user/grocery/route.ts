import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

type GroceryItem = { id: string; text: string; checked: boolean }

const MAX_ITEMS = 300

async function ensureUser(userId: string) {
  await db.insert(users).values({ id: userId }).onConflictDoNothing()
}

function sanitize(raw: unknown): GroceryItem[] {
  if (!Array.isArray(raw)) return []
  const out: GroceryItem[] = []
  const seenIds = new Set<string>()
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const text = typeof (r as GroceryItem).text === 'string' ? (r as GroceryItem).text.trim() : ''
    if (!text) continue
    let id = typeof (r as GroceryItem).id === 'string' ? (r as GroceryItem).id : ''
    if (!id || seenIds.has(id)) id = crypto.randomUUID()
    seenIds.add(id)
    out.push({ id, text: text.slice(0, 200), checked: Boolean((r as GroceryItem).checked) })
    if (out.length >= MAX_ITEMS) break
  }
  return out
}

async function readItems(userId: string): Promise<GroceryItem[]> {
  // Try to read from groceryLists first (new multi-list structure)
  try {
    const rows = await db
      .select({ groceryLists: users.groceryLists })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    const lists = rows[0]?.groceryLists as Array<{ id: string; name: string; items: GroceryItem[] }> | undefined
    if (lists && lists.length > 0) {
      // Flatten items from all lists
      return lists.flatMap(list => list.items ?? [])
    }
  } catch {
    // Column doesn't exist yet, fall back to old groceryItems
  }
  
  // Fall back to old groceryItems column
  const rows = await db
    .select({ groceryItems: users.groceryItems })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0]?.groceryItems ?? []
}

// GET /api/user/grocery — return the user's grocery checklist
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureUser(userId)
  return NextResponse.json({ items: await readItems(userId) })
}

// PUT /api/user/grocery — replace the whole list (autosave from the checklist UI)
export async function PUT(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const items = sanitize(body?.items)

  await ensureUser(userId)
  await db.update(users).set({ groceryItems: items }).where(eq(users.id, userId))
  return NextResponse.json({ ok: true, items })
}

// POST /api/user/grocery — append items (e.g. from a recipe page). Body: { add: string[] }
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const add: string[] = Array.isArray(body?.add)
    ? body.add.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => s.trim()).filter(Boolean)
    : []
  if (add.length === 0) return NextResponse.json({ error: 'Nothing to add' }, { status: 400 })

  await ensureUser(userId)
  const existing = await readItems(userId)
  const existingText = new Set(existing.map((i) => i.text.toLowerCase()))

  const appended: GroceryItem[] = []
  for (const text of add) {
    const key = text.toLowerCase()
    if (existingText.has(key)) continue
    existingText.add(key)
    appended.push({ id: crypto.randomUUID(), text: text.slice(0, 200), checked: false })
  }

  const items = [...existing, ...appended].slice(0, MAX_ITEMS)
  await db.update(users).set({ groceryItems: items }).where(eq(users.id, userId))
  return NextResponse.json({ ok: true, items, added: appended.length })
}
