const TIERS = {
  mythic: { emoji: '🏆', label: 'Mythic' },
  diamond: { emoji: '💎', label: 'Diamond' },
  platinum: { emoji: '⭐', label: 'Platinum' },
  gold: { emoji: '🥇', label: 'Gold' },
  silver: { emoji: '🥈', label: 'Silver' },
  bronze: { emoji: '🥉', label: 'Bronze' },
} as const

type Tier = keyof typeof TIERS

interface TierBadgeProps {
  tier: Tier
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function TierBadge({
  tier,
  showLabel = false,
  size = 'md',
}: TierBadgeProps) {
  const { emoji, label } = TIERS[tier]
  const sizeMap = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }

  return (
    <span className={`inline-flex items-center gap-1 ${sizeMap[size]}`}>
      <span>{emoji}</span>
      {showLabel && (
        <span className="label text-text-40">{label}</span>
      )}
    </span>
  )
}
