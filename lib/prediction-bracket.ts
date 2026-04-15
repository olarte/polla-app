// ============================================================
// Prediction → Bracket resolver
// Given the user's group-stage predictions, compute standings and
// resolve knockout bracket slot labels ("1A", "2B", "3ABCDF",
// "W73", "L101", …) into real Team objects. Winners propagate
// forward as the user predicts each knockout round.
// ============================================================

import { GROUPS, type Team } from './world-cup-data'
import type { Database } from './database.types'

type Match = Database['public']['Tables']['matches']['Row']
export type PredictionMap = Record<
  string,
  {
    score_a: number
    score_b: number
    // Only meaningful for knockout matches where the user picked
    // a tied regulation score. Otherwise null / undefined.
    penalty_winner?: 'a' | 'b' | null
  }
>

export interface TeamStanding {
  team: Team
  played: number
  points: number
  gd: number
  gf: number
  ga: number
}

// FIFA tiebreakers we can model from predictions alone:
// 1) points  2) goal difference  3) goals scored
// (Fair play points and FIFA Ranking are unknowable from user predictions.)
function sortStandings(a: TeamStanding, b: TeamStanding): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.gd !== a.gd) return b.gd - a.gd
  if (b.gf !== a.gf) return b.gf - a.gf
  return a.team.name.localeCompare(b.team.name)
}

export function computeGroupStandings(
  matches: Match[],
  predictions: PredictionMap
): Record<string, TeamStanding[]> {
  const standings: Record<string, TeamStanding[]> = {}

  for (const group of GROUPS) {
    const tm: Record<string, TeamStanding> = {}
    for (const t of group.teams) {
      tm[t.code] = { team: t, played: 0, points: 0, gd: 0, gf: 0, ga: 0 }
    }

    const groupMatches = matches.filter(
      (m) => m.stage === 'group' && m.group_letter === group.letter
    )

    for (const m of groupMatches) {
      const p = predictions[m.id]
      if (!p) continue
      const a = tm[m.team_a_code]
      const b = tm[m.team_b_code]
      if (!a || !b) continue
      a.played++
      b.played++
      a.gf += p.score_a
      a.ga += p.score_b
      a.gd += p.score_a - p.score_b
      b.gf += p.score_b
      b.ga += p.score_a
      b.gd += p.score_b - p.score_a
      if (p.score_a > p.score_b) a.points += 3
      else if (p.score_b > p.score_a) b.points += 3
      else {
        a.points += 1
        b.points += 1
      }
    }

    standings[group.letter] = Object.values(tm).sort(sortStandings)
  }
  return standings
}

// R32 "best third" slot definitions — each R32 fixture that uses a
// 3rd-placed team constrains it to a specific set of eligible groups.
// Pulled from KO_SCHEDULE fixture labels in lib/world-cup-data.ts.
const THIRD_SLOTS: { label: string; allowed: string[] }[] = [
  { label: '3ABCDF', allowed: ['A', 'B', 'C', 'D', 'F'] },
  { label: '3CDFGH', allowed: ['C', 'D', 'F', 'G', 'H'] },
  { label: '3CEFHI', allowed: ['C', 'E', 'F', 'H', 'I'] },
  { label: '3EHIJK', allowed: ['E', 'H', 'I', 'J', 'K'] },
  { label: '3BEFIJ', allowed: ['B', 'E', 'F', 'I', 'J'] },
  { label: '3AEHIJ', allowed: ['A', 'E', 'H', 'I', 'J'] },
  { label: '3EFGIJ', allowed: ['E', 'F', 'G', 'I', 'J'] },
  { label: '3DEIJL', allowed: ['D', 'E', 'I', 'J', 'L'] },
]

// Assign the top 8 third-placed teams to the 8 R32 "best third"
// slots using backtracking. Every slot has an allowed-groups
// constraint; a team can only fill a slot if its group is in
// that slot's allowed set. The old greedy heuristic could strand
// later slots with no valid pick even when a valid assignment
// existed — this searches the full space and is guaranteed to
// find one if it exists.
function assignThirdPlaceSlots(
  topEight: { letter: string; standing: TeamStanding }[],
  slots: { label: string; allowed: string[] }[]
): Record<string, Team> | null {
  const n = slots.length
  if (topEight.length < n) return null

  // Pre-compute which team indices are eligible for each slot,
  // ordered by team rank so the first solution the search finds
  // is rank-biased (higher-ranked thirds get their slot first).
  const eligible: number[][] = slots.map((slot) =>
    topEight
      .map((t, i) => (slot.allowed.includes(t.letter) ? i : -1))
      .filter((i) => i >= 0)
  )

  // Fail fast if any slot has no candidates at all.
  if (eligible.some((e) => e.length === 0)) return null

  const assignment: (number | null)[] = new Array(n).fill(null)
  const used = new Array(topEight.length).fill(false)

  function backtrack(slotIdx: number): boolean {
    if (slotIdx === n) return true
    for (const i of eligible[slotIdx]) {
      if (used[i]) continue
      used[i] = true
      assignment[slotIdx] = i
      if (backtrack(slotIdx + 1)) return true
      used[i] = false
      assignment[slotIdx] = null
    }
    return false
  }

  if (!backtrack(0)) return null

  const result: Record<string, Team> = {}
  for (let s = 0; s < n; s++) {
    const teamIdx = assignment[s]
    if (teamIdx != null) {
      result[slots[s].label] = topEight[teamIdx].standing.team
    }
  }
  return result
}

export function buildGroupSlotMap(
  standings: Record<string, TeamStanding[]>
): Record<string, Team> {
  const map: Record<string, Team> = {}

  for (const [letter, arr] of Object.entries(standings)) {
    if (arr[0]?.played) map[`1${letter}`] = arr[0].team
    if (arr[1]?.played) map[`2${letter}`] = arr[1].team
  }

  // Rank the 12 third-placed teams across groups
  const thirds = Object.entries(standings)
    .map(([letter, arr]) => ({ letter, standing: arr[2] }))
    .filter((x) => x.standing && x.standing.played > 0)
    .sort((a, b) => sortStandings(a.standing, b.standing))

  const topEight = thirds.slice(0, 8)
  const assignment = assignThirdPlaceSlots(topEight, THIRD_SLOTS)
  if (assignment) Object.assign(map, assignment)

  return map
}

// Feed a knockout result forward so downstream rounds can resolve.
// W{num} = winner team, L{num} = loser team. Handles tied regulation
// scores by consulting the penalty winner.
export function propagateKoResult(
  matchNumber: number,
  teamA: Team,
  teamB: Team,
  scoreA: number,
  scoreB: number,
  penaltyWinner: 'a' | 'b' | null,
  slotMap: Record<string, Team>
): Record<string, Team> {
  let winner: Team
  let loser: Team
  if (scoreA > scoreB) {
    winner = teamA
    loser = teamB
  } else if (scoreA < scoreB) {
    winner = teamB
    loser = teamA
  } else if (penaltyWinner === 'a') {
    winner = teamA
    loser = teamB
  } else if (penaltyWinner === 'b') {
    winner = teamB
    loser = teamA
  } else {
    return slotMap // tied with no pen decision — can't propagate yet
  }
  return {
    ...slotMap,
    [`W${matchNumber}`]: winner,
    [`L${matchNumber}`]: loser,
  }
}

// Pretty-print a slot label for placeholder UI when it can't yet resolve.
export function prettySlotLabel(label: string): string {
  if (/^1[A-L]$/.test(label)) return `Winner ${label[1]}`
  if (/^2[A-L]$/.test(label)) return `Runner-up ${label[1]}`
  if (label.startsWith('3')) {
    const groups = label.slice(1).split('').join('/')
    return `3rd place ${groups}`
  }
  if (label.startsWith('W')) return `Winner of M${label.slice(1)}`
  if (label.startsWith('L')) return `Loser of M${label.slice(1)}`
  return label
}
