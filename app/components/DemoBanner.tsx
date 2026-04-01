'use client'

import { useState } from 'react'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || dismissed) return null

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between px-3 py-1.5 bg-polla-warning/15 border-b border-polla-warning/25 text-polla-warning text-[11px] font-semibold">
      <span>Demo Mode — Test Data</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}
