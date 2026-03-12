'use client'

import Card from '../components/Card'
import Label from '../components/Label'
import TierBadge from '../components/TierBadge'
import WhatsAppBtn from '../components/WhatsAppBtn'

export default function HomePage() {
  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-lg">
            ⚽
          </div>
          <div>
            <p className="text-sm font-bold">Polla Football</p>
            <p className="text-text-40 text-xs">World Cup 2026</p>
          </div>
        </div>
        <div className="text-right">
          <p className="num text-sm">$0.00</p>
          <Label>Balance</Label>
        </div>
      </div>

      {/* Global Pool Card */}
      <Card glow>
        <Label>La Gran Polla — Global Prize Pool</Label>
        <p className="num text-3xl text-polla-gold mt-1">$228,456</p>
        <div className="flex items-center gap-2 mt-2">
          <TierBadge tier="bronze" size="sm" />
          <span className="text-text-40 text-xs">Your tier</span>
        </div>
      </Card>

      {/* Predict CTA */}
      <Card glow className="text-center">
        <p className="text-lg font-bold mb-1">Predict the World Cup</p>
        <p className="text-text-40 text-sm mb-3">
          104 matches. Predict every score. Climb the leaderboard.
        </p>
        <div className="flex items-center justify-between mb-3">
          <Label>Progress</Label>
          <span className="text-text-70 text-xs num">0%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
            style={{ width: '0%' }}
          />
        </div>
        <button className="mt-4 w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform">
          Start Predicting
        </button>
      </Card>

      {/* XP Summary */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Label>Total XP</Label>
            <p className="num text-xl mt-0.5">0</p>
          </div>
          <div className="text-right">
            <Label>Streak</Label>
            <p className="num text-xl mt-0.5">0 days</p>
          </div>
        </div>
      </Card>

      {/* My Pollas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>My Pollas</Label>
          <button className="text-polla-accent text-xs font-semibold">+ Create</button>
        </div>
        <Card className="text-center py-8">
          <p className="text-text-40 text-sm">No groups yet</p>
          <p className="text-text-25 text-xs mt-1">Create or join a polla to compete</p>
        </Card>
      </div>

      {/* Share */}
      <div className="flex justify-center">
        <WhatsAppBtn
          text="Invite Friends"
          message="Join me on Polla Football! Predict the World Cup 2026 🐔⚽ https://polla.football"
        />
      </div>
    </div>
  )
}
