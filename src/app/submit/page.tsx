import { Navbar } from '@/components/navbar'
import { SubmitForm } from '@/components/submit-form'

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">
            Contribute
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink mb-4">
            Submit a recipe
          </h1>
          <p className="text-ink-dim text-lg max-w-xl leading-relaxed">
            Every submission is reviewed before it goes live. Fill in as much detail as you can
            — the more you give us, the better we can represent your recipe.
          </p>
        </div>

        <SubmitForm />
      </div>

      <footer className="border-t border-line bg-panel mt-20">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <span className="font-display font-bold text-ink-dim">Cookbookverse</span>
          <span className="text-xs text-ink-ghost">v2 in progress</span>
        </div>
      </footer>
    </div>
  )
}
