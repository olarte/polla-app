'use client'

import { useState, useEffect } from 'react'
import Card from './Card'
import Label from './Label'

interface CollectibleCard {
  id: string
  card_number: number
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: string
  country_code: string | null
}

interface CardAlbumProps {
  onBack: () => void
  onOpenPacks: () => void
  unopenedCount: number
}

const RARITY_COLORS = {
  common: { border: 'rgba(255,255,255,0.4)', glow: 'none', bg: 'rgba(255,255,255,0.06)' },
  rare: { border: '#4FC3F7', glow: '0 0 12px rgba(79,195,247,0.4)', bg: 'rgba(79,195,247,0.08)' },
  epic: { border: '#CE93D8', glow: '0 0 12px rgba(206,147,216,0.4)', bg: 'rgba(206,147,216,0.08)' },
  legendary: { border: '#FFD700', glow: '0 0 20px rgba(255,215,0,0.5)', bg: 'rgba(255,215,0,0.1)' },
}

const RARITY_EMOJI: Record<string, string> = {
  jersey: '👕',
  moment: '⚡',
  costume: '🎭',
  golden: '✨',
}

const FILTERS = ['all', 'common', 'rare', 'epic', 'legendary'] as const

export default function CardAlbum({ onBack, onOpenPacks, unopenedCount }: CardAlbumProps) {
  const [cards, setCards] = useState<CollectibleCard[]>([])
  const [owned, setOwned] = useState<Record<string, number>>({})
  const [uniqueOwned, setUniqueOwned] = useState(0)
  const [total, setTotal] = useState(85)
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<CollectibleCard | null>(null)

  useEffect(() => {
    fetch('/api/cards')
      .then(r => r.json())
      .then(data => {
        setCards(data.cards || [])
        setOwned(data.owned || {})
        setUniqueOwned(data.uniqueOwned || 0)
        setTotal(data.total || 85)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? cards : cards.filter(c => c.rarity === filter)

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-text-70 text-sm flex items-center gap-1 active:opacity-60"
        >
          ← Daily
        </button>
        <button
          onClick={onOpenPacks}
          className="relative px-3 py-1.5 rounded-xl bg-card border border-card-border text-sm flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          🎁 {unopenedCount} Packs
          {unopenedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-polla-accent text-[9px] num flex items-center justify-center">
              {unopenedCount}
            </span>
          )}
        </button>
      </div>

      {/* Collection Counter */}
      <div className="text-center">
        <h1 className="text-xl font-bold">Card Album</h1>
        <p className="text-text-70 text-sm mt-1">
          <span className="num text-white">{uniqueOwned}</span>
          <span className="text-text-40"> / </span>
          <span className="num text-white">{total}</span>
          <span className="text-text-40"> cards</span>
        </p>
        {/* Progress bar */}
        <div className="w-48 mx-auto h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-gold transition-all"
            style={{ width: `${total > 0 ? (uniqueOwned / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Rarity Filters */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-polla-accent text-white'
                : 'bg-card border border-card-border text-text-40'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-1 text-[10px] opacity-60">
                {cards.filter(c => c.rarity === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      {loading ? (
        <Card className="text-center py-10">
          <p className="text-text-40 text-sm">Loading collection...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {filtered.map(card => {
            const isOwned = !!owned[card.id]
            const count = owned[card.id] || 0
            const colors = RARITY_COLORS[card.rarity]

            return (
              <button
                key={card.id}
                onClick={() => isOwned ? setSelectedCard(card) : null}
                className={`relative rounded-xl p-0.5 transition-transform ${
                  isOwned ? 'active:scale-95' : 'opacity-30'
                } ${card.rarity === 'legendary' && isOwned ? 'animate-legendary-pulse' : ''}`}
                style={{
                  background: isOwned
                    ? `linear-gradient(135deg, ${colors.bg}, transparent)`
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOwned ? colors.border : 'rgba(255,255,255,0.04)'}`,
                  boxShadow: isOwned ? colors.glow : 'none',
                  borderRadius: 12,
                }}
              >
                <div className="aspect-[3/4] rounded-[10px] flex flex-col items-center justify-center p-2 relative overflow-hidden">
                  {/* Card content */}
                  {isOwned ? (
                    <>
                      <span className="text-2xl mb-1">
                        {RARITY_EMOJI[card.category] || '🃏'}
                      </span>
                      <p className="text-[9px] font-semibold text-center leading-tight line-clamp-2">
                        {card.name}
                      </p>
                      <p className="text-[8px] mt-0.5 uppercase tracking-wider"
                        style={{ color: colors.border }}
                      >
                        {card.rarity}
                      </p>
                      {/* Duplicate badge */}
                      {count > 1 && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-polla-secondary text-[8px] num flex items-center justify-center border border-white/10">
                          ×{count}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl mb-1 grayscale opacity-30">🃏</span>
                      <p className="text-[9px] text-text-25 text-center">#{card.card_number}</p>
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="w-64 rounded-2xl p-6 text-center animate-slide-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: `linear-gradient(135deg, ${RARITY_COLORS[selectedCard.rarity].bg}, rgba(10,10,18,0.95))`,
              border: `2px solid ${RARITY_COLORS[selectedCard.rarity].border}`,
              boxShadow: RARITY_COLORS[selectedCard.rarity].glow,
            }}
          >
            <span className="text-5xl block mb-3">
              {RARITY_EMOJI[selectedCard.category] || '🃏'}
            </span>
            <h3 className="text-lg font-bold">{selectedCard.name}</h3>
            <p className="text-[10px] uppercase tracking-widest mt-1 mb-3"
              style={{ color: RARITY_COLORS[selectedCard.rarity].border }}
            >
              {selectedCard.rarity}
            </p>
            <p className="text-text-70 text-xs">{selectedCard.description}</p>
            <p className="text-text-25 text-[10px] mt-3">Card #{selectedCard.card_number}</p>
            {owned[selectedCard.id] > 1 && (
              <p className="text-text-40 text-[10px] mt-1">
                ×{owned[selectedCard.id]} copies
              </p>
            )}
            <button
              onClick={() => setSelectedCard(null)}
              className="mt-4 px-6 py-2 rounded-xl bg-card border border-card-border text-sm active:scale-95 transition-transform"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
