// ─── Seeded RNG (mulberry32) ──────────────────────────────────────────────────
// Using recipe ID as seed ensures the same recipe always picks the same modifiers
// unless the recipe is explicitly updated.

function hashStr(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function seededRng(seed: number) {
  let s = seed
  return function (): number {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REALISM_MODIFIERS = [
  'slight utensil marks',
  'faint steam',
  'natural portion sizes',
  'minor sauce smears',
  'uneven cooking textures',
  'subtle plating imperfections',
] as const

const BANNED_TERMS = [
  'ultra detailed',
  '8k',
  'studio lighting',
  'perfect lighting',
  'hyper realistic',
  'cinematic',
]

// ─── Types ────────────────────────────────────────────────────────────────────

type IngredientGroup = { group: string; items: string[] }

export type ImagePromptMode = 'real' | 'expectation'

export type RecipeForPrompt = {
  id: string
  title: string
  cuisine: string
  ingredients: IngredientGroup[]
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Generates a deterministic, style-consistent image prompt for a recipe.
 *
 * The same recipe ID always produces the same modifier selection (seeded RNG),
 * so image re-generation stays visually stable unless the recipe changes.
 *
 * @param recipe  Core recipe data used to describe the dish
 * @param mode    'real' = slightly messier, more imperfections (default)
 *                'expectation' = cleaner plating, fewer imperfections
 */
export function generateImagePrompt(
  recipe: RecipeForPrompt,
  mode: ImagePromptMode = 'real'
): string {
  const rng = seededRng(hashStr(recipe.id))

  // Seeded shuffle — pick 2 modifiers for expectation, 3 for real
  const pool = [...REALISM_MODIFIERS].sort(() => rng() - 0.5)
  const modifierCount = mode === 'real' ? 3 : 2
  const modifiers = pool.slice(0, modifierCount)
  const modifierClause = `with ${modifiers.join(' and ')}`

  // Infer plating description from first 4 ingredient items across all groups
  const allItems = recipe.ingredients.flatMap((g) => g.items)
  const platingDescription =
    allItems.length > 0
      ? `${allItems.slice(0, 4).join(', ')} arranged naturally on plate`
      : 'ingredients arranged naturally on plate'

  const presentationNote =
    mode === 'real'
      ? 'slightly imperfect presentation (minor sauce smears, uneven textures)'
      : 'neatly plated with clean presentation'

  let prompt =
    `A realistic photo of ${recipe.title}, plated according to the recipe: ${platingDescription}. ` +
    `The dish accurately reflects the ingredients and cooking method (no extra elements). ` +
    `Served on a plain white plate. ` +
    `Shot in natural window light with soft shadows, ${presentationNote} ${modifierClause}. ` +
    `Background is minimal and slightly out of focus (kitchen table or countertop). ` +
    `Color is natural, not oversaturated. ` +
    `Looks like a real homemade meal, not styled or commercial. ` +
    `50mm lens, shallow depth of field, slight grain, candid framing. ` +
    `Consistent app style: plain white plate, 45-degree angle, natural window lighting, minimal background.`

  // Strip banned terms that may have been injected via recipe data
  for (const term of BANNED_TERMS) {
    prompt = prompt.replace(new RegExp(term, 'gi'), '')
  }

  return prompt.trim()
}
