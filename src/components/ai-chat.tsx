'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type ActionStatus = 'idle' | 'saving' | 'submitting' | 'saved' | 'submitted' | 'error'
type ActionState = { status: ActionStatus; slug?: string; error?: string }

function looksLikeRecipe(content: string): boolean {
  return /ingredients/i.test(content) && /(instructions|method|steps|directions)/i.test(content)
}

export function AIChat() {
  const { isSignedIn } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState<Record<number, ActionState>>({})
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isSignedIn) return
    fetch('/api/user/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.dietaryPreferences?.length) setDietaryPreferences(data.dietaryPreferences) })
      .catch(() => {})
  }, [isSignedIn])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)

    // Append an empty assistant message we'll stream into
    setMessages((m) => [...m, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, dietaryPreferences }),
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((m) => {
          const updated = [...m]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages((m) => {
        const updated = [...m]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function saveRecipe(index: number) {
    if (!isSignedIn) {
      setActions((a) => ({ ...a, [index]: { status: 'error', error: 'Sign in to save recipes' } }))
      return
    }
    setActions((a) => ({ ...a, [index]: { status: 'saving' } }))
    const res = await fetch('/api/ai/save-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(0, index + 1) }),
    })
    if (res.ok) {
      const data = await res.json()
      setActions((a) => ({ ...a, [index]: { status: 'saved', slug: data.slug } }))
    } else {
      const data = await res.json().catch(() => ({}))
      setActions((a) => ({ ...a, [index]: { status: 'error', error: data.error ?? 'Save failed' } }))
    }
  }

  async function submitRecipe(index: number) {
    if (!isSignedIn) {
      setActions((a) => ({ ...a, [index]: { status: 'error', error: 'Sign in to submit recipes' } }))
      return
    }
    setActions((a) => ({ ...a, [index]: { status: 'submitting' } }))
    const res = await fetch('/api/ai/submit-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(0, index + 1) }),
    })
    if (res.ok) {
      setActions((a) => ({ ...a, [index]: { status: 'submitted' } }))
    } else {
      const data = await res.json().catch(() => ({}))
      setActions((a) => ({ ...a, [index]: { status: 'error', error: data.error ?? 'Submission failed' } }))
    }
  }

  return (
    <div className="border border-line rounded-2xl bg-panel overflow-hidden">
      {/* Messages */}
      <div className="min-h-[320px] max-h-[520px] overflow-y-auto p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-ink-ghost text-sm">Start by asking anything.</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-2 rounded-full border border-line bg-page text-ink-dim hover:border-ember hover:text-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-ember text-white rounded-br-sm'
                    : 'bg-page border border-line text-ink rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && !loading && looksLikeRecipe(msg.content) && (
                <RecipeActions
                  index={i}
                  state={actions[i] ?? { status: 'idle' }}
                  onSave={() => saveRecipe(i)}
                  onSubmit={() => submitRecipe(i)}
                />
              )}
            </div>
          ))
        )}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-page border border-line rounded-2xl rounded-bl-sm px-4 py-3">
              <ThinkingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-line p-4 flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="I have chicken thighs, soy sauce, and ginger..."
          rows={2}
          className="flex-1 resize-none bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-ember text-white flex items-center justify-center hover:bg-ember-deep disabled:opacity-40 transition-colors"
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-ink-ghost animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function RecipeActions({
  index,
  state,
  onSave,
  onSubmit,
}: {
  index: number
  state: ActionState
  onSave: () => void
  onSubmit: () => void
}) {
  const busy = state.status === 'saving' || state.status === 'submitting'

  if (state.status === 'saved' && state.slug) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
        <span>✓ Saved.</span>
        <a href={`/recipe/${state.slug}`} className="underline hover:text-green-300">View recipe →</a>
      </div>
    )
  }

  if (state.status === 'submitted') {
    return (
      <p className="mt-2 text-xs text-green-400">✓ Submitted for review. We'll let you know when it's approved.</p>
    )
  }

  if (state.status === 'error') {
    return <p className="mt-2 text-xs text-red-400">{state.error}</p>
  }

  return (
    <div className="mt-2 flex gap-2" data-index={index}>
      <button
        onClick={onSave}
        disabled={busy}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-line bg-page text-ink-dim hover:border-ember hover:text-ember transition-colors disabled:opacity-50"
      >
        <BookmarkIcon />
        {state.status === 'saving' ? 'Saving…' : 'Save recipe'}
      </button>
      <button
        onClick={onSubmit}
        disabled={busy}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-line bg-page text-ink-dim hover:border-ember hover:text-ember transition-colors disabled:opacity-50"
      >
        <SubmitIcon />
        {state.status === 'submitting' ? 'Submitting…' : 'Submit for review'}
      </button>
    </div>
  )
}

function BookmarkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function SubmitIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const SUGGESTIONS = [
  'I have chicken, lemon, and capers',
  'Something cozy for a cold night',
  'Make this vegan',
  'Quick dinner under 30 minutes',
]
