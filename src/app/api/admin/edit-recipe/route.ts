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

  const { recipe, instruction, recipeId } = await req.json()
  if (!recipe || !instruction?.trim()) {
    return NextResponse.json({ error: 'Recipe and instruction required' }, { status: 400 })
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.5,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: buildStaffPrompt('marco', 'edit'),
      },
      {
        role: 'user',
        content: `Recipe:\n${JSON.stringify(recipe, null, 2)}\n\nInstruction: ${instruction}`,
      },
    ],
  })

  const updatedRecipe = JSON.parse(completion.choices[0]?.message?.content ?? '{}')

  // Persist the edits to the DB if we have a recipeId
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
