import { describe, it, expect } from 'vitest'
import db from '../data/exercises.json' with { type: 'json' }
import { canonicalToken, creditMuscles } from './muscleVolume.js'
import { causeOf, CAUSE_VOCAB, POSITION_CAUSES, CANON_TO_CAUSE } from './stickingPoint.js'
import { patternOf } from './movementPattern.js'

// Reverse mapping: cause → set of canonical muscle groups (for contradiction check)
const CAUSE_TO_CANONS = {}
for (const [canon, cause] of Object.entries(CANON_TO_CAUSE)) {
  if (!CAUSE_TO_CANONS[cause]) CAUSE_TO_CANONS[cause] = new Set()
  CAUSE_TO_CANONS[cause].add(canon)
}

const CATEGORY = ['competition', 'variation', 'accessory']
const TARGET = ['squat', 'bench', 'deadlift', 'general']
const STICK = ['bottom', 'midrange', 'lockout', 'none']
const REGIONS = ['lowerBack','knee','shoulder','elbow','wrist','hip','hamstring','pec','bicepsTendon','ankle']

describe('exercise DB integrity', () => {
  it('has a large library', () => {
    expect(db.exercises.length).toBeGreaterThanOrEqual(237)
  })
  it('every accessory prime-mover token maps to a real movement pattern (not "other")', () => {
    const unmapped = db.exercises
      .filter((e) => e.category === 'accessory' && patternOf(e.primaryMuscle) === 'other')
      .map((e) => `${e.name}: ${e.primaryMuscle}`)
    if (unmapped.length) console.error('Accessories with no movement pattern:', unmapped)
    expect(unmapped).toHaveLength(0)
  })
  it('every exercise has valid required tags', () => {
    for (const ex of db.exercises) {
      expect(typeof ex.name).toBe('string')
      expect(CATEGORY).toContain(ex.category)
      expect(TARGET).toContain(ex.targetLift)
      expect(STICK).toContain(ex.stickingPoint)
      expect(typeof ex.primaryMuscle).toBe('string')
      expect(Array.isArray(ex.equipment)).toBe(true)
      expect(Array.isArray(ex.stress)).toBe(true)
      for (const r of ex.stress) expect(REGIONS).toContain(r)
    }
  })
  it('contains the four competition variants used by style.js', () => {
    const names = db.exercises.map((e) => e.name)
    expect(names).toContain('Back Squat (Low Bar)')
    expect(names).toContain('Back Squat (High Bar)')
    expect(names).toContain('Conventional Deadlift')
    expect(names).toContain('Sumo Deadlift')
    expect(names).toContain('Bench Press (Competition Grip)')
  })
  it('has variations and accessories for every main lift', () => {
    for (const lift of ['squat', 'bench', 'deadlift']) {
      expect(db.exercises.some((e) => e.category === 'variation' && e.targetLift === lift)).toBe(true)
      expect(db.exercises.some((e) => e.category === 'accessory')).toBe(true)
    }
  })
  it('names are unique', () => {
    const names = db.exercises.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('muscle token coverage (test 7)', () => {
  it('every primaryMuscle token in the DB resolves via canonicalToken (0 unmapped)', () => {
    const unmapped = []
    for (const ex of db.exercises) {
      for (const tok of ex.primaryMuscle.split('/')) {
        if (canonicalToken(tok.trim()) === null) {
          unmapped.push(`${ex.name}: "${tok.trim()}"`)
        }
      }
    }
    if (unmapped.length > 0) console.error('Unmapped tokens:', unmapped)
    expect(unmapped).toHaveLength(0)
  })
})

describe('stickingPoint 2D integrity (cases 9-10)', () => {
  // Case 9: causeOf elements ∈ CAUSE_VOCAB AND don't contradict primaryMuscle credit
  it('every causeOf element is in CAUSE_VOCAB and shares a canon group with primaryMuscle', () => {
    for (const ex of db.exercises) {
      const causes = causeOf(ex)
      if (causes.length === 0) continue
      const credits = creditMuscles(ex.primaryMuscle)
      for (const c of causes) {
        expect(
          CAUSE_VOCAB,
          `${ex.name}: cause "${c}" not in CAUSE_VOCAB`,
        ).toContain(c)
        const possibleCanons = CAUSE_TO_CANONS[c] ?? new Set()
        const intersection = [...possibleCanons].filter((can) => credits.has(can))
        expect(
          intersection.length,
          `${ex.name}: cause "${c}" contradicts primaryMuscle "${ex.primaryMuscle}" — no shared canon group`,
        ).toBeGreaterThan(0)
      }
    }
  })

  // Case 10: main-lift non-none exercises: causeOf ⊆ POSITION_CAUSES[targetLift][stickingPoint]
  it('main-lift non-none exercises have causeOf within valid POSITION_CAUSES', () => {
    const mainLifts = ['squat', 'bench', 'deadlift']
    for (const ex of db.exercises) {
      if (!mainLifts.includes(ex.targetLift)) continue
      if (!ex.stickingPoint || ex.stickingPoint === 'none') continue
      const causes = causeOf(ex)
      const valid = POSITION_CAUSES[ex.targetLift]?.[ex.stickingPoint] ?? []
      for (const c of causes) {
        expect(
          valid,
          `${ex.name}: cause "${c}" not in POSITION_CAUSES.${ex.targetLift}.${ex.stickingPoint} = [${valid}]`,
        ).toContain(c)
      }
    }
  })
})

describe('e1rmModifier', () => {
  it('every modifier present is a number in [0.75, 1.10]', () => {
    for (const ex of db.exercises) {
      if ('e1rmModifier' in ex) {
        expect(typeof ex.e1rmModifier).toBe('number')
        expect(ex.e1rmModifier).toBeGreaterThanOrEqual(0.75)
        expect(ex.e1rmModifier).toBeLessThanOrEqual(1.10)
      }
    }
  })
  it('at least 20 variations carry a modifier', () => {
    expect(db.exercises.filter((e) => 'e1rmModifier' in e).length).toBeGreaterThanOrEqual(20)
  })
})
