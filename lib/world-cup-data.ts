// ============================================================
// FIFA World Cup 2026 — Tournament Data
// 48 teams · 12 groups · 104 matches
// June 11 – July 19, 2026
// ============================================================

export interface Team {
  name: string
  code: string
  flag: string
}

export interface GroupDef {
  letter: string
  teams: [Team, Team, Team, Team]
}

export interface MatchDef {
  match_number: number
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'
  group_letter: string | null
  team_a: Team
  team_b: Team
  kickoff: string // ISO string
  venue: string
  city: string
  multiplier: number
}

// ── Venues ──────────────────────────────────────────────────
export const VENUES = [
  { name: 'MetLife Stadium', city: 'New York/New Jersey' },
  { name: 'AT&T Stadium', city: 'Dallas' },
  { name: 'SoFi Stadium', city: 'Los Angeles' },
  { name: 'Hard Rock Stadium', city: 'Miami' },
  { name: 'Lumen Field', city: 'Seattle' },
  { name: 'NRG Stadium', city: 'Houston' },
  { name: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { name: 'Lincoln Financial Field', city: 'Philadelphia' },
  { name: "Levi's Stadium", city: 'San Francisco' },
  { name: 'Arrowhead Stadium', city: 'Kansas City' },
  { name: 'Gillette Stadium', city: 'Boston' },
  { name: 'Estadio Azteca', city: 'Mexico City' },
  { name: 'Estadio BBVA', city: 'Monterrey' },
  { name: 'Estadio Akron', city: 'Guadalajara' },
  { name: 'BMO Field', city: 'Toronto' },
  { name: 'BC Place', city: 'Vancouver' },
] as const

// ── Groups ──────────────────────────────────────────────────
export const GROUPS: GroupDef[] = [
  {
    letter: 'A',
    teams: [
      { name: 'United States', code: 'USA', flag: '🇺🇸' },
      { name: 'Colombia', code: 'COL', flag: '🇨🇴' },
      { name: 'Morocco', code: 'MAR', flag: '🇲🇦' },
      { name: 'New Zealand', code: 'NZL', flag: '🇳🇿' },
    ],
  },
  {
    letter: 'B',
    teams: [
      { name: 'Mexico', code: 'MEX', flag: '🇲🇽' },
      { name: 'Germany', code: 'GER', flag: '🇩🇪' },
      { name: 'South Korea', code: 'KOR', flag: '🇰🇷' },
      { name: 'Panama', code: 'PAN', flag: '🇵🇦' },
    ],
  },
  {
    letter: 'C',
    teams: [
      { name: 'Canada', code: 'CAN', flag: '🇨🇦' },
      { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
      { name: 'Nigeria', code: 'NGA', flag: '🇳🇬' },
      { name: 'Costa Rica', code: 'CRC', flag: '🇨🇷' },
    ],
  },
  {
    letter: 'D',
    teams: [
      { name: 'France', code: 'FRA', flag: '🇫🇷' },
      { name: 'Australia', code: 'AUS', flag: '🇦🇺' },
      { name: 'Egypt', code: 'EGY', flag: '🇪🇬' },
      { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦' },
    ],
  },
  {
    letter: 'E',
    teams: [
      { name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
      { name: 'Japan', code: 'JPN', flag: '🇯🇵' },
      { name: 'Senegal', code: 'SEN', flag: '🇸🇳' },
      { name: 'Ecuador', code: 'ECU', flag: '🇪🇨' },
    ],
  },
  {
    letter: 'F',
    teams: [
      { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Netherlands', code: 'NED', flag: '🇳🇱' },
      { name: 'Ghana', code: 'GHA', flag: '🇬🇭' },
      { name: 'Honduras', code: 'HON', flag: '🇭🇳' },
    ],
  },
  {
    letter: 'G',
    teams: [
      { name: 'Spain', code: 'ESP', flag: '🇪🇸' },
      { name: 'Croatia', code: 'CRO', flag: '🇭🇷' },
      { name: 'Cameroon', code: 'CMR', flag: '🇨🇲' },
      { name: 'Peru', code: 'PER', flag: '🇵🇪' },
    ],
  },
  {
    letter: 'H',
    teams: [
      { name: 'Portugal', code: 'POR', flag: '🇵🇹' },
      { name: 'Uruguay', code: 'URU', flag: '🇺🇾' },
      { name: 'Tunisia', code: 'TUN', flag: '🇹🇳' },
      { name: 'Jamaica', code: 'JAM', flag: '🇯🇲' },
    ],
  },
  {
    letter: 'I',
    teams: [
      { name: 'Belgium', code: 'BEL', flag: '🇧🇪' },
      { name: 'Chile', code: 'CHI', flag: '🇨🇱' },
      { name: 'Iran', code: 'IRN', flag: '🇮🇷' },
      { name: 'Qatar', code: 'QAT', flag: '🇶🇦' },
    ],
  },
  {
    letter: 'J',
    teams: [
      { name: 'Italy', code: 'ITA', flag: '🇮🇹' },
      { name: 'Denmark', code: 'DEN', flag: '🇩🇰' },
      { name: 'Algeria', code: 'ALG', flag: '🇩🇿' },
      { name: 'Paraguay', code: 'PAR', flag: '🇵🇾' },
    ],
  },
  {
    letter: 'K',
    teams: [
      { name: 'Switzerland', code: 'SUI', flag: '🇨🇭' },
      { name: 'Sweden', code: 'SWE', flag: '🇸🇪' },
      { name: 'Turkey', code: 'TUR', flag: '🇹🇷' },
      { name: 'China PR', code: 'CHN', flag: '🇨🇳' },
    ],
  },
  {
    letter: 'L',
    teams: [
      { name: 'Poland', code: 'POL', flag: '🇵🇱' },
      { name: 'Serbia', code: 'SRB', flag: '🇷🇸' },
      { name: 'Ivory Coast', code: 'CIV', flag: '🇨🇮' },
      { name: 'Austria', code: 'AUT', flag: '🇦🇹' },
    ],
  },
]

// ── All teams flat list (for dropdowns) ─────────────────────
export const ALL_TEAMS: Team[] = GROUPS.flatMap((g) => g.teams)

// ── Stage multipliers ───────────────────────────────────────
const STAGE_MULTIPLIER: Record<string, number> = {
  group: 1.0,
  r32: 1.5,
  r16: 2.0,
  qf: 2.5,
  sf: 3.0,
  third: 4.0,
  final: 4.0,
}

// ── Generate group match pairings ───────────────────────────
// Each group of 4 teams → 6 matches (round-robin)
function groupPairings(teams: [Team, Team, Team, Team]): [Team, Team][] {
  return [
    [teams[0], teams[1]], // Matchday 1
    [teams[2], teams[3]],
    [teams[0], teams[2]], // Matchday 2
    [teams[1], teams[3]],
    [teams[0], teams[3]], // Matchday 3
    [teams[1], teams[2]],
  ]
}

// ── Generate all 104 matches ────────────────────────────────
export function generateAllMatches(): MatchDef[] {
  const matches: MatchDef[] = []
  let matchNum = 1

  // ── GROUP STAGE (72 matches) ──
  // June 11 – June 28, 2026
  // 4 matches per day, 18 days
  const groupStartDate = new Date('2026-06-11T16:00:00Z')
  const kickoffTimes = ['16:00', '19:00', '22:00', '01:00'] // UTC slots (next day for 01:00)

  // Generate all group pairings, interleaved across matchdays
  const matchday1: { group: string; pair: [Team, Team] }[] = []
  const matchday2: { group: string; pair: [Team, Team] }[] = []
  const matchday3: { group: string; pair: [Team, Team] }[] = []

  for (const group of GROUPS) {
    const pairs = groupPairings(group.teams)
    matchday1.push(
      { group: group.letter, pair: pairs[0] },
      { group: group.letter, pair: pairs[1] }
    )
    matchday2.push(
      { group: group.letter, pair: pairs[2] },
      { group: group.letter, pair: pairs[3] }
    )
    matchday3.push(
      { group: group.letter, pair: pairs[4] },
      { group: group.letter, pair: pairs[5] }
    )
  }

  const allGroupMatches = [...matchday1, ...matchday2, ...matchday3]
  let dayOffset = 0
  let slotIndex = 0

  for (const { group, pair } of allGroupMatches) {
    const baseDate = new Date(groupStartDate)
    baseDate.setDate(baseDate.getDate() + dayOffset)

    const [hours, minutes] = kickoffTimes[slotIndex].split(':').map(Number)
    const kickoff = new Date(baseDate)
    kickoff.setUTCHours(hours, minutes, 0, 0)
    // If 01:00 UTC, it's actually the next day
    if (hours < 10) kickoff.setDate(kickoff.getDate() + 1)

    const venue = VENUES[(matchNum - 1) % VENUES.length]

    matches.push({
      match_number: matchNum,
      stage: 'group',
      group_letter: group,
      team_a: pair[0],
      team_b: pair[1],
      kickoff: kickoff.toISOString(),
      venue: venue.name,
      city: venue.city,
      multiplier: STAGE_MULTIPLIER.group,
    })

    matchNum++
    slotIndex++
    if (slotIndex >= 4) {
      slotIndex = 0
      dayOffset++
    }
  }

  // ── KNOCKOUT STAGE (32 matches) ──
  const TBD: Team = { name: 'TBD', code: 'TBD', flag: '🏳️' }

  // Round of 32 — 16 matches (June 29 – July 2)
  const r32Start = new Date('2026-06-29T16:00:00Z')
  for (let i = 0; i < 16; i++) {
    const dayOff = Math.floor(i / 4)
    const slot = i % 4
    const [hours, minutes] = kickoffTimes[slot].split(':').map(Number)
    const kickoff = new Date(r32Start)
    kickoff.setDate(kickoff.getDate() + dayOff)
    kickoff.setUTCHours(hours, minutes, 0, 0)
    if (hours < 10) kickoff.setDate(kickoff.getDate() + 1)

    const venue = VENUES[i % VENUES.length]
    matches.push({
      match_number: matchNum++,
      stage: 'r32',
      group_letter: null,
      team_a: TBD,
      team_b: TBD,
      kickoff: kickoff.toISOString(),
      venue: venue.name,
      city: venue.city,
      multiplier: STAGE_MULTIPLIER.r32,
    })
  }

  // Round of 16 — 8 matches (July 3 – July 6)
  const r16Start = new Date('2026-07-03T18:00:00Z')
  for (let i = 0; i < 8; i++) {
    const dayOff = Math.floor(i / 2)
    const kickoff = new Date(r16Start)
    kickoff.setDate(kickoff.getDate() + dayOff)
    kickoff.setUTCHours(i % 2 === 0 ? 18 : 22, 0, 0, 0)

    const venue = VENUES[i % VENUES.length]
    matches.push({
      match_number: matchNum++,
      stage: 'r16',
      group_letter: null,
      team_a: TBD,
      team_b: TBD,
      kickoff: kickoff.toISOString(),
      venue: venue.name,
      city: venue.city,
      multiplier: STAGE_MULTIPLIER.r16,
    })
  }

  // Quarterfinals — 4 matches (July 8 – July 9)
  const qfStart = new Date('2026-07-08T18:00:00Z')
  for (let i = 0; i < 4; i++) {
    const dayOff = Math.floor(i / 2)
    const kickoff = new Date(qfStart)
    kickoff.setDate(kickoff.getDate() + dayOff)
    kickoff.setUTCHours(i % 2 === 0 ? 18 : 22, 0, 0, 0)

    const venue = VENUES[i % VENUES.length]
    matches.push({
      match_number: matchNum++,
      stage: 'qf',
      group_letter: null,
      team_a: TBD,
      team_b: TBD,
      kickoff: kickoff.toISOString(),
      venue: venue.name,
      city: venue.city,
      multiplier: STAGE_MULTIPLIER.qf,
    })
  }

  // Semifinals — 2 matches (July 12 – July 13)
  for (let i = 0; i < 2; i++) {
    const kickoff = new Date('2026-07-12T22:00:00Z')
    kickoff.setDate(kickoff.getDate() + i)

    matches.push({
      match_number: matchNum++,
      stage: 'sf',
      group_letter: null,
      team_a: TBD,
      team_b: TBD,
      kickoff: kickoff.toISOString(),
      venue: i === 0 ? 'MetLife Stadium' : 'AT&T Stadium',
      city: i === 0 ? 'New York/New Jersey' : 'Dallas',
      multiplier: STAGE_MULTIPLIER.sf,
    })
  }

  // Third place — 1 match (July 18)
  matches.push({
    match_number: matchNum++,
    stage: 'third',
    group_letter: null,
    team_a: TBD,
    team_b: TBD,
    kickoff: '2026-07-18T20:00:00Z',
    venue: 'Hard Rock Stadium',
    city: 'Miami',
    multiplier: STAGE_MULTIPLIER.third,
  })

  // Final — 1 match (July 19)
  matches.push({
    match_number: matchNum++,
    stage: 'final',
    group_letter: null,
    team_a: TBD,
    team_b: TBD,
    kickoff: '2026-07-19T20:00:00Z',
    venue: 'MetLife Stadium',
    city: 'New York/New Jersey',
    multiplier: STAGE_MULTIPLIER.final,
  })

  return matches
}

// ── Mock match intelligence data ────────────────────────────
// (In production, this would come from a football data API)

export interface TeamIntel {
  form: ('W' | 'D' | 'L')[] // Last 5 results
  qualification: { position: number; w: number; d: number; l: number; gf: number; ga: number }
  recentMatches: { opponent: string; opponentFlag: string; score: string; result: 'W' | 'D' | 'L' }[]
}

export const TEAM_INTEL: Record<string, TeamIntel> = {
  USA: {
    form: ['W', 'W', 'D', 'W', 'L'],
    qualification: { position: 1, w: 8, d: 2, l: 4, gf: 22, ga: 14 },
    recentMatches: [
      { opponent: 'Mexico', opponentFlag: '🇲🇽', score: '2-1', result: 'W' },
      { opponent: 'Canada', opponentFlag: '🇨🇦', score: '1-0', result: 'W' },
      { opponent: 'Costa Rica', opponentFlag: '🇨🇷', score: '1-1', result: 'D' },
    ],
  },
  COL: {
    form: ['W', 'D', 'W', 'W', 'D'],
    qualification: { position: 2, w: 7, d: 4, l: 3, gf: 19, ga: 11 },
    recentMatches: [
      { opponent: 'Argentina', opponentFlag: '🇦🇷', score: '1-1', result: 'D' },
      { opponent: 'Brazil', opponentFlag: '🇧🇷', score: '2-1', result: 'W' },
      { opponent: 'Ecuador', opponentFlag: '🇪🇨', score: '3-0', result: 'W' },
    ],
  },
  ARG: {
    form: ['W', 'W', 'W', 'D', 'W'],
    qualification: { position: 1, w: 11, d: 3, l: 0, gf: 28, ga: 8 },
    recentMatches: [
      { opponent: 'Brazil', opponentFlag: '🇧🇷', score: '1-0', result: 'W' },
      { opponent: 'Colombia', opponentFlag: '🇨🇴', score: '1-1', result: 'D' },
      { opponent: 'Uruguay', opponentFlag: '🇺🇾', score: '3-1', result: 'W' },
    ],
  },
  BRA: {
    form: ['W', 'L', 'W', 'D', 'W'],
    qualification: { position: 3, w: 8, d: 2, l: 4, gf: 24, ga: 16 },
    recentMatches: [
      { opponent: 'Argentina', opponentFlag: '🇦🇷', score: '0-1', result: 'L' },
      { opponent: 'Peru', opponentFlag: '🇵🇪', score: '4-0', result: 'W' },
      { opponent: 'Chile', opponentFlag: '🇨🇱', score: '2-1', result: 'W' },
    ],
  },
  FRA: {
    form: ['W', 'W', 'D', 'W', 'W'],
    qualification: { position: 1, w: 7, d: 1, l: 0, gf: 20, ga: 4 },
    recentMatches: [
      { opponent: 'Germany', opponentFlag: '🇩🇪', score: '2-0', result: 'W' },
      { opponent: 'Italy', opponentFlag: '🇮🇹', score: '3-1', result: 'W' },
      { opponent: 'Belgium', opponentFlag: '🇧🇪', score: '1-1', result: 'D' },
    ],
  },
  GER: {
    form: ['L', 'W', 'W', 'D', 'W'],
    qualification: { position: 2, w: 6, d: 2, l: 0, gf: 18, ga: 7 },
    recentMatches: [
      { opponent: 'France', opponentFlag: '🇫🇷', score: '0-2', result: 'L' },
      { opponent: 'Netherlands', opponentFlag: '🇳🇱', score: '2-1', result: 'W' },
      { opponent: 'Spain', opponentFlag: '🇪🇸', score: '1-1', result: 'D' },
    ],
  },
  ENG: {
    form: ['W', 'W', 'L', 'W', 'W'],
    qualification: { position: 1, w: 7, d: 1, l: 0, gf: 22, ga: 5 },
    recentMatches: [
      { opponent: 'Germany', opponentFlag: '🇩🇪', score: '3-0', result: 'W' },
      { opponent: 'Italy', opponentFlag: '🇮🇹', score: '0-1', result: 'L' },
      { opponent: 'Netherlands', opponentFlag: '🇳🇱', score: '2-1', result: 'W' },
    ],
  },
  ESP: {
    form: ['W', 'D', 'W', 'W', 'W'],
    qualification: { position: 1, w: 8, d: 2, l: 0, gf: 25, ga: 5 },
    recentMatches: [
      { opponent: 'Portugal', opponentFlag: '🇵🇹', score: '2-0', result: 'W' },
      { opponent: 'Italy', opponentFlag: '🇮🇹', score: '1-1', result: 'D' },
      { opponent: 'Germany', opponentFlag: '🇩🇪', score: '2-1', result: 'W' },
    ],
  },
  POR: {
    form: ['W', 'W', 'L', 'W', 'D'],
    qualification: { position: 2, w: 6, d: 2, l: 0, gf: 17, ga: 6 },
    recentMatches: [
      { opponent: 'Spain', opponentFlag: '🇪🇸', score: '0-2', result: 'L' },
      { opponent: 'Switzerland', opponentFlag: '🇨🇭', score: '4-0', result: 'W' },
      { opponent: 'Croatia', opponentFlag: '🇭🇷', score: '2-1', result: 'W' },
    ],
  },
  ITA: {
    form: ['W', 'D', 'W', 'L', 'W'],
    qualification: { position: 1, w: 6, d: 2, l: 0, gf: 16, ga: 5 },
    recentMatches: [
      { opponent: 'England', opponentFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', score: '1-0', result: 'W' },
      { opponent: 'France', opponentFlag: '🇫🇷', score: '1-3', result: 'L' },
      { opponent: 'Belgium', opponentFlag: '🇧🇪', score: '2-1', result: 'W' },
    ],
  },
  NED: {
    form: ['W', 'L', 'W', 'W', 'D'],
    qualification: { position: 2, w: 5, d: 3, l: 0, gf: 15, ga: 7 },
    recentMatches: [
      { opponent: 'Germany', opponentFlag: '🇩🇪', score: '1-2', result: 'L' },
      { opponent: 'Belgium', opponentFlag: '🇧🇪', score: '3-0', result: 'W' },
      { opponent: 'England', opponentFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', score: '1-2', result: 'L' },
    ],
  },
  JPN: {
    form: ['W', 'W', 'W', 'D', 'W'],
    qualification: { position: 1, w: 7, d: 1, l: 0, gf: 20, ga: 3 },
    recentMatches: [
      { opponent: 'Australia', opponentFlag: '🇦🇺', score: '3-0', result: 'W' },
      { opponent: 'Saudi Arabia', opponentFlag: '🇸🇦', score: '2-0', result: 'W' },
      { opponent: 'Iran', opponentFlag: '🇮🇷', score: '1-1', result: 'D' },
    ],
  },
  MEX: {
    form: ['L', 'W', 'D', 'W', 'L'],
    qualification: { position: 3, w: 7, d: 3, l: 4, gf: 18, ga: 15 },
    recentMatches: [
      { opponent: 'USA', opponentFlag: '🇺🇸', score: '1-2', result: 'L' },
      { opponent: 'Canada', opponentFlag: '🇨🇦', score: '2-0', result: 'W' },
      { opponent: 'Honduras', opponentFlag: '🇭🇳', score: '0-0', result: 'D' },
    ],
  },
}

// Fallback for teams without intel
export const DEFAULT_INTEL: TeamIntel = {
  form: ['D', 'W', 'L', 'W', 'D'],
  qualification: { position: 3, w: 4, d: 3, l: 3, gf: 12, ga: 10 },
  recentMatches: [
    { opponent: 'Unknown', opponentFlag: '🏳️', score: '1-1', result: 'D' },
    { opponent: 'Unknown', opponentFlag: '🏳️', score: '2-0', result: 'W' },
    { opponent: 'Unknown', opponentFlag: '🏳️', score: '0-1', result: 'L' },
  ],
}

export function getTeamIntel(code: string): TeamIntel {
  return TEAM_INTEL[code] ?? DEFAULT_INTEL
}

// ── Head-to-head data ───────────────────────────────────────
export interface H2HRecord {
  matches: number
  teamAWins: number
  draws: number
  teamBWins: number
  lastMet: string | null // "2022 World Cup Final" or null
}

// Some notable H2H matchups
const H2H_DATA: Record<string, H2HRecord> = {
  'ARG-FRA': { matches: 4, teamAWins: 2, draws: 1, teamBWins: 1, lastMet: '2022 World Cup Final' },
  'USA-MEX': { matches: 18, teamAWins: 8, draws: 3, teamBWins: 7, lastMet: '2025 CONCACAF Nations League' },
  'BRA-ARG': { matches: 22, teamAWins: 9, draws: 5, teamBWins: 8, lastMet: '2025 WCQ' },
  'GER-NED': { matches: 15, teamAWins: 6, draws: 4, teamBWins: 5, lastMet: '2024 Euro' },
  'ENG-GER': { matches: 12, teamAWins: 5, draws: 3, teamBWins: 4, lastMet: '2024 Euro' },
  'ESP-POR': { matches: 10, teamAWins: 4, draws: 3, teamBWins: 3, lastMet: '2024 Euro' },
  'BRA-COL': { matches: 14, teamAWins: 7, draws: 3, teamBWins: 4, lastMet: '2025 WCQ' },
  'USA-COL': { matches: 6, teamAWins: 2, draws: 2, teamBWins: 2, lastMet: '2024 Copa America' },
}

export function getH2H(codeA: string, codeB: string): H2HRecord | null {
  return H2H_DATA[`${codeA}-${codeB}`] ?? H2H_DATA[`${codeB}-${codeA}`] ?? null
}

// ── Scoring helpers ─────────────────────────────────────────
export const LOCK_DEADLINE = new Date('2026-06-11T15:00:00Z') // 1 hour before first match
