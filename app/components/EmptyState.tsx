'use client'

interface EmptyStateProps {
  emoji: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({
  emoji,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      {description && (
        <p className="text-text-40 text-sm max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="mt-3 text-text-40 text-xs underline underline-offset-2 hover:text-text-70 transition-colors"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  )
}

// Pre-built empty states
export function EmptyPollas({ onCreateFirst, onJoinWithLink }: { onCreateFirst: () => void; onJoinWithLink?: () => void }) {
  return (
    <EmptyState
      emoji="⛱️"
      title="No Pools Yet"
      description="Create your first pool and invite friends to predict the World Cup together!"
      action={{ label: 'Create Your First Pool', onClick: onCreateFirst }}
      secondaryAction={onJoinWithLink ? { label: 'or join one with an invite link', onClick: onJoinWithLink } : undefined}
    />
  )
}

export function EmptyPredictions({ onStartPredicting }: { onStartPredicting: () => void }) {
  return (
    <EmptyState
      emoji="🎯"
      title="Start Predicting"
      description="Make your World Cup predictions and earn points for accurate results"
      action={{ label: 'Make Predictions', onClick: onStartPredicting }}
    />
  )
}

export function EmptyCards() {
  return (
    <EmptyState
      emoji="🃏"
      title="No Cards Yet"
      description="Earn XP through daily predictions and logins to unlock booster packs"
    />
  )
}

export function EmptyBets({ onPlaceBet }: { onPlaceBet?: () => void }) {
  return (
    <EmptyState
      emoji="🎲"
      title="No Bets Yet"
      description="Place your first bet on today's matches"
      action={onPlaceBet ? { label: 'Place a Bet', onClick: onPlaceBet } : undefined}
    />
  )
}

export function EmptyMatches({ nextMatchDate }: { nextMatchDate?: string } = {}) {
  return (
    <EmptyState
      emoji="⚽"
      title="No Matches Today"
      description={nextMatchDate ? `Next match: ${nextMatchDate}` : 'Check back tomorrow for new matches to predict'}
    />
  )
}

export function EmptyLeaderboard() {
  return (
    <EmptyState
      emoji="🏆"
      title="Leaderboard Coming Soon"
      description="Complete your predictions — rankings update once matches begin"
    />
  )
}
