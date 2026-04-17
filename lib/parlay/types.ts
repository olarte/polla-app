// Parlay grading types — model football-data.org v4 /matches/{id} payload.
//
// Statistics coverage varies by competition tier. World Cup / CL / top-5
// leagues populate `statistics` reliably; elsewhere it may be missing.
// Graders fall back to bookings[] / goals[] where possible, or void.

export type Resolution = 'A' | 'B' | 'void'

export type Winner = 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW'

export type GoalKind = 'REGULAR' | 'PENALTY' | 'OWN'

export type Card = 'YELLOW' | 'RED' | 'YELLOW_RED'

export interface FdTeamRef {
  id: number
  name?: string
}

export interface FdGoal {
  minute: number
  injuryTime?: number | null
  type: GoalKind
  team: FdTeamRef
  scorer?: { id: number; name: string } | null
  assist?: { id: number; name: string } | null
  score: { home: number; away: number }
}

export interface FdBooking {
  minute: number
  team: FdTeamRef
  player?: { id: number; name: string }
  card: Card
}

export interface FdTeamStatistics {
  corner_kicks?: number
  yellow_cards?: number
  red_cards?: number
  yellow_red_cards?: number
  fouls?: number
  shots?: number
  shots_on_goal?: number
  ball_possession?: number
}

export interface FdTeam {
  id: number
  name: string
  statistics?: FdTeamStatistics
}

export interface FdMatch {
  id: number
  utcDate: string
  status: string
  homeTeam: FdTeam
  awayTeam: FdTeam
  score: {
    winner: Winner | null
    fullTime: { home: number; away: number }
    halfTime: { home: number; away: number }
  }
  goals: FdGoal[]
  bookings: FdBooking[]
}

export type QuestionType =
  | 'goal_before_15'
  | 'over_under_2_5'
  | 'btts'
  | 'more_cards'
  | 'more_corners'
  | 'first_half_goal'
  | 'red_card_match'
  | 'over_under_9_5_corners'
  | 'home_clean_sheet'
  | 'away_clean_sheet'
  | 'comeback_win'
  | 'over_under_3_5_yellows'

export const ALL_QUESTION_TYPES: QuestionType[] = [
  'goal_before_15',
  'over_under_2_5',
  'btts',
  'more_cards',
  'more_corners',
  'first_half_goal',
  'red_card_match',
  'over_under_9_5_corners',
  'home_clean_sheet',
  'away_clean_sheet',
  'comeback_win',
  'over_under_3_5_yellows',
]
