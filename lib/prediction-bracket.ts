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
export type PredictionMap = Record<string, { score_a: number; score_b: number }>

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

  // Greedy assignment: walk R32 fixture slots in order and pick the
  // highest-ranked qualifying third whose group hasn't been used yet.
  // Not 100% FIFA-matrix-correct in edge cases but stable and legible.
  const used = new Set<string>()
  for (const slot of THIRD_SLOTS) {
    const pick = topEight.find(
      (t) => slot.allowed.includes(t.letter) && !used.has(t.letter)
    )
    if (pick) {
      map[slot.label] = pick.standing.team
      used.add(pick.letter)
    }
  }
  return map
}

// Feed a knockout result forward so downstream rounds can resolve.
// W{num} = winner team, L{num} = loser team.
export function propagateKoResult(
  matchNumber: number,
  teamA: Team,
  teamB: Team,
  scoreA: number,
  scoreB: number,
  slotMap: Record<string, Team>
): Record<string, Team> {
  if (scoreA === scoreB) return slotMap // tie can't propagate — user must break it
  const winner = scoreA > scoreB ? teamA : teamB
  const loser = scoreA > scoreB ? teamB : teamA
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
