import { Navbar } from '@/components/navbar'
import { AIChat } from '@/components/ai-chat'

export default function AIPage() {
  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">
            AI Kitchen
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink mb-4">
            What do you want to cook?
          </h1>
          <p className="text-ink-dim text-lg leading-relaxed max-w-xl">
            Tell it what is in your fridge. Describe a craving. Ask it to adapt a recipe for a dietary need. It will find something or build something.
          </p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          {MODES.map((mode) => (
            <div
              key={mode.id}
              className="p-4 rounded-xl border border-line bg-panel"
            >
              <p className="text-lg mb-1">{mode.icon}</p>
              <p className="font-semibold text-ink text-sm mb-1">{mode.title}</p>
              <p className="text-xs text-ink-dim leading-relaxed">{mode.description}</p>
            </div>
          ))}
        </div>

        <AIChat />
      </div>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <span className="font-display font-bold text-ink-dim">Cookbookverse</span>
          <span className="text-xs text-ink-ghost">v2 in progress</span>
        </div>
      </footer>
    </div>
  )
}

const MODES = [
  {
    id: 'ingredients',
    icon: '🥬',
    title: 'From your fridge',
    description: 'List what you have. Get recipes that actually use it.',
  },
  {
    id: 'mood',
    icon: '🌧️',
    title: 'Match a mood',
    description: 'Cozy, spicy, light, celebratory. Describe it and find it.',
  },
  {
    id: 'adapt',
    icon: '⚗️',
    title: 'Adapt a recipe',
    description: 'Make it vegan, gluten-free, or fit what you have on hand.',
  },
]
