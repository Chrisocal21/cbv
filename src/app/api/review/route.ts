import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Panel prompt ─────────────────────────────────────────────────────────────
// Three judges, one call, recipe sent once.

const PANEL_SYSTEM = `You are the Court of Chefs — a three-judge panel reviewing recipe submissions for a curated food platform. Review the recipe from all three perspectives and return all three verdicts in a single JSON response.

**Technique Judge**
Does the recipe actually work? Check times and temperatures, order of operations, ingredient ratios, and any steps that would cause failure or unsafe results.

**Flavour Judge**
Does the recipe taste good? Evaluate salt, acid, fat, heat, texture, and balance. Is the seasoning coherent for the stated cuisine? Does the dish sound genuinely appealing?

**Home Cook Judge**
Can a real home cook follow this? Check instruction clarity, realistic equipment requirements, honest difficulty rating, and any steps that would confuse someone without culinary training.

Verdict guide:
- pass: Approved from this perspective.
- flag: Real problems that need correction before publishing.
- reject: Not publishable from this perspective.

Respond with this exact JSON shape:
{
  "technique": { "verdict": "pass"|"flag"|"reject", "notes": "2-4 sentences.", "issues": [] },
  "flavour":   { "verdict": "pass"|"flag"|"reject", "notes": "2-4 sentences.", "issues": [] },
  "homecook":  { "verdict": "pass"|"flag"|"reject", "notes": "2-4 sentences.", "issues": [] }
}`

// ─── Synthesis prompt ─────────────────────────────────────────────────────────

const SYNTHESIS_SYSTEM = `You are the Synthesis Judge on the Court of Chefs. You receive verdicts from three judges (technique, flavour, home cook) and produce the final court recommendation.

Confidence score guide:
- 85-100: Publishable as-is. Admin may approve directly.
- 65-84: Needs minor revision. Flag for attention.
- 40-64: Needs significant revision. Do not publish without fixes.
- 0-39: Reject. Not suitable for publication.

Respond in JSON:
{
  "recommendedAction": "approve" | "revise" | "reject",
  "confidenceScore": 0-100,
  "synthesisNotes": "2-3 sentences telling an admin exactly what to do and why."
}`

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { recipe } = await req.json()

  if (!recipe || typeof recipe !== 'object') {
    return NextResponse.json({ error: 'Recipe object required' }, { status: 400 })
  }

  const recipeJson = JSON.stringify(recipe, null, 2)

  // Call 1 — all three judges in one response
  const panelCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 900,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PANEL_SYSTEM },
      { role: 'user', content: `Review this recipe submission:\n\n${recipeJson}` },
    ],
  })

  const panel = JSON.parse(panelCompletion.choices[0]?.message?.content ?? '{}') as {
    technique: { verdict: string; notes: string; issues: string[] }
    flavour:   { verdict: string; notes: string; issues: string[] }
    homecook:  { verdict: string; notes: string; issues: string[] }
  }

  // Call 2 — synthesis
  const synthesisCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYNTHESIS_SYSTEM },
      {
        role: 'user',
        content: `Technique: ${JSON.stringify(panel.technique)}\n\nFlavour: ${JSON.stringify(panel.flavour)}\n\nHome Cook: ${JSON.stringify(panel.homecook)}`,
      },
    ],
  })

  const synthesis = JSON.parse(synthesisCompletion.choices[0]?.message?.content ?? '{}')

  return NextResponse.json({
    technique: panel.technique,
    flavour:   panel.flavour,
    homecook:  panel.homecook,
    synthesis,
  })
}
