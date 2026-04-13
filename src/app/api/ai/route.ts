import OpenAI from 'openai'
import { RECIPES } from '@/lib/data'
import { buildStaffPrompt, StaffPersona } from '@/lib/staff'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LIBRARY_SUMMARY = RECIPES.map(
  (r) =>
    `- "${r.title}" (slug: ${r.slug}) | ${r.cuisine} | ${r.collection} | ${r.difficulty} | ${r.totalTime} | tags: ${r.moodTags.join(', ')} | dietary: ${r.dietaryTags.join(', ') || 'none'}`
).join('\n')

const RECIPE_LIBRARY_CONTEXT = `RECIPE LIBRARY (always check this first before suggesting or generating anything new):
${LIBRARY_SUMMARY}`

/** Route a conversation to the correct persona based on the last user message content. */
function routeChat(messages: { role: string; content: string }[]): StaffPersona {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const text = (lastUser?.content ?? '').toLowerCase()

  // Baking & pastry — Céleste
  if (/\b(bread|cake|pastry|bak(e|ing|ed)|flour|gluten|yeast|sourdough|croissant|tart\b.*pie|pie\b.*tart|cookie|biscuit|meringue|custard|laminated|dough|knead|proof|rise\b|leavening|muffin|brownie|scone|shortcrust|choux|danish|macaron|brioche)\b/.test(text)) {
    return 'celeste'
  }

  // Food history, cultural context, origin — Theo
  if (/\b(histor(y|ical)|where does .{0,40} come from|who invented|origin of|when did|cultural (context|meaning|significance)|food coloniali|tradition(al)?|authentic(ity)?|story behind|meaning of|food writing|etymolog)\b/.test(text)) {
    return 'theo'
  }

  // Fermentation, global cuisines, street food, sourcing — Soren
  if (/\b(ferment(ed|ation|ing)|koji|miso|kimchi|kombucha|lacto.?ferment|ramen|wok|stir.?fr(y|ying|ied)|street food|fish sauce|injera|pho|banh mi|pad thai|bibimbap|jerk|berbere|teff|dim sum|dumpling|sushi|sashimi|tandoor|tamarind|lemongrass|galangal|forag(e|ing)|wild mushroom|where (can i|do i|to) (buy|find|get)|what is .{0,30}(paste|sauce|ingredient)|wok hei|garum|natto|tempeh|gochujang|harissa|shiso|dashi)\b/.test(text)) {
    return 'soren'
  }

  // Technique, heat, knife work — Marco
  if (/\b(sear(ing)?|maillard|brown(ing)?|carameliz|rest(ing)? (meat|steak|chicken|pork|fish)|cast iron|knife|dice|chop|mince|julienne|brunoise|braise|stock|sauce (broke|split|separated)|emulsion|vinaigrette|steak\b|medium.?rare|medium.?well|rare\b|well.?done|proper temperature|degrees (c|f|celsius|fahrenheit)|pan (too|not)|roast(ing)|poach(ing)|blanch(ing)|why is my .{0,40}(tough|dry|rubbery|chewy|burnt)|how (long|hot) (do|should) i (cook|heat|sear|fry)|saut[eé]|render(ing)?|deglaze|fond|mise en place)\b/.test(text)) {
    return 'marco'
  }

  // Nutrition, dietary restrictions, allergens — Nadia
  if (/\b(calori(e|es)|nutrition|protein (content|amount|grams)|carb(ohydrate)?|macr(o|os)|vitamin|mineral\b|vegan\b|vegetarian|gluten.?free|dairy.?free|allerg(y|en|ic)|nut.?free|coeliac|celiac|dietary (restriction|need|requirement)|healthy (option|alternative|swap)|gut health|probiotic|bioavail|food intoleran)\b/.test(text)) {
    return 'nadia'
  }

  // Default: Nadia handles general chat and recipe questions
  return 'nadia'
}

export async function POST(req: Request) {
  const { messages, dietaryPreferences, fridgeIngredients, weekPlanIds } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid request', { status: 400 })
  }

  const prefNote = Array.isArray(dietaryPreferences) && dietaryPreferences.length > 0
    ? `\n\nUSER DIETARY PREFERENCES: ${dietaryPreferences.join(', ')}. Always respect these when suggesting or generating recipes. Mention them proactively if relevant.`
    : ''

  const fridgeNote = Array.isArray(fridgeIngredients) && fridgeIngredients.length > 0
    ? `\n\nUSER'S FRIDGE CONTENTS: ${fridgeIngredients.join(', ')}. When the user asks what they can make or doesn't specify ingredients, use these as the starting point. Mention them naturally — don't list them back robotically.`
    : ''

  const weekPlanNote = Array.isArray(weekPlanIds) && weekPlanIds.length > 0
    ? `\n\nUSER'S WEEK PLAN: The user already has ${weekPlanIds.length} recipe(s) planned for this week. When suggesting what to cook next, try to complement what they already have planned \u2014 ideally recipes that share some non-staple ingredients to reduce their shopping footprint. Don't repeat what they already have planned.`
    : ''

  const persona = routeChat(messages)
  const systemPrompt = buildStaffPrompt(persona, 'chat', RECIPE_LIBRARY_CONTEXT + prefNote + fridgeNote + weekPlanNote)

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 1500,
    temperature: 0.7,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
