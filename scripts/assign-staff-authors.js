/**
 * Assigns staff_author to existing AI-generated recipes that don't have one yet.
 *
 * Logic:
 *   Baking Alchemy collection                 → celeste
 *   Has 2+ dietary tags OR vegan/dairy-free   → nadia
 *   Everything else AI-generated              → marco
 */

const fs = require('fs')
// Load .env.local manually (no dotenv dep in scripts)
fs.readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
  const m = line.match(/^([^#][^=]+)=(.+)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
})
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function main() {
  const recipes = await sql`
    SELECT id, title, collection, dietary_tags
    FROM recipes
    WHERE ai_generated = true
      AND staff_author IS NULL
    ORDER BY created_at ASC
  `

  if (recipes.length === 0) {
    console.log('No unattributed AI recipes found.')
    return
  }

  const assignments = recipes.map((r) => {
    const tags = Array.isArray(r.dietary_tags) ? r.dietary_tags : []
    const isNadia =
      tags.length >= 2 ||
      tags.some((t) => ['vegan', 'dairy-free', 'gluten-free'].includes(t.toLowerCase()))
    const isBaking = r.collection === 'Baking Alchemy'

    const persona = isBaking ? 'celeste' : isNadia ? 'nadia' : 'marco'
    return { id: r.id, title: r.title, persona }
  })

  console.log('\nAssignments to apply:\n')
  for (const a of assignments) {
    console.log(`  ${a.persona.padEnd(8)} ← ${a.title}`)
  }

  for (const a of assignments) {
    await sql`UPDATE recipes SET staff_author = ${a.persona} WHERE id = ${a.id}`
  }

  console.log(`\n✓ Updated ${assignments.length} recipes.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
