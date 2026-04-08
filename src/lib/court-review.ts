import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Verdict = 'pass' | 'flag' | 'reject'

export type JudgeResult = {
  verdict: Verdict
  notes: string
  issues: string[]
}

export type SynthesisResult = {
  recommendedAction: 'approve' | 'revise' | 'reject'
  confidenceScore: number
  synthesisNotes: string
}

export type CourtReport = {
  technique: JudgeResult
  flavour: JudgeResult
  homecook: JudgeResult
  critic: JudgeResult
  synthesis: SynthesisResult
}

const JUDGES = [
  {
    name: 'technique' as const,
    system: `You are the Technique Judge on the Court of Chefs — a panel that reviews recipe submissions for a curated food platform.

Your job is to evaluate whether this recipe actually works in practice. You are a trained culinary professional with deep knowledge of food science and classical technique.

Assess:
- Times and temperatures — are they accurate for the stated method and equipment?
- Method and order of operations — will the steps produce the described result?
- Ingredient ratios — are they appropriate for the technique?
- Any steps that are unclear, missing, or would cause a failure

Respond in JSON:
{
  "verdict": "pass" | "flag" | "reject",
  "notes": "Your detailed assessment. 2-4 sentences.",
  "issues": []
}`,
  },
  {
    name: 'flavour' as const,
    system: `You are the Flavour Judge on the Court of Chefs — a panel that reviews recipe submissions for a curated food platform.

Your job is to evaluate whether this recipe tastes good. Think in terms of salt, acid, fat, heat, texture, and balance.

Assess:
- Salt, acid, fat balance
- Seasoning coherence with stated cuisine
- Does the finished dish sound like something worth eating?

Respond in JSON:
{
  "verdict": "pass" | "flag" | "reject",
  "notes": "Your detailed assessment. 2-4 sentences.",
  "issues": []
}`,
  },
  {
    name: 'homecook' as const,
    system: `You are the Home Cook Judge on the Court of Chefs — a panel that reviews recipe submissions for a curated food platform.

Your job is to evaluate whether a real person cooking at home could follow this recipe successfully.

Assess:
- Are instructions clear without culinary training?
- Is equipment realistic for a home kitchen?
- Are substitutions given where they'd help?

Respond in JSON:
{
  "verdict": "pass" | "flag" | "reject",
  "notes": "Your detailed assessment. 2-4 sentences.",
  "issues": []
}`,
  },
  {
    name: 'critic' as const,
    system: `You are the Quality Assurance reviewer on the Court of Chefs — a panel that reviews recipe submissions for a curated food platform.

Your job is to be the final sanity check before a recipe reaches a real home cook. You are NOT looking for problems — you are checking that nothing will cause a real person to fail, waste ingredients, or be misled.

You should default to PASS. Only flag or reject when you find something that would genuinely matter in a real kitchen.

Things worth flagging (only if you actually find them):
- A step that will produce the wrong result if followed exactly as written (wrong temperature, missing rest time, wrong order of operations)
- A time claim that is significantly off for the stated method — things that would leave a cook waiting too long or burning their food
- An ingredient most home cooks cannot source, with no substitution offered
- A nutrition value that is implausible given the stated ingredients and quantities
- A description that promises a flavour or texture the ingredient list cannot deliver
- A step that assumes equipment or knowledge a home cook is unlikely to have, with no guidance

Things NOT worth flagging:
- Minor stylistic preferences
- The recipe not being your personal taste
- Small seasoning adjustments that are subjective
- Anything the other judges already caught
- Anything a cook could figure out themselves

If the recipe is solid, say so. A clean pass is the right answer for a well-written recipe.

Respond in JSON:
{
  "verdict": "pass" | "flag" | "reject",
  "notes": "2-3 honest sentences. If passing, briefly say why it holds up. If flagging, be specific about what will actually go wrong.",
  "issues": ["Only include items that will genuinely cause a problem — leave empty if the recipe is solid"]
}`,
  },
]

const SYNTHESIS_SYSTEM = `You are the Synthesis Judge on the Court of Chefs. Weigh four judge verdicts — Technique, Flavour, Home Cook, and QA — and produce the final report.

The QA reviewer is conservative and only flags real problems. If they passed cleanly, that carries weight. If they flagged something, it matters.

Confidence score guide:
- 85-100: Publishable as-is.
- 65-84: Needs minor revision.
- 40-64: Needs significant revision.
- 0-39: Reject.

Respond in JSON:
{
  "recommendedAction": "approve" | "revise" | "reject",
  "confidenceScore": 0-100,
  "synthesisNotes": "Concise 2-3 sentence synthesis. Be direct about what still needs attention if anything."
}`

export async function runCourtReview(recipe: object): Promise<CourtReport> {
  const recipeJson = JSON.stringify(recipe, null, 2)
  const userMessage = `Please review this recipe:\n\n${recipeJson}`

  const results = {} as Record<'technique' | 'flavour' | 'homecook' | 'critic', JudgeResult>

  for (const judge of JUDGES) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: judge.system },
        { role: 'user', content: userMessage },
      ],
    })
    results[judge.name] = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  }

  const synthesisCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYNTHESIS_SYSTEM },
      {
        role: 'user',
        content: `Technique: ${JSON.stringify(results.technique)}\n\nFlavour: ${JSON.stringify(results.flavour)}\n\nHome Cook: ${JSON.stringify(results.homecook)}\n\nDevil's Advocate: ${JSON.stringify(results.critic)}`,
      },
    ],
  })

  const synthesis: SynthesisResult = JSON.parse(synthesisCompletion.choices[0]?.message?.content ?? '{}')

  return { technique: results.technique, flavour: results.flavour, homecook: results.homecook, critic: results.critic, synthesis }
}
