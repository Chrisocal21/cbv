'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useTheme } from './theme-provider'

const NAV_LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/grocery-list', label: 'Grocery list' },
  { href: '/ai', label: 'Ask AI' },
]

const MOBILE_NAV = [
  { 
    href: '/', 
    label: 'Home',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )
  },
  { 
    href: '/grocery-list', 
    label: 'List',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    )
  },
  { 
    href: '/ai', 
    label: 'AI',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    )
  },
  { 
    href: '/profile', 
    label: 'Profile',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    )
  },
]

export function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { isSignedIn } = useUser()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQ.trim()) {
      router.push(`/explore?search=${encodeURIComponent(searchQ.trim())}`)
      setSearchOpen(false)
      setSearchQ('')
    }
  }

  return (
    <>
      {/* Top navbar */}
      <header className="sticky top-0 z-50 border-b border-line backdrop-blur-sm bg-page/80" data-print-hide>
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-ink hover:text-ember transition-colors"
          >
            Cookbookverse
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-ink-dim hover:text-ink transition-colors">
                {l.label}
              </Link>
            ))}
            {isSignedIn && (
              <Link href="/profile" className="text-sm text-ink-dim hover:text-ink transition-colors">
                Profile
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && (setSearchOpen(false), setSearchQ(''))}
                  placeholder="Search recipes…"
                  className="w-48 md:w-64 px-3 py-1.5 text-sm bg-panel border border-line rounded-full text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                />
                <button type="button" onClick={() => (setSearchOpen(false), setSearchQ(''))} className="text-ink-ghost hover:text-ink transition-colors">
                  <CloseIcon />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-line bg-panel hover:bg-panel-raised text-ink-dim hover:text-ink transition-colors"
              >
                <SearchIcon />
              </button>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-full border border-line bg-panel hover:bg-panel-raised text-ink-dim hover:text-ink transition-colors"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {!isSignedIn && (
              <SignInButton mode="modal">
                <button className="hidden md:inline-flex text-sm font-medium bg-ember text-white px-4 py-2 rounded-full hover:bg-ember-deep transition-colors">
                  Sign in
                </button>
              </SignInButton>
            )}
            {isSignedIn && (
              <>
                <div className="hidden md:block">
                  <NotificationBell />
                </div>
                <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-page/95 backdrop-blur-sm pb-safe" data-print-hide>
        <div className="flex items-center justify-around h-16 px-2">
          {MOBILE_NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 ${
                  isActive ? 'text-ember' : 'text-ink-ghost'
                }`}
              >
                {item.icon(isActive)}
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

type Notification = {
  id: string
  type: string
  message: string
  recipeSlug: string | null
  read: boolean
  createdAt: string
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/user/notifications')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setNotifs(data.notifications)
          setUnread(data.unreadCount)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!open && unread > 0) {
      await fetch('/api/user/notifications', { method: 'PATCH' })
      setUnread(0)
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center rounded-full border border-line bg-panel hover:bg-panel-raised text-ink-dim hover:text-ink transition-colors"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-ember" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-panel border border-line rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-sm font-semibold text-ink">Notifications</p>
          </div>
          {notifs.length === 0 ? (
            <p className="text-xs text-ink-ghost px-4 py-4">Nothing yet. Check back after your first recipe is saved.</p>
          ) : (
            <ul className="divide-y divide-line max-h-72 overflow-y-auto">
              {notifs.map((n) => (
                <li key={n.id}>
                  {n.recipeSlug ? (
                    <a
                      href={`/recipe/${n.recipeSlug}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-page transition-colors"
                    >
                      <p className="text-sm text-ink leading-snug">{n.message}</p>
                      <p className="text-xs text-ink-ghost mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </a>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-sm text-ink leading-snug">{n.message}</p>
                      <p className="text-xs text-ink-ghost mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
