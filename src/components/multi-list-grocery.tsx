'use client'

import { useState, useEffect, useRef } from 'react'

type GroceryItem = { id: string; text: string; checked: boolean }
type GroceryList = { id: string; name: string; items: GroceryItem[] }

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function MultiListGrocery({ initialLists }: { initialLists: GroceryList[] }) {
  const [lists, setLists] = useState<GroceryList[]>(initialLists.length > 0 ? initialLists : [{ id: uid(), name: 'Main list', items: [] }])
  const [activeIndex, setActiveIndex] = useState(0)
  const [input, setInput] = useState('')
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

  function toggle(id: string) {
    setLists((prev) => {
      const next = [...prev]
      const list = next[activeIndex]
      const item = list.items.find((i) => i.id === id)
      if (item) item.checked = !item.checked
      return next
    })
  }

  function remove(id: string) {
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

  function addNewList() {
    setLists((prev) => [...prev, { id: uid(), name: `List ${prev.length + 1}`, items: [] }])
    setActiveIndex(lists.length)
  }

  function renameList(index: number, name: string) {
    setLists((prev) => {
      const next = [...prev]
      next[index].name = name
      return next
    })
  }

  function deleteList(index: number) {
    if (lists.length === 1) return // Can't delete the last list
    setLists((prev) => prev.filter((_, i) => i !== index))
    if (activeIndex >= index && activeIndex > 0) setActiveIndex(activeIndex - 1)
  }

  const currentList = lists[activeIndex]
  const unchecked = currentList.items.filter((i) => !i.checked)
  const checked = currentList.items.filter((i) => i.checked)
  const total = currentList.items.length
  const remaining = unchecked.length

  return (
    <div>
      {/* Mobile: Horizontal swiper */}
      <div className="md:hidden">
        <div className="overflow-x-auto scrollbar-none -mx-6 px-6 snap-x snap-mandatory">
          <div className="flex gap-4">
            {lists.map((list, idx) => (
              <div
                key={list.id}
                className="flex-shrink-0 w-[calc(100vw-3rem)] snap-center"
              >
                <ListCard
                  list={list}
                  isActive={idx === activeIndex}
                  input={input}
                  setInput={setInput}
                  addItem={addItem}
                  toggle={toggle}
                  remove={remove}
                  clearChecked={clearChecked}
                  rename={(name) => renameList(idx, name)}
                  deleteList={lists.length > 1 ? () => deleteList(idx) : undefined}
                  onClick={() => setActiveIndex(idx)}
                />
              </div>
            ))}
            <div className="flex-shrink-0 w-[calc(100vw-3rem)] snap-center">
              <button
                onClick={addNewList}
                className="w-full h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-line rounded-2xl text-ink-ghost hover:border-ember hover:text-ember transition-colors"
              >
                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-sm font-medium">Add list</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {lists.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveIndex(idx)
                // Scroll to the card
                const container = document.querySelector('.overflow-x-auto')
                const card = container?.children[0]?.children[idx] as HTMLElement
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === activeIndex ? 'bg-ember' : 'bg-line'
              }`}
              aria-label={`Go to list ${idx + 1}`}
            />
          ))}
          <div className="w-2 h-2 rounded-full bg-line opacity-50" />
        </div>
      </div>

      {/* Desktop: Tabs */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 border-b border-line mb-6">
          {lists.map((list, idx) => (
            <button
              key={list.id}
              onClick={() => setActiveIndex(idx)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                idx === activeIndex
                  ? 'border-ember text-ember'
                  : 'border-transparent text-ink-ghost hover:text-ink'
              }`}
            >
              {list.name}
            </button>
          ))}
          <button
            onClick={addNewList}
            className="px-4 py-2 text-sm font-medium text-ink-ghost hover:text-ember transition-colors"
          >
            + Add list
          </button>
        </div>

        <ListCard
          list={currentList}
          isActive
          input={input}
          setInput={setInput}
          addItem={addItem}
          toggle={toggle}
          remove={remove}
          clearChecked={clearChecked}
          rename={(name) => renameList(activeIndex, name)}
          deleteList={lists.length > 1 ? () => deleteList(activeIndex) : undefined}
        />
      </div>
    </div>
  )
}

function ListCard({
  list,
  isActive,
  input,
  setInput,
  addItem,
  toggle,
  remove,
  clearChecked,
  rename,
  deleteList,
  onClick,
}: {
  list: GroceryList
  isActive: boolean
  input: string
  setInput: (val: string) => void
  addItem: () => void
  toggle: (id: string) => void
  remove: (id: string) => void
  clearChecked: () => void
  rename: (name: string) => void
  deleteList?: () => void
  onClick?: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(list.name)

  const unchecked = list.items.filter((i) => !i.checked)
  const checked = list.items.filter((i) => i.checked)
  const total = list.items.length
  const remaining = unchecked.length

  function saveName() {
    if (editName.trim()) {
      rename(editName.trim())
    } else {
      setEditName(list.name)
    }
    setIsEditing(false)
  }

  return (
    <div onClick={onClick} className={`border border-line rounded-2xl p-6 bg-panel ${onClick ? 'cursor-pointer' : ''}`}>
      {/* Header with editable name */}
      <div className="flex items-center justify-between mb-4">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            autoFocus
            className="flex-1 text-lg font-semibold text-ink bg-page border border-line rounded px-2 py-1 focus:outline-none focus:border-ember"
          />
        ) : (
          <h3
            onClick={(e) => {
              e.stopPropagation()
              if (isActive) setIsEditing(true)
            }}
            className="text-lg font-semibold text-ink cursor-pointer hover:text-ember"
          >
            {list.name}
          </h3>
        )}
        {deleteList && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Delete "${list.name}"?`)) deleteList()
            }}
            className="text-ink-ghost hover:text-ember text-xs"
          >
            Delete
          </button>
        )}
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

      {/* Items */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
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
