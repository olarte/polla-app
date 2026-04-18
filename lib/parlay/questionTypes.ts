import type {
  FdMatch,
  FdTeamStatistics,
  QuestionType,
  Resolution,
} from './types'

export interface QuestionTemplate {
  type: QuestionType
  prompt: string
  optionA: string
  optionB: string
  grade: (match: FdMatch) => Resolution
}

// ─── helpers ──────────────────────────────────────────────────
const yellowsFromStats = (s?: FdTeamStatistics): number | undefined =>
  s && typeof s.yellow_cards === 'number' ? s.yellow_cards : undefined

const cornersFromStats = (s?: FdTeamStatistics): number | undefined =>
  s && typeof s.corner_kicks === 'number' ? s.corner_kicks : undefined

const redsFromStats = (s?: FdTeamStatistics): number => {
  if (!s) return 0
  return (s.red_cards ?? 0) + (s.yellow_red_cards ?? 0)
}

const countBookings = (
  match: FdMatch,
  teamId: number,
  cards: ReadonlyArray<'YELLOW' | 'RED' | 'YELLOW_RED'>,
): number =>
  match.bookings.filter(
    (b) => b.team.id === teamId && cards.includes(b.card),
  ).length

const yellowCount = (match: FdMatch, teamId: number): number =>
  countBookings(match, teamId, ['YELLOW'])

// ─── templates ────────────────────────────────────────────────
export const QUESTION_TEMPLATES: Record<QuestionType, QuestionTemplate> = {
  goal_before_15: {
    type: 'goal_before_15',
    prompt: 'Goal scored before minute 15?',
    optionA: 'Yes',
    optionB: 'No',
    grade: (m) => (m.goals.some((g) => g.minute < 15) ? 'A' : 'B'),
  },

  over_under_2_5: {
    type: 'over_under_2_5',
    prompt: 'Total goals over 2.5?',
    optionA: 'Over 2.5',
    optionB: 'Under 2.5',
    grade: (m) =>
      m.score.fullTime.home + m.score.fullTime.away > 2.5 ? 'A' : 'B',
  },

  btts: {
    type: 'btts',
    prompt: 'Both teams to score?',
    optionA: 'Yes',
    optionB: 'No',
    grade: (m) =>
      m.score.fullTime.home > 0 && m.score.fullTime.away > 0 ? 'A' : 'B',
  },

  more_cards: {
    type: 'more_cards',
    prompt: 'Which team had more yellow cards?',
    optionA: 'Home',
    optionB: 'Away',
    grade: (m) => {
      let home = yellowsFromStats(m.homeTeam.statistics)
      let away = yellowsFromStats(m.awayTeam.statistics)
      if (home === undefined || away === undefined) {
        // Fallback: count YELLOW cards from bookings. YELLOW_RED is a
        // second yellow and is excluded to match stats.yellow_cards
        // semantics.
        home = yellowCount(m, m.homeTeam.id)
        away = yellowCount(m, m.awayTeam.id)
      }
      if (home === away) return 'void'
      return home > away ? 'A' : 'B'
    },
  },

  more_corners: {
    type: 'more_corners',
    prompt: 'Which team had more corners?',
    optionA: 'Home',
    optionB: 'Away',
    grade: (m) => {
      // No bookings fallback — FD payload has no corner events.
      const home = cornersFromStats(m.homeTeam.statistics)
      const away = cornersFromStats(m.awayTeam.statistics)
      if (home === undefined || away === undefined) return 'void'
      if (home === away) return 'void'
      return home > away ? 'A' : 'B'
    },
  },

  first_half_goal: {
    type: 'first_half_goal',
    prompt: 'Goal in the first half?',
    optionA: 'Yes',
    optionB: 'No',
    grade: (m) =>
      m.score.halfTime.home + m.score.halfTime.away > 0 ? 'A' : 'B',
  },

  red_card_match: {
    type: 'red_card_match',
    prompt: 'Red card shown in the match?',
    optionA: 'Yes',
    optionB: 'No',
    grade: (m) => {
      const fromBookings = m.bookings.some(
        (b) => b.card === 'RED' || b.card === 'YELLOW_RED',
      )
      if (fromBookings) return 'A'
      const fromStats =
        redsFromStats(m.homeTeam.statistics) +
          redsFromStats(m.awayTeam.statistics) >
        0
      return fromStats ? 'A' : 'B'
    },
  },

  over_under_9_5_corners: {
    type: 'over_under_9_5_corners',
    prompt: 'Total corners over 9.5?',
    optionA: 'Over 9.5',
    optionB: 'Under 9.5',
    grade: (m) => {
      const home = cornersFromStats(m.homeTeam.statistics)
      const away = cornersFromStats(m.awayTeam.statistics)
      if (home === undefined || away === undefined) return 'void'
      return home + away > 9.5 ? 'A' : 'B'
    },
  },

  comeback_win: {
    type: 'comeback_win',
    prompt: 'Winner came from behind at some point?',
    optionA: 'Yes',
    optionB: 'No',
    grade: (m) => {
      if (m.score.winner === 'DRAW' || m.score.winner === null) return 'B'
      const winnerIsHome = m.score.winner === 'HOME_TEAM'
      // Walk goals in chronological order (minute asc, injuryTime asc).
      const ordered = [...m.goals].sort((a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute
        return (a.injuryTime ?? 0) - (b.injuryTime ?? 0)
      })
      for (const g of ordered) {
        const trailing = winnerIsHome
          ? g.score.home < g.score.away
          : g.score.away < g.score.home
        if (trailing) return 'A'
      }
      return 'B'
    },
  },

  over_under_3_5_yellows: {
    type: 'over_under_3_5_yellows',
    prompt: 'Total yellow cards over 3.5?',
    optionA: 'Over 3.5',
    optionB: 'Under 3.5',
    grade: (m) => {
      let home = yellowsFromStats(m.homeTeam.statistics)
      let away = yellowsFromStats(m.awayTeam.statistics)
      if (home === undefined || away === undefined) {
        home = yellowCount(m, m.homeTeam.id)
        away = yellowCount(m, m.awayTeam.id)
      }
      return home + away > 3.5 ? 'A' : 'B'
    },
  },
}

export function gradeQuestion(
  type: QuestionType,
  match: FdMatch,
): Resolution {
  return QUESTION_TEMPLATES[type].grade(match)
}
