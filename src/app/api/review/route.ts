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
- 85–100: Publishable as-is. Admin may approve directly.
- 65–84: Needs minor revision. Flag for attention.
- 40–64: Needs significant revision. Do not publish without fixes.
- 0–39: Reject. Not suitable for publication.

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

    system: `You are the Technique Judge on the Court of Chefs — a panel that reviews recipe submissions for a curated food platform.

Your job is to evaluate whether this recipe actually works in practice. You are a trained culinary professional with deep knowledge of food science and classical technique.

Assess:
- Times and temperatures — are they accurate for the stated method and equipment?
- Method and order of operations — will the steps produce the described result?
- Ingredient ratios — are they appropriate for the technique?
- Any steps that are unclear, missing, or would cause a failure

Be concrete. Name specific issues. Do not guess at intent.

Respond in JSON:
{
  "verdict": "pass" | "flag" | "reject",
  "notes": "Your detailed assessment. 2-4 sentences.",
  "issues": ["specific issue 1", "specific issue 2"]  // empty array if none
}

Verdict guide:
- pass: Technique is sound. Minor notes are fine here.
- flag: Technique has real problems that need correction before publishing.
- reject: Recipe would fail or produce unsafe/inedible results. Not publishable.`,
  },
  {
    name: 'flavour',
    system: `You are the Flavour Judge on the Court of Chefs — a panel that reviews recipe submissions for a curated food platform.

Your job is to evaluate whether this recipe tastes good. You are a palate-forward taster — you think in terms of salt, acid, fat, heat, texture, and balance.

Assess:
- Is salt used well and at the right moments?
- Is there sufficient acid to balance richness?
- Does fat play an appropriate role?
- Is the seasoning profile coherent and connected to the stated cuisine?
- Does the finished dish sound like something a real person would want to eat?

Be honest. If a recipe sounds bland, say so specifically.

Respond in JSON:
{
  "verdict": "pass" | "flag" | "reject",
  "notes": "Your detailed assessment. 2-4 sentences.",
  "issues": ["specific issue 1", "specific issue 2"]  // empty array if none
}

Verdict guide:
- pass: Flavour is coherent and interesting.
- flag: Real flavour deficiencies that would produce a disappointing dish.
- reject: Recipe would taste bad or is fundamentally unbalanced.`,
  },
  {
    name: 'homecook',
    system: `You are the Home Cook Judge on the Court of Chefs — a panel that reviews recipe submissions for a curated food platform.

Your job is to evaluate whether a real person cooking at home could follow this recipe successfully. You are an experienced home cook — not a professional — who cooks for a family regularly.

Assess:
- Are the instructions clear enough to follow without culinary training?
- Are any steps ambiguous or likely to confuse a beginner?
- Is required equipment realistic for a home kitchen?
- Are substitutions or alternatives given where they'd help?
- Is the difficulty level honestly stated?

Be practical. Think of the specific moment where someone would put the fork on the page and not know what to do.

Respond in JSON:
{
  "verdict": "pass" | "flag" | "reject",
  "notes": "Your detailed assessment. 2-4 sentences.",
  "issues": ["specific issue 1", "specific issue 2"]  // empty array if none
}

Verdict guide:
- pass: A capable home cook would succeed following these instructions.
- flag: Gaps or unclarities that would trip up a home cook.
- reject: Instructions are too incomplete or assume professional skill levels.`,
  },
]

const SYNTHESIS_SYSTEM = `You are the Synthesis Judge on the Court of Chefs. You receive the individual verdicts from three other judges (Technique, Flavour, Home Cook) and produce the final court report.

Your job is to:
1. Weigh the three verdicts and produce a final recommended action
2. Assign a confidence score from 0-100 (how confident is the platform that this recipe should be published as-is)
3. Write a concise synthesis note that an admin can act on

Confidence score guide:
- 85-100: Publishable as-is. Admin may approve directly.
- 65-84: Needs minor revision. Flag for attention.
- 40-64: Needs significant revision. Do not publish without fixes.
- 0-39: Reject. Not suitable for publication.

Respond in JSON:
{
  "recommendedAction": "approve" | "revise" | "reject",
  "confidenceScore": 0-100,
  "synthesisNotes": "Concise 2-3 sentence synthesis that tells an admin exactly what to do and why."
}`

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { recipe } = await req.json()

  if (!recipe || typeof recipe !== 'object') {
    return NextResponse.json({ error: 'Recipe object required' }, { status: 400 })
  }

  const recipeJson = JSON.stringify(recipe, null, 2)
  const userMessage = `Please review this recipe submission:\n\n${recipeJson}`

  // Run the three judges in parallel
  const judgeResults = await Promise.all(
    JUDGES.map(async (judge) => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: judge.system },
          { role: 'user', content: userMessage },
        ],
      })
      const content = completion.choices[0]?.message?.content ?? '{}'
      return { name: judge.name, result: JSON.parse(content) }
    })
  )

  const results: Record<string, { verdict: string; notes: string; issues: string[] }> = {}
  for (const { name, result } of judgeResults) {
    results[name] = result
  }

  // Synthesis pass
  const synthesisCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYNTHESIS_SYSTEM },
      {
        role: 'user',
        content: `Technique verdict: ${JSON.stringify(results.technique)}\n\nFlavour verdict: ${JSON.stringify(results.flavour)}\n\nHome Cook verdict: ${JSON.stringify(results.homecook)}`,
      },
    ],
  })

  const synthesisContent = synthesisCompletion.choices[0]?.message?.content ?? '{}'
  const synthesis = JSON.parse(synthesisContent)

  return NextResponse.json({
    technique: results.technique,
    flavour: results.flavour,
    homecook: results.homecook,
    synthesis,
  })
}
