'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Card from '../../components/Card'
import Label from '../../components/Label'
import TierBadge from '../../components/TierBadge'
import FaqItem from '../../components/FaqItem'
import Collapsible from '../../components/Collapsible'
import PredictModal from '../../components/PredictModal'
import ConnectWalletPrompt from '../../components/ConnectWalletPrompt'
import { useAuth } from '../../contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'

const FAQ_ITEMS = [
  { q: 'What is Polla?', a: 'Polla is a skill-based prediction contest for the FIFA World Cup 2026. Predict match scores, compete in pools, and win real money based on your accuracy.' },
  { q: 'Do I need a wallet?', a: 'Yes. Polla uses MiniPay (Celo USDC) as the sole sign-up and payment method. Your wallet is your account — there is no phone or email fallback, and every pool has a stablecoin entry fee.' },
  { q: 'How does scoring work?', a: 'Exact score = 10 pts. Winner + goal difference = 5 pts. Winner + one team\u2019s goals right = 3 pts. Winner only = 2 pts. Wrong winner = 0 pts. Every match is worth the same — no stage multipliers.' },
  { q: 'What counts toward the leaderboard?', a: 'Only the 104 group-stage and knockout World Cup match predictions. Daily mini-predictions are a separate entertainment surface and do not contribute to the group or global leaderboard.' },
  { q: 'What are pools?', a: 'Every pool has a fixed stablecoin entry fee (minimum $1) paid via MiniPay. A 5% service fee is deducted, and 15% of the net pool flows to the global prize pool. The remainder is the group prize.' },
  { q: 'How do pool payouts work?', a: 'Two models are available: Winner Takes All (100% to 1st) or Podium Split (60/25/15 to top 3). The model is locked once the first prediction is made.' },
  { q: 'What are tiers?', a: 'Tiers are based on your global points ranking. From top to bottom: Mythic (top 0.1%), Diamond (top 1%), Platinum (top 5%), Gold (top 15%), Silver (top 40%), and Bronze (everyone else). Your tier updates as you earn more points.' },
  { q: 'What is the Grand Pool?', a: 'The global prize pool where all pool players compete. Prizes are distributed by ranking: Champion (15%), Top 5 (20%), Top 20 (25%), Top 100 (25%), Top 500 (15%).' },
  { q: 'How do tiebreakers work?', a: 'If players are tied on points, the tiebreaker is "total goals scored in the tournament" — the player whose prediction is closest to the actual total wins.' },
]

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final'] as const
const STAGE_LABEL: Record<string, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarterfinals',
  sf: 'Semifinals',
  third: 'Third Place',
  final: 'Final',
}

interface PredictionWithMatch {
  match_id: string
  score_a: number
  score_b: number
  penalty_winner: 'a' | 'b' | null
  points: number | null
  match: {
    match_number: number
    team_a_name: string
    team_a_flag: string
    team_b_name: string
    team_b_flag: string
    group_letter: string | null
    stage: string
    score_a: number | null
    score_b: number | null
    status: string
  }
}

interface LeaderboardEntry {
  rank: number | null
  tier: string
  total_points: number
  matches_predicted: number
  exact_scores: number
}

export default function ProfilePage() {
  const { user: authUser, profile } = useAuth()
  const [emoji, setEmoji] = useState('⚽')
  const [predictOpen, setPredictOpen] = useState(false)
  const [walletPromptOpen, setWalletPromptOpen] = useState(false)

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry | null>(null)
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([])
  const [predictionCount, setPredictionCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const isSubmitted = !!profile?.bracket_submitted_at

  useEffect(() => {
    if (!authUser) return
    const supabase = createClient()

    async function loadProfile() {
      const [leaderboardRes, predictionsRes] = await Promise.all([
        supabase
          .from('global_leaderboard')
          .select('rank, tier, total_points, matches_predicted, exact_scores')
          .eq('user_id', authUser!.id)
          .single(),
        supabase
          .from('predictions')
          .select('match_id, score_a, score_b, penalty_winner, points, matches:match_id(match_number, team_a_name, team_a_flag, team_b_name, team_b_flag, group_letter, stage, score_a, score_b, status)')
          .eq('user_id', authUser!.id)
          .order('created_at', { ascending: true }),
      ])

      if (leaderboardRes.data) {
        setLeaderboard(leaderboardRes.data as unknown as LeaderboardEntry)
      }

      if (predictionsRes.data) {
        const parsed = predictionsRes.data.map((p: any) => ({
          match_id: p.match_id,
          score_a: p.score_a,
          score_b: p.score_b,
          penalty_winner: p.penalty_winner,
          points: p.points,
          match: p.matches,
        })).filter((p: any) => p.match)
        setPredictions(parsed)
        setPredictionCount(parsed.length)
      }

      setLoading(false)
    }

    loadProfile()
  }, [authUser])

  useEffect(() => {
    if (profile?.avatar_emoji) setEmoji(profile.avatar_emoji)
  }, [profile])

  const handleEmojiChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
      const emojis = [...val]
      const newEmoji = emojis[emojis.length - 1]
      setEmoji(newEmoji)
      if (authUser) {
        const supabase = createClient()
        await supabase.from('users').update({ avatar_emoji: newEmoji }).eq('id', authUser.id)
      }
    }
  }

  const displayName = profile?.display_name || 'Player'
  const tierName = leaderboard?.tier || 'bronze'
  const validTier = (['mythic', 'diamond', 'platinum', 'gold', 'silver', 'bronze'].includes(tierName)
    ? tierName : 'bronze') as 'mythic' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'

  // Points breakdown
  const totalPoints = leaderboard?.total_points ?? 0
  const matchesPredicted = leaderboard?.matches_predicted ?? 0
  const exactScores = leaderboard?.exact_scores ?? 0
  const maxPossible = predictionCount * 10 // 10 pts per match is max
  const accuracy = maxPossible > 0 ? Math.round((totalPoints / maxPossible) * 100) : 0

  // Group predictions by stage
  const groupedPredictions = STAGE_ORDER.reduce((acc, stage) => {
    let filtered: PredictionWithMatch[]
    if (stage === 'group') {
      filtered = predictions.filter(p => p.match.stage === 'group')
        .sort((a, b) => {
          const ga = a.match.group_letter || ''
          const gb = b.match.group_letter || ''
          if (ga !== gb) return ga.localeCompare(gb)
          return a.match.match_number - b.match.match_number
        })
    } else {
      filtered = predictions.filter(p => p.match.stage === stage)
        .sort((a, b) => a.match.match_number - b.match.match_number)
    }
    if (filtered.length > 0) acc.push({ stage, label: STAGE_LABEL[stage] || stage, predictions: filtered })
    return acc
  }, [] as { stage: string; label: string; predictions: PredictionWithMatch[] }[])

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-12 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-10" />
        </div>
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-14 h-14 rounded-full bg-white/[0.06]" />
          <div className="h-5 w-32 rounded bg-white/[0.06] mt-3" />
          <div className="h-4 w-20 rounded bg-white/[0.06] mt-2" />
        </div>
        <Card><div className="animate-pulse space-y-3"><div className="h-3 w-16 rounded bg-white/[0.06]" /><div className="h-8 w-full rounded bg-white/[0.06]" /></div></Card>
        <Card><div className="animate-pulse grid grid-cols-3 gap-3"><div className="h-12 rounded bg-white/[0.06]" /><div className="h-12 rounded bg-white/[0.06]" /><div className="h-12 rounded bg-white/[0.06]" /></div></Card>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 space-y-5 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/app" className="text-text-40 text-sm">&larr; Home</Link>
        <h1 className="text-sm font-bold">Profile</h1>
        <div className="w-10" />
      </div>

      {/* Avatar + Info */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <label className="cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-2xl">
              {emoji}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-polla-bg border border-card-border flex items-center justify-center text-[10px]">
              ✏️
            </div>
            <input
              type="text"
              className="sr-only"
              value=""
              onChange={handleEmojiChange}
              aria-label="Choose avatar emoji"
            />
          </label>
        </div>
        <p className="text-lg font-bold mt-3">{displayName}</p>
        <div className="flex items-center gap-2 mt-1">
          <TierBadge tier={validTier} size="sm" showLabel />
          {leaderboard?.rank && (
            <span className="text-text-40 text-xs">&middot; Rank #{leaderboard.rank}</span>
          )}
        </div>
      </div>

      {/* Wallet */}
      <Card>
        <Label>Wallet</Label>
        {profile?.wallet_connected && profile?.wallet_address ? (
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-sm font-mono text-text-70">
                {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
              </p>
              <p className="text-[10px] text-text-40 mt-0.5">Celo Network</p>
            </div>
            <span className="text-xs text-polla-success font-semibold px-2.5 py-1 rounded-lg bg-polla-success/10 border border-polla-success/20">
              Connected
            </span>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-text-40 text-xs mb-3">
              Connect your MiniPay wallet to join paid pools.
            </p>
            <button
              onClick={() => setWalletPromptOpen(true)}
              className="w-full py-2.5 rounded-xl bg-polla-success/20 border border-polla-success/30 text-polla-success text-xs font-bold active:scale-[0.97] transition-transform"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </Card>

      {/* My Stats — points-focused */}
      <Card>
        <Label>My Stats</Label>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="num text-3xl font-bold">{totalPoints.toLocaleString()}</p>
          <p className="text-text-40 text-xs">points</p>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
            style={{ width: `${Math.min(accuracy, 100)}%` }}
          />
        </div>
        <p className="text-text-25 text-[10px] mt-1">{accuracy}% accuracy ({totalPoints} of {maxPossible} possible pts)</p>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-card-border">
          <div className="text-center">
            <p className="num text-lg font-bold">{matchesPredicted}</p>
            <p className="text-text-35 text-[10px]">Matches Scored</p>
          </div>
          <div className="text-center">
            <p className="num text-lg font-bold">{exactScores}</p>
            <p className="text-text-35 text-[10px]">Exact Scores</p>
          </div>
        </div>
      </Card>

      {/* Predict CTA / Prediction Summary */}
      {!isSubmitted ? (
        <Card glow className="text-center">
          <p className="text-sm font-bold mb-1">Predict the World Cup</p>
          <p className="text-text-40 text-xs mb-2">
            {predictionCount} / 104 matches predicted
          </p>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
              style={{ width: `${Math.round((predictionCount / 104) * 100)}%` }}
            />
          </div>
          <button
            onClick={() => setPredictOpen(true)}
            className="w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
          >
            {predictionCount === 0 ? 'Start Predicting' : 'Continue Predicting'}
          </button>
        </Card>
      ) : (
        /* Prediction Summary — grouped by stage */
        groupedPredictions.length > 0 && (
          <div className="space-y-4">
            <Label>My Predictions</Label>
            {groupedPredictions.map(({ stage, label, predictions: stagePreds }) => {
              const stagePoints = stagePreds.reduce((s, p) => s + (p.points ?? 0), 0)
              const scored = stagePreds.filter(p => p.points !== null).length
              return (
                <Collapsible
                  key={stage}
                  title={
                    <div className="flex items-center justify-between w-full pr-2">
                      <span>{label}</span>
                      <span className="text-text-40 text-xs num">
                        {stagePoints} pts &middot; {scored}/{stagePreds.length}
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-1.5">
                    {stage === 'group' ? (
                      // Sub-group by group letter
                      Object.entries(
                        stagePreds.reduce((acc, p) => {
                          const gl = p.match.group_letter || '?'
                          if (!acc[gl]) acc[gl] = []
                          acc[gl].push(p)
                          return acc
                        }, {} as Record<string, PredictionWithMatch[]>)
                      ).map(([gl, preds]) => (
                        <div key={gl}>
                          <p className="text-text-25 text-[10px] uppercase tracking-widest font-bold mb-1 mt-2">
                            Group {gl}
                          </p>
                          {preds.map(p => (
                            <PredictionRow key={p.match_id} prediction={p} />
                          ))}
                        </div>
                      ))
                    ) : (
                      stagePreds.map(p => (
                        <PredictionRow key={p.match_id} prediction={p} />
                      ))
                    )}
                  </div>
                </Collapsible>
              )
            })}
          </div>
        )
      )}

      {/* FAQ */}
      <Collapsible title="How Polla Works">
        <div>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </Collapsible>

      <PredictModal isOpen={predictOpen} onClose={() => setPredictOpen(false)} />

      {walletPromptOpen && (
        <ConnectWalletPrompt
          onClose={() => setWalletPromptOpen(false)}
          onConnected={() => setWalletPromptOpen(false)}
        />
      )}
    </div>
  )
}

// ── Prediction Row ──

function PredictionRow({ prediction: p }: { prediction: PredictionWithMatch }) {
  const m = p.match
  const isScored = p.points !== null
  const pointsColor = p.points === 10 ? 'text-polla-gold' :
    p.points !== null && p.points >= 5 ? 'text-polla-success' :
    p.points !== null && p.points > 0 ? 'text-text-70' : 'text-text-25'

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.02]">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs">{m.team_a_flag}</span>
        <span className="text-[11px] font-semibold truncate">{m.team_a_name}</span>
        <span className="num text-xs font-bold text-text-70">{p.score_a}</span>
        <span className="text-text-25 text-[10px]">-</span>
        <span className="num text-xs font-bold text-text-70">{p.score_b}</span>
        <span className="text-[11px] font-semibold truncate">{m.team_b_name}</span>
        <span className="text-xs">{m.team_b_flag}</span>
        {p.penalty_winner && (
          <span className="text-text-25 text-[9px]">
            (pen {p.penalty_winner === 'a' ? m.team_a_name : m.team_b_name})
          </span>
        )}
      </div>
      <div className="ml-2 text-right shrink-0">
        {isScored ? (
          <span className={`num text-xs font-bold ${pointsColor}`}>
            {p.points === 10 ? '10' : p.points} pts
          </span>
        ) : (
          <span className="text-text-25 text-[10px]">&mdash;</span>
        )}
      </div>
    </div>
  )
}
