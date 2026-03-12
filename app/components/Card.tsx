import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  glow?: boolean
  className?: string
  padding?: boolean
}

export default function Card({
  children,
  glow = false,
  className = '',
  padding = true,
}: CardProps) {
  return (
    <div
      className={`${glow ? 'glow-card' : 'glass-card'} ${
        padding ? 'p-4' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
