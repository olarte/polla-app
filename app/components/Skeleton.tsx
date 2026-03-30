'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'card' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
  count?: number
}

function SkeletonBase({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`}
    />
  )
}

export default function Skeleton({
  className = '',
  variant = 'rect',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  const variantClass = {
    text: 'h-4 rounded',
    card: 'h-28 rounded-xl',
    circle: 'rounded-full',
    rect: 'rounded-lg',
  }[variant]

  if (count > 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBase key={i} className={variantClass} />
        ))}
      </div>
    )
  }

  return <SkeletonBase className={`${variantClass} ${className}`} />
}

// Pre-built skeleton patterns
export function SkeletonMatchCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex justify-between items-center">
        <SkeletonBase className="h-4 w-20 rounded" />
        <SkeletonBase className="h-4 w-16 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-8 w-8 rounded-full" />
          <SkeletonBase className="h-4 w-24 rounded" />
        </div>
        <SkeletonBase className="h-8 w-12 rounded" />
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-4 w-24 rounded" />
          <SkeletonBase className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonPollaCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBase className="h-4 w-32 rounded" />
          <SkeletonBase className="h-3 w-20 rounded" />
        </div>
      </div>
      <SkeletonBase className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <SkeletonBase className="h-3 w-16 rounded" />
        <SkeletonBase className="h-3 w-16 rounded" />
      </div>
    </div>
  )
}

export function SkeletonLeaderboardRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <SkeletonBase className="h-6 w-6 rounded" />
      <SkeletonBase className="h-8 w-8 rounded-full" />
      <SkeletonBase className="h-4 w-28 rounded flex-1" />
      <SkeletonBase className="h-4 w-12 rounded" />
    </div>
  )
}

export function SkeletonProfileHeader() {
  return (
    <div className="flex flex-col items-center space-y-3 py-4">
      <SkeletonBase className="h-14 w-14 rounded-full" />
      <SkeletonBase className="h-5 w-32 rounded" />
      <SkeletonBase className="h-4 w-20 rounded" />
    </div>
  )
}
