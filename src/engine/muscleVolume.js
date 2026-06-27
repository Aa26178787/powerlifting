/**
 * Per-muscle volume ledger — pure reporting layer (no prescription changes).
 *
 * 15 canonical muscle groups, 28 DB primaryMuscle token aliases, per-muscle
 * MEV/MAV/MRV bands (heuristic; weaker evidence than per-lift bands — see
 * honest disclosure in docs).
 *
 * Evidence note: per-muscle MEV/MAV/MRV values, synergist 0.5 split-credit,
 * and 15-group taxonomy are heuristic ("근거 약함"). Only the general direction
 * (≥10 sets/wk for hypertrophy) has meta-analytic support.
 */

// ── 15 canonical muscle groups ───────────────────────────────────────────────
export const MUSCLES = [
  'quads', 'hamstrings', 'glutes', 'adductors', 'erectors',
  'chest', 'frontDelts', 'sideDelts', 'rearDelts',
  'lats', 'upperBack',
  'biceps', 'triceps', 'forearms',
  'core',
]

// ── 28 DB primaryMuscle tokens → canonical (all keys lowercased) ─────────────
// Full-token entries are checked FIRST (before parenthetical strip); this is
// what makes "shoulders (lat delt)" → sideDelts rather than frontDelts.
export const MUSCLE_ALIAS = {
  // Full-token entries (must stay before any strip-based fallback)
  'shoulders (lat delt)': 'sideDelts',

  // Leg / posterior chain
  quads:           'quads',
  hamstrings:      'hamstrings',
  glutes:          'glutes',
  adductors:       'adductors',
  erectors:        'erectors',
  ql:              'erectors',       // QL (quadratus lumborum) → erectors group

  // Chest
  chest:           'chest',
  'upper-chest':   'chest',
  'lower-chest':   'chest',

  // Delts
  shoulders:       'frontDelts',    // unqualified "shoulders" → front delt default
  'rear-delts':    'rearDelts',

  // Back
  lats:            'lats',
  'upper-back':    'upperBack',
  traps:           'upperBack',

  // Arms
  biceps:          'biceps',
  brachialis:      'biceps',
  brachioradialis: 'biceps',
  triceps:         'triceps',
  forearms:        'forearms',
  grip:            'forearms',

  // Core
  core:            'core',
  abs:             'core',
  obliques:        'core',
  'hip-flexors':   'core',
}

// ── Per-muscle MEV / MAV / MRV (sets/week, heuristic, consensus-tier) ────────
// erectors MRV=12 intentionally low: SBD all stress erectors as synergists →
// double-counting is expected; the low cap makes the over-reporting visible.
export const PER_MUSCLE_BANDS = {
  quads:      { mev: 8,  mav: 14, mrv: 20 },
  hamstrings: { mev: 6,  mav: 12, mrv: 18 },
  glutes:     { mev: 4,  mav: 12, mrv: 16 },
  adductors:  { mev: 0,  mav: 6,  mrv: 12 },
  erectors:   { mev: 4,  mav: 8,  mrv: 12 },
  chest:      { mev: 8,  mav: 14, mrv: 20 },
  frontDelts: { mev: 0,  mav: 8,  mrv: 14 },
  sideDelts:  { mev: 6,  mav: 14, mrv: 22 },
  rearDelts:  { mev: 6,  mav: 12, mrv: 20 },
  lats:       { mev: 10, mav: 16, mrv: 22 },
  upperBack:  { mev: 8,  mav: 16, mrv: 22 },
  biceps:     { mev: 6,  mav: 14, mrv: 20 },
  triceps:    { mev: 6,  mav: 12, mrv: 18 },
  forearms:   { mev: 0,  mav: 6,  mrv: 12 },
  core:       { mev: 0,  mav: 12, mrv: 20 },
}

export const SYNERGIST_CREDIT = 0.5
export const ACCESSORY_EST_SETS = 3   // used by steering layer (batch O); reporting uses actual sets

// ── Token resolution ──────────────────────────────────────────────────────────

/**
 * Resolves a raw primaryMuscle token (possibly with parens, any case) to one
 * of the 15 canonical group names, or null if unrecognised.
 *
 * Steps:
 *   1. lowercase + trim
 *   2. full-token MUSCLE_ALIAS lookup  (handles "shoulders (lat delt)")
 *   3. strip parentheticals, retry     (handles "biceps (long head)", "core (*)")
 *   4. return null if still unresolved
 */
export function canonicalToken(tok) {
  if (typeof tok !== 'string') return null
  const lower = tok.toLowerCase().trim()
  // 1. Full-token lookup (handles special full-paren entries)
  if (lower in MUSCLE_ALIAS) return MUSCLE_ALIAS[lower]
  // 2. Strip parentheticals and retry
  const base = lower.replace(/\s*\(.*?\)\s*/g, '').trim()
  if (base && base in MUSCLE_ALIAS) return MUSCLE_ALIAS[base]
  // 3. Direct canonical match (safety net — all canonicals are their own aliases)
  if (MUSCLES.includes(lower)) return lower
  return null
}

// ── Credit mapping ────────────────────────────────────────────────────────────

/**
 * Converts a primaryMuscle string (e.g. "quads/glutes") to a Map of
 * canonical → credit: first token = 1.0 (prime), subsequent = 0.5 (synergist).
 * Duplicate canonicals are max-collapsed: "chest/upper-chest" → {chest: 1.0}.
 */
export function creditMuscles(primaryMuscle) {
  const out = new Map()
  if (!primaryMuscle) return out
  const tokens = primaryMuscle.split('/').map((t) => t.trim())
  tokens.forEach((tok, i) => {
    const canon = canonicalToken(tok)
    if (canon === null) return
    const credit = i === 0 ? 1.0 : SYNERGIST_CREDIT
    if (!out.has(canon) || out.get(canon) < credit) out.set(canon, credit)
  })
  return out
}

// ── Ledger operations ─────────────────────────────────────────────────────────

/** Returns a zeroed ledger for all 15 canonical groups. */
export function newLedger() {
  const ledger = {}
  for (const m of MUSCLES) ledger[m] = 0
  return ledger
}

/**
 * Adds `sets` to each muscle credited by `primaryMuscle`.
 * Prime mover gets sets × 1.0, synergists sets × 0.5.
 * Mutates ledger in-place (ledger is session-local; no shared state in engine).
 */
export function addToLedger(ledger, primaryMuscle, sets) {
  const credits = creditMuscles(primaryMuscle)
  for (const [canon, credit] of credits) {
    if (canon in ledger) ledger[canon] += sets * credit
  }
}

/**
 * Returns a per-group summary object:
 *   { [group]: { sets, mev, mav, mrv, status: 'under'|'in'|'over' } }
 *
 * status 'in' means sets >= mev AND sets <= mrv.
 * status 'under' means sets < mev.
 * status 'over'  means sets > mrv.
 */
export function summarize(ledger) {
  const out = {}
  for (const group of MUSCLES) {
    const sets = ledger[group] ?? 0
    const { mev, mav, mrv } = PER_MUSCLE_BANDS[group]
    let status
    if (sets < mev) status = 'under'
    else if (sets <= mrv) status = 'in'
    else status = 'over'
    out[group] = { sets, mev, mav, mrv, status }
  }
  return out
}

// ── Steering helpers (exported for batch O; no wiring into generate/accessories yet) ──

/**
 * Returns [0..1] indicating how far the prime mover for `primaryMuscle` is
 * below MEV. 1.0 = completely untrained; 0.0 = at or above MEV.
 * Only the first (prime) token is used for deficit judgment.
 */
export function muscleDeficit(ledger, primaryMuscle) {
  const firstTok = typeof primaryMuscle === 'string'
    ? primaryMuscle.split('/')[0].trim()
    : primaryMuscle
  const canon = canonicalToken(firstTok)
  if (!canon) return 0
  const { mev } = PER_MUSCLE_BANDS[canon]
  if (mev <= 0) return 0
  const sets = ledger[canon] ?? 0
  return Math.max(0, Math.min(1, (mev - sets) / mev))
}

/**
 * Returns true if adding `addSets` to the prime mover's current tally would
 * exceed its MRV. Only the first (prime) token is used.
 */
export function isOverMrv(ledger, primaryMuscle, addSets) {
  const firstTok = typeof primaryMuscle === 'string'
    ? primaryMuscle.split('/')[0].trim()
    : primaryMuscle
  const canon = canonicalToken(firstTok)
  if (!canon) return false
  const { mrv } = PER_MUSCLE_BANDS[canon]
  const sets = ledger[canon] ?? 0
  return (sets + addSets) > mrv
}
