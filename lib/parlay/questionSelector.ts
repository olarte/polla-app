import { ALL_QUESTION_TYPES, type QuestionType } from './types'

// Slot 1 is always the anchor — the over/under line everyone understands.
const ANCHOR: QuestionType = 'over_under_2_5'

// History-weighting rules, per Session 15 brief:
//   - Used in last 1 match  → weight 0 (skip entirely)
//   - Used in last 3 matches → weight 0.5
//   - Used in last 6 matches → weight 0.75 (mild disprefer)
//   - Otherwise              → weight 1
// Closer-recency wins when a type appears in multiple windows.
function historyWeight(
  type: QuestionType,
  history: QuestionType[][],
): number {
  const last1 = history.slice(0, 1)
  const last3 = history.slice(0, 3)
  const last6 = history.slice(0, 6)
  if (last1.some((ms) => ms.includes(type))) return 0
  if (last3.some((ms) => ms.includes(type))) return 0.5
  if (last6.some((ms) => ms.includes(type))) return 0.75
  return 1
}

// FNV-1a 32-bit hash. Stable across platforms, good enough for a seed.
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// mulberry32 PRNG — small, fast, well-distributed for our needs.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function weightedPick(
  candidates: QuestionType[],
  weights: number[],
  rng: () => number,
): QuestionType {
  const total = weights.reduce((s, w) => s + w, 0)
  if (total <= 0) {
    // Everything is zero-weighted. Fall back to uniform pick over
    // candidates so the slot still gets populated.
    return candidates[Math.floor(rng() * candidates.length)]
  }
  let r = rng() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

/**
 * Deterministically pick 5 question types for a parlay market.
 * Same matchId + same history always produces the same output.
 *
 * @param matchId   — any stable identifier (uuid recommended)
 * @param history   — recent markets' question-type arrays, most recent first
 */
export function selectQuestions(
  matchId: string,
  history: QuestionType[][],
): QuestionType[] {
  const rng = mulberry32(fnv1a(matchId))
  const picks: QuestionType[] = [ANCHOR]
  const pool: QuestionType[] = ALL_QUESTION_TYPES.filter((t) => t !== ANCHOR)

  for (let slot = 2; slot <= 5; slot++) {
    const weights = pool.map((t) => historyWeight(t, history))
    const chosen = weightedPick(pool, weights, rng)
    picks.push(chosen)
    pool.splice(pool.indexOf(chosen), 1)
  }

  return picks
}
