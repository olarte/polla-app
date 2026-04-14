'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '../contexts/AuthContext'
import { LOCK_DEADLINE, GROUPS, type Team } from '@/lib/world-cup-data'
import {
  computeGroupStandings,
  buildGroupSlotMap,
  propagateKoResult,
  prettySlotLabel,
  type PredictionMap,
  type TeamStanding,
} from '@/lib/prediction-bracket'
import type { Database } from '@/lib/database.types'

type Match = Database['public']['Tables']['matches']['Row']

interface PredictModalProps {
  isOpen: boolean
  onClose: () => void
}

type Phase = 'catchup' | 'review' | 'bracket'
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
  // catchupQueue is the explicit list of match IDs the catchup
  // phase walks through. In regular mode it's all 72 group match
  // IDs in order. In "finish groups" mode it's only the matches
  // that were unpredicted when the user clicked the prompt.
  const [catchupQueue, setCatchupQueue] = useState<string[]>([])
  const [history, setHistory] = useState<Action[]>([])
  const [draftA, setDraftA] = useState<number | null>(null)
  const [draftB, setDraftB] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('catchup')
  const [editMatchId, setEditMatchId] = useState<string | null>(null)
  const [editDraftA, setEditDraftA] = useState<number | null>(null)
  const [editDraftB, setEditDraftB] = useState<number | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const initRef = useRef(false)
  // Scroll-position memory for when the user dives into the edit
  // overlay from the groups review and comes back. Without this
  // the browser clamps the saved scrollTop to the tiny edit view
  // and we lose the user's place in the (tall) groups list.
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const savedScrollTop = useRef(0)

  const isLocked = new Date() >= LOCK_DEADLINE

  // ── Derived collections ──
  const queue = useMemo(
    () => [...matches].sort((a, b) => a.match_number - b.match_number),
    [matches]
  )
  const groupMatches = useMemo(
    () =>
      matches
        .filter((m) => m.stage === 'group')
        .sort((a, b) => a.match_number - b.match_number),
    [matches]
  )
  const knockoutMatches = useMemo(
    () =>
      matches
        .filter((m) => m.stage !== 'group')
        .sort((a, b) => a.match_number - b.match_number),
    [matches]
  )

  // ── Group standings + bracket slot map ──
  const standings = useMemo(
    () => computeGroupStandings(matches, predictions),
    [matches, predictions]
  )

  const slotMap = useMemo<Record<string, Team>>(() => {
    let map = buildGroupSlotMap(standings)
    const ko = matches
      .filter(
        (m) => m.stage !== 'group' && m.match_number >= 73 && m.match_number <= 102
      )
      .sort((a, b) => a.match_number - b.match_number)
    for (const m of ko) {
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
  }, [matches, predictions, standings])

  const resolveTeam = useCallback(
    (m: Match, side: 'a' | 'b'): Team | null => {
      if (m.stage === 'group') {
        return side === 'a'
          ? { name: m.team_a_name, code: m.team_a_code, flag: m.team_a_flag }
          : { name: m.team_b_name, code: m.team_b_code, flag: m.team_b_flag }
      }
      const code = side === 'a' ? m.team_a_code : m.team_b_code
      return slotMap[code] ?? null
    },
    [slotMap]
  )

  // ── Load matches + predictions whenever the modal opens ──
  useEffect(() => {
    if (!isOpen) return
    if (!user) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const [mRes, pRes] = await Promise.all([
        // Scope to the real 104 WC matches. Dev seed scripts can leave
        // test rows with match_number >= 201 that would otherwise
        // pollute the group review screens.
        supabase
          .from('matches')
          .select('*')
          .gte('match_number', 1)
          .lte('match_number', 104)
          .order('match_number'),
        supabase.from('predictions').select('*').eq('user_id', user.id),
      ])
      if (cancelled) return
      setMatches(mRes.data ?? [])
      const map: PredictionMap = {}
      for (const p of pRes.data ?? []) {
        map[p.match_id] = { score_a: p.score_a, score_b: p.score_b }
      }
      setPredictions(map)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, user, supabase])

  // ── Decide starting phase + cursor once data has loaded ──
  useEffect(() => {
    if (loading || initRef.current || queue.length === 0) return
    initRef.current = true
    const groupsDone = groupMatches.every((m) => predictions[m.id])
    if (groupsDone) {
      const hasKoPrediction = knockoutMatches.some((m) => predictions[m.id])
      setPhase(hasKoPrediction ? 'bracket' : 'review')
      setCatchupQueue([])
      setCursor(0)
    } else {
      setPhase('catchup')
      setCatchupQueue(groupMatches.map((m) => m.id))
      const firstUnpredicted = groupMatches.findIndex((m) => !predictions[m.id])
      setCursor(firstUnpredicted >= 0 ? firstUnpredicted : 0)
    }
  }, [loading, queue.length, groupMatches, knockoutMatches, predictions])

  // ── Reset transient state on close so reopening starts fresh ──
  useEffect(() => {
    if (isOpen) return
    initRef.current = false
    setCursor(0)
    setCatchupQueue([])
    setHistory([])
    setEditMatchId(null)
    setPhase('catchup')
    setDraftA(null)
    setDraftB(null)
  }, [isOpen])

  // The match currently shown in the catchup card stack.
  const current: Match | undefined =
    phase === 'catchup' && catchupQueue[cursor]
      ? matches.find((m) => m.id === catchupQueue[cursor])
      : undefined

  // ── Seed catchup draft when the current card changes ──
  useEffect(() => {
    if (!current) {
      setDraftA(null)
      setDraftB(null)
      return
    }
    const existing = predictions[current.id]
    setDraftA(existing?.score_a ?? null)
    setDraftB(existing?.score_b ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  // ── Seed edit-overlay draft when editMatchId changes ──
  useEffect(() => {
    if (!editMatchId) {
      setEditDraftA(null)
      setEditDraftB(null)
      return
    }
    const existing = predictions[editMatchId]
    setEditDraftA(existing?.score_a ?? null)
    setEditDraftB(existing?.score_b ?? null)
  }, [editMatchId, predictions])

  // ── Debounced persistence ──
  const persistPrediction = useCallback(
    (matchId: string, scoreA: number, scoreB: number) => {
      if (!user) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        await supabase.from('predictions').upsert(
          {
            user_id: user.id,
            match_id: matchId,
            score_a: scoreA,
            score_b: scoreB,
          },
          { onConflict: 'user_id,match_id' }
        )
      }, 300)
    },
    [user, supabase]
  )

  // ── Catchup actions ──
  // Advancing past the end of the catchup queue auto-returns the
  // user to the groups review screen — covers both "saved the last
  // group match in the full 72" and "finished the last unpredicted
  // match in Finish-groups mode".
  const advance = () => {
    setCursor((c) => {
      const next = c + 1
      if (next >= catchupQueue.length) {
        setPhase('review')
        return c
      }
      return next
    })
  }

  const handleSkip = () => {
    if (!current) return
    setHistory((h) => [...h, { matchId: current.id, kind: 'skip' }])
    advance()
  }

  const handleSave = () => {
    if (!current || draftA === null || draftB === null) return
    if (current.stage !== 'group' && draftA === draftB) return

    const pred = { score_a: draftA, score_b: draftB }
    const matchId = current.id

    setPredictions((p) => ({ ...p, [matchId]: pred }))
    setHistory((h) => [...h, { matchId, kind: 'save' }])
    persistPrediction(matchId, pred.score_a, pred.score_b)
    advance()
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    const idx = catchupQueue.indexOf(last.matchId)
    if (idx < 0) return
    setHistory((h) => h.slice(0, -1))
    setCursor(idx)
    const existing = predictions[last.matchId]
    setDraftA(existing?.score_a ?? null)
    setDraftB(existing?.score_b ?? null)
  }

  // ── Phase navigation ──
  const goToReview = () => {
    setEditMatchId(null)
    setPhase('review')
  }

  // "Finish groups →" — walks only the currently-unpredicted group
  // matches, in order. Empty list is a no-op (shouldn't happen in
  // practice since the button is hidden once all 72 are done).
  const goToFinishGroups = () => {
    setEditMatchId(null)
    const unpredictedIds = groupMatches
      .filter((m) => !predictions[m.id])
      .map((m) => m.id)
    if (unpredictedIds.length === 0) return
    setCatchupQueue(unpredictedIds)
    setCursor(0)
    setHistory([])
    setPhase('catchup')
  }

  const goToBracket = () => {
    setEditMatchId(null)
    setPhase('bracket')
  }

  // ── Edit overlay actions ──
  const openEdit = (matchId: string) => {
    if (bodyScrollRef.current) {
      savedScrollTop.current = bodyScrollRef.current.scrollTop
    }
    setEditMatchId(matchId)
  }
  const closeEdit = () => setEditMatchId(null)

  // Restore the groups-review scroll position after the edit overlay closes.
  useEffect(() => {
    if (editMatchId) return
    if (!bodyScrollRef.current) return
    if (savedScrollTop.current <= 0) return
    // Wait one frame so the groups list has remounted at full height
    // before we push scrollTop — otherwise the browser clamps again.
    const target = savedScrollTop.current
    const raf = requestAnimationFrame(() => {
      if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = target
    })
    return () => cancelAnimationFrame(raf)
  }, [editMatchId])

  const saveEdit = () => {
    if (!editMatchId || editDraftA === null || editDraftB === null) return
    const match = matches.find((m) => m.id === editMatchId)
    if (!match) return
    if (match.stage !== 'group' && editDraftA === editDraftB) return
    const pred = { score_a: editDraftA, score_b: editDraftB }
    setPredictions((p) => ({ ...p, [editMatchId]: pred }))
    persistPrediction(editMatchId, pred.score_a, pred.score_b)
    setEditMatchId(null)
  }

  if (!isOpen) return null

  const editingMatch = editMatchId
    ? matches.find((m) => m.id === editMatchId) ?? null
    : null
  const groupsPredictedCount = groupMatches.filter((m) => predictions[m.id]).length
  const koPredictedCount = knockoutMatches.filter((m) => predictions[m.id]).length
  // "N Left" shows how many cards remain in the CURRENT catchup
  // session — equals unpredicted matches in finish-groups mode,
  // remaining-in-order matches in regular mode.
  const leftInCatchup = Math.max(0, catchupQueue.length - cursor)

  return (
    <div className="fixed inset-0 z-[60] bg-polla-bg flex flex-col">
      {/* ── Header ── */}
      {renderHeader({
        phase,
        loading,
        editingMatch,
        leftInCatchup,
        history,
        onClose,
        goToReview,
        handleUndo,
        closeEdit,
      })}

      {/* Lock banner */}
      {isLocked && !loading && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polla-accent/10 border border-polla-accent/20">
          <span className="text-polla-accent text-xs">🔒</span>
          <span className="text-polla-accent text-[11px]">Predictions are locked</span>
        </div>
      )}

      {/* Catchup progress bar */}
      {!loading && !editingMatch && phase === 'catchup' && (
        <div className="px-4 pb-3">
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all duration-300"
              style={{ width: `${(groupsPredictedCount / 72) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div ref={bodyScrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-text-40 text-sm">
            Loading matches…
          </div>
        ) : editingMatch ? (
          <div className="px-4 pt-2 pb-3">
            <MatchCard
              match={editingMatch}
              teamA={resolveTeam(editingMatch, 'a')}
              teamB={resolveTeam(editingMatch, 'b')}
              labelA={editingMatch.team_a_code}
              labelB={editingMatch.team_b_code}
              scoreA={editDraftA}
              scoreB={editDraftB}
              setScoreA={setEditDraftA}
              setScoreB={setEditDraftB}
              isLocked={isLocked}
            />
          </div>
        ) : phase === 'catchup' && current ? (
          <div className="px-4 pt-2 pb-3">
            <MatchCard
              key={current.id}
              match={current}
              teamA={resolveTeam(current, 'a')}
              teamB={resolveTeam(current, 'b')}
              labelA={current.team_a_code}
              labelB={current.team_b_code}
              scoreA={draftA}
              scoreB={draftB}
              setScoreA={setDraftA}
              setScoreB={setDraftB}
              isLocked={isLocked}
            />
          </div>
        ) : phase === 'review' ? (
          <div className="px-4 pt-2 pb-3 space-y-3">
            {GROUPS.map((g) => (
              <GroupReviewCard
                key={g.letter}
                groupLetter={g.letter}
                matches={groupMatches.filter((m) => m.group_letter === g.letter)}
                standings={standings[g.letter] ?? []}
                predictions={predictions}
                onEdit={openEdit}
              />
            ))}
          </div>
        ) : phase === 'bracket' ? (
          <div className="px-4 pt-2 pb-3 overflow-x-auto">
            <KnockoutBracket
              matches={knockoutMatches}
              predictions={predictions}
              resolveTeam={resolveTeam}
              onEdit={openEdit}
            />
          </div>
        ) : null}
      </div>

      {/* ── Footer ── */}
      {!loading &&
        renderFooter({
          phase,
          editingMatch,
          current,
          draftA,
          draftB,
          editDraftA,
          editDraftB,
          isLocked,
          groupsPredictedCount,
          koPredictedCount,
          handleSkip,
          handleSave,
          saveEdit,
          closeEdit,
          goToFinishGroups,
          goToBracket,
          onClose,
        })}
    </div>
  )
}

// ── Header renderer ─────────────────────────────────────────

function renderHeader(args: {
  phase: Phase
  loading: boolean
  editingMatch: Match | null
  leftInCatchup: number
  history: Action[]
  onClose: () => void
  goToReview: () => void
  handleUndo: () => void
  closeEdit: () => void
}) {
  const {
    phase,
    loading,
    editingMatch,
    leftInCatchup,
    history,
    onClose,
    goToReview,
    handleUndo,
    closeEdit,
  } = args

  if (editingMatch) {
    return (
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <button
          onClick={closeEdit}
          className="h-10 px-2 -ml-2 text-xs font-semibold text-text-70 active:text-white"
        >
          Cancel
        </button>
        <h2 className="text-sm font-bold text-white">Edit prediction</h2>
        <div className="w-14" />
      </div>
    )
  }

  if (phase === 'catchup') {
    return (
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <button
          onClick={onClose}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-text-70 active:text-white text-lg"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="flex-1 text-center">
          {!loading && (
            <span className="text-xs font-semibold text-text-70">
              <span className="num text-white">{leftInCatchup}</span> Left
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToReview}
            className="h-10 px-2 text-[11px] font-semibold text-polla-accent active:opacity-60"
          >
            Groups
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="h-10 px-2 -mr-2 text-xs font-semibold text-polla-accent active:opacity-60 disabled:opacity-25"
          >
            Undo
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'review') {
    return (
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-text-70 active:text-white text-lg"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-sm font-bold text-white">Your Groups</h2>
        <div className="w-10" />
      </div>
    )
  }

  // bracket
  return (
    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
      <button
        onClick={onClose}
        className="w-10 h-10 -ml-2 flex items-center justify-center text-text-70 active:text-white text-lg"
        aria-label="Close"
      >
        ✕
      </button>
      <h2 className="text-sm font-bold text-white">Knockout Bracket</h2>
      <button
        onClick={goToReview}
        className="h-10 px-2 -mr-2 text-[11px] font-semibold text-polla-accent active:opacity-60"
      >
        Groups
      </button>
    </div>
  )
}

// ── Footer renderer ─────────────────────────────────────────

function renderFooter(args: {
  phase: Phase
  editingMatch: Match | null
  current: Match | undefined
  draftA: number | null
  draftB: number | null
  editDraftA: number | null
  editDraftB: number | null
  isLocked: boolean
  groupsPredictedCount: number
  koPredictedCount: number
  handleSkip: () => void
  handleSave: () => void
  saveEdit: () => void
  closeEdit: () => void
  goToFinishGroups: () => void
  goToBracket: () => void
  onClose: () => void
}) {
  const {
    phase,
    editingMatch,
    current,
    draftA,
    draftB,
    editDraftA,
    editDraftB,
    isLocked,
    groupsPredictedCount,
    koPredictedCount,
    handleSkip,
    handleSave,
    saveEdit,
    closeEdit,
    goToFinishGroups,
    goToBracket,
    onClose,
  } = args

  if (editingMatch) {
    const isKo = editingMatch.stage !== 'group'
    const saveDisabled =
      isLocked ||
      editDraftA === null ||
      editDraftB === null ||
      (isKo && editDraftA === editDraftB)
    return (
      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 border-t border-card-border flex gap-3">
        <button
          onClick={closeEdit}
          className="flex-1 h-12 rounded-xl border border-card-border bg-card text-sm font-bold text-text-70 active:opacity-70"
        >
          Cancel
        </button>
        <button
          onClick={saveEdit}
          disabled={saveDisabled}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-polla-accent to-polla-accent-dark text-sm font-bold text-white active:opacity-80 disabled:opacity-30"
        >
          Save
        </button>
      </div>
    )
  }

  if (phase === 'catchup' && current) {
    const isKo = current.stage !== 'group'
    const saveDisabled =
      isLocked ||
      draftA === null ||
      draftB === null ||
      (isKo && draftA === draftB)
    return (
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
          disabled={saveDisabled}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-polla-accent to-polla-accent-dark text-sm font-bold text-white active:opacity-80 disabled:opacity-30"
        >
          Save
        </button>
      </div>
    )
  }

  if (phase === 'review') {
    const totalPredicted = groupsPredictedCount + koPredictedCount
    const groupsRemaining = 72 - groupsPredictedCount
    const groupStageComplete = groupsRemaining === 0
    return (
      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 border-t border-card-border">
        <div className="flex items-center justify-between gap-3 mb-2 text-[10px] text-text-40">
          <p className="leading-snug">
            <span className="num text-white">{totalPredicted}</span>
            /104 games predicted.{' '}
            {groupStageComplete ? (
              <span className="text-polla-success font-semibold">Group stage complete.</span>
            ) : (
              <>
                <span className="num text-white">{groupsRemaining}</span>{' '}
                {groupsRemaining === 1 ? 'game' : 'games'} left in the group stage.
              </>
            )}
          </p>
          {!groupStageComplete && (
            <button
              onClick={goToFinishGroups}
              className="shrink-0 text-polla-accent font-semibold"
            >
              Finish groups →
            </button>
          )}
        </div>
        <button
          onClick={goToBracket}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-polla-accent to-polla-accent-dark text-sm font-bold text-white active:opacity-80"
        >
          Continue to Knockouts →
        </button>
      </div>
    )
  }

  if (phase === 'bracket') {
    return (
      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 border-t border-card-border flex items-center justify-between">
        <span className="text-[10px] text-text-40">
          <span className="num text-white">{koPredictedCount}</span> / 32 knockouts predicted
        </span>
        <button
          onClick={onClose}
          className="h-10 px-4 rounded-lg bg-polla-accent text-white text-xs font-bold active:opacity-80"
        >
          Done
        </button>
      </div>
    )
  }

  return null
}

// ── Slack-style Match Card ──────────────────────────────────

interface MatchCardProps {
  match: Match
  teamA: Team | null
  teamB: Team | null
  labelA: string
  labelB: string
  scoreA: number | null
  scoreB: number | null
  setScoreA: (v: number | null) => void
  setScoreB: (v: number | null) => void
  isLocked: boolean
}

function MatchCard({
  match,
  teamA,
  teamB,
  labelA,
  labelB,
  scoreA,
  scoreB,
  setScoreA,
  setScoreB,
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
  const isTied = scoreA !== null && scoreB !== null && scoreA === scoreB

  return (
    <div className="glow-card p-4 mx-auto w-full max-w-md">
      <div className="flex items-center justify-center mb-3">
        <span className="px-3 py-1 rounded-full bg-polla-accent/10 border border-polla-accent/25 text-polla-accent text-[10px] font-bold uppercase tracking-widest">
          {headline}
        </span>
      </div>
      <div className="text-center mb-4">
        <p className="text-text-70 text-[11px] font-semibold">
          {dateStr} · {timeStr}
        </p>
        <p className="text-text-40 text-[9px] mt-0.5">
          {match.venue}, {match.city}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <TeamScore
          team={teamA}
          label={labelA}
          value={scoreA}
          onChange={setScoreA}
          disabled={isLocked}
        />
        <TeamScore
          team={teamB}
          label={labelB}
          value={scoreB}
          onChange={setScoreB}
          disabled={isLocked}
        />
      </div>
      <div className="text-center min-h-[12px]">
        {isKo && isTied && (
          <p className="text-polla-warning text-[10px] font-semibold">
            Knockouts can&apos;t end in a tie — pick a winner.
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
        className={`w-14 h-14 rounded-2xl text-center text-3xl font-extrabold num border-2 outline-none transition-colors placeholder:text-text-25 ${
          value !== null
            ? 'border-polla-accent bg-polla-accent/10 text-white'
            : 'border-card-border bg-white/[0.04] text-text-25 focus:border-polla-accent/60'
        } disabled:opacity-40`}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            // First tap on a blank box seeds 0 rather than underflowing.
            if (value === null) return onChange(0)
            if (value === 0) return
            onChange(Math.max(0, value - 1))
          }}
          disabled={disabled || value === 0}
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-card-border text-text-70 text-sm font-bold active:bg-polla-accent/20 disabled:opacity-30"
          aria-label="decrement"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            // First tap on a blank box seeds 0 rather than jumping to 1.
            if (value === null) return onChange(0)
            onChange(value + 1)
          }}
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

// ── Group Review Card ───────────────────────────────────────

function GroupReviewCard({
  groupLetter,
  matches,
  standings,
  predictions,
  onEdit,
}: {
  groupLetter: string
  matches: Match[]
  standings: TeamStanding[]
  predictions: PredictionMap
  onEdit: (id: string) => void
}) {
  const predictedCount = matches.filter((m) => predictions[m.id]).length
  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Group {groupLetter}</h3>
        <span className="text-[10px] text-text-40 num">
          {predictedCount}/{matches.length}
        </span>
      </div>

      {/* Standings table */}
      <div className="mb-3 rounded-lg bg-white/[0.02] border border-card-border overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_28px_32px_28px] text-[9px] font-bold uppercase tracking-wider text-text-40 px-2 py-1.5 border-b border-card-border">
          <span>#</span>
          <span>Team</span>
          <span className="text-right">P</span>
          <span className="text-right">GD</span>
          <span className="text-right">GF</span>
        </div>
        {standings.map((s, i) => {
          const advances = i < 2
          return (
            <div
              key={s.team.code}
              className={`grid grid-cols-[24px_1fr_28px_32px_28px] text-[11px] px-2 py-1.5 items-center ${
                advances ? 'text-white' : 'text-text-40'
              } ${i < standings.length - 1 ? 'border-b border-card-border/50' : ''}`}
            >
              <span
                className={`num font-bold ${advances ? 'text-polla-success' : ''}`}
              >
                {i + 1}
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span>{s.team.flag}</span>
                <span className="font-semibold truncate">{s.team.code}</span>
              </span>
              <span className="num text-right font-bold">{s.points}</span>
              <span className="num text-right">
                {s.gd > 0 ? '+' : ''}
                {s.gd}
              </span>
              <span className="num text-right">{s.gf}</span>
            </div>
          )
        })}
      </div>

      {/* Match rows */}
      <div className="space-y-1">
        {matches.map((m) => (
          <MatchRow
            key={m.id}
            match={m}
            prediction={predictions[m.id]}
            onEdit={() => onEdit(m.id)}
          />
        ))}
      </div>
    </div>
  )
}

function MatchRow({
  match,
  prediction,
  onEdit,
}: {
  match: Match
  prediction?: { score_a: number; score_b: number }
  onEdit: () => void
}) {
  const hasPred = !!prediction
  return (
    <button
      onClick={onEdit}
      className={`w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 py-2 rounded-lg border text-left active:scale-[0.98] transition-transform ${
        hasPred
          ? 'bg-polla-success/5 border-polla-success/20'
          : 'bg-white/[0.02] border-card-border'
      }`}
    >
      <div className="flex items-center gap-1.5 justify-end truncate">
        <span className="text-[11px] font-semibold truncate">
          {match.team_a_code}
        </span>
        <span className="text-base">{match.team_a_flag}</span>
      </div>
      <div className="flex items-center gap-1.5 num font-extrabold text-sm min-w-[60px] justify-center">
        {hasPred ? (
          <>
            <span className="text-white">{prediction!.score_a}</span>
            <span className="text-text-25">-</span>
            <span className="text-white">{prediction!.score_b}</span>
          </>
        ) : (
          <span className="text-text-25 text-[9px] font-semibold">Tap to predict</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 truncate">
        <span className="text-base">{match.team_b_flag}</span>
        <span className="text-[11px] font-semibold truncate">
          {match.team_b_code}
        </span>
      </div>
    </button>
  )
}

// ── Knockout Bracket ────────────────────────────────────────

const KO_ROUNDS: { stage: string; label: string; short: string }[] = [
  { stage: 'r32', label: 'Round of 32', short: 'R32' },
  { stage: 'r16', label: 'Round of 16', short: 'R16' },
  { stage: 'qf', label: 'Quarterfinal', short: 'QF' },
  { stage: 'sf', label: 'Semifinal', short: 'SF' },
  { stage: 'final', label: 'Final', short: 'Final' },
]

function KnockoutBracket({
  matches,
  predictions,
  resolveTeam,
  onEdit,
}: {
  matches: Match[]
  predictions: PredictionMap
  resolveTeam: (m: Match, side: 'a' | 'b') => Team | null
  onEdit: (id: string) => void
}) {
  const thirdPlace = matches.find((m) => m.stage === 'third') ?? null

  return (
    <div className="flex gap-3 items-start min-w-max pb-2">
      {KO_ROUNDS.map((round) => {
        const roundMatches = matches
          .filter((m) => m.stage === round.stage)
          .sort((a, b) => a.match_number - b.match_number)
        return (
          <div
            key={round.stage}
            className="flex flex-col gap-2 w-[210px] shrink-0"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-40 text-center mb-1">
              {round.label}
            </div>
            {roundMatches.map((m) => (
              <BracketCell
                key={m.id}
                match={m}
                teamA={resolveTeam(m, 'a')}
                teamB={resolveTeam(m, 'b')}
                prediction={predictions[m.id]}
                onEdit={() => onEdit(m.id)}
              />
            ))}
            {round.stage === 'final' && thirdPlace && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-40 text-center mt-4 mb-1">
                  Third Place
                </div>
                <BracketCell
                  match={thirdPlace}
                  teamA={resolveTeam(thirdPlace, 'a')}
                  teamB={resolveTeam(thirdPlace, 'b')}
                  prediction={predictions[thirdPlace.id]}
                  onEdit={() => onEdit(thirdPlace.id)}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BracketCell({
  match,
  teamA,
  teamB,
  prediction,
  onEdit,
}: {
  match: Match
  teamA: Team | null
  teamB: Team | null
  prediction?: { score_a: number; score_b: number }
  onEdit: () => void
}) {
  const hasPred = !!prediction
  const winnerSide =
    hasPred && prediction && prediction.score_a !== prediction.score_b
      ? prediction.score_a > prediction.score_b
        ? 'a'
        : 'b'
      : null
  return (
    <button
      onClick={onEdit}
      className={`rounded-lg border px-2 py-1.5 text-left w-full active:scale-[0.98] transition-transform ${
        hasPred
          ? 'bg-polla-success/5 border-polla-success/20'
          : 'bg-white/[0.02] border-card-border'
      }`}
    >
      <BracketSide
        team={teamA}
        label={match.team_a_code}
        score={prediction?.score_a}
        isWinner={winnerSide === 'a'}
        isLoser={winnerSide === 'b'}
      />
      <div className="border-t border-card-border/40 my-1" />
      <BracketSide
        team={teamB}
        label={match.team_b_code}
        score={prediction?.score_b}
        isWinner={winnerSide === 'b'}
        isLoser={winnerSide === 'a'}
      />
    </button>
  )
}

function BracketSide({
  team,
  label,
  score,
  isWinner,
  isLoser,
}: {
  team: Team | null
  label: string
  score?: number
  isWinner: boolean
  isLoser: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-base ${isLoser ? 'opacity-50' : ''}`}>
        {team?.flag ?? '🏳️'}
      </span>
      <div className="flex-1 min-w-0">
        {team ? (
          <p
            className={`text-[11px] font-bold truncate ${
              isWinner
                ? 'text-white'
                : isLoser
                  ? 'text-text-40'
                  : 'text-text-70'
            }`}
          >
            {team.code}
          </p>
        ) : (
          <p className="text-[9px] text-text-40 font-semibold truncate">
            {prettySlotLabel(label)}
          </p>
        )}
      </div>
      <span
        className={`num text-sm font-extrabold w-5 text-right ${
          isWinner
            ? 'text-white'
            : isLoser
              ? 'text-text-40'
              : 'text-text-25'
        }`}
      >
        {score ?? '–'}
      </span>
    </div>
  )
}
