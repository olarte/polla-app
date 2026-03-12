'use client'

import Card from '../../components/Card'
import Label from '../../components/Label'

export default function DailyPage() {
  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Daily Predictions</h1>
          <p className="text-text-40 text-xs mt-0.5">Earn XP with mini-predictions</p>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-base active:scale-90 transition-transform">
            🃏
          </button>
          <button className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-base active:scale-90 transition-transform">
            🎁
          </button>
        </div>
      </div>

      {/* XP bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <Label>XP Progress — Next Pack</Label>
          <span className="text-text-70 text-xs num">0 / 100 XP</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-rarity-epic transition-all"
            style={{ width: '0%' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-text-25 text-[10px]">Pack 1: 100 XP</span>
          <span className="text-text-25 text-[10px]">0 packs earned</span>
        </div>
      </Card>

      {/* Today's matches */}
      <div>
        <Label>Today&apos;s Matches</Label>
        <Card className="mt-2 text-center py-10">
          <span className="text-3xl block mb-3">🎯</span>
          <p className="text-text-40 text-sm">No matches today</p>
          <p className="text-text-25 text-xs mt-1">
            Tournament starts June 11, 2026
          </p>
        </Card>
      </div>

      {/* Streak */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-semibold">Daily Streak</p>
            <p className="text-text-40 text-xs">Log in daily to build your streak and earn bonus XP</p>
          </div>
          <span className="num text-lg text-polla-gold ml-auto">0</span>
        </div>
      </Card>
    </div>
  )
}
