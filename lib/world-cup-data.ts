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
}

// ── Venues ──────────────────────────────────────────────────
export const VENUES = [
  { name: 'MetLife Stadium', city: 'East Rutherford' },
  { name: 'AT&T Stadium', city: 'Arlington' },
  { name: 'SoFi Stadium', city: 'Inglewood' },
  { name: 'Hard Rock Stadium', city: 'Miami Gardens' },
  { name: 'Lumen Field', city: 'Seattle' },
  { name: 'NRG Stadium', city: 'Houston' },
  { name: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { name: 'Lincoln Financial Field', city: 'Philadelphia' },
  { name: "Levi's Stadium", city: 'Santa Clara' },
  { name: 'Arrowhead Stadium', city: 'Kansas City' },
  { name: 'Gillette Stadium', city: 'Foxborough' },
  { name: 'Estadio Azteca', city: 'Mexico City' },
  { name: 'Estadio BBVA', city: 'Monterrey' },
  { name: 'Estadio Akron', city: 'Zapopan' },
  { name: 'BMO Field', city: 'Toronto' },
  { name: 'BC Place', city: 'Vancouver' },
] as const

// ── Groups ──────────────────────────────────────────────────
export const GROUPS: GroupDef[] = [
  {
    letter: 'A',
    teams: [
      { name: 'Mexico', code: 'MEX', flag: '🇲🇽' },
      { name: 'South Africa', code: 'RSA', flag: '🇿🇦' },
      { name: 'South Korea', code: 'KOR', flag: '🇰🇷' },
      { name: 'Czechia', code: 'CZE', flag: '🇨🇿' },
    ],
  },
  {
    letter: 'B',
    teams: [
      { name: 'Canada', code: 'CAN', flag: '🇨🇦' },
      { name: 'Bosnia and Herzegovina', code: 'BIH', flag: '🇧🇦' },
      { name: 'Qatar', code: 'QAT', flag: '🇶🇦' },
      { name: 'Switzerland', code: 'SUI', flag: '🇨🇭' },
    ],
  },
  {
    letter: 'C',
    teams: [
      { name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
      { name: 'Morocco', code: 'MAR', flag: '🇲🇦' },
      { name: 'Haiti', code: 'HAI', flag: '🇭🇹' },
      { name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    ],
  },
  {
    letter: 'D',
    teams: [
      { name: 'United States', code: 'USA', flag: '🇺🇸' },
      { name: 'Paraguay', code: 'PAR', flag: '🇵🇾' },
      { name: 'Australia', code: 'AUS', flag: '🇦🇺' },
      { name: 'Türkiye', code: 'TUR', flag: '🇹🇷' },
    ],
  },
  {
    letter: 'E',
    teams: [
      { name: 'Germany', code: 'GER', flag: '🇩🇪' },
      { name: 'Curaçao', code: 'CUW', flag: '🇨🇼' },
      { name: 'Ivory Coast', code: 'CIV', flag: '🇨🇮' },
      { name: 'Ecuador', code: 'ECU', flag: '🇪🇨' },
    ],
  },
  {
    letter: 'F',
    teams: [
      { name: 'Netherlands', code: 'NED', flag: '🇳🇱' },
      { name: 'Japan', code: 'JPN', flag: '🇯🇵' },
      { name: 'Sweden', code: 'SWE', flag: '🇸🇪' },
      { name: 'Tunisia', code: 'TUN', flag: '🇹🇳' },
    ],
  },
  {
    letter: 'G',
    teams: [
      { name: 'Belgium', code: 'BEL', flag: '🇧🇪' },
      { name: 'Egypt', code: 'EGY', flag: '🇪🇬' },
      { name: 'Iran', code: 'IRN', flag: '🇮🇷' },
      { name: 'New Zealand', code: 'NZL', flag: '🇳🇿' },
    ],
  },
  {
    letter: 'H',
    teams: [
      { name: 'Spain', code: 'ESP', flag: '🇪🇸' },
      { name: 'Cape Verde', code: 'CPV', flag: '🇨🇻' },
      { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦' },
      { name: 'Uruguay', code: 'URU', flag: '🇺🇾' },
    ],
  },
  {
    letter: 'I',
    teams: [
      { name: 'France', code: 'FRA', flag: '🇫🇷' },
      { name: 'Senegal', code: 'SEN', flag: '🇸🇳' },
      { name: 'Iraq', code: 'IRQ', flag: '🇮🇶' },
      { name: 'Norway', code: 'NOR', flag: '🇳🇴' },
    ],
  },
  {
    letter: 'J',
    teams: [
      { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
      { name: 'Algeria', code: 'ALG', flag: '🇩🇿' },
      { name: 'Austria', code: 'AUT', flag: '🇦🇹' },
      { name: 'Jordan', code: 'JOR', flag: '🇯🇴' },
    ],
  },
  {
    letter: 'K',
    teams: [
      { name: 'Portugal', code: 'POR', flag: '🇵🇹' },
      { name: 'DR Congo', code: 'COD', flag: '🇨🇩' },
      { name: 'Uzbekistan', code: 'UZB', flag: '🇺🇿' },
      { name: 'Colombia', code: 'COL', flag: '🇨🇴' },
    ],
  },
  {
    letter: 'L',
    teams: [
      { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Croatia', code: 'CRO', flag: '🇭🇷' },
      { name: 'Ghana', code: 'GHA', flag: '🇬🇭' },
      { name: 'Panama', code: 'PAN', flag: '🇵🇦' },
    ],
  },
]

// ── All teams flat list (for dropdowns) ─────────────────────
export const ALL_TEAMS: Team[] = GROUPS.flatMap((g) => g.teams)

// ── Official FIFA World Cup 2026 match schedule ─────────────
// Source: FIFA final draw (Dec 5, 2025) + official match schedule.
// All kickoff times below are Eastern Time (EDT = UTC−4 in June/July).

const TEAM_BY_CODE: Record<string, Team> = Object.fromEntries(
  ALL_TEAMS.map((t) => [t.code, t])
)

function tbdTeam(label: string): Team {
  return { name: label, code: label, flag: '🏳️' }
}

function etToUtcISO(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h + 4, mi)).toISOString()
}

// [match_number, group, teamA_code, teamB_code, date, ET_time, venue, city]
type GroupRow = [number, string, string, string, string, string, string, string]

const GROUP_SCHEDULE: GroupRow[] = [
  [1,  'A', 'MEX', 'RSA', '2026-06-11', '15:00', 'Estadio Azteca',          'Mexico City'],
  [2,  'A', 'KOR', 'CZE', '2026-06-11', '22:00', 'Estadio Akron',           'Zapopan'],
  [3,  'B', 'CAN', 'BIH', '2026-06-12', '15:00', 'BMO Field',               'Toronto'],
  [4,  'D', 'USA', 'PAR', '2026-06-12', '21:00', 'SoFi Stadium',            'Inglewood'],
  [5,  'D', 'AUS', 'TUR', '2026-06-13', '00:00', 'BC Place',                'Vancouver'],
  [6,  'B', 'QAT', 'SUI', '2026-06-13', '15:00', "Levi's Stadium",          'Santa Clara'],
  [7,  'C', 'BRA', 'MAR', '2026-06-13', '18:00', 'MetLife Stadium',         'East Rutherford'],
  [8,  'C', 'HAI', 'SCO', '2026-06-13', '21:00', 'Gillette Stadium',        'Foxborough'],
  [9,  'E', 'GER', 'CUW', '2026-06-14', '13:00', 'NRG Stadium',             'Houston'],
  [10, 'F', 'NED', 'JPN', '2026-06-14', '16:00', 'AT&T Stadium',            'Arlington'],
  [11, 'E', 'CIV', 'ECU', '2026-06-14', '19:00', 'Lincoln Financial Field', 'Philadelphia'],
  [12, 'F', 'SWE', 'TUN', '2026-06-14', '22:00', 'Estadio BBVA',            'Monterrey'],
  [13, 'H', 'ESP', 'CPV', '2026-06-15', '12:00', 'Mercedes-Benz Stadium',   'Atlanta'],
  [14, 'G', 'BEL', 'EGY', '2026-06-15', '15:00', 'Lumen Field',             'Seattle'],
  [15, 'H', 'KSA', 'URU', '2026-06-15', '18:00', 'Hard Rock Stadium',       'Miami Gardens'],
  [16, 'G', 'IRN', 'NZL', '2026-06-15', '21:00', 'SoFi Stadium',            'Inglewood'],
  [17, 'I', 'FRA', 'SEN', '2026-06-16', '15:00', 'MetLife Stadium',         'East Rutherford'],
  [18, 'I', 'IRQ', 'NOR', '2026-06-16', '18:00', 'Gillette Stadium',        'Foxborough'],
  [19, 'J', 'ARG', 'ALG', '2026-06-16', '21:00', 'Arrowhead Stadium',       'Kansas City'],
  [20, 'J', 'AUT', 'JOR', '2026-06-17', '00:00', "Levi's Stadium",          'Santa Clara'],
  [21, 'K', 'POR', 'COD', '2026-06-17', '13:00', 'NRG Stadium',             'Houston'],
  [22, 'L', 'ENG', 'CRO', '2026-06-17', '16:00', 'AT&T Stadium',            'Arlington'],
  [23, 'L', 'GHA', 'PAN', '2026-06-17', '19:00', 'BMO Field',               'Toronto'],
  [24, 'K', 'UZB', 'COL', '2026-06-17', '22:00', 'Estadio Azteca',          'Mexico City'],
  [25, 'A', 'CZE', 'RSA', '2026-06-18', '12:00', 'Mercedes-Benz Stadium',   'Atlanta'],
  [26, 'B', 'SUI', 'BIH', '2026-06-18', '15:00', 'SoFi Stadium',            'Inglewood'],
  [27, 'B', 'CAN', 'QAT', '2026-06-18', '18:00', 'BC Place',                'Vancouver'],
  [28, 'A', 'MEX', 'KOR', '2026-06-18', '21:00', 'Estadio Akron',           'Zapopan'],
  [29, 'D', 'TUR', 'PAR', '2026-06-19', '00:00', "Levi's Stadium",          'Santa Clara'],
  [30, 'D', 'USA', 'AUS', '2026-06-19', '15:00', 'Lumen Field',             'Seattle'],
  [31, 'C', 'SCO', 'MAR', '2026-06-19', '18:00', 'Gillette Stadium',        'Foxborough'],
  [32, 'C', 'BRA', 'HAI', '2026-06-19', '21:00', 'Lincoln Financial Field', 'Philadelphia'],
  [33, 'F', 'TUN', 'JPN', '2026-06-20', '00:00', 'Estadio BBVA',            'Monterrey'],
  [34, 'F', 'NED', 'SWE', '2026-06-20', '13:00', 'NRG Stadium',             'Houston'],
  [35, 'E', 'GER', 'CIV', '2026-06-20', '16:00', 'BMO Field',               'Toronto'],
  [36, 'E', 'ECU', 'CUW', '2026-06-20', '20:00', 'Arrowhead Stadium',       'Kansas City'],
  [37, 'H', 'ESP', 'KSA', '2026-06-21', '12:00', 'Mercedes-Benz Stadium',   'Atlanta'],
  [38, 'G', 'BEL', 'IRN', '2026-06-21', '15:00', 'SoFi Stadium',            'Inglewood'],
  [39, 'H', 'URU', 'CPV', '2026-06-21', '18:00', 'Hard Rock Stadium',       'Miami Gardens'],
  [40, 'G', 'NZL', 'EGY', '2026-06-21', '21:00', 'BC Place',                'Vancouver'],
  [41, 'J', 'ARG', 'AUT', '2026-06-22', '13:00', 'AT&T Stadium',            'Arlington'],
  [42, 'I', 'FRA', 'IRQ', '2026-06-22', '17:00', 'Lincoln Financial Field', 'Philadelphia'],
  [43, 'I', 'NOR', 'SEN', '2026-06-22', '20:00', 'MetLife Stadium',         'East Rutherford'],
  [44, 'J', 'JOR', 'ALG', '2026-06-22', '23:00', "Levi's Stadium",          'Santa Clara'],
  [45, 'K', 'POR', 'UZB', '2026-06-23', '13:00', 'NRG Stadium',             'Houston'],
  [46, 'L', 'ENG', 'GHA', '2026-06-23', '16:00', 'Gillette Stadium',        'Foxborough'],
  [47, 'L', 'PAN', 'CRO', '2026-06-23', '19:00', 'BMO Field',               'Toronto'],
  [48, 'K', 'COL', 'COD', '2026-06-23', '22:00', 'Estadio Akron',           'Zapopan'],
  [49, 'B', 'SUI', 'CAN', '2026-06-24', '15:00', 'BC Place',                'Vancouver'],
  [50, 'B', 'BIH', 'QAT', '2026-06-24', '15:00', 'Lumen Field',             'Seattle'],
  [51, 'C', 'SCO', 'BRA', '2026-06-24', '18:00', 'Hard Rock Stadium',       'Miami Gardens'],
  [52, 'C', 'MAR', 'HAI', '2026-06-24', '18:00', 'Mercedes-Benz Stadium',   'Atlanta'],
  [53, 'A', 'CZE', 'MEX', '2026-06-24', '21:00', 'Estadio Azteca',          'Mexico City'],
  [54, 'A', 'RSA', 'KOR', '2026-06-24', '21:00', 'Estadio BBVA',            'Monterrey'],
  [55, 'E', 'CUW', 'CIV', '2026-06-25', '16:00', 'Lincoln Financial Field', 'Philadelphia'],
  [56, 'E', 'ECU', 'GER', '2026-06-25', '16:00', 'MetLife Stadium',         'East Rutherford'],
  [57, 'F', 'JPN', 'SWE', '2026-06-25', '19:00', 'AT&T Stadium',            'Arlington'],
  [58, 'F', 'TUN', 'NED', '2026-06-25', '19:00', 'Arrowhead Stadium',       'Kansas City'],
  [59, 'D', 'TUR', 'USA', '2026-06-25', '22:00', 'SoFi Stadium',            'Inglewood'],
  [60, 'D', 'PAR', 'AUS', '2026-06-25', '22:00', "Levi's Stadium",          'Santa Clara'],
  [61, 'I', 'NOR', 'FRA', '2026-06-26', '15:00', 'Gillette Stadium',        'Foxborough'],
  [62, 'I', 'SEN', 'IRQ', '2026-06-26', '15:00', 'BMO Field',               'Toronto'],
  [63, 'H', 'CPV', 'KSA', '2026-06-26', '20:00', 'NRG Stadium',             'Houston'],
  [64, 'H', 'URU', 'ESP', '2026-06-26', '20:00', 'Estadio Akron',           'Zapopan'],
  [65, 'G', 'EGY', 'IRN', '2026-06-26', '23:00', 'Lumen Field',             'Seattle'],
  [66, 'G', 'NZL', 'BEL', '2026-06-26', '23:00', 'BC Place',                'Vancouver'],
  [67, 'L', 'PAN', 'ENG', '2026-06-27', '17:00', 'MetLife Stadium',         'East Rutherford'],
  [68, 'L', 'CRO', 'GHA', '2026-06-27', '17:00', 'Lincoln Financial Field', 'Philadelphia'],
  [69, 'K', 'COL', 'POR', '2026-06-27', '19:30', 'Hard Rock Stadium',       'Miami Gardens'],
  [70, 'K', 'COD', 'UZB', '2026-06-27', '19:30', 'Mercedes-Benz Stadium',   'Atlanta'],
  [71, 'J', 'ALG', 'AUT', '2026-06-27', '22:00', 'Arrowhead Stadium',       'Kansas City'],
  [72, 'J', 'JOR', 'ARG', '2026-06-27', '22:00', 'AT&T Stadium',            'Arlington'],
]

// Knockout bracket — teams are bracket slot labels until groups resolve.
// Labels: "1A" = Group A winner, "2A" = Group A runner-up,
// "3ABCDF" = best 3rd-placed team from groups A/B/C/D/F,
// "W73" = winner of match 73, "L101" = loser of match 101.
type KoRow = [number, MatchDef['stage'], string, string, string, string, string, string]

const KO_SCHEDULE: KoRow[] = [
  [73,  'r32',   '2A',      '2B',      '2026-06-28', '15:00', 'SoFi Stadium',            'Inglewood'],
  [74,  'r32',   '1C',      '2F',      '2026-06-29', '13:00', 'NRG Stadium',             'Houston'],
  [75,  'r32',   '1E',      '3ABCDF',  '2026-06-29', '16:30', 'Gillette Stadium',        'Foxborough'],
  [76,  'r32',   '1F',      '2C',      '2026-06-29', '21:00', 'Estadio BBVA',            'Monterrey'],
  [77,  'r32',   '1I',      '3CDFGH',  '2026-06-30', '17:00', 'MetLife Stadium',         'East Rutherford'],
  [78,  'r32',   '2E',      '2I',      '2026-06-30', '13:00', 'AT&T Stadium',            'Arlington'],
  [79,  'r32',   '1A',      '3CEFHI',  '2026-06-30', '21:00', 'Estadio Azteca',          'Mexico City'],
  [80,  'r32',   '1L',      '3EHIJK',  '2026-07-01', '12:00', 'Mercedes-Benz Stadium',   'Atlanta'],
  [81,  'r32',   '1D',      '3BEFIJ',  '2026-07-01', '20:00', "Levi's Stadium",          'Santa Clara'],
  [82,  'r32',   '1G',      '3AEHIJ',  '2026-07-01', '16:00', 'Lumen Field',             'Seattle'],
  [83,  'r32',   '2K',      '2L',      '2026-07-02', '19:00', 'BMO Field',               'Toronto'],
  [84,  'r32',   '1H',      '2J',      '2026-07-02', '15:00', 'SoFi Stadium',            'Inglewood'],
  [85,  'r32',   '1B',      '3EFGIJ',  '2026-07-02', '23:00', 'BC Place',                'Vancouver'],
  [86,  'r32',   '1J',      '2H',      '2026-07-03', '18:00', 'Hard Rock Stadium',       'Miami Gardens'],
  [87,  'r32',   '1K',      '3DEIJL',  '2026-07-03', '21:30', 'Arrowhead Stadium',       'Kansas City'],
  [88,  'r32',   '2D',      '2G',      '2026-07-03', '14:00', 'AT&T Stadium',            'Arlington'],

  [89,  'r16',   'W74',     'W77',     '2026-07-04', '17:00', 'Lincoln Financial Field', 'Philadelphia'],
  [90,  'r16',   'W73',     'W75',     '2026-07-04', '13:00', 'NRG Stadium',             'Houston'],
  [91,  'r16',   'W76',     'W78',     '2026-07-05', '16:00', 'MetLife Stadium',         'East Rutherford'],
  [92,  'r16',   'W79',     'W80',     '2026-07-05', '20:00', 'Estadio Azteca',          'Mexico City'],
  [93,  'r16',   'W83',     'W84',     '2026-07-06', '15:00', 'AT&T Stadium',            'Arlington'],
  [94,  'r16',   'W81',     'W82',     '2026-07-06', '20:00', 'Lumen Field',             'Seattle'],
  [95,  'r16',   'W86',     'W88',     '2026-07-07', '12:00', 'Mercedes-Benz Stadium',   'Atlanta'],
  [96,  'r16',   'W85',     'W87',     '2026-07-07', '16:00', 'BC Place',                'Vancouver'],

  [97,  'qf',    'W89',     'W90',     '2026-07-09', '16:00', 'Gillette Stadium',        'Foxborough'],
  [98,  'qf',    'W93',     'W94',     '2026-07-10', '15:00', 'SoFi Stadium',            'Inglewood'],
  [99,  'qf',    'W91',     'W92',     '2026-07-11', '17:00', 'Hard Rock Stadium',       'Miami Gardens'],
  [100, 'qf',    'W95',     'W96',     '2026-07-11', '21:00', 'Arrowhead Stadium',       'Kansas City'],

  [101, 'sf',    'W97',     'W98',     '2026-07-14', '15:00', 'AT&T Stadium',            'Arlington'],
  [102, 'sf',    'W99',     'W100',    '2026-07-15', '15:00', 'Mercedes-Benz Stadium',   'Atlanta'],

  [103, 'third', 'L101',    'L102',    '2026-07-18', '17:00', 'Hard Rock Stadium',       'Miami Gardens'],
  [104, 'final', 'W101',    'W102',    '2026-07-19', '15:00', 'MetLife Stadium',         'East Rutherford'],
]

// ── Generate all 104 matches ────────────────────────────────
export function generateAllMatches(): MatchDef[] {
  const matches: MatchDef[] = []

  for (const [num, group, a, b, date, time, venue, city] of GROUP_SCHEDULE) {
    matches.push({
      match_number: num,
      stage: 'group',
      group_letter: group,
      team_a: TEAM_BY_CODE[a],
      team_b: TEAM_BY_CODE[b],
      kickoff: etToUtcISO(date, time),
      venue,
      city,
    })
  }

  for (const [num, stage, a, b, date, time, venue, city] of KO_SCHEDULE) {
    matches.push({
      match_number: num,
      stage,
      group_letter: null,
      team_a: tbdTeam(a),
      team_b: tbdTeam(b),
      kickoff: etToUtcISO(date, time),
      venue,
      city,
    })
  }

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
// Predictions lock at the exact kickoff of the opening match:
// Mexico vs South Africa, Jun 11 2026, 15:00 ET (19:00 UTC).
export const LOCK_DEADLINE = new Date('2026-06-11T19:00:00Z')
