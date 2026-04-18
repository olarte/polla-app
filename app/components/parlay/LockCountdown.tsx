'use client'

import { useEffect, useState } from 'react'

interface LockCountdownProps {
  locksAt: string // ISO
  label?: string
  // Threshold in seconds to flip the digits red; default 10 minutes.
  redUnderSeconds?: number
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function LockCountdown({
  locksAt,
  label = 'Locks in',
  redUnderSeconds = 600,
}: LockCountdownProps) {
  const target = new Date(locksAt).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = Math.max(0, target - now)
  const s = Math.floor(diff / 1000)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const urgent = s > 0 && s < redUnderSeconds
  const locked = diff <= 0

  return (
    <div className="flex items-baseline justify-between">
      <span className="label">{locked ? 'Locked' : label}</span>
      <span
        className={`num text-lg ${urgent ? 'text-polla-accent-dark' : 'text-polla-success'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {locked ? '00:00:00' : `${pad(hh)}:${pad(mm)}:${pad(ss)}`}
      </span>
    </div>
  )
}
