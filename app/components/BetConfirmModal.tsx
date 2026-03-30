'use client'

export type BetStep = 'idle' | 'approving' | 'betting' | 'confirming' | 'confirmed' | 'error'

interface BetConfirmModalProps {
  matchLabel: string // e.g. "Brazil vs Morocco"
  outcomeLabel: string // e.g. "Brazil to win"
  amount: number
  odds: number
  step: BetStep
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export default function BetConfirmModal({
  matchLabel,
  outcomeLabel,
  amount,
  odds,
  step,
  error,
  onConfirm,
  onClose,
}: BetConfirmModalProps) {
  const payout = (amount * odds).toFixed(2)
  const isProcessing = step === 'approving' || step === 'betting' || step === 'confirming'
  const isDone = step === 'confirmed'

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
      <div className="w-full max-w-md bg-polla-bg border-t border-card-border rounded-t-2xl p-5 space-y-4 animate-slide-up">
        {isDone ? (
          <div className="text-center py-4 space-y-3">
            <span className="text-4xl block">🎉</span>
            <p className="text-lg font-bold">Bet placed!</p>
            <p className="text-text-40 text-sm">
              ${amount.toFixed(2)} on {outcomeLabel}
            </p>
            <p className="text-text-40 text-xs">Odds may shift as more bets come in.</p>
            <button
              onClick={onClose}
              className="w-full py-3 mt-2 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-text-40 text-xs uppercase tracking-wider">Confirm Bet</p>
              <p className="text-lg font-bold mt-1">{matchLabel}</p>
            </div>

            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-40 text-xs">Your pick</span>
                <span className="text-sm font-semibold">{outcomeLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-40 text-xs">Amount</span>
                <span className="num text-sm">${amount.toFixed(2)} USDC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-40 text-xs">Current payout</span>
                <span className="num text-sm text-polla-success">
                  ~${payout} ({odds.toFixed(1)}x)
                </span>
              </div>
            </div>

            <p className="text-text-25 text-[10px] text-center">
              Odds may change before kickoff. Payout calculated at market close.
            </p>

            {error && (
              <p className="text-polla-accent text-xs text-center">{error}</p>
            )}

            {/* Transaction step indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === 'approving'
                        ? 'bg-polla-accent animate-pulse'
                        : 'bg-polla-success'
                    }`}
                  >
                    {step === 'approving' ? '1' : '✓'}
                  </div>
                  <span className="text-text-40 text-[10px]">Approve</span>
                </div>
                <div className="w-6 h-px bg-card-border" />
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === 'betting'
                        ? 'bg-polla-accent animate-pulse'
                        : step === 'confirming'
                        ? 'bg-polla-success'
                        : 'bg-white/[0.06]'
                    }`}
                  >
                    {step === 'confirming' ? '✓' : '2'}
                  </div>
                  <span className="text-text-40 text-[10px]">Bet</span>
                </div>
                <div className="w-6 h-px bg-card-border" />
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === 'confirming'
                        ? 'bg-polla-warning animate-pulse'
                        : 'bg-white/[0.06]'
                    }`}
                  >
                    3
                  </div>
                  <span className="text-text-40 text-[10px]">Confirm</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-card border border-card-border text-sm text-text-40 disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-btn-primary text-sm font-bold disabled:opacity-50 active:scale-[0.97] transition-transform"
              >
                {isProcessing ? 'Processing...' : `Confirm — $${amount.toFixed(2)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
