'use client'

import Card from '../../components/Card'
import Label from '../../components/Label'
import TierBadge from '../../components/TierBadge'

const PRIZE_LADDER = [
  { icon: '🏆', label: 'Champion', pct: '15%', players: 1 },
  { icon: '💎', label: 'Top 5', pct: '20%', players: 4 },
  { icon: '⭐', label: 'Top 20', pct: '25%', players: 15 },
  { icon: '🥇', label: 'Top 100', pct: '25%', players: 80 },
  { icon: '🥈', label: 'Top 500', pct: '15%', players: 400 },
]

const TIERS = [
  { tier: 'mythic' as const, percentile: 'Top 0.1%', color: 'text-polla-gold' },
  { tier: 'diamond' as const, percentile: 'Top 1%', color: 'text-rarity-rare' },
  { tier: 'platinum' as const, percentile: 'Top 5%', color: 'text-rarity-epic' },
  { tier: 'gold' as const, percentile: 'Top 15%', color: 'text-polla-gold' },
  { tier: 'silver' as const, percentile: 'Top 40%', color: 'text-polla-silver' },
  { tier: 'bronze' as const, percentile: 'Everyone', color: 'text-polla-bronze' },
]

export default function GlobalPage() {
  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Header */}
      <h1 className="text-xl font-bold">Global Leaderboard</h1>

      {/* Your position */}
      <Card glow>
        <Label>Your Position</Label>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-lg">
              ⚽
            </div>
            <div>
              <p className="text-sm font-bold">Unranked</p>
              <p className="text-text-40 text-xs">Complete predictions to rank</p>
            </div>
          </div>
          <TierBadge tier="bronze" size="lg" showLabel />
        </div>
      </Card>

      {/* Prize Ladder */}
      <div>
        <Label>Prize Ladder</Label>
        <Card className="mt-2 space-y-0">
          {PRIZE_LADDER.map((row, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-3 ${
                i < PRIZE_LADDER.length - 1 ? 'border-b border-card-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{row.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-text-70">{row.label}</p>
                  <p className="text-text-35 text-[10px]">
                    {row.players} {row.players === 1 ? 'player' : 'players'}
                  </p>
                </div>
              </div>
              <span className="num text-sm text-polla-gold">{row.pct}</span>
            </div>
          ))}
        </Card>
        <p className="text-text-25 text-[10px] text-center mt-2">
          10% reserved for stage bonuses (Group → Final multipliers)
        </p>
      </div>

      {/* Tier Distribution */}
      <div>
        <Label>Tier Distribution</Label>
        <Card className="mt-2">
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            <div className="bg-polla-gold" style={{ width: '0.1%', minWidth: '4px' }} />
            <div className="bg-rarity-rare" style={{ width: '0.9%', minWidth: '4px' }} />
            <div className="bg-rarity-epic" style={{ width: '4%', minWidth: '8px' }} />
            <div className="bg-polla-gold/70" style={{ width: '10%' }} />
            <div className="bg-polla-silver" style={{ width: '25%' }} />
            <div className="bg-polla-bronze flex-1" />
          </div>
          {/* Breakdown */}
          <div className="space-y-2.5">
            {TIERS.map((t) => (
              <div key={t.tier} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TierBadge tier={t.tier} size="sm" />
                  <span className="text-text-70 text-xs font-semibold capitalize">{t.tier}</span>
                </div>
                <span className={`text-xs num ${t.color}`}>{t.percentile}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
