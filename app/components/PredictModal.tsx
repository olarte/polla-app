'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '../contexts/AuthContext'
import { LOCK_DEADLINE, type Team } from '@/lib/world-cup-data'
import {
  computeGroupStandings,
  buildGroupSlotMap,
  propagateKoResult,
  prettySlotLabel,
  type PredictionMap,
} from '@/lib/prediction-bracket'
import type { Database } from '@/lib/database.types'

type Match = Database['public']['Tables']['matches']['Row']

interface PredictModalProps {
  isOpen: boolean
  onClose: () => void
}

type Action = { matchId: string; kind: 'save' | 'skip' }

const STAGE_LABEL: Record<string, string> = {
  group: 'Group',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarterfinal',
  sf: 'Semifinal',
  third: 'Third place',
  final: 'Final',
}

export default function PredictModal({ isOpen, onClose }: PredictModalProps) {
  const [supabase] = useState(() => createClient())
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<PredictionMap>({})
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(0)
  const [history, setHistory] = useState<Action[]>([])
  const [draftA, setDraftA] = useState<number | null>(null)
  const [draftB, setDraftB] = useState<number | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const initialized = useRef(false)

  const isLocked = new Date() >= LOCK_DEADLINE

  // ── Queue: all 104 matches in play order (group 1→72, then knockouts 73→104) ──
  const queue = useMemo(
    () => [...matches].sort((a, b) => a.match_number - b.match_number),
    [matches]
  )

  // ── Slot map: resolves bracket labels ('1A', '2B', '3ABCDF', 'W73'…) to real Teams ──
  const slotMap = useMemo<Record<string, Team>>(() => {
    const standings = computeGroupStandings(matches, predictions)
    let map = buildGroupSlotMap(standings)

    const koMatches = matches
      .filter(
        (m) => m.stage !== 'group' && m.match_number >= 73 && m.match_number <= 102
      )
      .sort((a, b) => a.match_number - b.match_number)

    for (const m of koMatches) {
      const p = predictions[m.id]
      if (!p) continue
      const teamA = map[m.team_a_code]
      const teamB = map[m.team_b_code]
      if (teamA && teamB && p.score_a !== p.score_b) {
        map = propagateKoResult(
          m.match_number,
          teamA,
          teamB,
          p.score_a,
          p.score_b,
          map
        )
      }
    }
    return map
  }, [matches, predictions])

  // ── Load matches + predictions on open ──
  useEffect(() => {
    if (!isOpen || !user) return
    async function load() {
      setLoading(true)
      const [mRes, pRes] = await Promise.all([
        supabase.from('matches').select('*').order('match_number'),
        supabase.from('predictions').select('*').eq('user_id', user!.id),
      ])
      if (mRes.data) setMatches(mRes.data)
      if (pRes.data) {
        const map: PredictionMap = {}
        for (const p of pRes.data) {
          map[p.match_id] = { score_a: p.score_a, score_b: p.score_b }
        }
        setPredictions(map)
      }
      setLoading(false)
    }
    load()
  }, [isOpen, user, supabase])

  // ── Jump cursor to first unpredicted match on first load ──
  useEffect(() => {
    if (loading || initialized.current || queue.length === 0) return
    const firstUnpredicted = queue.findIndex((m) => !predictions[m.id])
    setCursor(firstUnpredicted >= 0 ? firstUnpredicted : queue.length)
    initialized.current = true
  }, [loading, queue, predictions])

  // ── Reset on close ──
  useEffect(() => {
    if (!isOpen) {
      initialized.current = false
      setCursor(0)
      setHistory([])
    }
  }, [isOpen])

  const current: Match | undefined = queue[cursor]

  // ── Seed draft scores from existing prediction when card changes ──
  useEffect(() => {
    if (!current) {
      setDraftA(null)
      setDraftB(null)
      return
    }
    const existing = predictions[current.id]
    setDraftA(existing?.score_a ?? null)
    setDraftB(existing?.score_b ?? null)
    // intentionally only re-seeding when the card itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  // ── Resolve teams for the current match ──
  const resolveMatch = useCallback(
    (m: Match): { teamA: Team | null; teamB: Team | null; labelA: string; labelB: string } => {
      if (m.stage === 'group') {
        return {
          teamA: { name: m.team_a_name, code: m.team_a_code, flag: m.team_a_flag },
          teamB: { name: m.team_b_name, code: m.team_b_code, flag: m.team_b_flag },
          labelA: m.team_a_code,
          labelB: m.team_b_code,
        }
      }
      return {
        teamA: slotMap[m.team_a_code] ?? null,
        teamB: slotMap[m.team_b_code] ?? null,
        labelA: m.team_a_code,
        labelB: m.team_b_code,
      }
    },
    [slotMap]
  )

  const advance = () => setCursor((c) => Math.min(c + 1, queue.length))

  const handleSkip = () => {
    if (!current) return
    setHistory((h) => [...h, { matchId: current.id, kind: 'skip' }])
    advance()
  }

  const handleSave = () => {
    if (!current || draftA === null || draftB === null) return
    if (current.stage !== 'group' && draftA === draftB) return // knockouts can't tie

    const pred = { score_a: draftA, score_b: draftB }
    const matchId = current.id
    setPredictions((p) => ({ ...p, [matchId]: pred }))
    setHistory((h) => [...h, { matchId, kind: 'save' }])
    advance()

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!user) return
      await supabase.from('predictions').upsert(
        {
          user_id: user.id,
          match_id: matchId,
          score_a: pred.score_a,
          score_b: pred.score_b,
        },
        { onConflict: 'user_id,match_id' }
      )
    }, 300)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    const idx = queue.findIndex((m) => m.id === last.matchId)
    if (idx < 0) return
    setHistory((h) => h.slice(0, -1))
    setCursor(idx)
    // Re-seed drafts synchronously so the UI reflects the restored card
    // even if the id-change effect hasn't flushed yet.
    const existing = predictions[last.matchId]
    setDraftA(existing?.score_a ?? null)
    setDraftB(existing?.score_b ?? null)
  }

  if (!isOpen) return null

  const left = queue.length - cursor
  const isDone = !loading && queue.length > 0 && cursor >= queue.length
  const predictedCount = Object.keys(predictions).length

  return (
    <div className="fixed inset-0 z-[60] bg-polla-bg flex flex-col">
      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-text-70 active:text-white text-lg"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="text-center">
          {!loading && !isDone && (
            <span className="text-xs font-semibold text-text-70">
              <span className="num text-white">{left}</span> Left
            </span>
          )}
        </div>
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="h-10 px-2 -mr-2 text-xs font-semibold text-polla-accent active:opacity-60 disabled:opacity-25"
        >
          Undo
        </button>
      </div>

      {/* ── Progress bar ── */}
      {!loading && !isDone && queue.length > 0 && (
        <div className="px-4 pb-3">
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all duration-300"
              style={{ width: `${(cursor / queue.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Lock banner ── */}
      {isLocked && !loading && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polla-accent/10 border border-polla-accent/20">
          <span className="text-polla-accent text-xs">🔒</span>
          <span className="text-polla-accent text-[11px]">Predictions are locked</span>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-text-40 text-sm">
            Loading matches…
          </div>
        ) : isDone ? (
          <AllDone
            predicted={predictedCount}
            total={queue.length}
            onClose={onClose}
          />
        ) : current ? (
          <MatchCard
            key={current.id}
            match={current}
            resolved={resolveMatch(current)}
            draftA={draftA}
            draftB={draftB}
            setDraftA={setDraftA}
            setDraftB={setDraftB}
            isLocked={isLocked}
          />
        ) : null}
      </div>

      {/* ── Footer ── */}
      {!loading && !isDone && current && (
        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 border-t border-card-border flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isLocked}
            className="flex-1 h-12 rounded-xl border border-card-border bg-card text-sm font-bold text-text-70 active:opacity-70 disabled:opacity-30"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={
              isLocked ||
              draftA === null ||
              draftB === null ||
              (current.stage !== 'group' && draftA === draftB)
            }
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-polla-accent to-polla-accent-dark text-sm font-bold text-white active:opacity-80 disabled:opacity-30"
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

// ── Match Card ──────────────────────────────────────────────

interface MatchCardProps {
  match: Match
  resolved: { teamA: Team | null; teamB: Team | null; labelA: string; labelB: string }
  draftA: number | null
  draftB: number | null
  setDraftA: (n: number | null) => void
  setDraftB: (n: number | null) => void
  isLocked: boolean
}

function MatchCard({
  match,
  resolved,
  draftA,
  draftB,
  setDraftA,
  setDraftB,
  isLocked,
}: MatchCardProps) {
  const kickoff = new Date(match.kickoff)
  const dateStr = kickoff.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeStr = kickoff.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  const headline =
    match.stage === 'group'
      ? `Group ${match.group_letter} · Match ${match.match_number}`
      : STAGE_LABEL[match.stage] ?? match.stage

  const isKo = match.stage !== 'group'
  const isTied = draftA !== null && draftB !== null && draftA === draftB

  return (
    <div className="glow-card p-4 mx-auto w-full max-w-md">
      {/* Stage pill */}
      <div className="flex items-center justify-center mb-3">
        <span className="px-3 py-1 rounded-full bg-polla-accent/10 border border-polla-accent/25 text-polla-accent text-[10px] font-bold uppercase tracking-widest">
          {headline}
        </span>
      </div>

      {/* Date / venue */}
      <div className="text-center mb-4">
        <p className="text-text-70 text-[11px] font-semibold">
          {dateStr} · {timeStr}
        </p>
        <p className="text-text-40 text-[9px] mt-0.5">
          {match.venue}, {match.city}
        </p>
        {match.multiplier > 1 && (
          <p className="text-polla-gold text-[9px] mt-0.5 num font-bold">
            {match.multiplier}x multiplier
          </p>
        )}
      </div>

      {/* Teams + score inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <TeamScore
          team={resolved.teamA}
          label={resolved.labelA}
          value={draftA}
          onChange={setDraftA}
          disabled={isLocked}
        />
        <TeamScore
          team={resolved.teamB}
          label={resolved.labelB}
          value={draftB}
          onChange={setDraftB}
          disabled={isLocked}
        />
      </div>

      {/* Helper text */}
      <div className="text-center min-h-[12px]">
        {isKo && isTied && (
          <p className="text-polla-warning text-[10px] font-semibold">
            Knockouts can't end in a tie — pick a winner.
          </p>
        )}
        {!isKo && (
          <p className="text-text-25 text-[9px]">
            Exact: 5pts · Result + GD: 3pts · Result: 2pts
          </p>
        )}
      </div>
    </div>
  )
}

// ── Team + Score column ─────────────────────────────────────

function TeamScore({
  team,
  label,
  value,
  onChange,
  disabled,
}: {
  team: Team | null
  label: string
  value: number | null
  onChange: (v: number | null) => void
  disabled: boolean
}) {
  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (raw === '') {
      onChange(null)
      return
    }
    const n = parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 0 && n <= 20) onChange(n)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-4xl leading-none">{team?.flag ?? '🏳️'}</span>
      <div className="text-center min-h-[28px] px-1">
        {team ? (
          <>
            <p className="text-white text-xs font-bold leading-tight">{team.code}</p>
            <p className="text-text-40 text-[9px] leading-tight mt-0.5 truncate max-w-[130px] mx-auto">
              {team.name}
            </p>
          </>
        ) : (
          <p className="text-text-40 text-[10px] font-semibold leading-tight">
            {prettySlotLabel(label)}
          </p>
        )}
      </div>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === null ? '' : String(value)}
        placeholder="–"
        onChange={handleType}
        disabled={disabled}
        maxLength={2}
        className={`w-14 h-14 rounded-2xl text-center text-3xl font-extrabold num border-2 outline-none transition-colors
          placeholder:text-text-25
          ${
            value !== null
              ? 'border-polla-accent bg-polla-accent/10 text-white'
              : 'border-card-border bg-white/[0.04] text-text-25 focus:border-polla-accent/60'
          }
          disabled:opacity-40`}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (value === null || value === 0) return
            onChange(Math.max(0, value - 1))
          }}
          disabled={disabled || value === null || value === 0}
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-card-border text-text-70 text-sm font-bold active:bg-polla-accent/20 disabled:opacity-30"
          aria-label="decrement"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange((value ?? 0) + 1)}
          disabled={disabled}
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-card-border text-text-70 text-sm font-bold active:bg-polla-accent/20 disabled:opacity-30"
          aria-label="increment"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── All Done state ──────────────────────────────────────────

function AllDone({
  predicted,
  total,
  onClose,
}: {
  predicted: number
  total: number
  onClose: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="text-7xl mb-4">🐔</div>
      <h2 className="text-2xl font-extrabold mb-2">You're all set!</h2>
      <p className="text-text-70 text-sm mb-6 max-w-xs">
        Your prediction sheet is locked in. Good luck in the tournament.
      </p>
      <div className="flex gap-8 mb-10">
        <Stat label="Predicted" value={predicted} accent />
        <Stat label="Total" value={total} />
      </div>
      <button
        onClick={onClose}
        className="w-full max-w-xs h-12 rounded-xl bg-gradient-to-r from-polla-accent to-polla-accent-dark text-sm font-bold text-white active:opacity-80"
      >
        Done
      </button>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="text-center">
      <p
        className={`text-3xl font-extrabold num ${
          accent ? 'text-polla-accent' : 'text-white'
        }`}
      >
        {value}
      </p>
      <p className="text-text-40 text-[10px] uppercase tracking-wider font-bold mt-1">
        {label}
      </p>
    </div>
  )
}
