import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase-server'
import MatchTabs from './MatchTabs'

interface PageProps {
  params: { id: string }
}

export default async function MatchDetailPage({ params }: PageProps) {
  const supabase = createSupabaseServer()
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!match) {
    notFound()
  }

  const kickoff = new Date(match.kickoff)
  const dateStr = kickoff.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = kickoff.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div className="px-4 pt-3 pb-6 space-y-5">
      <Link
        href="/app"
        className="text-text-40 text-sm font-medium active:text-white transition-colors"
      >
        ← Back
      </Link>

      <div className="text-center">
        <p className="text-text-40 text-[10px] mb-3">
          {dateStr} · {timeStr} · {match.venue}
        </p>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-4xl block mb-1">{match.team_a_flag}</span>
            <span className="text-sm font-bold">{match.team_a_name}</span>
          </div>
          <span className="text-text-25 text-lg font-bold">vs</span>
          <div className="text-center">
            <span className="text-4xl block mb-1">{match.team_b_flag}</span>
            <span className="text-sm font-bold">{match.team_b_name}</span>
          </div>
        </div>
      </div>

      <MatchTabs match={match} />
    </div>
  )
}
