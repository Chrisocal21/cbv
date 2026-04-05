import { Navbar } from '@/components/navbar'
import { AdminDashboard } from '@/components/admin-dashboard'
import { AdminGenerator } from '@/components/admin-generator'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-ember mb-3">
            Admin
          </p>
          <h1 className="font-display text-4xl font-bold text-ink mb-2">
            Content Studio
          </h1>
          <p className="text-ink-dim">
            Generate and publish recipes. Review pending submissions.
          </p>
        </div>

        <AdminGenerator />

        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-ink mb-1">Pending submissions</h2>
          <p className="text-sm text-ink-ghost">User and generated recipes awaiting your decision.</p>
        </div>

        <AdminDashboard />
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
