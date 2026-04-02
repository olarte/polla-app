'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '../../../components/Card'
import Label from '../../../components/Label'
import WhatsAppBtn from '../../../components/WhatsAppBtn'
import TierBadge from '../../../components/TierBadge'
import { useAuth } from '../../../contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { LOCK_DEADLINE } from '@/lib/world-cup-data'

const TOURNAMENT_END = new Date('2026-07-19T23:59:59Z')

type MemberRow = {
  id: string
  user_id: string
  total_points: number
  rank: number | null
  role: string
  display_name: string
  avatar_emoji: string
}

type GroupData = {
  id: string
  name: string
  emoji: string
  is_paid: boolean
  entry_fee: number
  payout_model: string
  global_allocation: number
  invite_code: string
  member_count: number
  pool_amount: number
  status: string
}

const PAYOUT_INFO: Record<string, { title: string; desc: string; splits: { label: string; pct: string }[] }> = {
  winner_takes_all: {
    title: 'Winner Takes All',
    desc: '100% of the prize pool goes to 1st place',
    splits: [
      { label: '1st Place', pct: '100%' },
    ],
  },
  podium_split: {
    title: 'Podium Split',
    desc: 'Top 3 share the prize pool',
    splits: [
      { label: '1st Place', pct: '60%' },
      { label: '2nd Place', pct: '25%' },
      { label: '3rd Place', pct: '15%' },
    ],
  },
  proportional: {
    title: 'Proportional',
    desc: 'Prize distributed proportionally by points earned',
    splits: [
      { label: 'All players', pct: 'Pro-rata' },
    ],
  },
}

const PAYOUT_ICONS: Record<string, string> = {
  winner_takes_all: '👑',
  podium_split: '🏅',
  proportional: '📊',
}

const MEDAL_COLORS = ['text-polla-gold', 'text-polla-silver', 'text-polla-bronze']
const MEDALS = ['🥇', '🥈', '🥉']

function getTierForRank(rank: number, total: number): string {
  const pct = (rank / total) * 100
  if (pct <= 0.1) return 'mythic'
  if (pct <= 1) return 'diamond'
  if (pct <= 5) return 'platinum'
  if (pct <= 15) return 'gold'
  if (pct <= 40) return 'silver'
  return 'bronze'
}

type Announcement = {
  icon: string
  text: string
  time: string
  type: 'score' | 'rank' | 'reminder' | 'info'
}

function generateAnnouncements(group: GroupData, members: MemberRow[], phase: string): Announcement[] {
  const announcements: Announcement[] = []

  if (phase === 'pre') {
    announcements.push({
      icon: '📋',
      text: 'Complete your predictions before the tournament starts!',
      time: 'Reminder',
      type: 'reminder',
    })
    if (group.member_count < 4) {
      announcements.push({
        icon: '👥',
        text: `Invite more friends! ${group.member_count} of 4 minimum for a competitive pool.`,
        time: 'Tip',
        type: 'info',
      })
    }
    return announcements
  }

  if (phase === 'live') {
    // Show top performer highlight
    if (members.length > 0 && members[0].total_points > 0) {
      announcements.push({
        icon: '🔥',
        text: `${members[0].display_name} leads with ${members[0].total_points} pts!`,
        time: 'Leaderboard',
        type: 'rank',
      })
    }
    // Show exact score achievements
    announcements.push({
      icon: '🎯',
      text: 'Daily predictions are live — earn XP on today\'s matches!',
      time: 'Today',
      type: 'reminder',
    })
    return announcements
  }

  // post
  if (members.length > 0) {
    announcements.push({
      icon: '🏆',
      text: `${members[0].display_name} wins with ${members[0].total_points} pts! Congratulations!`,
      time: 'Final',
      type: 'score',
    })
  }
  if (group.is_paid) {
    announcements.push({
      icon: '💰',
      text: 'Payouts have been distributed. Check your balance.',
      time: 'Payout',
      type: 'info',
    })
  }

  return announcements
}

export default function PollaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [supabase] = useState(() => createClient())
  const [group, setGroup] = useState<GroupData | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const now = new Date()
  const phase = now < LOCK_DEADLINE ? 'pre' : now > TOURNAMENT_END ? 'post' : 'live'

  const fetchData = useCallback(async () => {
    if (!id) return

    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (!groupData) {
      setLoading(false)
      return
    }

    setGroup(groupData as GroupData)

    // Get all members with user info
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .order('total_points', { ascending: false })

    if (memberRows && memberRows.length > 0) {
      const userIds = memberRows.map((m) => m.user_id)
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, avatar_emoji')
        .in('id', userIds)

      const enriched: MemberRow[] = memberRows.map((m, i) => {
        const u = users?.find((u) => u.id === m.user_id)
        return {
          id: m.id,
          user_id: m.user_id,
          total_points: m.total_points,
          rank: i + 1,
          role: m.role,
          display_name: u?.display_name ?? 'Player',
          avatar_emoji: u?.avatar_emoji ?? '⚽',
        }
      })

      setMembers(enriched)
    }

    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCopyCode = async () => {
    if (!group) return
    try {
      await navigator.clipboard.writeText(group.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="h-4 w-28 rounded bg-white/[0.06] animate-pulse" />
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-white/[0.06]" />
            <div className="h-3 w-24 rounded bg-white/[0.06]" />
          </div>
        </div>
        <Card><div className="animate-pulse space-y-3">
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
          <div className="h-4 w-full rounded bg-white/[0.06]" />
          <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
        </div></Card>
        <div className="space-y-1.5 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02]">
              <div className="w-7 h-6 rounded bg-white/[0.06]" />
              <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
              <div className="flex-1 h-4 rounded bg-white/[0.06]" />
              <div className="w-10 h-4 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="px-4 pt-4 text-center py-20">
        <p className="text-text-40 text-sm">Pool not found</p>
        <button
          onClick={() => router.push('/app/pollas')}
          className="mt-4 text-polla-accent text-sm underline"
        >
          Back to My Pools
        </button>
      </div>
    )
  }

  const payout = PAYOUT_INFO[group.payout_model] || PAYOUT_INFO.podium_split
  const payoutIcon = PAYOUT_ICONS[group.payout_model] || '🏅'
  const serviceFee = group.is_paid ? Number(group.entry_fee) * 0.05 : 0
  const netEntry = group.is_paid ? Number(group.entry_fee) - serviceFee : 0
  const globalContrib = netEntry * (group.global_allocation / 100)
  const announcements = generateAnnouncements(group, members, phase)

  return (
    <div className="px-4 pt-4 space-y-4 pb-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.push('/app/pollas')}
        className="text-text-40 text-sm flex items-center gap-1"
      >
        ← Back to My Pools
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-4xl">{group.emoji}</span>
        <div>
          <h1 className="text-xl font-bold">{group.name}</h1>
          <p className="text-text-40 text-xs mt-0.5">
            {group.member_count} members · {group.is_paid ? `$${Number(group.entry_fee).toFixed(0)} entry` : 'FREE 🎮'}
          </p>
        </div>
      </div>

      {/* Stats row (paid only) */}
      {group.is_paid && (
        <div className="flex gap-2">
          <Card className="flex-1 text-center">
            <Label>Entry Fee</Label>
            <p className="num text-lg font-extrabold mt-0.5">${Math.round(Number(group.entry_fee)).toLocaleString()}</p>
          </Card>
          <Card className="flex-1 text-center">
            <Label>Prize Pool</Label>
            <p className="num text-lg font-extrabold text-polla-gold mt-0.5">${Math.round(Number(group.pool_amount)).toLocaleString()}</p>
          </Card>
          <Card className="flex-1 text-center">
            <Label>Global</Label>
            <p className="num text-lg font-extrabold text-polla-accent mt-0.5">${Math.round(globalContrib).toLocaleString()}</p>
          </Card>
        </div>
      )}

      {/* Payout model card */}
      <Card>
        <Label>{group.is_paid ? 'Payout Model' : 'Competition'}</Label>
        <div className="mt-2">
          {group.is_paid ? (
            <>
              <p className="text-sm font-bold">{payoutIcon} {payout.title}</p>
              <p className="text-text-40 text-xs mt-1">{payout.desc}</p>

              {/* Visual payout breakdown */}
              <div className="mt-3 space-y-2">
                {payout.splits.map((split, i) => {
                  const pctNum = parseInt(split.pct)
                  const poolAmount = Number(group.pool_amount)
                  const amount = !isNaN(pctNum) ? (poolAmount * pctNum / 100) : null

                  return (
                    <div key={i} className="flex items-center gap-3">
                      {MEDALS[i] && (
                        <span className="text-sm w-5 text-center">{MEDALS[i]}</span>
                      )}
                      {!MEDALS[i] && (
                        <span className="text-sm w-5 text-center text-text-40">~</span>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-70">{split.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="num text-[10px] text-text-40">{split.pct}</span>
                            {amount !== null && (
                              <span className={`num text-xs font-bold ${MEDAL_COLORS[i] ?? 'text-text-70'}`}>
                                ${amount.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>
                        {!isNaN(pctNum) && (
                          <div className="mt-1 w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                i === 0 ? 'bg-polla-gold' : i === 1 ? 'bg-polla-silver' : 'bg-polla-bronze'
                              }`}
                              style={{ width: `${pctNum}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">🎮 Bragging Rights</p>
              <p className="text-text-40 text-xs mt-1">
                No prizes — just glory and leaderboard position
              </p>
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-polla-success/10 border border-polla-success/15">
                <span className="text-sm">✅</span>
                <span className="text-polla-success text-xs">Free to play — no wallet needed</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Invite */}
      <Card>
        <Label>Invite Friends</Label>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-card-border">
            <span className="num text-sm text-text-70 tracking-[0.25em] font-bold">{group.invite_code}</span>
            <button
              onClick={handleCopyCode}
              className="ml-auto text-text-40 text-xs active:text-polla-accent transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <WhatsAppBtn
            text="Share on WhatsApp"
            message={`Join my Pool "${group.name}" for the World Cup 2026! ⚽🏆\n\nCode: ${group.invite_code}\nhttps://sabi.gg/join/${group.invite_code}`}
            className="w-full justify-center"
          />
        </div>
      </Card>

      {/* Announcements */}
      <Card>
        <Label>Announcements</Label>
        {announcements.length === 0 ? (
          <p className="text-text-35 text-xs mt-2">No announcements yet. Stay tuned!</p>
        ) : (
          <div className="mt-2 space-y-0">
            {announcements.map((ann, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-card-border last:border-0">
                <span className="text-sm mt-0.5">{ann.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-70">{ann.text}</p>
                  <p className="text-[10px] text-text-25 mt-0.5">{ann.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Standings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Standings</Label>
          <span className="text-text-25 text-[10px]">{members.length} players</span>
        </div>
        <div className="space-y-1.5">
          {members.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-text-35 text-xs">No members yet</p>
            </Card>
          ) : (
            members.map((member) => {
              const isMe = member.user_id === user?.id
              const tier = members.length >= 6 ? getTierForRank(member.rank!, members.length) : null

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isMe
                      ? 'bg-polla-accent/10 border border-polla-accent/20'
                      : 'bg-white/[0.02] border border-card-border'
                  }`}
                >
                  {/* Rank */}
                  <span className={`num text-sm font-extrabold w-7 text-center ${
                    member.rank === 1 ? 'text-polla-gold' :
                    member.rank === 2 ? 'text-polla-silver' :
                    member.rank === 3 ? 'text-polla-bronze' :
                    'text-text-40'
                  }`}>
                    {member.rank}
                  </span>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-sm shrink-0">
                    {member.avatar_emoji}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm truncate ${isMe ? 'font-bold' : 'font-semibold text-text-70'}`}>
                        {member.display_name}
                        {isMe && <span className="text-text-40 text-xs ml-1">(you)</span>}
                      </p>
                      {tier && <TierBadge tier={tier as any} size="sm" />}
                    </div>
                    {member.role === 'admin' && (
                      <p className="text-text-25 text-[10px]">Admin</p>
                    )}
                  </div>

                  {/* Points */}
                  <span className="num text-sm font-extrabold">{member.total_points}</span>
                  <span className="text-text-35 text-[10px]">pts</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
