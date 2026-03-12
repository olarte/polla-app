'use client'

import Card from '../../components/Card'
import Label from '../../components/Label'

export default function PollasPage() {
  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Pollas</h1>
        <button className="px-4 py-2 rounded-xl bg-btn-primary text-xs font-bold active:scale-[0.97] transition-transform">
          + Create Polla
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['All', 'Free', 'Paid'].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              i === 0
                ? 'bg-polla-accent/20 text-polla-accent border border-polla-accent/30'
                : 'bg-card border border-card-border text-text-40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <Card className="text-center py-12">
        <span className="text-4xl block mb-3">🐔</span>
        <p className="text-text-70 text-sm font-semibold mb-1">No pollas yet</p>
        <p className="text-text-35 text-xs max-w-[220px] mx-auto">
          Create a group with friends or join one to start competing
        </p>
      </Card>

      {/* Join section */}
      <div>
        <Label>Join a Polla</Label>
        <Card className="mt-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter invite code"
              className="flex-1 bg-white/[0.03] border border-card-border rounded-lg px-3 py-2.5 text-sm text-text-70 placeholder:text-text-25 outline-none focus:border-polla-accent/40 transition-colors"
            />
            <button className="px-4 py-2.5 rounded-lg bg-polla-secondary border border-card-border text-xs font-semibold text-text-70 active:scale-[0.97] transition-transform">
              Join
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
