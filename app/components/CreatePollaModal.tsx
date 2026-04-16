'use client'

import { useState } from 'react'
import Card from './Card'
import Label from './Label'

interface CreatePollaModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (group: any) => void
}

const POOL_EMOJIS = ['⚽', '🏆', '🔥', '🎯', '👑', '🦁', '🐉', '🎪', '🌟', '💎', '🦅', '⛱️']

const PAYOUT_MODELS = [
  { value: 'winner_takes_all', label: 'Winner Takes All', desc: '100% to 1st', icon: '👑' },
  { value: 'podium_split', label: 'Podium Split', desc: '60/25/15 top 3', icon: '🏅' },
]

export default function CreatePollaModal({ isOpen, onClose, onCreated }: CreatePollaModalProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('⚽')
  const [entryFee, setEntryFee] = useState('10')
  const [payoutModel, setPayoutModel] = useState('podium_split')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const reset = () => {
    setStep(1)
    setName('')
    setEmoji('⚽')
    setEntryFee('10')
    setPayoutModel('podium_split')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          emoji,
          entry_fee: Number(entryFee),
          payout_model: payoutModel,
          global_allocation: 20,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create group')
        return
      }

      onCreated(data.group)
      handleClose()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-polla-bg border-t border-card-border rounded-t-2xl p-5 pb-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Create a Pool</h2>
          <button onClick={handleClose} className="text-text-40 text-xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-polla-accent/10 border border-polla-accent/20 text-polla-accent text-xs">
            {error}
          </div>
        )}

        {/* Step 1: Name + Emoji */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Pool Name</Label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Office World Cup"
                maxLength={40}
                className="mt-1.5 w-full bg-white/[0.03] border border-card-border rounded-lg px-3 py-2.5 text-sm text-text-70 placeholder:text-text-25 outline-none focus:border-polla-accent/40 transition-colors"
              />
            </div>

            <div>
              <Label>Emoji</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {POOL_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      emoji === e
                        ? 'bg-polla-accent/20 border-2 border-polla-accent scale-110'
                        : 'bg-white/[0.03] border border-card-border'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (name.length < 2) {
                  setError('Name must be at least 2 characters')
                  return
                }
                setError('')
                setStep(2)
              }}
              className="w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Entry fee + payout */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Entry Fee (USD)</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-text-40 text-sm">$</span>
                <input
                  type="number"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  min={1}
                  className="flex-1 bg-white/[0.03] border border-card-border rounded-lg px-3 py-2.5 text-sm text-text-70 outline-none focus:border-polla-accent/40 transition-colors num"
                />
              </div>
              <p className="text-text-25 text-[10px] mt-1">A 5% service fee is deducted from the pool.</p>
            </div>

            <div>
              <Label>Payout Model</Label>
              <div className="mt-1.5 space-y-2">
                {PAYOUT_MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPayoutModel(m.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      payoutModel === m.value
                        ? 'bg-polla-accent/10 border-2 border-polla-accent/40'
                        : 'bg-white/[0.03] border border-card-border'
                    }`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-text-70">{m.label}</p>
                      <p className="text-[10px] text-text-35">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl bg-card border border-card-border text-sm font-semibold text-text-40 active:scale-[0.97] transition-transform"
              >
                Back
              </button>
              <button
                onClick={() => {
                  const fee = Number(entryFee)
                  if (!Number.isFinite(fee) || fee < 1) {
                    setError('Entry fee must be at least $1')
                    return
                  }
                  setError('')
                  setStep(3)
                }}
                className="flex-1 py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <div className="text-center mb-3">
                <span className="text-4xl">{emoji}</span>
                <p className="text-lg font-bold mt-2">{name}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-40">Entry Fee</span>
                  <span className="num font-semibold">${Number(entryFee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-40">Payout</span>
                  <span className="font-semibold">
                    {PAYOUT_MODELS.find((m) => m.value === payoutModel)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-40">Global Pool</span>
                  <span className="num font-semibold">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-40">Service Fee</span>
                  <span className="num font-semibold text-text-35">5%</span>
                </div>
              </div>
            </Card>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl bg-card border border-card-border text-sm font-semibold text-text-40 active:scale-[0.97] transition-transform"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create Pool'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
