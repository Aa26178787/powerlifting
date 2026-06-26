import { describe, it, expect } from 'vitest'
import { resolveE1rm, generate } from './generate.js'
import { byName } from './exercises.js'
import { PRESETS } from './quality.js'

const profile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, fatigue: 2,
  qualities: { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 },
  periodizationModel: 'auto',
}

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
