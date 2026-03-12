'use client'

import { useState } from 'react'

interface FaqItemProps {
  question: string
  answer: string
}

export default function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-card-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-semibold text-text-70">{question}</span>
        <span
          className={`text-text-40 text-xs transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? 'max-h-60 pb-4' : 'max-h-0'
        }`}
      >
        <p className="text-sm text-text-40 leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}
