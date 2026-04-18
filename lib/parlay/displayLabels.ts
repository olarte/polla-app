/**
 * Replace "Home" / "Away" tokens in question prompts and option labels
 * with the actual team flag + code. Used at render time so existing
 * parlay_questions rows (seeded with generic Home/Away templates) show
 * per-match branding without a DB migration.
 *
 * In Sabi's schema: team_a = home, team_b = away (matches football-data's
 * homeTeam/awayTeam assignment in the seed script).
 */

export interface TeamRef {
  flag: string
  code: string
}

function buildLabel(t: TeamRef): string {
  return `${t.flag} ${t.code}`
}

function substitute(text: string, home: TeamRef, away: TeamRef): string {
  const homeLabel = buildLabel(home)
  const awayLabel = buildLabel(away)
  return text
    .replace(/\bHome team\b/g, homeLabel)
    .replace(/\bAway team\b/g, awayLabel)
    .replace(/\bHome\b/g, homeLabel)
    .replace(/\bAway\b/g, awayLabel)
}

export interface LabelledQuestion {
  id: string
  slot: number
  prompt: string
  option_a_label: string
  option_b_label: string
  resolution?: 'A' | 'B' | 'void' | null
}

export function applyTeamLabels<Q extends LabelledQuestion>(
  questions: Q[],
  home: TeamRef,
  away: TeamRef,
): Q[] {
  return questions.map(q => ({
    ...q,
    prompt: substitute(q.prompt, home, away),
    option_a_label: substitute(q.option_a_label, home, away),
    option_b_label: substitute(q.option_b_label, home, away),
  }))
}
