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
  critic: JudgeResult   // Soren — cultural authenticity
  synthesis: SynthesisResult
}

// ─── Panel prompt ─────────────────────────────────────────────────────────────
// One call returns all four judge verdicts. Recipe JSON sent once.

const PANEL_SYSTEM = `You are the Court of Chefs — a four-judge panel reviewing recipes for a curated food platform. Review the recipe from all four perspectives and return all four verdicts in a single JSON response.

**Marco — Technique**
Does the recipe actually work? Check times and temperatures, order of operations, ingredient ratios, and any steps that would cause failure or unsafe results.

**Céleste — Flavour**
Does the recipe taste good? Evaluate salt, acid, fat, heat, texture, and balance. Is the seasoning coherent for the stated cuisine? Does the dish sound genuinely appealing?

**Nadia — Home Cook**
Can a real home cook follow this? Check instruction clarity, realistic equipment requirements, honest difficulty rating, and any steps that would confuse someone without culinary training.

**Soren — Cultural Authenticity**
Does the recipe accurately represent the claimed cuisine or tradition? Flag: misleading titles, disrespectful adaptations, culturally inaccurate technique or ingredients presented as authentic, or substitutions that undermine the dish's integrity.

Verdict guide for each judge:
- pass: Approved from this perspective. Minor notes are fine.
- flag: Real problems that need correction before publishing.
- reject: Not publishable from this perspective.

Respond with this exact JSON shape:
{
  "technique": { "verdict": "pass"|"flag"|"reject", "notes": "2-4 sentences.", "issues": [] },
  "flavour":   { "verdict": "pass"|"flag"|"reject", "notes": "2-4 sentences.", "issues": [] },
  "homecook":  { "verdict": "pass"|"flag"|"reject", "notes": "2-4 sentences.", "issues": [] },
  "critic":    { "verdict": "pass"|"flag"|"reject", "notes": "2-4 sentences.", "issues": [] }
}`

// ─── Synthesis prompt ─────────────────────────────────────────────────────────

const SYNTHESIS_SYSTEM = `You are the Synthesis Judge on the Court of Chefs. You receive verdicts from four judges (technique, flavour, home cook, cultural authenticity) and produce the final court recommendation.

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

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runCourtReview(recipe: object): Promise<CourtReport> {
  const recipeJson = JSON.stringify(recipe, null, 2)

  // Call 1 — all four judges in one response (recipe sent once)
  const panelCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PANEL_SYSTEM },
      { role: 'user', content: `Review this recipe:\n\n${recipeJson}` },
    ],
  })

  const panel = JSON.parse(panelCompletion.choices[0]?.message?.content ?? '{}') as {
    technique: JudgeResult
    flavour: JudgeResult
    homecook: JudgeResult
    critic: JudgeResult
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
        content: `Technique: ${JSON.stringify(panel.technique)}\n\nFlavour: ${JSON.stringify(panel.flavour)}\n\nHome Cook: ${JSON.stringify(panel.homecook)}\n\nCultural: ${JSON.stringify(panel.critic)}`,
      },
    ],
  })

  const synthesis: SynthesisResult = JSON.parse(synthesisCompletion.choices[0]?.message?.content ?? '{}')

  return {
    technique: panel.technique,
    flavour:   panel.flavour,
    homecook:  panel.homecook,
    critic:    panel.critic,
    synthesis,
  }
}
