import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, recipes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildStaffPrompt } from '@/lib/staff'

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
        content: buildStaffPrompt('marco', 'apply-critic'),
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
