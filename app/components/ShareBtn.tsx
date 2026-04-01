'use client'

import { useState } from 'react'
import type { ShareOptions } from '../../lib/share'

interface ShareBtnProps {
  options: ShareOptions
  text?: string
  variant?: 'whatsapp' | 'default'
  className?: string
}

export default function ShareBtn({
  options,
  text = 'Share',
  variant = 'default',
  className = '',
}: ShareBtnProps) {
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)

    try {
      const { share } = await import('../../lib/share')
      await share(options)
    } finally {
      setSharing(false)
    }
  }

  const baseStyles =
    variant === 'whatsapp'
      ? 'bg-polla-whatsapp/[0.15] border border-polla-whatsapp/[0.33] text-polla-whatsapp'
      : 'bg-white/[0.03] border border-white/[0.06] text-text-70'

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
        active:scale-95 transition-transform duration-100 disabled:opacity-50
        ${baseStyles} ${className}`}
    >
      <span className="text-base">{variant === 'whatsapp' ? '💬' : '📤'}</span>
      {sharing ? 'Sharing…' : text}
    </button>
  )
}
