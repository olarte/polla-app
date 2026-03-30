'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from './Card'
import Label from './Label'

interface Pack {
  id: string
  pack_number: number
  milestone_xp: number
  source: string
  min_rarity: string | null
  opened: boolean
  cards_awarded: string[] | null
  opened_at: string | null
}

interface RevealedCard {
  id: string
  card_number: number
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: string
}

const PACK_MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 3000]
const PACK_LABELS = ['Pack 1', 'Pack 2', 'Pack 3', 'Pack 4', 'Pack 5', 'Pack 6', 'Pack 7 (Rare+)', 'Pack 8 (Epic+)']

const RARITY_COLORS: Record<string, { border: string; glow: string; bg: string }> = {
  common: { border: 'rgba(255,255,255,0.4)', glow: 'none', bg: 'rgba(255,255,255,0.06)' },
  rare: { border: '#4FC3F7', glow: '0 0 20px rgba(79,195,247,0.5)', bg: 'rgba(79,195,247,0.1)' },
  epic: { border: '#CE93D8', glow: '0 0 20px rgba(206,147,216,0.5)', bg: 'rgba(206,147,216,0.1)' },
  legendary: { border: '#FFD700', glow: '0 0 30px rgba(255,215,0,0.6)', bg: 'rgba(255,215,0,0.15)' },
}

const RARITY_EMOJI: Record<string, string> = {
  jersey: '👕',
  moment: '⚡',
  costume: '🎭',
  golden: '✨',
}

interface PackOpeningProps {
  onBack: () => void
}

export default function PackOpening({ onBack }: PackOpeningProps) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [xp, setXp] = useState(0)
  const [packsEarned, setPacksEarned] = useState(0)
  const [loading, setLoading] = useState(true)

  // Opening state
  const [openingPack, setOpeningPack] = useState<Pack | null>(null)
  const [revealedCards, setRevealedCards] = useState<RevealedCard[]>([])
  const [revealIndex, setRevealIndex] = useState(-1) // -1 = pack animation, 0+ = card reveal
  const [isOpening, setIsOpening] = useState(false)

  const fetchPacks = useCallback(async () => {
    try {
      const res = await fetch('/api/cards/packs')
      if (res.ok) {
        const data = await res.json()
        setPacks(data.packs || [])
        setXp(data.xp || 0)
        setPacksEarned(data.packsEarned || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPacks()
  }, [fetchPacks])

  const unopenedPacks = packs.filter(p => !p.opened)
  const nextMilestone = PACK_MILESTONES.find(m => xp < m) ?? PACK_MILESTONES[PACK_MILESTONES.length - 1]
  const prevMilestone = PACK_MILESTONES.filter(m => m <= xp).pop() ?? 0
  const xpToNext = nextMilestone - xp
  const progress = nextMilestone > prevMilestone
    ? ((xp - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100

  async function handleOpenPack(pack: Pack) {
    setOpeningPack(pack)
    setRevealIndex(-1)
    setIsOpening(true)
    setRevealedCards([])

    try {
      const res = await fetch('/api/cards/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      })
      const data = await res.json()
      if (data.cards) {
        setRevealedCards(data.cards)
        // Start pack opening animation
        setTimeout(() => setRevealIndex(0), 800)
      } else {
        setIsOpening(false)
        setOpeningPack(null)
      }
    } catch {
      setIsOpening(false)
      setOpeningPack(null)
    }
  }

  function handleNextCard() {
    if (revealIndex < revealedCards.length - 1) {
      setRevealIndex(revealIndex + 1)
    } else {
      // Done revealing
      setIsOpening(false)
      setOpeningPack(null)
      setRevealedCards([])
      setRevealIndex(-1)
      fetchPacks()
    }
  }

  // Opening animation overlay
  if (isOpening && openingPack) {
    const currentCard = revealIndex >= 0 ? revealedCards[revealIndex] : null
    const isRarePlus = currentCard && (currentCard.rarity === 'rare' || currentCard.rarity === 'epic' || currentCard.rarity === 'legendary')

    return (
      <div className="fixed inset-0 z-50 bg-polla-bg flex items-center justify-center">
        {revealIndex === -1 ? (
          // Pack opening animation
          <div className="text-center animate-slide-up">
            <div className="w-32 h-44 mx-auto rounded-2xl bg-gradient-to-br from-polla-secondary to-polla-secondary-deep border-2 border-polla-accent flex items-center justify-center mb-6"
              style={{
                animation: 'pack-shake 0.5s ease-in-out infinite',
                boxShadow: '0 0 30px rgba(233,69,96,0.4)',
              }}
            >
              <span className="text-5xl">🎁</span>
            </div>
            <p className="text-text-40 text-sm">Opening pack...</p>
          </div>
        ) : currentCard ? (
          // Card reveal
          <button
            onClick={handleNextCard}
            className="text-center w-full px-8 animate-slide-up"
          >
            <div
              className="w-48 h-64 mx-auto rounded-2xl flex flex-col items-center justify-center p-4 mb-6"
              style={{
                background: `linear-gradient(135deg, ${RARITY_COLORS[currentCard.rarity].bg}, rgba(10,10,18,0.95))`,
                border: `2px solid ${RARITY_COLORS[currentCard.rarity].border}`,
                boxShadow: RARITY_COLORS[currentCard.rarity].glow,
              }}
            >
              <span className="text-5xl mb-3">
                {RARITY_EMOJI[currentCard.category] || '🃏'}
              </span>
              <h3 className="text-base font-bold">{currentCard.name}</h3>
              <p className="text-[10px] uppercase tracking-widest mt-1"
                style={{ color: RARITY_COLORS[currentCard.rarity].border }}
              >
                {currentCard.rarity}
              </p>
              <p className="text-text-70 text-xs mt-2 leading-snug">{currentCard.description}</p>
            </div>

            {/* Celebration for rare+ */}
            {isRarePlus && (
              <p className="text-polla-gold text-sm font-bold mb-3">
                {currentCard.rarity === 'legendary' ? '🌟 LEGENDARY! 🌟' :
                 currentCard.rarity === 'epic' ? '💜 EPIC! 💜' :
                 '💎 RARE! 💎'}
              </p>
            )}

            <p className="text-text-40 text-xs">
              {revealIndex < revealedCards.length - 1
                ? `Tap for next card (${revealIndex + 1}/${revealedCards.length})`
                : 'Tap to finish'}
            </p>
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-text-70 text-sm flex items-center gap-1 active:opacity-60"
        >
          ← Album
        </button>
        <h1 className="text-lg font-bold">Booster Packs</h1>
        <div className="w-16" /> {/* spacer */}
      </div>

      {/* Current XP Display */}
      <div className="text-center">
        <Label>Your XP</Label>
        <p className="num text-4xl text-polla-accent mt-1">{xp.toLocaleString()}</p>
      </div>

      {/* Progress Bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-40 text-[10px] num">{prevMilestone} XP</span>
          <span className="text-text-40 text-[10px] num">{nextMilestone} XP</span>
        </div>
        <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-rarity-epic transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {xpToNext > 0 && (
          <p className="text-center text-text-70 text-xs mt-2">
            <span className="num text-polla-accent">{xpToNext}</span> XP to next pack
          </p>
        )}
      </Card>

      {/* Available Packs */}
      {unopenedPacks.length > 0 && (
        <div>
          <Label>Available Packs</Label>
          <div className="space-y-2 mt-2">
            {unopenedPacks.map(pack => (
              <button
                key={pack.id}
                onClick={() => handleOpenPack(pack)}
                className="w-full"
              >
                <Card glow className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎁</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold">
                        {PACK_LABELS[pack.pack_number - 1] || `Pack ${pack.pack_number}`}
                      </p>
                      <p className="text-text-40 text-[10px]">
                        {pack.min_rarity
                          ? `${pack.min_rarity.charAt(0).toUpperCase() + pack.min_rarity.slice(1)}+ guaranteed`
                          : '3 random cards'}
                      </p>
                    </div>
                  </div>
                  <span className="text-polla-accent text-sm font-bold">Open →</span>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pack Timeline */}
      <div>
        <Label>Pack Milestones</Label>
        <div className="mt-3 space-y-0">
          {PACK_MILESTONES.map((milestone, i) => {
            const isUnlocked = xp >= milestone
            const isCurrent = !isUnlocked && (i === 0 || xp >= PACK_MILESTONES[i - 1])
            const pack = packs.find(p => p.pack_number === i + 1)
            const isOpened = pack?.opened ?? false

            return (
              <div key={milestone} className="flex items-start gap-3 relative">
                {/* Vertical line */}
                {i < PACK_MILESTONES.length - 1 && (
                  <div className="absolute left-[11px] top-6 w-0.5 h-full bg-white/[0.06]"
                    style={isUnlocked ? { background: 'linear-gradient(to bottom, #E94560, rgba(255,255,255,0.06))' } : {}}
                  />
                )}

                {/* Icon */}
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  isOpened ? 'bg-polla-success/20 text-polla-success' :
                  isUnlocked ? 'bg-polla-accent/20 text-polla-accent' :
                  isCurrent ? 'bg-polla-gold/20 text-polla-gold' :
                  'bg-white/[0.04] text-text-25'
                }`}>
                  {isOpened ? '✓' : isUnlocked ? '🎁' : isCurrent ? '🎁' : '🔒'}
                </div>

                {/* Content */}
                <div className="pb-5 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${
                      isUnlocked || isCurrent ? 'text-white' : 'text-text-25'
                    }`}>
                      {PACK_LABELS[i]}
                    </p>
                    <span className={`num text-xs ${
                      isUnlocked ? 'text-polla-success' :
                      isCurrent ? 'text-polla-gold' :
                      'text-text-25'
                    }`}>
                      {milestone.toLocaleString()} XP
                    </span>
                  </div>
                  {isOpened && (
                    <p className="text-polla-success text-[10px] mt-0.5">Opened</p>
                  )}
                  {isCurrent && (
                    <p className="text-polla-gold text-[10px] mt-0.5">
                      {milestone - xp} XP remaining
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {loading && (
        <Card className="text-center py-8">
          <p className="text-text-40 text-sm">Loading packs...</p>
        </Card>
      )}
    </div>
  )
}
