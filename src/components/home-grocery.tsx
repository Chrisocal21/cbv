'use client'

import { useEffect, useState, useRef } from 'react'

type GroceryItem = { id: string; text: string; checked: boolean }
type GroceryList = { id: string; name: string; items: GroceryItem[] }

const STORAGE_KEY = 'cbv:grocery-collapsed'

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function HomeGrocery({ initialLists, itemsToGet }: { initialLists: GroceryList[]; itemsToGet: number }) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lists, setLists] = useState<GroceryList[]>(initialLists.length > 0 ? initialLists : [{ id: uid(), name: 'Main list', items: [] }])
  const [input, setInput] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  // Autosave to server
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const t = setTimeout(() => {
      fetch('/api/user/grocery-lists', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lists }),
      }).catch(() => {})
      // Emit event for other components
      window.dispatchEvent(new CustomEvent('grocery-updated'))
    }, 600)
    return () => clearTimeout(t)
  }, [lists])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  // Detect scroll position to update active index
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const cardWidth = container.scrollWidth / lists.length
      const newIndex = Math.round(scrollLeft / cardWidth)
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < lists.length) {
        setActiveIndex(newIndex)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [lists.length, activeIndex])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  function scrollToList(idx: number) {
    setActiveIndex(idx)
    const container = scrollContainerRef.current
    if (!container) return
    const cards = container.children[0]?.children
    const card = cards?.[idx] as HTMLElement
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  function addItem() {
    const val = input.trim()
    if (!val) return
    const parts = val.split(',').map((p) => p.trim()).filter(Boolean)
    setLists((prev) => {
      const next = [...prev]
      const list = next[activeIndex]
      const existing = new Set(list.items.map((i) => i.text.toLowerCase()))
      for (const p of parts) {
        if (existing.has(p.toLowerCase())) continue
        existing.add(p.toLowerCase())
        list.items.push({ id: uid(), text: p, checked: false })
      }
      return next
    })
    setInput('')
  }

  function toggleItem(id: string) {
    setLists((prev) => {
      const next = [...prev]
      const list = next[activeIndex]
      const item = list.items.find((i) => i.id === id)
      if (item) item.checked = !item.checked
      return next
    })
  }

  function removeItem(id: string) {
    setLists((prev) => {
      const next = [...prev]
      next[activeIndex].items = next[activeIndex].items.filter((i) => i.id !== id)
      return next
    })
  }

  function clearChecked() {
    setLists((prev) => {
      const next = [...prev]
      next[activeIndex].items = next[activeIndex].items.filter((i) => !i.checked)
      return next
    })
  }

  const currentList = lists[activeIndex]
  const totalItems = lists.flatMap(l => l.items).length
  const totalUnchecked = lists.flatMap(l => l.items).filter(i => !i.checked).length

  return (
    <section className="pt-6 pb-12">
      {/* Header and text content - constrained width */}
      <div className="mx-auto max-w-2xl px-6">
        {/* The header bar is the single open/close toggle for the whole list */}
        <button
          onClick={toggle}
          aria-expanded={!collapsed}
          className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 rounded-xl border-2 border-line bg-panel hover:border-ember hover:bg-panel-raised transition-all group"
        >
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ember">Your grocery list</span>
          <span className="flex items-center gap-3 text-sm font-medium text-ink group-hover:text-ember transition-colors">
            {collapsed && (
              <span>
                {totalUnchecked > 0
                  ? `${totalUnchecked} item${totalUnchecked === 1 ? '' : 's'} to buy`
                  : 'List is clear'}
              </span>
            )}
            <span className="flex items-center gap-2">
              <span>{collapsed ? 'Show list' : 'Hide list'}</span>
              <svg
                className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </span>
        </button>

        {!collapsed && (
          <p className="text-sm text-ink-dim mt-1 mb-6 leading-relaxed">
            Add what you need and check it off as you shop — it saves automatically. Add ingredients straight from any recipe.
          </p>
        )}
      </div>

      {/* Scroll container - full width, breaks out of constraint */}
      {!collapsed && (
        <>
          {/* Horizontal swiper for multiple lists */}
          <div className="relative">
            {/* Edge fade indicators for multiple lists */}
            {lists.length > 1 && activeIndex > 0 && (
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-page to-transparent pointer-events-none z-10" />
            )}
            {lists.length > 1 && activeIndex < lists.length - 1 && (
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-page to-transparent pointer-events-none z-10" />
            )}
            
            <div 
              ref={scrollContainerRef}
              className="overflow-x-scroll overflow-y-hidden scrollbar-none snap-x snap-mandatory px-6"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x',
                userSelect: 'none'
              }}
            >
              <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                {lists.map((list, idx) => (
                  <div
                    key={list.id}
                    className="flex-shrink-0 w-[calc(100vw-3rem)] md:w-[640px] snap-center"
                    style={{ userSelect: 'none' }}
                  >
                    <InteractiveListCard 
                      list={list} 
                      isActive={idx === activeIndex}
                      input={input}
                      setInput={setInput}
                      addItem={addItem}
                      toggle={toggleItem}
                      remove={removeItem}
                      clearChecked={clearChecked}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom section - constrained width */}
          <div className="mx-auto max-w-2xl px-6">
            {/* Dots indicator (only show if more than 1 list) */}
            {lists.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {lists.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToList(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === activeIndex ? 'bg-ember' : 'bg-line'
                    }`}
                    aria-label={`Go to list ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Helpful hint */}
            <div className="mt-4 flex justify-center">
              {lists.length === 1 ? (
                <p className="text-xs text-ink-ghost text-center">
                  Create multiple lists to organize your shopping
                </p>
              ) : (
                <p className="text-xs text-ink-ghost text-center flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  Swipe to see your other lists
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </p>
              )}
            </div>

            {/* Link to full grocery list page */}
            <div className="mt-4 flex justify-center">
              <a
                href="/grocery-list"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-line bg-panel hover:border-ember hover:bg-panel-raised text-sm font-medium text-ink-dim hover:text-ember transition-all"
              >
                Manage your lists
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// Interactive card for home page
function InteractiveListCard({ 
  list, 
  isActive,
  input,
  setInput,
  addItem,
  toggle,
  remove,
  clearChecked
}: { 
  list: GroceryList
  isActive: boolean
  input: string
  setInput: (val: string) => void
  addItem: () => void
  toggle: (id: string) => void
  remove: (id: string) => void
  clearChecked: () => void
}) {
  const unchecked = list.items.filter((i) => !i.checked)
  const checked = list.items.filter((i) => i.checked)
  const total = list.items.length
  const remaining = unchecked.length

  return (
    <div 
      className={`border rounded-2xl p-6 bg-panel min-h-[400px] transition-all ${isActive ? 'border-ember' : 'border-line'}`}
      style={{ touchAction: 'pan-x' }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ink">{list.name}</h3>
      </div>



      {/* Progress */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-ink-ghost">
              {remaining === 0 ? (
                <span className="text-ember font-medium">All done!</span>
              ) : (
                `${remaining} still to get`
              )}
            </span>
            {checked.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearChecked()
                }}
                className="text-ink-ghost hover:text-ember transition-colors font-medium"
              >
                Clear {checked.length} checked
              </button>
            )}
          </div>
          <div className="w-full h-1.5 bg-page rounded-full overflow-hidden">
            <div
              className="h-full bg-ember transition-all duration-300"
              style={{ width: `${total > 0 ? ((total - remaining) / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Items - interactive */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
        {unchecked.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggle(item.id)
              }}
              className="flex-shrink-0 w-5 h-5 rounded border-2 border-line hover:border-ember transition-colors"
            />
            <span className="flex-1 text-sm text-ink">{item.text}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                remove(item.id)
              }}
              className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-ember transition-all text-sm"
            >
              ×
            </button>
          </div>
        ))}
        {checked.map((item) => (
          <div key={item.id} className="flex items-center gap-2 opacity-40 group">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggle(item.id)
              }}
              className="flex-shrink-0 w-5 h-5 rounded bg-ember border-2 border-ember flex items-center justify-center"
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <span className="flex-1 text-sm text-ink line-through">{item.text}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                remove(item.id)
              }}
              className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-ember transition-all text-sm"
            >
              ×
            </button>
          </div>
        ))}

        {/* Bottom add row - only show on active card */}
        {isActive && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-dashed border-line" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addItem()
                }
              }}
              placeholder="Add an item..."
              className="flex-1 text-sm bg-transparent border-none text-ink placeholder:text-ink-ghost focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      {total === 0 && !isActive && (
        <p className="text-xs text-ink-ghost text-center py-8">No items yet.</p>
      )}
    </div>
  )
}
