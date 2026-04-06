'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useTheme } from './theme-provider'

const NAV_LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/collections', label: 'Collections' },
  { href: '/ai', label: 'Ask AI' },
  { href: '/fridge', label: 'My fridge' },
  { href: '/submit', label: 'Submit' },
]

export function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { isSignedIn } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const router = useRouter()

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQ.trim()) {
      router.push(`/explore?search=${encodeURIComponent(searchQ.trim())}`)
      setSearchOpen(false)
      setSearchQ('')
    }
  }

  return (
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
              My kitchen
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
            className="w-9 h-9 flex items-center justify-center rounded-full border border-line bg-panel hover:bg-panel-raised text-ink-dim hover:text-ink transition-colors"
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
            <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full border border-line bg-panel text-ink-dim hover:text-ink transition-colors"
          >
            {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-page/95 backdrop-blur-sm px-6 py-4 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm text-ink-dim hover:text-ink transition-colors"
            >
              {l.label}
            </Link>
          ))}
          {isSignedIn && (
            <Link href="/profile" onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm text-ink-dim hover:text-ink transition-colors">
              My kitchen
            </Link>
          )}
          {!isSignedIn && (
            <SignInButton mode="modal">
              <button className="mt-2 w-full text-sm font-medium bg-ember text-white px-4 py-2.5 rounded-full hover:bg-ember-deep transition-colors">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      )}
    </header>
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
