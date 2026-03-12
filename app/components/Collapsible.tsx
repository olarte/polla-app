'use client'

import { useState, ReactNode } from 'react'

interface CollapsibleProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export default function Collapsible({
  title,
  children,
  defaultOpen = false,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-card-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1"
      >
        <span className="label">{title}</span>
        <span
          className={`text-text-40 text-xs transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-[1000px] pb-4' : 'max-h-0'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
