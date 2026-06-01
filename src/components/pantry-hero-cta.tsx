'use client'

import { SignInButton } from '@clerk/nextjs'

/** Primary CTA for the signed-out pantry hero — opens Clerk sign-in modal. */
export function PantryHeroCta() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <SignInButton mode="modal">
        <button className="inline-flex items-center px-6 py-3 rounded-full bg-ember text-white font-medium hover:bg-ember-deep transition-colors">
          Build your kitchen list
        </button>
      </SignInButton>
      <a
        href="/explore"
        className="inline-flex items-center px-6 py-3 rounded-full border border-line text-ink font-medium hover:bg-panel transition-colors"
      >
        Browse the library
      </a>
    </div>
  )
}
