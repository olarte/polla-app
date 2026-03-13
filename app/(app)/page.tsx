'use client'

import Link from 'next/link'
import Card from '../components/Card'
import Label from '../components/Label'
import TierBadge from '../components/TierBadge'
import WhatsAppBtn from '../components/WhatsAppBtn'

// Mock data — will be replaced with real data later
const MOCK_USER = {
  avatar_emoji: '🦁',
  display_name: 'Daniel',
  balance: 42.50,
  tier: 'silver' as const,
  tier_percentile: 32,
  total_xp: 385,
  packs_earned: 3,
  cards_collected: 14,
  streak_days: 5,
  prediction_progress: 23,
  rank: 1247,
}

const MOCK_POLLAS = [
  { id: '1', name: 'Office Polla', members: 8, type: 'paid', entry: 10, progress: 45 },
  { id: '2', name: 'Family Cup', members: 12, type: 'free', entry: 0, progress: 67 },
]

const NEXT_PACK_XP = 500
const NEXT_MATCH = {
  teamA: '🇦🇷 Argentina',
  teamB: '🇫🇷 France',
  group: 'Group C',
  date: new Date('2026-06-12T18:00:00'),
}

function getCountdown(target: Date) {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  return { days, hours, mins }
}

export default function HomePage() {
  const user = MOCK_USER
  const countdown = getCountdown(NEXT_MATCH.date)
  const xpToNext = NEXT_PACK_XP - user.total_xp
  const xpProgress = Math.min((user.total_xp / NEXT_PACK_XP) * 100, 100)

  return (
    <div className="px-4 pt-4 space-y-5 pb-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight">POLLA</span>
        </div>
        <Link href="/profile" className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-card-border">
            <span className="num text-xs">${user.balance.toFixed(2)}</span>
          </div>
          <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-lg">
            {user.avatar_emoji}
          </div>
        </Link>
      </div>

      {/* ── Predict the World Cup CTA ── */}
      <Card glow className="text-center">
        <p className="text-lg font-bold mb-1">Predict the World Cup</p>
        <p className="text-text-40 text-sm mb-3">
          104 matches. Predict every score. Climb the leaderboard.
        </p>
        <div className="flex items-center justify-between mb-2">
          <Label>Progress</Label>
          <span className="text-text-70 text-xs num">{user.prediction_progress}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
            style={{ width: `${user.prediction_progress}%` }}
          />
        </div>
        <button className="mt-4 w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform">
          Continue Predicting
        </button>
      </Card>

      {/* ── Global Pool Card ── */}
      <Card glow>
        <Label>La Gran Polla — Global Prize Pool</Label>
        <p className="num text-3xl text-polla-gold mt-1">$228,456</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <TierBadge tier={user.tier} size="sm" />
            <span className="text-text-40 text-xs">
              {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} · Top {user.tier_percentile}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-text-40 text-xs">Rank </span>
            <span className="num text-sm">#{user.rank}</span>
          </div>
        </div>
        <div className="mt-2 text-text-40 text-xs">
          Grand Prize: <span className="text-polla-gold num">$34,268</span>
        </div>
      </Card>

      {/* ── Next Match Countdown ── */}
      {countdown && (
        <Card>
          <Label>Next Match</Label>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold">{NEXT_MATCH.teamA} vs {NEXT_MATCH.teamB}</span>
            <span className="text-text-40 text-xs">{NEXT_MATCH.group}</span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="text-center">
              <p className="num text-xl">{countdown.days}</p>
              <Label>Days</Label>
            </div>
            <span className="text-text-25 text-lg num">:</span>
            <div className="text-center">
              <p className="num text-xl">{countdown.hours}</p>
              <Label>Hrs</Label>
            </div>
            <span className="text-text-25 text-lg num">:</span>
            <div className="text-center">
              <p className="num text-xl">{countdown.mins}</p>
              <Label>Min</Label>
            </div>
          </div>
        </Card>
      )}

      {/* ── XP Summary ── */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Label>Total XP</Label>
            <p className="num text-xl mt-0.5">{user.total_xp}</p>
          </div>
          <div className="text-center">
            <Label>Packs Earned</Label>
            <p className="num text-xl mt-0.5">{user.packs_earned}</p>
          </div>
          <div className="text-right">
            <Label>Cards</Label>
            <p className="num text-xl mt-0.5">{user.cards_collected}/85</p>
          </div>
        </div>

        {/* Next pack progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <Label>Next Pack</Label>
            <span className="text-text-40 text-[10px]">{xpToNext > 0 ? `${xpToNext} XP to go` : 'Ready!'}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-polla-warning to-polla-gold transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        <p className="text-text-25 text-[10px] mt-3">
          XP earned from Daily Predictions + Polla Contest Predictions
        </p>
      </Card>

      {/* ── My Pollas ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>My Pollas</Label>
          <div className="flex items-center gap-3">
            <button className="text-text-40 text-xs underline underline-offset-2">Join with code</button>
            <button className="text-polla-accent text-xs font-semibold">+ Create</button>
          </div>
        </div>

        {MOCK_POLLAS.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-text-40 text-sm">No groups yet</p>
            <p className="text-text-25 text-xs mt-1">Create or join a polla to compete</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {MOCK_POLLAS.map((polla) => (
              <Link key={polla.id} href="/pollas">
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{polla.name}</p>
                    <p className="text-text-40 text-xs mt-0.5">
                      {polla.members} members · {polla.type === 'free' ? 'Free' : `$${polla.entry} entry`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark"
                          style={{ width: `${polla.progress}%` }}
                        />
                      </div>
                      <span className="num text-[10px] text-text-40">{polla.progress}%</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Share ── */}
      <div className="flex justify-center">
        <WhatsAppBtn
          text="Invite Friends"
          message="Join me on Polla Football! Predict the World Cup 2026 🐔⚽ https://polla.football"
        />
      </div>
    </div>
  )
}
