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
]

const SYNTHESIS_SYSTEM = `You are the Synthesis Judge on the Court of Chefs. Weigh three judge verdicts and produce the final report.

Confidence score guide:
- 85-100: Publishable as-is.
- 65-84: Needs minor revision.
- 40-64: Needs significant revision.
- 0-39: Reject.

Respond in JSON:
{
  "recommendedAction": "approve" | "revise" | "reject",
  "confidenceScore": 0-100,
  "synthesisNotes": "Concise 2-3 sentence synthesis."
}`

export async function runCourtReview(recipe: object): Promise<CourtReport> {
  const recipeJson = JSON.stringify(recipe, null, 2)
  const userMessage = `Please review this recipe:\n\n${recipeJson}`

  const results = {} as Record<'technique' | 'flavour' | 'homecook', JudgeResult>

  for (const judge of JUDGES) {
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
        content: `Technique: ${JSON.stringify(results.technique)}\n\nFlavour: ${JSON.stringify(results.flavour)}\n\nHome Cook: ${JSON.stringify(results.homecook)}`,
      },
    ],
  })

  const synthesis: SynthesisResult = JSON.parse(synthesisCompletion.choices[0]?.message?.content ?? '{}')

  return { technique: results.technique, flavour: results.flavour, homecook: results.homecook, synthesis }
}
