'use client'

import { useState } from 'react'
import type { Database } from '@/lib/database.types'
import BetCard from '@/app/components/BetCard'
import ConnectWalletPrompt from '@/app/components/ConnectWalletPrompt'
import ParlayTab from '@/app/components/parlay/ParlayTab'
import { PARLAY_COPY } from '@/lib/parlay/copy'

type Match = Database['public']['Tables']['matches']['Row']

interface MatchTabsProps {
  match: Match
}

type TabKey = 'winner' | 'parlay'

export default function MatchTabs({ match }: MatchTabsProps) {
  const [tab, setTab] = useState<TabKey>('winner')
  const [walletPrompt, setWalletPrompt] = useState(false)

  const matchLabel = `${match.team_a_name} vs ${match.team_b_name}`

  return (
    <>
      <div
        role="tablist"
        aria-label="Match markets"
        className="flex gap-1 bg-white/[0.03] rounded-xl p-1"
      >
        <TabBtn
          active={tab === 'winner'}
          onClick={() => setTab('winner')}
          label="Match Winner"
          id="tab-winner"
          panelId="panel-winner"
        />
        <TabBtn
          active={tab === 'parlay'}
          onClick={() => setTab('parlay')}
          label={PARLAY_COPY.tabLabel}
          subtitle={PARLAY_COPY.tabSubtitle}
          id="tab-parlay"
          panelId="panel-parlay"
        />
      </div>

      <div
        role="tabpanel"
        id="panel-winner"
        aria-labelledby="tab-winner"
        hidden={tab !== 'winner'}
      >
        {tab === 'winner' && (
          <BetCard
            match={{
              id: match.id,
              team_a_name: match.team_a_name,
              team_a_code: match.team_a_code,
              team_a_flag: match.team_a_flag,
              team_b_name: match.team_b_name,
              team_b_code: match.team_b_code,
              team_b_flag: match.team_b_flag,
              kickoff: match.kickoff,
              score_a: match.score_a,
              score_b: match.score_b,
              status: match.status,
            }}
            onWalletNeeded={() => setWalletPrompt(true)}
          />
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-parlay"
        aria-labelledby="tab-parlay"
        hidden={tab !== 'parlay'}
      >
        {tab === 'parlay' && (
          <ParlayTab matchId={match.id} matchLabel={matchLabel} kickoffIso={match.kickoff} />
        )}
      </div>

      {walletPrompt && (
        <ConnectWalletPrompt
          onClose={() => setWalletPrompt(false)}
          onConnected={() => setWalletPrompt(false)}
        />
      )}
    </>
  )
}

function TabBtn({
  active, onClick, label, subtitle, id, panelId,
}: {
  active: boolean
  onClick: () => void
  label: string
  subtitle?: string
  id: string
  panelId: string
}) {
  return (
    <button
      role="tab"
      id={id}
      aria-controls={panelId}
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 min-h-[48px] py-2 rounded-lg text-sm font-bold transition-colors flex flex-col items-center justify-center leading-tight ${
        active ? 'bg-polla-accent/20 text-polla-accent' : 'text-text-40'
      }`}
    >
      <span>{label}</span>
      {subtitle && (
        <span className="text-[10px] font-semibold tracking-wider opacity-70 mt-0.5">
          {subtitle}
        </span>
      )}
    </button>
  )
}
