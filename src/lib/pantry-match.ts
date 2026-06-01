/**
 * Pantry → recipe matching engine.
 *
 * Given a user's living pantry list (the fridge list) and the recipe catalog,
 * rank recipes by how well their ingredients are covered by what the user has.
 *
 * Used by:
 *   - src/app/api/user/fridge/matches/route.ts
 *
 * Reuses normalizeIngredient from ingredients.ts so the matching is consistent
 * with the week-plan overlap logic.
 */

import { normalizeIngredient, type IngredientGroup } from './ingredients'

/**
 * Pantry basics assumed to always be on hand. These never count against a
 * recipe as "missing" and don't inflate the match score — most cooks have them.
 */
const STAPLES = new Set([
  'salt',
  'pepper',
  'black pepper',
  'sea salt',
  'water',
  'oil',
  'olive oil',
  'vegetable oil',
  'sunflower oil',
  'cooking oil',
  'sugar',
  'flour',
  'plain flour',
  'all-purpose flour',
])

function isStaple(norm: string): boolean {
  if (STAPLES.has(norm)) return true
  // catch "fine sea salt", "freshly ground black pepper", etc.
  return (
    norm.endsWith(' salt') ||
    norm.endsWith(' pepper') ||
    norm.endsWith(' oil') ||
    norm.endsWith(' sugar') ||
    norm.endsWith(' flour')
  )
}

/** Significant words in a normalized ingredient (drops short filler words). */
function coreWords(norm: string): string[] {
  return norm.split(/\s+/).filter((w) => w.length >= 4)
}

/**
 * Does a recipe ingredient match anything in the pantry?
 *
 * Matches if:
 *   - either phrase contains the other (substring), or
 *   - they share a significant word (>= 4 chars)
 *
 * e.g. pantry "chicken" matches recipe "chicken thighs"
 *      pantry "ripe tomatoes" matches recipe "tomatoes"
 */
function matchesPantry(recipeNorm: string, pantry: { phrase: string; words: Set<string> }[]): boolean {
  const recipeWords = coreWords(recipeNorm)
  for (const p of pantry) {
    if (!p.phrase) continue
    if (recipeNorm.includes(p.phrase) || p.phrase.includes(recipeNorm)) return true
    for (const w of recipeWords) {
      if (p.words.has(w)) return true
    }
  }
  return false
}

export type RecipeMatch = {
  /** 0–1 coverage of the recipe's non-staple ingredients */
  score: number
  /** number of non-staple ingredients the user has */
  haveCount: number
  /** total number of distinct non-staple ingredients */
  totalCount: number
  /** display names of the non-staple ingredients the user is missing */
  missing: string[]
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Score a single recipe against the prepared pantry.
 * Returns null if the recipe has no usable (non-staple) ingredients.
 */
function scoreRecipe(
  ingredients: IngredientGroup[],
  pantry: { phrase: string; words: Set<string> }[],
): RecipeMatch | null {
  const seen = new Set<string>()
  const nonStaple: string[] = []

  for (const group of ingredients) {
    for (const item of group.items) {
      const norm = normalizeIngredient(item)
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      if (!isStaple(norm)) nonStaple.push(norm)
    }
  }

  if (nonStaple.length === 0) return null

  const missing: string[] = []
  let haveCount = 0
  for (const norm of nonStaple) {
    if (matchesPantry(norm, pantry)) haveCount++
    else missing.push(titleCase(norm))
  }

  return {
    score: haveCount / nonStaple.length,
    haveCount,
    totalCount: nonStaple.length,
    missing,
  }
}

/**
 * Rank a catalog of recipes against a pantry list.
 *
 * Returns matches sorted best-first: highest coverage, then fewest missing
 * ingredients, then a caller-supplied tiebreak (e.g. saveCount).
 *
 * Only recipes with at least one matched non-staple ingredient are returned.
 */
export function rankRecipesByPantry<T extends { ingredients: IngredientGroup[]; saveCount?: number }>(
  pantryList: string[],
  recipes: T[],
): Array<T & { match: RecipeMatch }> {
  const pantry = pantryList
    .map((raw) => {
      const phrase = normalizeIngredient(raw)
      return { phrase, words: new Set(coreWords(phrase)) }
    })
    .filter((p) => p.phrase.length > 0)

  if (pantry.length === 0) return []

  const results: Array<T & { match: RecipeMatch }> = []
  for (const recipe of recipes) {
    const match = scoreRecipe(recipe.ingredients, pantry)
    if (!match || match.haveCount === 0) continue
    results.push({ ...recipe, match })
  }

  results.sort((a, b) => {
    if (b.match.score !== a.match.score) return b.match.score - a.match.score
    if (a.match.missing.length !== b.match.missing.length)
      return a.match.missing.length - b.match.missing.length
    return (b.saveCount ?? 0) - (a.saveCount ?? 0)
  })

  return results
}
