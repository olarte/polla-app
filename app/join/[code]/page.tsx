'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '../../components/Card'
import ConnectWalletPrompt from '../../components/ConnectWalletPrompt'

type GroupPreview = {
  id: string
  name: string
  emoji: string
  is_paid: boolean
  entry_fee: number
  payout_model: string
  member_count: number
  pool_amount: number
  status: string
  creator_name: string
  creator_emoji: string
}

const PAYOUT_LABELS: Record<string, string> = {
  winner_takes_all: 'Winner Takes All',
  podium_split: 'Podium Split (60/25/15)',
  proportional: 'Proportional',
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<GroupPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [walletPromptOpen, setWalletPromptOpen] = useState(false)

  useEffect(() => {
    if (!code) return

    fetch(`/api/groups/preview?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setNotFound(true)
        } else {
          setGroup(data.group)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [code])

  const handleJoin = async () => {
    setJoining(true)
    setError('')

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code }),
      })

      const data = await res.json()

      if (res.status === 401) {
        router.push(`/login?redirect=/join/${code}`)
        return
      }

      if (!res.ok) {
        if (data.error === 'Already a member' && data.group_id) {
          router.push(`/pollas/${data.group_id}`)
          return
        }
        if (data.needs_wallet) {
          setWalletPromptOpen(true)
          return
        }
        setError(data.error || 'Failed to join')
        return
      }

      router.push(`/pollas/${data.group_id}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-polla-bg flex items-center justify-center">
        <p className="text-text-35 text-sm">Loading...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-polla-bg flex flex-col items-center justify-center px-6">
        <span className="text-5xl mb-4">🐔</span>
        <h1 className="text-xl font-bold mb-2">Polla Not Found</h1>
        <p className="text-text-40 text-sm text-center mb-6">
          This invite code is invalid or the group no longer exists
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
        >
          Go Home
        </button>
      </div>
    )
  }

  if (!group) return null

  return (
    <div className="min-h-screen bg-polla-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-5">
        {/* Group preview */}
        <div className="text-center">
          <span className="text-6xl block mb-3">{group.emoji}</span>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-text-40 text-sm mt-1">
            Created by {group.creator_emoji} {group.creator_name}
          </p>
        </div>

        <Card>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-40">Members</span>
              <span className="font-semibold">{group.member_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-40">Type</span>
              <span className="font-semibold">
                {group.is_paid ? `💰 $${Number(group.entry_fee).toFixed(0)} entry` : '🎮 Free'}
              </span>
            </div>
            {group.is_paid && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-text-40">Payout</span>
                  <span className="font-semibold">{PAYOUT_LABELS[group.payout_model] || group.payout_model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-40">Prize Pool</span>
                  <span className="num font-semibold text-polla-gold">${Number(group.pool_amount).toFixed(0)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-text-40">Status</span>
              <span className={`font-semibold ${group.status === 'open' ? 'text-polla-success' : 'text-text-40'}`}>
                {group.status === 'open' ? '✅ Open' : group.status === 'locked' ? '🔒 Locked' : '✓ Completed'}
              </span>
            </div>
          </div>
        </Card>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-polla-accent/10 border border-polla-accent/20 text-polla-accent text-xs text-center">
            {error}
          </div>
        )}

        {group.status === 'open' ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full py-3.5 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {joining ? 'Joining...' : group.is_paid ? `Join — $${Number(group.entry_fee).toFixed(0)}` : 'Join Polla'}
          </button>
        ) : (
          <div className="text-center">
            <p className="text-text-40 text-sm">This polla is no longer accepting members</p>
          </div>
        )}

        <p className="text-center text-text-25 text-xs">
          Predict the FIFA World Cup 2026 🐔⚽
        </p>
      </div>

      {walletPromptOpen && (
        <ConnectWalletPrompt
          onClose={() => setWalletPromptOpen(false)}
          onConnected={() => {
            setWalletPromptOpen(false)
            handleJoin()
          }}
        />
      )}
    </div>
  )
}
