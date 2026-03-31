'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import Card from '../../components/Card'
import Label from '../../components/Label'
import CreatePollaModal from '../../components/CreatePollaModal'
import ConnectWalletPrompt from '../../components/ConnectWalletPrompt'
import { useAuth } from '../../contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { LOCK_DEADLINE } from '@/lib/world-cup-data'
import { useGroupPayment, type PaymentStep } from '@/lib/contracts/useGroupPayment'

const TOURNAMENT_END = new Date('2026-07-19T23:59:59Z')

type TournamentPhase = 'pre' | 'live' | 'post'

function getTournamentPhase(): TournamentPhase {
  const now = new Date()
  if (now < LOCK_DEADLINE) return 'pre'
  if (now > TOURNAMENT_END) return 'post'
  return 'live'
}

type GroupWithMembers = {
  id: string
  name: string
  emoji: string
  is_paid: boolean
  entry_fee: number
  payout_model: string
  invite_code: string
  member_count: number
  pool_amount: number
  status: string
  my_rank: number | null
  my_points: number
  top3: { display_name: string; avatar_emoji: string; total_points: number; rank: number }[]
}

export default function PollasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [pollas, setPollas] = useState<GroupWithMembers[]>([])
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [predictionProgress, setPredictionProgress] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const [walletPromptOpen, setWalletPromptOpen] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<{ code: string; fee: number } | null>(null)
  const { isConnected } = useAccount()
  const { payEntryFee, step: paymentStep, error: paymentError, reset: resetPayment } = useGroupPayment()

  const phase = getTournamentPhase()

  // Stop loading after 3 seconds max as fallback
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000)
    return () => clearTimeout(timeout)
  }, [])

  // Hide bottom nav when payment modal is open
  useEffect(() => {
    if (pendingPayment) {
      document.documentElement.setAttribute('data-hide-nav', 'true')
    } else {
      document.documentElement.removeAttribute('data-hide-nav')
    }
    return () => document.documentElement.removeAttribute('data-hide-nav')
  }, [pendingPayment])

  const fetchPollas = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
    // Fetch groups, memberships, and prediction progress in parallel
    const [membershipsRes, matchCountRes, predCountRes] = await Promise.all([
      supabase
        .from('group_members')
        .select('group_id, total_points, rank')
        .eq('user_id', user.id),
      supabase
        .from('matches')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    const total = matchCountRes.count ?? 0
    const predicted = predCountRes.count ?? 0
    setTotalMatches(total)
    setPredictionProgress(total > 0 ? Math.round((predicted / total) * 100) : 0)

    const memberships = membershipsRes.data
    if (!memberships || memberships.length === 0) {
      setPollas([])
      setLoading(false)
      return
    }

    const groupIds = memberships.map((m) => m.group_id)

    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)

    if (!groups) {
      setPollas([])
      setLoading(false)
      return
    }

    // Get top 3 members for each group
    const pollasWithData: GroupWithMembers[] = await Promise.all(
      groups.map(async (group) => {
        const myMembership = memberships.find((m) => m.group_id === group.id)

        const { data: topMembers } = await supabase
          .from('group_members')
          .select('total_points, rank, user_id')
          .eq('group_id', group.id)
          .order('total_points', { ascending: false })
          .limit(3)

        let top3: GroupWithMembers['top3'] = []
        if (topMembers && topMembers.length > 0) {
          const userIds = topMembers.map((m) => m.user_id)
          const { data: users } = await supabase
            .from('users')
            .select('id, display_name, avatar_emoji')
            .in('id', userIds)

          top3 = topMembers.map((m, i) => {
            const u = users?.find((u) => u.id === m.user_id)
            return {
              display_name: u?.display_name ?? 'Player',
              avatar_emoji: u?.avatar_emoji ?? '⚽',
              total_points: m.total_points,
              rank: i + 1,
            }
          })
        }

        return {
          id: group.id,
          name: group.name,
          emoji: group.emoji,
          is_paid: group.is_paid,
          entry_fee: group.entry_fee,
          payout_model: group.payout_model,
          invite_code: group.invite_code,
          member_count: group.member_count,
          pool_amount: group.pool_amount,
          status: group.status,
          my_rank: myMembership?.rank ?? null,
          my_points: myMembership?.total_points ?? 0,
          top3,
        }
      })
    )

    setPollas(pollasWithData)
    setLoading(false)
    } catch (err) {
      console.error('fetchPollas error:', err)
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchPollas()
  }, [fetchPollas])

  const handleJoin = async (code?: string, txHash?: string) => {
    const inviteCode = (code || joinCode).trim()
    if (!inviteCode) return
    setJoining(true)
    setJoinError('')

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode, tx_hash: txHash }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Paid group needs wallet connection
        if (data.needs_wallet) {
          setWalletPromptOpen(true)
          return
        }
        // Paid group needs payment
        if (data.needs_payment) {
          if (!isConnected) {
            setWalletPromptOpen(true)
            return
          }
          setPendingPayment({ code: inviteCode, fee: data.entry_fee })
          return
        }
        setJoinError(data.error)
        return
      }

      setJoinCode('')
      setPendingPayment(null)
      router.push(`/pollas/${data.group_id}`)
    } catch {
      setJoinError('Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  const handlePayAndJoin = async () => {
    if (!pendingPayment) return
    setJoining(true)
    setJoinError('')

    try {
      const txHash = await payEntryFee(pendingPayment.fee)
      // Now retry join with the tx hash
      await handleJoin(pendingPayment.code, txHash)
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || paymentError || 'Payment failed'
      setJoinError(msg)
      setJoining(false)
    }
  }

  const filtered = pollas.filter((p) => {
    if (filter === 'free') return !p.is_paid
    if (filter === 'paid') return p.is_paid
    return true
  })

  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div className="px-4 pt-4 space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">My Pollas</h1>
          {pollas.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-polla-accent/15 text-polla-accent text-xs num font-bold">
              {pollas.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-btn-primary text-xs font-bold active:scale-[0.97] transition-transform"
        >
          + New
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'free', 'paid'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === tab
                ? 'bg-polla-accent/20 text-polla-accent border border-polla-accent/30'
                : 'bg-card border border-card-border text-text-40'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Polla cards */}
      {loading ? (
        <div className="text-center py-12 text-text-35 text-sm">Loading...</div>
      ) : filtered.length === 0 && pollas.length === 0 ? (
        <Card className="text-center py-12">
          <span className="text-4xl block mb-3">🐔</span>
          <p className="text-text-70 text-sm font-semibold mb-1">No pollas yet</p>
          <p className="text-text-35 text-xs max-w-[220px] mx-auto">
            Create a group with friends or join one to start competing
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-text-40 text-sm">No {filter} pollas</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((polla) => (
            <Link key={polla.id} href={`/pollas/${polla.id}`}>
              <PollaCard
                polla={polla}
                phase={phase}
                predictionProgress={predictionProgress}
                medals={MEDALS}
              />
            </Link>
          ))}
        </div>
      )}

      {/* Join section */}
      <div>
        <Label>Join a Polla with invite link</Label>
        <Card className="mt-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase())
                setJoinError('')
              }}
              placeholder="Enter invite code"
              maxLength={6}
              className="flex-1 bg-white/[0.03] border border-card-border rounded-lg px-3 py-2.5 text-sm text-text-70 placeholder:text-text-25 outline-none focus:border-polla-accent/40 transition-colors uppercase tracking-widest num"
            />
            <button
              onClick={() => handleJoin()}
              disabled={joining || !joinCode.trim()}
              className="px-4 py-2.5 rounded-lg bg-polla-secondary border border-card-border text-xs font-semibold text-text-70 active:scale-[0.97] transition-transform disabled:opacity-40"
            >
              {joining ? '...' : 'Join'}
            </button>
          </div>
          {joinError && (
            <p className="text-polla-accent text-xs mt-2">{joinError}</p>
          )}
        </Card>
      </div>

      {/* Create Polla Modal */}
      <CreatePollaModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(group) => {
          router.push(`/pollas/${group.id}`)
        }}
      />

      {/* Connect Wallet Prompt */}
      {walletPromptOpen && (
        <ConnectWalletPrompt
          onClose={() => setWalletPromptOpen(false)}
          onConnected={() => {
            setWalletPromptOpen(false)
            // Retry join after wallet connected
            if (joinCode.trim()) handleJoin()
          }}
        />
      )}

      {/* Paid Group Payment Modal */}
      {pendingPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="w-full max-w-md bg-polla-bg border-t border-card-border rounded-t-2xl p-5 space-y-4 animate-slide-up">
            <div className="text-center">
              <p className="text-text-40 text-xs uppercase tracking-wider">Paid Group Entry</p>
              <p className="text-lg font-bold mt-1">Join for ${pendingPayment.fee} USDC</p>
            </div>

            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-40 text-xs">Entry fee</span>
                <span className="num text-sm">${pendingPayment.fee} USDC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-40 text-xs">Service fee (5%)</span>
                <span className="num text-sm text-text-40">${(pendingPayment.fee * 0.05).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-card-border pt-2 mt-2">
                <span className="text-text-40 text-xs">Sent to</span>
                <span className="text-[10px] text-text-40 font-mono">Treasury</span>
              </div>
            </div>

            {paymentStep !== 'idle' && paymentStep !== 'error' && (
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    paymentStep === 'approving' ? 'bg-polla-accent animate-pulse' : 'bg-polla-success'
                  }`}>
                    {paymentStep === 'approving' ? '1' : '✓'}
                  </div>
                  <span className="text-text-40 text-[10px]">Approve</span>
                </div>
                <div className="w-6 h-px bg-card-border" />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    paymentStep === 'transferring' ? 'bg-polla-accent animate-pulse' :
                    paymentStep === 'confirming' || paymentStep === 'confirmed' ? 'bg-polla-success' : 'bg-white/[0.06]'
                  }`}>
                    {paymentStep === 'confirming' || paymentStep === 'confirmed' ? '✓' : '2'}
                  </div>
                  <span className="text-text-40 text-[10px]">Pay</span>
                </div>
                <div className="w-6 h-px bg-card-border" />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    paymentStep === 'confirming' ? 'bg-polla-warning animate-pulse' :
                    paymentStep === 'confirmed' ? 'bg-polla-success' : 'bg-white/[0.06]'
                  }`}>
                    {paymentStep === 'confirmed' ? '✓' : '3'}
                  </div>
                  <span className="text-text-40 text-[10px]">Join</span>
                </div>
              </div>
            )}

            {(paymentError || joinError) && (
              <p className="text-polla-accent text-xs text-center">{paymentError || joinError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPendingPayment(null); resetPayment() }}
                disabled={paymentStep !== 'idle' && paymentStep !== 'error' && paymentStep !== 'confirmed'}
                className="flex-1 py-3 rounded-xl bg-card border border-card-border text-sm text-text-40 disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handlePayAndJoin}
                disabled={joining || (paymentStep !== 'idle' && paymentStep !== 'error')}
                className="flex-1 py-3 rounded-xl bg-btn-primary text-sm font-bold disabled:opacity-50 active:scale-[0.97] transition-transform"
              >
                {paymentStep === 'idle' || paymentStep === 'error'
                  ? `Pay $${pendingPayment.fee} USDC`
                  : 'Processing...'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Polla Card (state-adaptive) ──────────────────────────────

interface PollaCardProps {
  polla: GroupWithMembers
  phase: TournamentPhase
  predictionProgress: number
  medals: string[]
}

function PollaCard({ polla, phase, predictionProgress, medals }: PollaCardProps) {
  // ── PRE-TOURNAMENT: progress bar, member status, entry fee ──
  if (phase === 'pre') {
    return (
      <Card className="mb-0.5">
        {/* Top row: info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{polla.emoji}</span>
            <div>
              <p className="text-sm font-bold">{polla.name}</p>
              <p className="text-text-40 text-xs mt-0.5">
                {polla.member_count} members · {polla.is_paid ? `$${Number(polla.entry_fee).toFixed(0)} entry` : 'FREE 🎮'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
              polla.status === 'open'
                ? 'bg-polla-success/15 text-polla-success'
                : 'bg-text-25/10 text-text-40'
            }`}>
              {polla.status === 'open' ? 'Open' : 'Locked'}
            </span>
          </div>
        </div>

        {/* Prediction progress */}
        <div className="mt-3 pt-3 border-t border-card-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-40 text-[10px]">Predictions</span>
            <span className="num text-[10px] text-text-40">{predictionProgress}% complete</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
              style={{ width: `${predictionProgress}%` }}
            />
          </div>
        </div>
      </Card>
    )
  }

  // ── POST-TOURNAMENT: final position, payout ──
  if (phase === 'post') {
    return (
      <Card className="mb-0.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{polla.emoji}</span>
            <div>
              <p className="text-sm font-bold">{polla.name}</p>
              <p className="text-text-40 text-xs mt-0.5">
                {polla.member_count} members · {polla.is_paid ? `$${Number(polla.entry_fee).toFixed(0)} entry` : 'FREE 🎮'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-text-40 text-[10px] uppercase tracking-wider">Final</p>
            <p className={`num text-xl font-extrabold ${
              polla.my_rank === 1 ? 'text-polla-gold' :
              polla.my_rank === 2 ? 'text-polla-silver' :
              polla.my_rank === 3 ? 'text-polla-bronze' :
              'text-text-70'
            }`}>
              {polla.my_rank ? `#${polla.my_rank}` : '—'}
            </p>
          </div>
        </div>

        {/* Payout earned */}
        <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between">
          <span className="text-text-40 text-xs">{polla.my_points} pts final</span>
          {polla.is_paid && (
            <span className="num text-sm font-bold text-polla-gold">
              ${Number(polla.pool_amount).toFixed(0)} pool
            </span>
          )}
          {!polla.is_paid && (
            <span className="text-xs text-text-40">Completed</span>
          )}
        </div>
      </Card>
    )
  }

  // ── TOURNAMENT LIVE: rank, points, top 3 podium, prize pool ──
  return (
    <Card className="mb-0.5">
      {/* Top row: info + rank */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{polla.emoji}</span>
          <div>
            <p className="text-sm font-bold">{polla.name}</p>
            <p className="text-text-40 text-xs mt-0.5">
              {polla.member_count} members · {polla.is_paid ? `$${Number(polla.entry_fee).toFixed(0)} entry` : 'FREE 🎮'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-text-40 text-[10px] uppercase tracking-wider">Your rank</p>
          <p className="num text-lg font-extrabold">
            {polla.my_rank ? `#${polla.my_rank}` : '—'}
          </p>
          <p className="num text-xs text-text-40">{polla.my_points} pts</p>
        </div>
      </div>

      {/* Top 3 podium */}
      {polla.top3.length > 0 && (
        <div className="mt-3 pt-3 border-t border-card-border">
          <div className="flex items-center gap-3">
            {polla.top3.map((member, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm">{medals[i]}</span>
                <span className="text-xs truncate text-text-70">{member.display_name}</span>
                <span className="num text-[10px] text-text-35 shrink-0">{member.total_points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer: pool amount */}
      <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between">
        <span className="text-text-40 text-xs">{polla.my_points} pts</span>
        {polla.is_paid && (
          <span className="num text-xs text-polla-gold">
            ${Number(polla.pool_amount).toFixed(0)} pool
          </span>
        )}
      </div>
    </Card>
  )
}
