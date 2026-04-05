'use client'

import Link from 'next/link'
import { SignInButton, UserButton, Show } from '@clerk/nextjs'
import { useTheme } from './theme-provider'

export function Navbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 border-b border-line backdrop-blur-sm bg-page/80">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-ink hover:text-ember transition-colors"
        >
          Cookbookverse
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/explore" className="text-sm text-ink-dim hover:text-ink transition-colors">
            Explore
          </Link>
          <Link href="/collections" className="text-sm text-ink-dim hover:text-ink transition-colors">
            Collections
          </Link>
          <Link href="/ai" className="text-sm text-ink-dim hover:text-ink transition-colors">
            Ask AI
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-line bg-panel hover:bg-panel-raised text-ink-dim hover:text-ink transition-colors"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="hidden md:inline-flex text-sm font-medium bg-ember text-white px-4 py-2 rounded-full hover:bg-ember-deep transition-colors">
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </Show>
        </div>

      </div>
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
