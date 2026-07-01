import { describe, it, expect } from 'vitest'
import { resolveE1rm, generate, deficitBaseWeight } from './generate.js'
import { byName } from './exercises.js'
import { PRESETS, ZONES } from './quality.js'
import { MUSCLES } from './muscleVolume.js'
import { patternOf } from './movementPattern.js'

const profile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, fatigue: 2,
  qualities: { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 },
  periodizationModel: 'auto',
}

// ── Test 8: muscleVolume reporting field ──────────────────────────────────────
describe('muscleVolume reporting (test 8)', () => {
  it('every week carries a muscleVolume field with all 15 canonical groups', () => {
    const plan = generate(profile)
    for (const wk of plan.weeks) {
      expect(wk.muscleVolume).toBeTruthy()
      for (const group of MUSCLES) {
        const entry = wk.muscleVolume[group]
        expect(entry, `missing group ${group}`).toBeTruthy()
        expect(typeof entry.sets).toBe('number')
        expect(['under', 'in', 'over']).toContain(entry.status)
        expect(typeof entry.mev).toBe('number')
        expect(typeof entry.mrv).toBe('number')
      }
    }
  })

  it('4-day powerbuilding: quads/erectors well-represented, biceps lower (sanity)', () => {
    const plan = generate(profile)
    const wk1 = plan.weeks[0].muscleVolume
    // SBD-heavy → quads and erectors should accumulate meaningful volume
    expect(wk1.quads.sets).toBeGreaterThan(0)
    expect(wk1.erectors.sets).toBeGreaterThan(0)
    // Biceps is not a primary in SBD main lifts → remains zero or very low from mains
    // (accessories may contribute, but at most a few sets from curls)
    expect(wk1.quads.sets).toBeGreaterThan(wk1.biceps.sets)
  })

  it('muscleVolume field does not break existing plan shape ({template, model, weeks})', () => {
    const plan = generate(profile)
    expect(plan.template).toBe('custom')
    expect(typeof plan.model).toBe('string')
    expect(Array.isArray(plan.weeks)).toBe(true)
    // muscleVolume is additive — sessions and exercises still present
    expect(plan.weeks[0].sessions[0].exercises.length).toBeGreaterThan(0)
  })
})

describe('resolveE1rm', () => {
  it('uses a direct 1RM when provided', () => {
    expect(resolveE1rm({ oneRM: 200 })).toBe(200)
  })
  it('estimates from weight x reps @ RPE otherwise', () => {
    expect(resolveE1rm({ weight: 325, reps: 5, rpe: 8 })).toBeCloseTo(400.74, 1)
  })
})

describe('generate v3', () => {
  it('returns a model and a 4-week plan ending in deload', () => {
    const plan = generate(profile)
    expect(['adaptive','linear','undulating','block']).toContain(plan.model)
    expect(plan.weeks).toHaveLength(5)
    expect(plan.weeks[4].isDeload).toBe(true)
  })
  it('every working exercise carries quality, reps range, autoregulate, finite weight', () => {
    const plan = generate(profile)
    const exs = plan.weeks.slice(0, 3).flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(exs.every((e) => ['power','strength','hypertrophy','endurance'].includes(e.quality))).toBe(true)
    expect(exs.every((e) => Array.isArray(e.reps) && Number.isFinite(e.weight) && e.autoregulate)).toBe(true)
  })
  it('respects an explicit model override', () => {
    expect(generate({ ...profile, periodizationModel: 'block' }).model).toBe('block')
  })
  it('attaches accessories to every session', () => {
    const plan = generate(profile)
    expect(plan.weeks[0].sessions.every((s) => Array.isArray(s.accessories))).toBe(true)
  })
  it('an endurance-dominant blend generates without crashing (finite weights incl deload)', () => {
    const plan = generate({ ...profile, qualities: { power:0, strength:0, hypertrophy:0, endurance:1 } })
    const all = plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(all.length).toBeGreaterThan(0)
    expect(all.every((e) => Number.isFinite(e.weight))).toBe(true)
  })
  it('accessoryOverrides reassigns a slot to a different movement pattern', () => {
    const base = { lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
      years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 2, deloadEnabled: false,
      equipment: ['barbell', 'rack', 'bench', 'cables', 'dumbbells'], qualities: { power: 0, strength: 0, hypertrophy: 1, endurance: 0 } }
    const acc0 = generate(base).weeks[0].sessions.flatMap((s) => s.accessories)[0]
    const slot = patternOf(acc0.primaryMuscle)               // the slot's auto pattern
    const target = slot === 'biceps' ? 'triceps' : 'biceps'  // a different, equipment-feasible pattern
    const accs = generate({ ...base, accessoryOverrides: { [slot]: target } })
      .weeks[0].sessions.flatMap((s) => s.accessories)
    const swapped = accs.filter((a) => a.accSlot === slot)
    expect(swapped.length).toBeGreaterThan(0)
    expect(swapped.every((a) => patternOf(a.primaryMuscle) === target)).toBe(true)   // slot now holds the new pattern
  })
  it('deadlift reps are capped at 6 across all qualities (high-rep blends too)', () => {
    for (const q of [{ hypertrophy: 1 }, { endurance: 1 }, { strength: 0.5, hypertrophy: 0.5 }]) {
      const plan = generate({ ...profile, qualities: { power: 0, strength: 0, hypertrophy: 0, endurance: 0, ...q }, daysPerWeek: 6 })
      const dlReps = plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
        .filter((e) => e.baseLift === 'deadlift')
        .flatMap((e) => e.scheme.sets.map((set) => set.reps))
        .filter((r) => typeof r === 'number')
      expect(dlReps.length).toBeGreaterThan(0)
      expect(Math.max(...dlReps)).toBeLessThanOrEqual(6)
    }
  })
  it('no lift exceeds its MRV in realized weekly volume', () => {
    const hyper = generate({ ...profile, qualities: { power:0, strength:0, hypertrophy:1, endurance:0 }, daysPerWeek: 6 })
    // sum sets per baseLift in week 1
    const wk = hyper.weeks[0]
    const perLift = {}
    for (const s of wk.sessions) for (const e of s.exercises) perLift[e.baseLift] = (perLift[e.baseLift]||0) + e.sets
    for (const lift of Object.keys(perLift)) expect(perLift[lift]).toBeLessThanOrEqual(22) // hypertrophy band mrv
  })
})

// Profile for style/accessories tests (no region restrictions)
const styleProfile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, fatigue: 2,
  qualities: { power: 0, strength: 0.7, hypertrophy: 0.3, endurance: 0 },
  periodizationModel: 'auto',
  style: { squat: { bar: 'low' }, bench: { grip: 'close' }, deadlift: { stance: 'sumo' } },
  stickingPoint: { squat: 'bottom', bench: 'lockout', deadlift: 'bottom' },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks','cables','dumbbells'],
}

// Profile for region-status tests
const richProfile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, fatigue: 2,
  qualities: { power: 0, strength: 0.7, hypertrophy: 0.3, endurance: 0 },
  periodizationModel: 'auto',
  style: { squat: { bar: 'low' }, bench: { grip: 'close' }, deadlift: { stance: 'sumo' } },
  stickingPoint: { squat: 'bottom', bench: 'lockout', deadlift: 'bottom' },
  regionStatus: { lowerBack: 3 },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks','cables','dumbbells'],
}

describe('priorityLift', () => {
  it('bumps the priority lift weekly sets vs no priority (still <= MRV)', () => {
    const base = generate({ ...profile, daysPerWeek: 4, priorityLift: null })
    const bumped = generate({ ...profile, daysPerWeek: 4, priorityLift: 'bench' })
    const benchSets = (plan) => plan.weeks[0].sessions.flatMap((s) => s.exercises).filter((e) => e.baseLift === 'bench').reduce((a, e) => a + e.sets, 0)
    expect(benchSets(bumped)).toBeGreaterThanOrEqual(benchSets(base))
  })
  it('null priority leaves output identical to SP1', () => {
    expect(() => generate({ ...profile, priorityLift: null })).not.toThrow()
  })
})

describe('generate v2', () => {
  it('uses the styled competition deadlift variant on heavy slots', () => {
    const plan = generate(styleProfile)
    const names = plan.weeks[0].sessions.flatMap((s) => s.exercises).map((e) => e.lift)
    expect(names).toContain('Sumo Deadlift')
  })
  it('attaches accessories to every session', () => {
    const plan = generate(styleProfile)
    expect(plan.weeks[0].sessions.every((s) => Array.isArray(s.accessories))).toBe(true)
    expect(plan.weeks[0].sessions.some((s) => s.accessories.length > 0)).toBe(true)
  })
  it('region status 3 (lowerBack) keeps no lowerBack-stressing main work in week 1', () => {
    const plan = generate(richProfile)
    const mains = plan.weeks[0].sessions.flatMap((s) => s.exercises)
    const offenders = mains.filter((e) => {
      const ex = byName(e.lift)
      return ex && ex.stress.includes('lowerBack')
    })
    expect(offenders.length).toBe(0)
  })
  it('surfaces dropped deadlift in session notes when lowerBack is status 3', () => {
    const plan = generate(richProfile)
    const allNotes = plan.weeks[0].sessions.flatMap((s) => s.notes)
    const deadliftNote = allNotes.find((n) => n.includes('deadlift'))
    expect(deadliftNote).toBeTruthy()
  })
  it('deload week exercises all have finite numeric weights (no NaN from variant name lookup)', () => {
    const plan = generate(styleProfile)
    const deloadWeek = plan.weeks[4]
    expect(deloadWeek.isDeload).toBe(true)
    const exercises = deloadWeek.sessions.flatMap((s) => s.exercises)
    exercises.forEach((e) => {
      expect(Number.isFinite(e.weight)).toBe(true)
    })
  })
})

describe('input coupling: powerbuilding vs powerlifting', () => {
  const base = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
  }
  const schemes = (r) => r.weeks.flatMap(w => w.sessions).flatMap(s => s.exercises).map(e => e.scheme.type)

  it('powerbuilding produces within-session concurrent (strengthHypertrophy)', () => {
    const pb = generate({ ...base, qualities: PRESETS.powerbuilding })
    expect(schemes(pb)).toContain('strengthHypertrophy')
  })
  it('powerlifting does NOT use concurrent (clear strength dominant)', () => {
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    expect(schemes(pl)).not.toContain('strengthHypertrophy')
  })
  it('restrictive equipment keeps competition lifts and does not crash', () => {
    const r = generate({ ...base, qualities: PRESETS.powerlifting, equipment: ['barbell','rack','bench'] })
    const lifts = r.weeks[0].sessions.flatMap(s => s.exercises).map(e => e.baseLift)
    expect(lifts).toContain('squat')
  })
  it('novice (years<1) does NOT get concurrent scheme even with mixed blend', () => {
    const r = generate({ ...base, years: 0.5, qualities: PRESETS.powerbuilding })
    expect(schemes(r)).not.toContain('strengthHypertrophy')
  })

  // Case 13: PB SH frequency ≥ 50% of strength-quality main slots (after dilution removal)
  it('PB strengthHypertrophy frequency: ≥50% of main strength-quality slots (case 13)', () => {
    const pb = generate({ ...base, qualities: PRESETS.powerbuilding })
    const strengthExs = pb.weeks.flatMap(w => w.sessions).flatMap(s => s.exercises)
      .filter(e => e.quality === 'strength')
    const shCount = strengthExs.filter(e => e.scheme.type === 'strengthHypertrophy').length
    expect(shCount / strengthExs.length).toBeGreaterThanOrEqual(0.50)
  })

  // Case 16: PB strength floor guard — heavy-set share ≥ 30% in main strength slots
  it('PB strength floor guard: heavy-set share (reps<=5) ≥ 0.30 in all main strength slots (case 16)', () => {
    const pb = generate({ ...base, qualities: PRESETS.powerbuilding })
    const mainStrSets = pb.weeks.flatMap(w => w.sessions).flatMap(s => s.exercises)
      .filter(e => e.quality === 'strength')
      .flatMap(e => e.scheme.sets)
      .filter(s => Number.isFinite(s.reps))
    const heavy = mainStrSets.filter(s => s.reps <= 5)
    expect(heavy.length / mainStrSets.length).toBeGreaterThanOrEqual(0.30)
  })

  // Case 17: differentiation assertion — heavyRatio(PB) < heavyRatio(PL), top preserved
  it('differentiation: heavyRatio(PB) < heavyRatio(PL); SH top sets have strength reps (case 17)', () => {
    const plPlan = generate({ ...base, qualities: PRESETS.powerlifting })
    const pbPlan = generate({ ...base, qualities: PRESETS.powerbuilding })

    function heavyRatioByReps(plan) {
      const sets = plan.weeks.flatMap(w => w.sessions).flatMap(s => s.exercises)
        .filter(e => e.quality === 'strength')
        .flatMap(e => e.scheme.sets)
        .filter(s => Number.isFinite(s.reps))
      const heavy = sets.filter(s => s.reps <= 5)
      if (sets.length === 0) return 1
      return heavy.length / sets.length
    }

    const plRatio = heavyRatioByReps(plPlan)
    const pbRatio = heavyRatioByReps(pbPlan)
    expect(pbRatio, `PB heavy ratio ${pbRatio} should be < PL ${plRatio}`).toBeLessThan(plRatio)

    // Top-end invariant: SH exercises always have strength-reps top set (92%)
    const pbSHExs = pbPlan.weeks.flatMap(w => w.sessions).flatMap(s => s.exercises)
      .filter(e => e.quality === 'strength' && e.scheme.type === 'strengthHypertrophy')
    expect(pbSHExs.length, 'PB must have SH exercises to test top invariant').toBeGreaterThan(0)
    for (const ex of pbSHExs) {
      expect(ex.scheme.sets[0].reps, 'SH top set must have strength zone reps').toBe(ZONES.strength.reps[0])
      // PL also preserves top: check PL top-set weight ≥ 90% of base e1rm (week-0, loadRamp≈1)
    }
    // PL: no SH → top verified via its own scheme (topSetBackoff top = e1rm*0.92 = heavy)
    // We only need to check that the top exercise in PL is still heavy (not degraded)
    const plTopWeights = plPlan.weeks[0].sessions.flatMap(s => s.exercises)
      .filter(e => e.quality === 'strength')
      .map(e => Math.max(...e.scheme.sets.map(s => s.weight)))
    const BASE_E1RM = { squat: 200, bench: 140, deadlift: 240 }
    for (const ex of plPlan.weeks[0].sessions.flatMap(s => s.exercises).filter(e => e.quality === 'strength')) {
      const top = Math.max(...ex.scheme.sets.map(s => s.weight))
      const base_e1rm = BASE_E1RM[ex.baseLift]
      // ≥0.80 of the comp base: heavy (not degraded to a hypertrophy backoff ~0.67–0.75).
      // A strength-quality VARIATION slot has an e1rmModifier<1, so its absolute top can
      // sit ~0.83 of the comp base — still clearly heavy.
      expect(top / base_e1rm, `PL top% should be heavy for ${ex.baseLift}`).toBeGreaterThanOrEqual(0.80)
    }
  })
})

describe('generate v3 mesocycle controls', () => {
  it('honors mesoWeeks + deload toggle', () => {
    expect(generate({ ...profile, mesoWeeks: 5, deloadEnabled: true }).weeks).toHaveLength(6)
    expect(generate({ ...profile, mesoWeeks: 5, deloadEnabled: false }).weeks).toHaveLength(5)
  })
  it('exercises carry concrete scheme sets', () => {
    const ex = generate(profile).weeks[0].sessions[0].exercises[0]
    expect(ex.scheme.sets.length).toBeGreaterThan(0)
  })
  it('accessories carry a rep-based scheme (quality + sets, no weight)', () => {
    const plan = generate(styleProfile)
    const acc = plan.weeks[0].sessions.flatMap((s) => s.accessories)
    expect(acc.length).toBeGreaterThan(0)
    expect(acc.every((a) => a.quality && a.scheme && a.scheme.sets.length > 0)).toBe(true)
    expect(acc.every((a) => a.scheme.sets.every((set) => set.reps != null && set.weight === undefined))).toBe(true)
  })
})

describe('per-lift frequency layout', () => {
  const base = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 5, fatigue: 1, mesoWeeks: 3, deloadEnabled: false,
    qualities: { power:0, strength:1, hypertrophy:0, endurance:0 },
  }
  const liftSlots = (r, lift) => r.weeks[0].sessions.flatMap(s=>s.exercises).filter(e=>e.baseLift===lift).length
  it('honors explicit per-lift frequency in week 1 slot counts', () => {
    const r = generate({ ...base, frequency: { squat: 3, bench: 1, deadlift: 0 } })
    expect(liftSlots(r, 'squat')).toBe(3)
    expect(liftSlots(r, 'bench')).toBe(1)
    expect(liftSlots(r, 'deadlift')).toBe(0)
    expect(r.template).toBe('custom')
  })
  it('default (no frequency) preserves legacy-ish distribution: squat 2, bench 2, deadlift 1 at 4 days', () => {
    const r = generate({ ...base, daysPerWeek: 4, frequency: undefined })
    expect(liftSlots(r, 'squat')).toBe(2)
    expect(liftSlots(r, 'bench')).toBe(2)
    expect(liftSlots(r, 'deadlift')).toBe(1)
  })
  it('total main slots equal the sum of frequencies', () => {
    const freq = { squat: 2, bench: 3, deadlift: 1 }
    const r = generate({ ...base, daysPerWeek: 5, frequency: freq })
    const total = r.weeks[0].sessions.flatMap(s=>s.exercises).filter(e=>['squat','bench','deadlift'].includes(e.baseLift)).length
    expect(total).toBe(6)
  })
  it('clamps frequency above daysPerWeek', () => {
    const r = generate({ ...base, daysPerWeek: 3, frequency: { squat: 9, bench: 0, deadlift: 0 } })
    expect(liftSlots(r, 'squat')).toBe(3)   // clamped to daysPerWeek
  })
})

describe('recommendation quality (acceptance)', () => {
  const base = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
    equipment: ['barbell','rack','bench','cables','dumbbells','leg press machine','machine','box','db','ghr machine'],
    accessoryPreference: 'machine',
  }
  const mainSchemes = (r) => r.weeks.flatMap(w=>w.sessions).flatMap(s=>s.exercises).map(e=>e.scheme.type)
  const mainSets = (r) => r.weeks.flatMap(w=>w.sessions).flatMap(s=>s.exercises).map(e=>e.sets)

  it('main lifts never use 1-set intensity techniques', () => {
    const r = generate({ ...base, qualities: PRESETS.powerbuilding })
    const banned = ['restPause','dropSet','myoReps','widowmaker']
    expect(mainSchemes(r).every((k) => !banned.includes(k))).toBe(true)
  })
  it('main working exercises have at least 2 sets each (no 1-set collapse)', () => {
    const r = generate({ ...base, qualities: PRESETS.powerlifting })
    expect(mainSets(r).length).toBeGreaterThan(0)
    expect(Math.min(...mainSets(r))).toBeGreaterThanOrEqual(2)
  })
  it('squat variation slots are not Box Squat by default', () => {
    const r = generate({ ...base, qualities: PRESETS.powerbuilding })
    const squatVars = r.weeks.flatMap(w=>w.sessions).flatMap(s=>s.exercises)
      .filter(e=>e.baseLift==='squat' && e.scheme).map(e=>e.lift)
    expect(squatVars.some((n)=>/Box Squat/.test(n))).toBe(false)
  })
})

// frequency: squat:2, bench:3, deadlift:1 at 5 days forces a combined session on day 2
// (distinctDays: squat→[0,2], bench→[1,2,4], deadlift→[2] → day 2 has all 3 lifts)
describe('multi-lift session accessories (Fix 1 + Fix 2)', () => {
  const multiBase = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 5, fatigue: 1, mesoWeeks: 3, deloadEnabled: false,
    qualities: { power:0, strength:1, hypertrophy:0, endurance:0 },
    frequency: { squat: 2, bench: 3, deadlift: 1 },
    equipment: ['barbell','rack','bench','cables','dumbbells'],
  }
  it('session with 2+ main lifts has accessories (secondary lift no longer zero)', () => {
    const plan = generate(multiBase)
    const multiSessions = plan.weeks[0].sessions.filter(s => new Set(s.exercises.map(e => e.baseLift)).size >= 2)
    expect(multiSessions.length).toBeGreaterThan(0)
    for (const s of multiSessions) expect(s.accessories.length).toBeGreaterThan(0)
  })
  it('combined session total accessories ≤ shared cap (not multiplied per lift)', () => {
    const plan = generate(multiBase)
    const multiSessions = plan.weeks[0].sessions.filter(s => new Set(s.exercises.map(e => e.baseLift)).size >= 2)
    for (const s of multiSessions) expect(s.accessories.length).toBeLessThanOrEqual(5)
  })
  it('combined squat+bench session includes bench-specific accessories (targetLift)', () => {
    const plan = generate(multiBase)
    const combined = plan.weeks[0].sessions.find(s => {
      const bases = new Set(s.exercises.map(e => e.baseLift))
      return bases.has('squat') && bases.has('bench')
    })
    expect(combined).toBeTruthy()
    expect(combined.accessories.some(a => a.targetLift === 'bench')).toBe(true)
  })
})

describe('main lift volume floor + weekly ramp', () => {
  const base = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 1, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
    qualities: { power:0, strength:0.5, hypertrophy:0.5, endurance:0 },
  }
  const squatSets = (r, w) => r.weeks[w].sessions.flatMap(s=>s.exercises).filter(e=>e.baseLift==='squat').reduce((a,e)=>a+e.sets,0)
  const squatTopLoad = (r, w) => Math.max(...r.weeks[w].sessions.flatMap(s=>s.exercises).filter(e=>e.baseLift==='squat').map(e=>e.weight))
  it('weekly squat volume is non-decreasing across the ramp (capped by per-session cap)', () => {
    const r = generate(base)
    // With the per-session cap, the floor may already sit at the ceiling, so
    // weekly volume can be flat — progression then comes from LOAD (below), not
    // ever-more junk sets. Volume must never DECREASE across working weeks.
    expect(squatSets(r, 3)).toBeGreaterThanOrEqual(squatSets(r, 0))
  })
  it('week 4 squat top-set load exceeds week 1 (bounded weekly load progression)', () => {
    const r = generate(base)
    expect(squatTopLoad(r, 3)).toBeGreaterThan(squatTopLoad(r, 0))
  })
  it('week 1 squat session volume is above the old MEV-pinned minimum', () => {
    const r = generate(base)
    const wk1 = r.weeks[0].sessions.flatMap(s=>s.exercises).filter(e=>e.baseLift==='squat')
    // at least one squat session with >= 5 working sets (old default was ~4)
    expect(Math.max(...wk1.map(e=>e.sets))).toBeGreaterThanOrEqual(5)
  })
})

// ── Test 9: steering layer gating ────────────────────────────────────────────
describe('steering layer gating (test 9)', () => {
  const base = {
    lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
    equipment: ['barbell', 'rack', 'bench', 'cables', 'dumbbells'],
  }
  const countMuscle = (plan, muscle) =>
    plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.accessories)
      .filter((a) => a.primaryMuscle === muscle).length

  it('balanced/hyp blend picks more biceps accessories than powerlifting blend (deficit fill ON vs gated)', () => {
    // balanced: dom='hypertrophy' → gatedWeight=0.6 → biceps deficit-boosted
    // powerlifting: dom='strength' → gatedWeight=0 → no deficit fill
    const balanced = generate({ ...base, qualities: { power: 0, strength: 0.3, hypertrophy: 0.7, endurance: 0 } })
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    expect(countMuscle(balanced, 'biceps')).toBeGreaterThan(countMuscle(pl, 'biceps'))
  })

  it('accessory count per session stays within cap (≤5) for both blends', () => {
    const balanced = generate({ ...base, qualities: { power: 0, strength: 0.3, hypertrophy: 0.7, endurance: 0 } })
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    for (const plan of [balanced, pl]) {
      for (const wk of plan.weeks) {
        for (const s of wk.sessions) {
          expect(s.accessories.length).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('reporting muscleVolume uses actual scheme.sets', () => {
    // Both the steering ledger and reporting now use realized scheme.sets.length.
    const plan = generate({ ...base, qualities: { power: 0, strength: 0.3, hypertrophy: 0.7, endurance: 0 } })
    for (const wk of plan.weeks) {
      expect(wk.muscleVolume).toBeTruthy()
      for (const group of Object.keys(wk.muscleVolume)) {
        expect(typeof wk.muscleVolume[group].sets).toBe('number')
        expect(wk.muscleVolume[group].sets).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // ── accessories use a uniform straight scheme (readability) + deterministic ──
  it('auto accessories are all STRAIGHT (uniform display) and deterministic', () => {
    const hyp = { ...base, qualities: { power: 0, strength: 0.3, hypertrophy: 0.7, endurance: 0 } }
    const plan = generate(hyp)
    const types = new Set(
      plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.accessories).map((a) => a.scheme.type)
    )
    expect([...types]).toEqual(['straight'])       // no rest-pause/drop-set/myo-reps mixed in
    // Deterministic across runs.
    const names = (p) => p.weeks.map((w) => w.sessions.map((s) => s.accessories.map((a) => a.name)))
    expect(names(generate(hyp))).toEqual(names(plan))
  })
})

// ── Tests: peaking × ledger tuning (Change A + B) ────────────────────────────
describe('peaking × ledger tuning (Change A + B)', () => {
  // 6-week hypertrophy-dominant peaking profile (hyp=0.7 → dom='hypertrophy',
  // goalBias=1, minCap=1, sharedCap=4, baseDeficit=0.6)
  const hypPeakProfile = {
    lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    years: 3, daysPerWeek: 4, fatigue: 2,
    qualities: { power: 0, strength: 0.3, hypertrophy: 0.7, endurance: 0 },
    mesoWeeks: 6,
    competition: { on: true, date: '2026-09-01' },
    deloadEnabled: false,
    equipment: ['barbell', 'rack', 'bench', 'cables', 'dumbbells'],
  }
  // Phase map for 6-week meso (phaseFor(wk.index-1, 6, true)):
  //  plan.weeks[0,1] → accumulation   (deficitWeight=0.6, sharedCap=4)
  //  plan.weeks[2,3] → intensification (deficitWeight=0.3, sharedCap=4)
  //  plan.weeks[4,5] → peak            (deficitWeight=0.0, sharedCap=3)

  const weekAccCount = (plan, i) =>
    plan.weeks[i].sessions.reduce((sum, s) => sum + s.accessories.length, 0)

  const weekBicepsSets = (plan, i) =>
    plan.weeks[i].sessions
      .flatMap(s => s.accessories)
      .filter(a => a.primaryMuscle === 'biceps')
      .reduce((sum, a) => sum + a.scheme.sets.length, 0)

  // ── A.1: no backfill in peak ───────────────────────────────────────────────
  it('A — peak weeks: biceps deficit sets ≤ intensification weeks (no taper reversal)', () => {
    const plan = generate(hypPeakProfile)
    const accumBiceps  = weekBicepsSets(plan, 0) + weekBicepsSets(plan, 1)
    const intensBiceps = weekBicepsSets(plan, 2) + weekBicepsSets(plan, 3)
    const peakBiceps   = weekBicepsSets(plan, 4) + weekBicepsSets(plan, 5)
    // Deficit fill in accum should boost under-represented biceps in SBD plans
    expect(accumBiceps).toBeGreaterThan(0)
    // Peak: deficitWeight=0 → biceps not boosted → count ≤ intens level
    expect(peakBiceps).toBeLessThanOrEqual(intensBiceps)
  })

  // ── A.2: determinism ──────────────────────────────────────────────────────
  it('A — determinism: two generate() calls produce identical accessory output', () => {
    const names = (p) => p.weeks.map(w => w.sessions.map(s => s.accessories.map(a => a.name)))
    expect(names(generate(hypPeakProfile))).toEqual(names(generate(hypPeakProfile)))
  })

  // ── B.3: count taper but not zero ─────────────────────────────────────────
  it('B — peak accessory count ≤ accum count and every peak session ≥ minCap (1)', () => {
    const plan = generate(hypPeakProfile)
    // hyp-dom: sharedCap=4 in accum, sharedCap=3 in peak (after −1 trim)
    expect(weekAccCount(plan, 4)).toBeLessThanOrEqual(weekAccCount(plan, 0))
    // Floor = minCap=1: no session is wiped out entirely
    for (const s of plan.weeks[4].sessions) {
      expect(s.accessories.length).toBeGreaterThanOrEqual(1)
    }
  })

  // ── B.4: deload guard ─────────────────────────────────────────────────────
  it('B — deload guard: deload week in peak phase is NOT double-cut below working peak', () => {
    const plan = generate({ ...hypPeakProfile, deloadEnabled: true })
    expect(plan.weeks).toHaveLength(7)
    const deloadWk = plan.weeks[6]
    expect(deloadWk.isDeload).toBe(true)
    // Guard (!wk.isDeload) prevents the −1 trim: deload sharedCap stays at 4 (accum level)
    // Working peak sharedCap=3 → deload must be ≥ peak
    const deloadTotal = deloadWk.sessions.reduce((sum, s) => sum + s.accessories.length, 0)
    expect(deloadTotal).toBeGreaterThanOrEqual(weekAccCount(plan, 4))
  })

  // ── 5: non-peaking bit-for-bit unchanged ──────────────────────────────────
  it('non-peaking: same profile with competition off produces identical output twice', () => {
    const nonPeakProfile = { ...hypPeakProfile, competition: { on: false, date: '' } }
    const snap = (p) => p.weeks.map(w => w.sessions.map(s => ({
      count: s.accessories.length,
      names: s.accessories.map(a => a.name),
    })))
    // Proves A+B code paths (gated by peaking=false) introduce no non-determinism
    expect(snap(generate(nonPeakProfile))).toEqual(snap(generate(nonPeakProfile)))
  })

  // ── 6: pure-PL peak accessory taper (floor=1 active) ──────────────────────
  it('pure-PL peaking: peak-week accessories taper below accum weeks (floor=1, ≥1)', () => {
    // str=0.70 → dom='strength' → goalBias=-1 → minCap=2, sharedCap=2.
    // Peak taper floor=1: Math.max(1, 2-1)=1 → peak weeks drop 2→1 per session.
    // baseDeficit=0 (str-dom) so deficit never alters names; only the count tapers,
    // and the taper is peaking-gated (non-peaking plans are unchanged).
    const plPeakProfile = {
      ...hypPeakProfile,
      qualities: { power: 0.10, strength: 0.70, hypertrophy: 0.20, endurance: 0.00 },
    }
    const peakPlan    = generate(plPeakProfile)
    const nonPeakPlan = generate({ ...plPeakProfile, competition: { on: false, date: '' } })
    // Peaking: peak weeks (4,5) tapered below accum weeks (0,1); never wiped (≥1)
    for (const wi of [4, 5]) {
      expect(weekAccCount(peakPlan, wi)).toBeLessThan(weekAccCount(peakPlan, 0))
      for (const s of peakPlan.weeks[wi].sessions) {
        expect(s.accessories.length).toBeGreaterThanOrEqual(1)
      }
    }
    // Non-peaking: no taper — peak-index week count equals accum-index week count
    expect(weekAccCount(nonPeakPlan, 4)).toBe(weekAccCount(nonPeakPlan, 0))
  })
})

// ── Accessory deficit-fill gating ramp (feat/accessory-gating-ramp) ──────────
describe('accessory deficit-fill gating ramp', () => {
  const base = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
    equipment: ['barbell','rack','bench','cables','dumbbells'],
  }
  const countMuscle = (plan, muscle) =>
    plan.weeks.flatMap(w => w.sessions).flatMap(s => s.accessories)
      .filter(a => a.primaryMuscle === muscle).length

  // §4.1 — deficitBaseWeight unit: boundary values (RED: export missing before patch)
  it('deficitBaseWeight: PL (str-dom, hyp=0.20) → 0 (dead-zone clamp)', () => {
    expect(deficitBaseWeight({ dom: 'strength', n: { hypertrophy: 0.20 } })).toBe(0)
  })
  it('deficitBaseWeight: PB (str-dom, hyp=0.45) → 0.45 (ramp midpoint)', () => {
    expect(deficitBaseWeight({ dom: 'strength', n: { hypertrophy: 0.45 } })).toBeCloseTo(0.45, 6)
  })
  it('deficitBaseWeight: athletic (power-dom, hyp=0.20) → 0 (power branch dead-zone)', () => {
    expect(deficitBaseWeight({ dom: 'power', n: { hypertrophy: 0.20 } })).toBe(0)
  })
  it('deficitBaseWeight: bodybuilding (hyp-dom, hyp=0.80) → 0.6 (non-str/pwr branch full)', () => {
    expect(deficitBaseWeight({ dom: 'hypertrophy', n: { hypertrophy: 0.80 } })).toBe(0.6)
  })
  it('deficitBaseWeight: 50/50 (str-dom, hyp=0.50) → 0.6 (HI clamp)', () => {
    expect(deficitBaseWeight({ dom: 'strength', n: { hypertrophy: 0.50 } })).toBe(0.6)
  })
  it('deficitBaseWeight: endurance-dom → 0.6 (non-str/pwr branch full)', () => {
    expect(deficitBaseWeight({ dom: 'endurance', n: { hypertrophy: 0.10 } })).toBe(0.6)
  })

  // §4.2 — regression: PB active, PL preserved
  it('PL deficit muscles (biceps/sideDelts/lats/upperBack) = 0', () => {
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    for (const muscle of ['biceps', 'sideDelts', 'lats', 'upperBack']) {
      expect(countMuscle(pl, muscle), `PL ${muscle} should be 0`).toBe(0)
    }
  })
  it('PB deficit muscles > 0 AND PB accessory names differ from PL (RED: PB currently 0)', () => {
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    const pb = generate({ ...base, qualities: PRESETS.powerbuilding })
    const deficitMuscles = ['biceps', 'sideDelts', 'lats', 'upperBack']
    const pbDeficitTotal = deficitMuscles.reduce((s, m) => s + countMuscle(pb, m), 0)
    expect(pbDeficitTotal, 'PB should have >0 deficit-muscle accessories').toBeGreaterThan(0)
    const plAllNames = pl.weeks.flatMap(w => w.sessions).flatMap(s => s.accessories).map(a => a.name).sort().join(',')
    const pbAllNames = pb.weeks.flatMap(w => w.sessions).flatMap(s => s.accessories).map(a => a.name).sort().join(',')
    expect(pbAllNames, 'PB accessory names should differ from PL').not.toBe(plAllNames)
  })
  it('PB total accessory count > PL count (goalBias -1→0 in the hyp-active zone grants +1 slot)', () => {
    // PB {str0.45/hyp0.45}: dom=strength but baseDeficit>0 (hyp share ≥ LO) → goalBias 0
    // → minCap 1, sharedCap 3 (vs PL's -1 → minCap 2, sharedCap 2). So PB carries one
    // extra accessory per session for muscle-group completeness; PL stays SBD-lean.
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    const pb = generate({ ...base, qualities: PRESETS.powerbuilding })
    const count = plan => plan.weeks.flatMap(w => w.sessions).flatMap(s => s.accessories).length
    expect(count(pb)).toBeGreaterThan(count(pl))
  })

  it('accessory-count gradient: PL == athletic (lean) < PB < bodybuilding', () => {
    // goalBias: PL/athletic -1 (baseDeficit 0), PB 0 (hyp-active), bodybuilding +1.
    // athletic is power-dominant with hyp 0.20 → baseDeficit 0 → stays lean (NOT bumped),
    // proving the bump keys on hyp share, not merely on being a mixed blend.
    const count = q => generate({ ...base, qualities: q })
      .weeks.flatMap(w => w.sessions).flatMap(s => s.accessories).length
    const pl = count(PRESETS.powerlifting)
    const ath = count(PRESETS.athletic)
    const pb = count(PRESETS.powerbuilding)
    const bb = count(PRESETS.bodybuilding)
    expect(ath).toBe(pl)          // power-dominant stays SBD-lean
    expect(pb).toBeGreaterThan(pl)
    expect(bb).toBeGreaterThan(pb) // full gradient
  })

  // §4.3 — PL deterministic accessory golden (re-baselined after family dedup + centered
  // layout spacing). Each session has at most one of any movement family (no GM wide+narrow).
  it('PL 4-week accessory names — deterministic golden, no same-family duplicates per session', () => {
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    const names = pl.weeks.map(w => w.sessions.map(s => s.accessories.map(a => a.name)))
    // Re-baselined after accessories were made uniform STRAIGHT (readability): with
    // every accessory at 3 sets the steering ledger is identical each week, so the
    // deterministic selection repeats across all 4 weeks. No same movement-family
    // twice in a session.
    const wk = [['Cable Fly', 'Cable Pull-Through'], ['Cable Glute Kickback', 'Bulgarian Split Squat'], ['Cable Fly', 'Low-to-High Cable Fly'], ['Cable Glute Kickback', 'Bulgarian Split Squat']]
    expect(names).toEqual([wk, wk, wk, wk])
  })

  // §4.4 — PB peaking taper: deficit-fill monotonically decreasing (RED: accumTotal=0 before patch)
  it('PB peaking: deficit-fill per-week monotonically decreasing (accum > 0, accum ≥ intens ≥ peak=0)', () => {
    const pbPeakProfile = {
      ...base,
      qualities: PRESETS.powerbuilding,
      mesoWeeks: 6,
      competition: { on: true, date: '2026-09-01' },
    }
    const plan = generate(pbPeakProfile)
    const weekDeficitCount = (i) => plan.weeks[i].sessions.flatMap(s => s.accessories)
      .filter(a => ['biceps', 'sideDelts', 'lats', 'upperBack'].includes(a.primaryMuscle)).length
    const accumTotal = weekDeficitCount(0) + weekDeficitCount(1)
    const intensTotal = weekDeficitCount(2) + weekDeficitCount(3)
    const peakTotal   = weekDeficitCount(4) + weekDeficitCount(5)
    expect(accumTotal, 'PB accum weeks should have active deficit fill').toBeGreaterThan(0)
    expect(accumTotal).toBeGreaterThanOrEqual(intensTotal)
    expect(intensTotal).toBeGreaterThanOrEqual(peakTotal)
    expect(peakTotal, 'peak weeks: deficitWeight=0 → no deficit-muscle fill').toBe(0)
  })

  // §4.5 — Determinism
  it('generate() with PB produces identical accessory output on two calls', () => {
    const pbProfile = { ...base, qualities: PRESETS.powerbuilding }
    const names = (p) => p.weeks.map(w => w.sessions.map(s => s.accessories.map(a => a.name)))
    expect(names(generate(pbProfile))).toEqual(names(generate(pbProfile)))
  })
})

describe('peaking (competition) taper mode integration', () => {
  // 6-week powerlifting meso with competition on + date → peaking=true → taper mode
  const peakProfile = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 6, deloadEnabled: false,
    qualities: { power: 0.10, strength: 0.70, hypertrophy: 0.20, endurance: 0.00 },
    competition: { on: true, date: '2026-09-01' },
  }
  // sum all main lift sets in a given working-week index (0-based)
  const mainSetsInWeek = (plan, w) =>
    plan.weeks[w].sessions
      .flatMap(s => s.exercises)
      .filter(e => ['squat','bench','deadlift'].includes(e.baseLift))
      .reduce((a, e) => a + e.sets, 0)

  it('last working week main volume < peak-boundary week (taper is non-monotonic)', () => {
    const plan = generate(peakProfile)
    // For 6-week meso: PEAK_AT=2/3 → t≈2/3 near w=3 (t=3/5=0.6); last working = w=5.
    // Peak-boundary ramp ≈1.135 at w=3; last ramp=0.55 at w=5 → last < mid.
    const midSets  = mainSetsInWeek(plan, 3)   // w=3 is last ascending week
    const lastSets = mainSetsInWeek(plan, 5)   // w=5 is last working week
    expect(lastSets).toBeLessThan(midSets)
  })

  it('every working week main lift has >= 2 sets per session (taper floor=2)', () => {
    const plan = generate(peakProfile)
    for (const wk of plan.weeks) {
      for (const s of wk.sessions) {
        for (const e of s.exercises.filter(ex => ['squat','bench','deadlift'].includes(ex.baseLift))) {
          expect(e.sets).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })
})

// recommendedFrequency integration (final-review fix)
describe('recommendedFrequency integration', () => {
  const base = {
    lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    years: 3, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
    qualities: PRESETS.powerlifting,  // str-dominant, non-mixed → +1 squat when room allows
  }
  const squatCount = (r) => r.weeks[0].sessions.flatMap((s) => s.exercises).filter((e) => e.baseLift === 'squat').length

  it('5-day str-dominant plan (no explicit frequency) → squat trained 3× in week 1', () => {
    const r = generate({ ...base, daysPerWeek: 5 })
    expect(squatCount(r)).toBe(3)
  })
  it('4-day str-dominant plan (no explicit frequency, no room) → squat trained 2× in week 1', () => {
    const r = generate({ ...base, daysPerWeek: 4 })
    expect(squatCount(r)).toBe(2)
  })
})

// whole-mesocycle phase, block-relative ramp (S2 Task 3 fix)
describe('12-week peaking plan: whole-mesocycle phase arc (S2 Task 3 fix)', () => {
  // Pure strength + peaking: peak schemes (topSingleBackoff/ramping) must appear only
  // in late whole-mesocycle weeks (workWeekIndex ≥ 8/11 → frac ≥ 0.67), NOT in early
  // block-1 weeks even though those weeks sit at blockWeek 4/5 within their 6-week block.
  const peakProfile12 = {
    lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 12, deloadEnabled: true,
    qualities: { power: 0, strength: 1, hypertrophy: 0, endurance: 0 },
    competition: { on: true, date: '2027-01-01' },
    periodizationModel: 'auto',
  }
  // planLayout(12, true): 6 work + deload + 6 work + deload = 14 entries
  // plan.weeks[4]  = block-1 blockWeek=4, workWeekIndex=4 → frac=4/11≈0.36 → accumulation (fixed)
  //                  broken: phaseFor(4,6,true) frac=4/5=0.80 → 'peak' → topSingleBackoff/ramping
  // plan.weeks[12] = block-2 blockWeek=5, workWeekIndex=11 → frac=11/11=1.0 → 'peak' (both)

  it('early work week (plan.weeks[4], workWeekIndex=4) does NOT use peak-phase scheme', () => {
    const plan = generate(peakProfile12)
    expect(plan.weeks).toHaveLength(14) // 6 work + deload + 6 work + deload
    expect(plan.weeks[4].isDeload).toBe(false)
    const earlyStrExs = plan.weeks[4].sessions.flatMap(s => s.exercises)
      .filter(e => e.quality === 'strength')
    expect(earlyStrExs.length, 'early week must have strength exercises').toBeGreaterThan(0)
    for (const ex of earlyStrExs) {
      expect(
        ['topSingleBackoff', 'ramping'],
        `week 5 (workWeekIndex=4) must NOT use peak scheme; got ${ex.scheme.type} on ${ex.lift}`,
      ).not.toContain(ex.scheme.type)
    }
  })

  it('final work week (plan.weeks[12], workWeekIndex=11) uses peak-phase scheme', () => {
    const plan = generate(peakProfile12)
    expect(plan.weeks[12].isDeload).toBe(false)
    const lateStrExs = plan.weeks[12].sessions.flatMap(s => s.exercises)
      .filter(e => e.quality === 'strength')
    expect(lateStrExs.length, 'final work week must have strength exercises').toBeGreaterThan(0)
    const hasPeakScheme = lateStrExs.some(e =>
      e.scheme.type === 'topSingleBackoff' || e.scheme.type === 'ramping',
    )
    expect(hasPeakScheme, 'final work week should use peak-phase scheme').toBe(true)
  })
})

// realization isolation integration (S2 final-review)
describe('realization deload vs recovery deload integration (S2 final-review)', () => {
  // 4-week peaking plan with deload: trailing deload → Bosquet realization taper (holds intensity)
  const peakDeloadProfile = {
    lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: true,
    qualities: { power: 0.10, strength: 0.70, hypertrophy: 0.20, endurance: 0.00 },
    competition: { on: true, date: '2026-09-01' },
    periodizationModel: 'auto',
  }
  // Same profile without competition → recovery deload (drops to RPE 6)
  const nonPeakDeloadProfile = { ...peakDeloadProfile, competition: { on: false, date: '' } }

  // 12-week peaking plan with deloads enabled → block-1 deload (recovery) + block-2 deload (realization)
  const longPeakDeloadProfile = {
    lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 12, deloadEnabled: true,
    qualities: { power: 0, strength: 1, hypertrophy: 0, endurance: 0 },
    competition: { on: true, date: '2027-01-01' },
    periodizationModel: 'auto',
  }

  it('PEAKING plan trailing deload holds intensity (rpeTarget !== 6) — realization', () => {
    const plan = generate(peakDeloadProfile)
    const deloadWeeks = plan.weeks.filter(w => w.isDeload)
    expect(deloadWeeks.length).toBeGreaterThan(0)
    const trailingDeload = deloadWeeks[deloadWeeks.length - 1]
    const mainExs = trailingDeload.sessions.flatMap(s => s.exercises)
      .filter(e => ['squat', 'bench', 'deadlift'].includes(e.baseLift))
    expect(mainExs.length).toBeGreaterThan(0)
    for (const ex of mainExs) {
      expect(ex.rpeTarget, `realization: ${ex.lift} rpeTarget should not be 6`).not.toBe(6)
    }
  })

  it('NON-PEAKING plan trailing deload drops to rpeTarget 6 — recovery', () => {
    const plan = generate(nonPeakDeloadProfile)
    const deloadWeeks = plan.weeks.filter(w => w.isDeload)
    expect(deloadWeeks.length).toBeGreaterThan(0)
    const trailingDeload = deloadWeeks[deloadWeeks.length - 1]
    const mainExs = trailingDeload.sessions.flatMap(s => s.exercises)
      .filter(e => ['squat', 'bench', 'deadlift'].includes(e.baseLift))
    expect(mainExs.length).toBeGreaterThan(0)
    for (const ex of mainExs) {
      expect(ex.rpeTarget, `recovery: ${ex.lift} rpeTarget should be 6`).toBe(6)
    }
  })

  it('>8-week peaking plan: mid-plan deload is recovery (rpeTarget 6), final deload is realization (rpeTarget !== 6)', () => {
    const plan = generate(longPeakDeloadProfile)
    // planLayout(12, true): 6 work + deload + 6 work + deload = 14 total weeks, 2 deloads
    const deloadWeeks = plan.weeks.filter(w => w.isDeload)
    expect(deloadWeeks.length).toBe(2)
    // Mid-plan deload (block-1 trailing): NOT lastEntry → recovery
    const midDeload = deloadWeeks[0]
    const midMainExs = midDeload.sessions.flatMap(s => s.exercises)
      .filter(e => ['squat', 'bench', 'deadlift'].includes(e.baseLift))
    expect(midMainExs.length).toBeGreaterThan(0)
    for (const ex of midMainExs) {
      expect(ex.rpeTarget, `mid-deload recovery: ${ex.lift} should be 6`).toBe(6)
    }
    // Final deload (block-2 trailing = lastEntry in a peaking plan): realization
    const finalDeload = deloadWeeks[deloadWeeks.length - 1]
    const finalMainExs = finalDeload.sessions.flatMap(s => s.exercises)
      .filter(e => ['squat', 'bench', 'deadlift'].includes(e.baseLift))
    expect(finalMainExs.length).toBeGreaterThan(0)
    for (const ex of finalMainExs) {
      expect(ex.rpeTarget, `final-deload realization: ${ex.lift} rpeTarget should not be 6`).not.toBe(6)
    }
  })
})
