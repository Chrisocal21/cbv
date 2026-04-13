/**
 * Shared ingredient normalisation and overlap computation.
 * Used by:
 *   - src/app/api/user/week-plan/route.ts
 *   - src/app/recipe/[slug]/page.tsx
 *   - src/app/profile/page.tsx
 */

export type IngredientGroup = { group: string; items: string[] }

/**
 * Strip leading quantities and units from a raw ingredient string
 * to get the core ingredient name.
 *
 * e.g. "2 tbsp olive oil" → "olive oil"
 *      "3 drops vanilla extract" → "vanilla extract"
 */
export function normalizeIngredient(item: string): string {
  return item
    .toLowerCase()
    .replace(
      /^\d[\d\s/]*\s*(tbsp|tsp|tablespoon|teaspoon|cup|cups|oz|g|kg|ml|l|lb|pound|clove|cloves|bunch|pinch|handful|large|small|medium|can|tin|slice|piece|sheet|sprig|stalk|head|drop|drops)\s*/i,
      '',
    )
    .replace(/[,().]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
}

type RecipeWithIngredients = { id: string; ingredients: IngredientGroup[] }

/**
 * For each plan recipe, return the non-staple ingredients it shares
 * with at least one other plan recipe.
 *
 * Staples = ingredients appearing in >30% of all published recipes.
 * Requires at least 2 plan recipes to produce any result.
 */
export function computeOverlaps(
  planRecipes: RecipeWithIngredients[],
  allRecipesIngredients: IngredientGroup[][],
): Record<string, string[]> {
  if (planRecipes.length < 2) return {}

  const total = allRecipesIngredients.length
  const freqMap: Record<string, number> = {}

  for (const ingredients of allRecipesIngredients) {
    const seen = new Set<string>()
    for (const group of ingredients) {
      for (const item of group.items) {
        const norm = normalizeIngredient(item)
        if (norm && !seen.has(norm)) {
          seen.add(norm)
          freqMap[norm] = (freqMap[norm] || 0) + 1
        }
      }
    }
  }

  const staples = new Set(
    Object.entries(freqMap)
      .filter(([, count]) => count / total > 0.3)
      .map(([ing]) => ing),
  )

  const planNormalized: Record<string, Set<string>> = {}
  for (const r of planRecipes) {
    planNormalized[r.id] = new Set()
    for (const group of r.ingredients) {
      for (const item of group.items) {
        const norm = normalizeIngredient(item)
        if (norm && !staples.has(norm)) planNormalized[r.id].add(norm)
      }
    }
  }

  const result: Record<string, string[]> = {}
  for (const r of planRecipes) {
    const shared: string[] = []
    for (const ing of planNormalized[r.id]) {
      const otherHasIt = planRecipes.some(
        (other) => other.id !== r.id && planNormalized[other.id].has(ing),
      )
      if (otherHasIt) shared.push(ing)
    }
    if (shared.length > 0) result[r.id] = shared
  }

  return result
}
