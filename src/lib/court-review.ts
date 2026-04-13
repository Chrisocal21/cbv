import OpenAI from 'openai'
import { buildStaffPrompt } from '@/lib/staff'

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
  { name: 'technique' as const, system: buildStaffPrompt('marco',   'review:technique') },
  { name: 'flavour'   as const, system: buildStaffPrompt('celeste', 'review:flavour')   },
  { name: 'homecook'  as const, system: buildStaffPrompt('nadia',   'review:homecook')  },
  { name: 'critic'    as const, system: buildStaffPrompt('nadia',   'review:critic')    },
]

const SYNTHESIS_SYSTEM = buildStaffPrompt('theo', 'review:synthesis')

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
