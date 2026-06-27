import { describe, it, expect } from 'vitest'
import {
  canonicalToken,
  creditMuscles,
  newLedger,
  addToLedger,
  summarize,
  muscleDeficit,
  isOverMrv,
  PER_MUSCLE_BANDS,
} from './muscleVolume.js'

// ── Test 1: canonicalToken ────────────────────────────────────────────────────
describe('canonicalToken', () => {
  it('resolves full-token "shoulders (lat delt)" to sideDelts', () => {
    expect(canonicalToken('shoulders (lat delt)')).toBe('sideDelts')
  })
  it('resolves "biceps (long head)" via parenthetical strip', () => {
    expect(canonicalToken('biceps (long head)')).toBe('biceps')
  })
  it('resolves "QL" (uppercase) to erectors', () => {
    expect(canonicalToken('QL')).toBe('erectors')
  })
  it('resolves "core (anti-rotation)" via parenthetical strip', () => {
    expect(canonicalToken('core (anti-rotation)')).toBe('core')
  })
  it('resolves "core (anterior)" via parenthetical strip', () => {
    expect(canonicalToken('core (anterior)')).toBe('core')
  })
  it('strips parens does not accidentally map "shoulders (lat delt)" to frontDelts', () => {
    // Full-token lookup must win over strip fallback
    expect(canonicalToken('shoulders (lat delt)')).not.toBe('frontDelts')
  })
  it('returns null for unknown tokens', () => {
    expect(canonicalToken('unknownMuscle')).toBeNull()
    expect(canonicalToken('')).toBeNull()
    expect(canonicalToken(null)).toBeNull()
  })
  it('is case-insensitive', () => {
    expect(canonicalToken('QUADS')).toBe('quads')
    expect(canonicalToken('Hamstrings')).toBe('hamstrings')
    expect(canonicalToken('REAR-DELTS')).toBe('rearDelts')
  })
})

// ── Test 2: creditMuscles ─────────────────────────────────────────────────────
describe('creditMuscles', () => {
  it('prime mover gets 1.0, synergist 0.5', () => {
    const m = creditMuscles('quads/glutes')
    expect(m.get('quads')).toBe(1.0)
    expect(m.get('glutes')).toBe(0.5)
    expect(m.size).toBe(2)
  })

  it('max-collapses duplicate canonicals: chest/upper-chest → {chest:1.0}', () => {
    const m = creditMuscles('chest/upper-chest')
    expect(m.get('chest')).toBe(1.0)
    expect(m.size).toBe(1)    // upper-chest resolves to chest too → collapsed to max
  })

  it('returns empty map for empty / null input', () => {
    expect(creditMuscles('').size).toBe(0)
    expect(creditMuscles(null).size).toBe(0)
  })

  it('ignores unresolvable tokens', () => {
    const m = creditMuscles('quads/unknownTok')
    expect(m.get('quads')).toBe(1.0)
    expect(m.size).toBe(1)
  })
})

// ── Test 3: addToLedger / summarize ──────────────────────────────────────────
describe('addToLedger + summarize', () => {
  it('accumulates sets and reports correct status at MEV boundary', () => {
    const ledger = newLedger()
    // biceps: mev=6, mrv=20
    addToLedger(ledger, 'biceps', 3)
    expect(summarize(ledger).biceps.status).toBe('under')   // 3 < 6
    addToLedger(ledger, 'biceps', 3)                         // now = 6 = mev
    expect(summarize(ledger).biceps.sets).toBe(6)
    expect(summarize(ledger).biceps.status).toBe('in')      // >= mev, <= mrv
  })

  it('reports over when sets exceed MRV', () => {
    const ledger = newLedger()
    // erectors: mrv=12
    addToLedger(ledger, 'erectors', 13)
    expect(summarize(ledger).erectors.status).toBe('over')
  })

  it('synergist credit of 0.5 accumulates fractionally', () => {
    const ledger = newLedger()
    // "quads/glutes": glutes gets 0.5 per set
    addToLedger(ledger, 'quads/glutes', 4)
    expect(ledger.glutes).toBe(2)   // 4 × 0.5
    expect(ledger.quads).toBe(4)    // 4 × 1.0
  })

  it('summarize includes mev/mav/mrv from PER_MUSCLE_BANDS', () => {
    const s = summarize(newLedger())
    for (const [group, bands] of Object.entries(PER_MUSCLE_BANDS)) {
      expect(s[group].mev).toBe(bands.mev)
      expect(s[group].mav).toBe(bands.mav)
      expect(s[group].mrv).toBe(bands.mrv)
    }
  })

  it('status is under when mev=0 and sets=0 is impossible — adductors mev=0', () => {
    const ledger = newLedger()
    // adductors mev=0 → even 0 sets is 'in' (not under)
    expect(summarize(ledger).adductors.status).toBe('in')
  })
})

// ── Test 4: muscleDeficit ─────────────────────────────────────────────────────
describe('muscleDeficit', () => {
  it('returns > 0 for a muscle with no sets when mev > 0', () => {
    const ledger = newLedger()
    expect(muscleDeficit(ledger, 'biceps')).toBeGreaterThan(0)
  })

  it('returns 0 when sets >= mev', () => {
    const ledger = newLedger()
    addToLedger(ledger, 'biceps', 6)   // = mev
    expect(muscleDeficit(ledger, 'biceps')).toBe(0)
  })

  it('returns 0 for muscles with mev=0 (adductors, core, forearms)', () => {
    const ledger = newLedger()
    expect(muscleDeficit(ledger, 'adductors')).toBe(0)
    expect(muscleDeficit(ledger, 'core')).toBe(0)
    expect(muscleDeficit(ledger, 'forearms')).toBe(0)
  })

  it('is clamped to [0,1]', () => {
    const ledger = newLedger()
    const d = muscleDeficit(ledger, 'lats')
    expect(d).toBeGreaterThanOrEqual(0)
    expect(d).toBeLessThanOrEqual(1)
  })

  it('uses only the prime (first) token from a compound primaryMuscle', () => {
    const ledger = newLedger()
    // quads/glutes — deficit is for quads (prime), not glutes
    addToLedger(ledger, 'quads', 10)  // quads mev=8 → quads satisfied
    expect(muscleDeficit(ledger, 'quads/glutes')).toBe(0)   // quads satisfied
  })
})

// ── Test 5: isOverMrv ────────────────────────────────────────────────────────
describe('isOverMrv', () => {
  it('returns true when current + addSets exceeds MRV', () => {
    const ledger = newLedger()
    // erectors mrv=12
    addToLedger(ledger, 'erectors', 10)
    expect(isOverMrv(ledger, 'erectors', 3)).toBe(true)    // 10+3=13 > 12
  })

  it('returns false when current + addSets = MRV (not strictly over)', () => {
    const ledger = newLedger()
    addToLedger(ledger, 'erectors', 10)
    expect(isOverMrv(ledger, 'erectors', 2)).toBe(false)   // 10+2=12, not > 12
  })

  it('returns false for unknown token', () => {
    const ledger = newLedger()
    expect(isOverMrv(ledger, 'unknownMuscle', 5)).toBe(false)
  })

  it('uses only the prime token from compound primaryMuscle', () => {
    const ledger = newLedger()
    // hamstrings mrv=18
    addToLedger(ledger, 'hamstrings', 16)
    expect(isOverMrv(ledger, 'hamstrings/glutes', 3)).toBe(true)   // 16+3=19 > 18
    expect(isOverMrv(ledger, 'hamstrings/glutes', 2)).toBe(false)  // 16+2=18, not over
  })
})
