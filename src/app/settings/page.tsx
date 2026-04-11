'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'low-carb',
  'keto',
]

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [dietary, setDietary] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/'); return }

    fetch('/api/user/settings')
      .then((r) => r.json())
      .then((data) => {
        setDisplayName(data.displayName ?? '')
        setUsername(data.username ?? '')
        setBio(data.bio ?? '')
        setDietary(data.dietaryPreferences ?? [])
      })
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, router])

  const toggleDietary = (tag: string) =>
    setDietary((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName, username, bio, dietaryPreferences: dietary }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <p className="text-ink-ghost">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-14">
        {/* Header */}
        <div className="mb-10">
          <a href="/profile" className="text-xs text-ink-ghost hover:text-ember transition-colors">
            ← My kitchen
          </a>
          <h1 className="font-display text-3xl font-bold text-ink mt-4">Account settings</h1>
        </div>

        <div className="space-y-8">
          {/* Display name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you appear on the platform"
              className="w-full px-4 py-3 rounded-xl border border-line bg-panel text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors text-sm"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
              Username
            </label>
            <div className="flex items-center gap-0 rounded-xl border border-line bg-panel focus-within:border-ember transition-colors overflow-hidden">
              <span className="pl-4 text-ink-ghost text-sm select-none">cookbookverse.com/chef/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="yourname"
                className="flex-1 px-2 py-3 bg-transparent text-ink placeholder:text-ink-ghost focus:outline-none text-sm"
              />
            </div>
            {username && (
              <p className="text-xs text-ink-ghost mt-2">
                Your public profile: <a href={`/chef/${username}`} className="text-ember hover:underline">/chef/{username}</a>
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about your cooking…"
              className="w-full px-4 py-3 rounded-xl border border-line bg-panel text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors text-sm resize-none"
            />
          </div>

          {/* Dietary preferences */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-1">
              Dietary preferences
            </label>
            <p className="text-xs text-ink-ghost mb-4">
              These are used to personalise your AI Kitchen suggestions.
            </p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleDietary(tag)}
                  className={`text-xs font-medium px-4 py-2 rounded-full border transition-colors ${
                    dietary.includes(tag)
                      ? 'bg-ember text-white border-ember'
                      : 'bg-panel border-line text-ink-dim hover:border-ember hover:text-ink'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-full bg-ember text-white font-medium text-sm hover:bg-ember-deep transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span className="text-sm text-green-400">Saved ✓</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
