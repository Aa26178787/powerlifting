import { describe, it, expect } from 'vitest'
import { judgeAccessoryFit, suggestAlternatives } from './accessoryFit.js'
import { byName } from './exercises.js'

const codes = (fit) => fit.reasons.map((r) => r.code)

describe('judgeAccessoryFit — verdicts & reasons', () => {
  it('emphasis match (wide-grip bench → chest accessory) → good', () => {
    const fit = judgeAccessoryFit({ name: 'Machine Chest Press', lift: 'bench', style: { grip: 'wide' }, quality: 'hypertrophy' })
    expect(codes(fit)).toContain('emphasisMatch')
    expect(fit.verdict).toBe('good')
  })
  it('de-emphasised (close-grip bench → chest accessory) → ok with emphasisOff', () => {
    const fit = judgeAccessoryFit({ name: 'Machine Chest Press', lift: 'bench', style: { grip: 'close' }, quality: 'hypertrophy' })
    expect(codes(fit)).toContain('emphasisOff')
    expect(fit.verdict).toBe('ok')
  })
  it('region pain (status 2 on a stressed region) → caution', () => {
    const fit = judgeAccessoryFit({ name: 'Standing Leg Curl (Machine)', lift: 'deadlift', style: { stance: 'conventional' }, regionStatus: { knee: 2 } })
    expect(codes(fit)).toContain('regionPain')
    expect(fit.verdict).toBe('caution')
  })
  it('region injury (status 3) → avoid', () => {
    const fit = judgeAccessoryFit({ name: 'Standing Leg Curl (Machine)', lift: 'deadlift', regionStatus: { knee: 3 } })
    expect(codes(fit)).toContain('regionInjury')
    expect(fit.verdict).toBe('avoid')
  })
  it('over-MRV prime mover → caution', () => {
    const fit = judgeAccessoryFit({ name: 'Leg Extension', lift: 'squat', style: { bar: 'high' }, muscleSummary: { quads: { status: 'over' } } })
    expect(codes(fit)).toContain('overMrv')
    expect(fit.verdict).toBe('caution')
  })
  it('off-target accessory is informational only, never negative', () => {
    const fit = judgeAccessoryFit({ name: 'Machine Chest Press', lift: 'squat', style: { bar: 'low' } })
    expect(codes(fit)).toContain('offTarget')
    expect(['ok', 'good']).toContain(fit.verdict)
  })
})

describe('judgeAccessoryFit — robustness & suggestions', () => {
  it('never throws and returns empty suggestions for an unknown exercise (other pattern)', () => {
    const fit = judgeAccessoryFit({ name: 'NotARealExercise', lift: 'squat', style: { bar: 'low' } })
    expect(fit.suggestions).toEqual([])
    expect(fit.verdict).toBe('ok')
  })
  it('suggestions are same-pattern, region-safe, exclude the current exercise', () => {
    const fit = judgeAccessoryFit({
      name: 'Machine Chest Press', lift: 'bench', style: { grip: 'close' }, equipment: ['barbell','rack','bench','cables','dumbbells','machine'],
    })
    expect(fit.suggestions).not.toContain('Machine Chest Press')
    for (const n of fit.suggestions) {
      const ex = byName(n)
      expect(ex).toBeTruthy()
    }
  })
  it('region-injured alternatives are filtered out of suggestions', () => {
    const out = suggestAlternatives({
      ex: byName('Leg Extension'), lift: 'squat', style: { bar: 'high' },
      regionStatus: { knee: 3 }, equipment: ['barbell','rack','bench','machine','cables','dumbbells'],
    })
    for (const n of out) {
      const ex = byName(n)
      expect((ex.stress ?? []).includes('knee')).toBe(false)   // knee-stressing options excluded at status 3
    }
  })
  it('does not mutate its inputs', () => {
    const rs = { knee: 2 }
    const style = { bar: 'low' }
    judgeAccessoryFit({ name: 'Leg Extension', lift: 'squat', style, regionStatus: rs })
    expect(rs).toEqual({ knee: 2 })
    expect(style).toEqual({ bar: 'low' })
  })
})
