/**
 * All user-facing copy for the parlay feature.
 *
 * Voice rules (enforce on change):
 *   - Casual but not cringy. Friend who knows sports, not crypto bro.
 *   - Short sentences, active voice.
 *   - Numbers ($10, 0.4x, 3/5) lead where they're the point.
 *   - No exclamation points unless someone just won money.
 */

export const PARLAY_COPY = {
  // ─── Tab + header ──────────────────────────────────────────
  tabLabel: 'Parlay',
  tabSubtitle: 'Pick 5 · win bigger',

  // ─── Countdown ─────────────────────────────────────────────
  locksInLabel: 'Locks in',
  locked: 'Predictions closed',
  opensIn: 'Opens in',

  // ─── Stake input ───────────────────────────────────────────
  stakeLabel: 'Stake (USDC)',
  stakeHelp: 'How much you want to put in. Min $1.',
  stakeBelowMin: 'Minimum stake is $1',
  stakeAboveBalance: 'Not enough USDC',

  // ─── Payout preview ────────────────────────────────────────
  payoutHeader: 'Estimated payout',
  payoutHelp: 'Estimates update every 30s. Final payout depends on who else is in.',
  payoutRow5: (usd: string, mult: string) => `5 of 5   ${usd}  (${mult}x)`,
  payoutRow4: (usd: string, mult: string) => `4 of 5   ${usd}  (${mult}x)`,
  payoutRow3: (usd: string, mult: string) => `3 of 5   ${usd}  (${mult}x)`,

  // ─── Submit button ─────────────────────────────────────────
  submitIdle: 'Place ticket',
  submitAwaitingPicks: 'Pick all 5 to submit',
  submitAwaitingStake: 'Enter a stake',
  submitConnecting: 'Connect wallet',
  submitApproving: 'Approving USDC…',
  submitPlacing: 'Placing ticket…',
  submitConfirming: 'Waiting for confirmation…',
  submitError: 'Try again',
  submitSuccessToast: 'Ticket placed',

  // ─── Post-submit ticket view ───────────────────────────────
  ticketHeader: 'Your ticket',
  ticketPicksLabel: 'Your picks',
  ticketStakeLabel: 'Stake',
  ticketTxLabel: 'Transaction',
  ticketViewOnCeloscan: 'View on Celoscan',
  ticketKickoffIn: 'Kickoff in',
  ticketLocked: 'Waiting for kickoff',

  // ─── Settlement: winner ────────────────────────────────────
  winHero: (score: number) => `You got ${score} of 5`,
  winPayoutLabel: 'You won',
  winSentToWallet: 'USDC is in your wallet',
  winViewTx: 'View settlement',

  // ─── Settlement: loser ─────────────────────────────────────
  loseHero: (score: number) => `You got ${score} of 5`,
  loseSubtitle3: 'So close. One more next time.',
  loseSubtitle2: 'Two picks right. Better reads tomorrow.',
  loseSubtitle1: 'Rough one. New matches tomorrow.',
  loseSubtitle0: 'Tough match. Back at it tomorrow.',

  // ─── Score breakdown ───────────────────────────────────────
  breakdownHeader: 'Your picks vs. result',
  breakdownPickLabel: 'Your pick',
  breakdownResultLabel: 'Result',
  breakdownVoidLabel: 'Voided',

  // ─── Share ─────────────────────────────────────────────────
  shareButton: 'Share',
  shareCaption: (score: number, team_a: string, team_b: string) =>
    `I got ${score} of 5 on Sabi — ${team_a} vs ${team_b}. Play at sabi.app`,
  shareCardCta: 'Play on sabi.app',
  shareFallbackHint: 'Image saved — share it from your gallery',

  // ─── Leaderboard link ──────────────────────────────────────
  leaderboardCtaPosition: (rank: number, total: number) =>
    `You're #${rank} of ${total} today`,
  leaderboardCtaLink: 'See leaderboard',

  // ─── Empty / error states ──────────────────────────────────
  stateNotOpenYet: 'Predictions open 24h before kickoff.',
  stateLockedWaiting: 'Predictions closed. Waiting for match result.',
  stateManualReview: 'Verifying result. Your USDC is safe.',
  stateVoided: 'Match voided. Your bet will be refunded.',
  stateVoidedEta: (eta: string) => `Refund expected by ${eta}.`,

  // ─── Retry / tx error ──────────────────────────────────────
  txErrorHeader: 'Transaction didn\'t go through',
  txErrorHelp: 'Your picks are saved. Hit retry when you\'re ready.',
  txErrorRetry: 'Retry',

  // ─── Leaderboard page ──────────────────────────────────────
  leaderboardTitle: 'Parlay leaderboard',
  leaderboardTabToday: 'Today',
  leaderboardTabWeek: 'This week',
  leaderboardTabTournament: 'World Cup 2026',
  leaderboardEmpty: 'No tickets settled yet.',
  leaderboardColRank: '#',
  leaderboardColPlayer: 'Player',
  leaderboardColScore: 'Score',
  leaderboardColWinnings: 'Won',
  leaderboardColTickets: 'Tickets',
  leaderboardMe: 'You',

  // ─── Generic ───────────────────────────────────────────────
  estimatedLabel: 'Estimated',
} as const
