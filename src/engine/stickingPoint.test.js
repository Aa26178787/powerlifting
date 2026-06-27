import { describe, it, expect } from 'vitest'
import db from '../data/exercises.json' with { type: 'json' }
import { causeOf, stickTier, POSITION_CAUSES } from './stickingPoint.js'

// ── helpers ───────────────────────────────────────────────────────────────────

const ex = (name) => db.exercises.find((e) => e.name === name)

// ── Case 1: explicit cause ────────────────────────────────────────────────────

describe('causeOf — explicit cause field', () => {
  it('string cause → single-element array', () => {
    expect(causeOf({ cause: 'hip', stickingPoint: 'lockout', primaryMuscle: 'quads/glutes' })).toEqual(['hip'])
  })
  it('array cause → same array', () => {
    expect(causeOf({ cause: ['hip', 'back'], stickingPoint: 'lockout', primaryMuscle: 'quads/glutes' })).toEqual(['hip', 'back'])
  })
  it('explicit cause takes precedence over primaryMuscle derivation', () => {
    // primaryMuscle 'triceps' would derive to 'triceps', but explicit 'hip' wins
    expect(causeOf({ cause: 'hip', stickingPoint: 'lockout', primaryMuscle: 'triceps' })).toEqual(['hip'])
  })
})

// ── Case 2: derivation from primaryMuscle ────────────────────────────────────

describe('causeOf — derivation from primaryMuscle first token', () => {
  it('Leg Press (quads/glutes) → quads', () => {
    expect(causeOf(ex('Leg Press'))).toEqual(['quads'])
  })
  it('Triceps Pushdown (rope) (triceps) → triceps', () => {
    expect(causeOf(ex('Triceps Pushdown (rope)'))).toEqual(['triceps'])
  })
  it('Romanian Deadlift (RDL) (hamstrings/glutes) → hip', () => {
    expect(causeOf(ex('Romanian Deadlift (RDL)'))).toEqual(['hip'])
  })
  it('Good Morning (standing) (hamstrings/erectors) → hip', () => {
    expect(causeOf(ex('Good Morning (standing)'))).toEqual(['hip'])
  })
  it('Stiff-Leg Deadlift (hamstrings/erectors) → hip', () => {
    expect(causeOf(ex('Stiff-Leg Deadlift'))).toEqual(['hip'])
  })
  it('stickingPoint=none → []', () => {
    expect(causeOf({ stickingPoint: 'none', primaryMuscle: 'biceps' })).toEqual([])
  })
  it('stickingPoint absent → []', () => {
    expect(causeOf({ primaryMuscle: 'quads' })).toEqual([])
  })
  it('unmapped primary muscle → []', () => {
    // 'core' resolves via canonicalToken but is not in CANON_TO_CAUSE
    expect(causeOf({ stickingPoint: 'bottom', primaryMuscle: 'core' })).toEqual([])
  })
})

// ── Case 3: 4 manual overrides ───────────────────────────────────────────────

describe('causeOf — 4 explicit override exercises', () => {
  it('Box Squat (above parallel): override quads→hip (lockout hip-drive)', () => {
    expect(causeOf(ex('Box Squat (above parallel)'))).toEqual(['hip'])
  })
  it('Banded Squat: override quads→hip (lockout hip-drive)', () => {
    expect(causeOf(ex('Banded Squat'))).toEqual(['hip'])
  })
  it('Chain Squat: override quads→hip (lockout hip-drive)', () => {
    expect(causeOf(ex('Chain Squat'))).toEqual(['hip'])
  })
  it('Push Press: override shoulder→triceps (overhead lockout)', () => {
    expect(causeOf(ex('Push Press'))).toEqual(['triceps'])
  })
})

// ── Case 4: stickTier 4 outcomes ─────────────────────────────────────────────

describe('stickTier — 4 match tiers', () => {
  // Exercise whose cause derives to 'triceps'
  const exTriceps = { stickingPoint: 'lockout', primaryMuscle: 'triceps' }
  // Exercise with no derivable cause (core is not in CANON_TO_CAUSE)
  const exNoCause = { stickingPoint: 'lockout', primaryMuscle: 'core' }

  it("'none': position mismatch", () => {
    expect(stickTier(exTriceps, 'bottom', 'triceps')).toBe('none')
    expect(stickTier(exTriceps, 'none', 'triceps')).toBe('none')
    expect(stickTier(exTriceps, undefined, 'triceps')).toBe('none')
  })
  it("'position': cause argument not given (undefined) — backward-compat path", () => {
    expect(stickTier(exTriceps, 'lockout', undefined)).toBe('position')
  })
  it("'position': exercise has no derivable causes", () => {
    expect(stickTier(exNoCause, 'lockout', 'quads')).toBe('position')
  })
  it("'full': position matches AND cause matches", () => {
    expect(stickTier(exTriceps, 'lockout', 'triceps')).toBe('full')
  })
  it("'causeMiss': position matches but cause doesn't", () => {
    expect(stickTier(exTriceps, 'lockout', 'quads')).toBe('causeMiss')
  })
})

// ── Case 5: POSITION_CAUSES table values ─────────────────────────────────────

describe('POSITION_CAUSES — spec-specified examples present', () => {
  it('squat.bottom ⊇ {quads, hip}', () => {
    expect(POSITION_CAUSES.squat.bottom).toContain('quads')
    expect(POSITION_CAUSES.squat.bottom).toContain('hip')
  })
  it('squat.midrange ⊇ {quads, hip, back}', () => {
    expect(POSITION_CAUSES.squat.midrange).toContain('quads')
    expect(POSITION_CAUSES.squat.midrange).toContain('hip')
    expect(POSITION_CAUSES.squat.midrange).toContain('back')
  })
  it('squat.lockout ⊇ {hip, back}', () => {
    expect(POSITION_CAUSES.squat.lockout).toContain('hip')
    expect(POSITION_CAUSES.squat.lockout).toContain('back')
  })
  it('bench.bottom ⊇ {chest, shoulder}', () => {
    expect(POSITION_CAUSES.bench.bottom).toContain('chest')
    expect(POSITION_CAUSES.bench.bottom).toContain('shoulder')
  })
  it('bench.lockout = [triceps]', () => {
    expect(POSITION_CAUSES.bench.lockout).toEqual(['triceps'])
  })
  it('deadlift.bottom ⊇ {quads, back, lats}', () => {
    expect(POSITION_CAUSES.deadlift.bottom).toContain('quads')
    expect(POSITION_CAUSES.deadlift.bottom).toContain('back')
    expect(POSITION_CAUSES.deadlift.bottom).toContain('lats')
  })
  it('deadlift.lockout ⊇ {hip, back}', () => {
    expect(POSITION_CAUSES.deadlift.lockout).toContain('hip')
    expect(POSITION_CAUSES.deadlift.lockout).toContain('back')
  })
})
