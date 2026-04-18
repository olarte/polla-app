'use client'

import type { Database } from '@/lib/database.types'
import ParlayTab from '@/app/components/parlay/ParlayTab'

type Match = Database['public']['Tables']['matches']['Row']

interface MatchTabsProps {
  match: Match
}

export default function MatchTabs({ match }: MatchTabsProps) {
  const matchLabel = `${match.team_a_name} vs ${match.team_b_name}`
  return (
    <ParlayTab
      matchId={match.id}
      matchLabel={matchLabel}
      kickoffIso={match.kickoff}
      home={{ flag: match.team_a_flag, code: match.team_a_code }}
      away={{ flag: match.team_b_flag, code: match.team_b_code }}
    />
  )
}
