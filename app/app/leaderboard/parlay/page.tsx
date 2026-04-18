import Link from 'next/link'
import LeaderboardTabs from './LeaderboardTabs'
import { PARLAY_COPY } from '@/lib/parlay/copy'

export default function ParlayLeaderboardPage() {
  return (
    <div className="px-4 pt-3 pb-6 space-y-5">
      <Link
        href="/app"
        className="text-text-40 text-sm font-medium active:text-white transition-colors"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-bold">{PARLAY_COPY.leaderboardTitle}</h1>

      <LeaderboardTabs />
    </div>
  )
}
