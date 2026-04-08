import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, recipes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { recipe, criticNotes, criticIssues, recipeId } = await req.json()
  if (!recipe || !criticNotes) {
    return NextResponse.json({ error: 'Recipe and critic findings required' }, { status: 400 })
  }

  const issuesList = Array.isArray(criticIssues) && criticIssues.length > 0
    ? criticIssues.map((issue: string, i: number) => `${i + 1}. ${issue}`).join('\n')
    : null

  // QA passed with no issues — nothing to fix, return as-is
  if (!issuesList) {
    return NextResponse.json({ recipe })
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.4,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a senior recipe editor at a curated food platform. A QA reviewer has identified specific real problems in a recipe. Your job is to fix them properly.

For each issue, your process is:
1. Understand WHY it is a problem — what would actually go wrong for a real cook?
2. Determine the RIGHT fix for this specific type of dish and cuisine — not a generic fix, the correct one
3. Apply the minimal change that resolves the issue without changing the character of the recipe

How to approach specific fix types:
- Wrong temperature or time → reason from the method, ingredient density, and pan/oven type; what does this dish actually need?
- Vague doneness cues → replace with specific sensory cues the cook can actually perceive: colour, texture, aroma, sound, how the pan looks
- Unverifiable nutrition → estimate from the actual stated quantities using standard food composition data
- Hard to source ingredient → add a practical substitution in parentheses on the same ingredient line
- Description promises something the ingredients cannot deliver → either adjust the technique to deliver it, or rewrite the description to be honest about what you actually get
- Missing critical information → add only what a cook genuinely needs at that moment, not what sounds thorough

Rules:
- Do NOT change the title, cuisine, collection, gradient, or anything not in the issues list
- Do NOT rewrite sections that were not flagged
- Do NOT make the recipe more complex — simpler and more precise is always the goal
- If fixing an issue would require fundamentally changing the dish, adjust the expectation in the description instead
- Think like someone who has cooked this exact type of dish many times and knows where people go wrong

Return the complete recipe JSON with exactly the same structure as the input.`,
      },
      {
        role: 'user',
        content: `Recipe:\n${JSON.stringify(recipe, null, 2)}\n\nQA reviewer notes:\n${criticNotes}\n\nSpecific issues to fix:\n${issuesList}`,
      },
    ],
  })

  const updatedRecipe = JSON.parse(completion.choices[0]?.message?.content ?? '{}')

  if (recipeId) {
    await db.update(recipes).set({
      title: updatedRecipe.title ?? recipe.title,
      subtitle: updatedRecipe.subtitle ?? recipe.subtitle,
      description: updatedRecipe.description ?? recipe.description,
      collection: updatedRecipe.collection ?? recipe.collection,
      cuisine: updatedRecipe.cuisine ?? recipe.cuisine,
      difficulty: updatedRecipe.difficulty ?? recipe.difficulty,
      prepTime: updatedRecipe.prepTime ?? recipe.prepTime,
      cookTime: updatedRecipe.cookTime ?? recipe.cookTime,
      totalTime: updatedRecipe.totalTime ?? recipe.totalTime,
      servings: updatedRecipe.servings ?? recipe.servings,
      moodTags: updatedRecipe.moodTags ?? recipe.moodTags,
      dietaryTags: updatedRecipe.dietaryTags ?? recipe.dietaryTags,
      ingredients: updatedRecipe.ingredients ?? recipe.ingredients,
      steps: updatedRecipe.steps ?? recipe.steps,
      nutrition: updatedRecipe.nutrition ?? recipe.nutrition,
      originStory: updatedRecipe.originStory ?? recipe.originStory,
      gradient: updatedRecipe.gradient ?? recipe.gradient,
    }).where(eq(recipes.id, recipeId))
  }

  return NextResponse.json({ recipe: updatedRecipe })
}
