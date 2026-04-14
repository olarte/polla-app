'use client'

import { getTeamIntel, getH2H } from '@/lib/world-cup-data'
import type { Database } from '@/lib/database.types'
import Label from './Label'

type Match = Database['public']['Tables']['matches']['Row']

interface MatchDetailProps {
  match: Match
  prediction?: { score_a: number; score_b: number }
  onScoreChange: (side: 'a' | 'b', value: number) => void
  onBack: () => void
  isLocked: boolean
}

export default function MatchDetail({ match, prediction, onScoreChange, onBack, isLocked }: MatchDetailProps) {
  const kickoff = new Date(match.kickoff)
  const dateStr = kickoff.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = kickoff.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const intelA = getTeamIntel(match.team_a_code)
  const intelB = getTeamIntel(match.team_b_code)
  const h2h = getH2H(match.team_a_code, match.team_b_code)

  return (
    <div className="fixed inset-0 z-50 bg-polla-bg flex flex-col">
      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-3 border-b border-card-border">
        <button
          onClick={onBack}
          className="text-text-40 text-sm font-medium active:text-white transition-colors"
        >
          ← Back to predictions
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* ── Match Header ── */}
        <div className="text-center">
          <p className="text-text-40 text-[10px] mb-3">
            {dateStr} · {timeStr} · {match.venue}
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <span className="text-4xl block mb-1">{match.team_a_flag}</span>
              <span className="text-sm font-bold">{match.team_a_name}</span>
            </div>
            <span className="text-text-25 text-lg font-bold">vs</span>
            <div className="text-center">
              <span className="text-4xl block mb-1">{match.team_b_flag}</span>
              <span className="text-sm font-bold">{match.team_b_name}</span>
            </div>
          </div>
          {match.group_letter && (
            <p className="text-text-40 text-[10px] mt-2">
              Group {match.group_letter} · Match #{match.match_number}
            </p>
          )}
        </div>

        {/* ── Prediction Input ── */}
        <div className="glow-card p-4">
          <Label>Your Prediction</Label>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{match.team_a_code}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={20}
                value={prediction?.score_a ?? ''}
                placeholder="–"
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') return
                  onScoreChange('a', parseInt(v, 10))
                }}
                disabled={isLocked}
                className={`w-12 h-12 rounded-xl text-center text-lg font-extrabold num
                  bg-white/[0.06] border transition-colors outline-none
                  ${prediction?.score_a !== undefined ? 'border-polla-accent/50 text-white' : 'border-card-border text-text-25'}
                  ${isLocked ? 'opacity-40 cursor-not-allowed' : 'focus:border-polla-accent'}
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
            </div>
            <span className="text-text-25 text-lg font-bold">-</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={20}
                value={prediction?.score_b ?? ''}
                placeholder="–"
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') return
                  onScoreChange('b', parseInt(v, 10))
                }}
                disabled={isLocked}
                className={`w-12 h-12 rounded-xl text-center text-lg font-extrabold num
                  bg-white/[0.06] border transition-colors outline-none
                  ${prediction?.score_b !== undefined ? 'border-polla-accent/50 text-white' : 'border-card-border text-text-25'}
                  ${isLocked ? 'opacity-40 cursor-not-allowed' : 'focus:border-polla-accent'}
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              <span className="text-sm font-semibold">{match.team_b_code}</span>
            </div>
          </div>
          <p className="text-text-25 text-[9px] text-center mt-2">
            Exact: 5pts · Result+GD: 3pts · Result: 2pts
          </p>
        </div>

        {/* ── Recent Form ── */}
        <div className="glass-card p-4">
          <Label>Recent Form (Last 5)</Label>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <FormColumn team={match.team_a_code} flag={match.team_a_flag} form={intelA.form} />
            <FormColumn team={match.team_b_code} flag={match.team_b_flag} form={intelB.form} />
          </div>
        </div>

        {/* ── Qualification Stats ── */}
        <div className="glass-card p-4">
          <Label>Qualification</Label>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <QualColumn team={match.team_a_code} flag={match.team_a_flag} qual={intelA.qualification} />
            <QualColumn team={match.team_b_code} flag={match.team_b_flag} qual={intelB.qualification} />
          </div>
        </div>

        {/* ── Recent Matches ── */}
        <div className="glass-card p-4">
          <Label>Recent Matches</Label>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <RecentColumn team={match.team_a_code} matches={intelA.recentMatches} />
            <RecentColumn team={match.team_b_code} matches={intelB.recentMatches} />
          </div>
        </div>

        {/* ── Head to Head ── */}
        <div className="glass-card p-4">
          <Label>Head to Head</Label>
          {h2h ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{match.team_a_code}</span>
                <span className="text-text-40">{h2h.matches} meetings</span>
                <span className="font-semibold">{match.team_b_code}</span>
              </div>
              <div className="flex items-center gap-1 mt-2 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-polla-accent"
                  style={{ flex: h2h.teamAWins }}
                />
                <div
                  className="h-full rounded-full bg-text-40"
                  style={{ flex: h2h.draws }}
                />
                <div
                  className="h-full rounded-full bg-polla-secondary"
                  style={{ flex: h2h.teamBWins }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-polla-accent text-[10px] num">{h2h.teamAWins}W</span>
                <span className="text-text-40 text-[10px] num">{h2h.draws}D</span>
                <span className="text-polla-secondary text-[10px] num">{h2h.teamBWins}W</span>
              </div>
              {h2h.lastMet && (
                <p className="text-text-25 text-[9px] text-center mt-2">
                  Last met: {h2h.lastMet}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 text-center py-4">
              <p className="text-lg mb-1">🌟</p>
              <p className="text-text-40 text-xs">Historic first encounter!</p>
              <p className="text-text-25 text-[10px] mt-0.5">
                These teams have never met in a major tournament
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function FormColumn({ team, flag, form }: { team: string; flag: string; form: ('W' | 'D' | 'L')[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{flag}</span>
        <span className="text-xs font-semibold">{team}</span>
      </div>
      <div className="flex gap-1">
        {form.map((r, i) => (
          <span
            key={i}
            className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center ${
              r === 'W'
                ? 'bg-polla-success/20 text-polla-success'
                : r === 'D'
                  ? 'bg-polla-warning/20 text-polla-warning'
                  : 'bg-polla-accent/20 text-polla-accent'
            }`}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}

function QualColumn({
  team,
  flag,
  qual,
}: {
  team: string
  flag: string
  qual: { position: number; w: number; d: number; l: number; gf: number; ga: number }
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{flag}</span>
        <span className="text-xs font-semibold">{team}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-text-40">Finished</span>
          <span className="num">{qual.position}{qual.position === 1 ? 'st' : qual.position === 2 ? 'nd' : qual.position === 3 ? 'rd' : 'th'}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-text-40">Record</span>
          <span className="num">{qual.w}W {qual.d}D {qual.l}L</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-text-40">Goals</span>
          <span className="num">{qual.gf} - {qual.ga}</span>
        </div>
      </div>
    </div>
  )
}

function RecentColumn({
  team,
  matches,
}: {
  team: string
  matches: { opponent: string; opponentFlag: string; score: string; result: 'W' | 'D' | 'L' }[]
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold">{team}</span>
      {matches.map((m, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span
              className={`w-4 h-4 rounded-sm text-[8px] font-bold flex items-center justify-center ${
                m.result === 'W'
                  ? 'bg-polla-success/20 text-polla-success'
                  : m.result === 'D'
                    ? 'bg-polla-warning/20 text-polla-warning'
                    : 'bg-polla-accent/20 text-polla-accent'
              }`}
            >
              {m.result}
            </span>
            <span className="text-[10px]">{m.opponentFlag}</span>
          </div>
          <span className="text-text-40 text-[10px] num">{m.score}</span>
        </div>
      ))}
    </div>
  )
}
