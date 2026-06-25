# v3 SP1 — Quality Model & Mesocycle Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `goal` with a four-quality blend (Power/Strength/Hypertrophy/Endurance) mapped to evidence-based zones, add selectable+recommended periodization models, blend presets, and an MRV volume cap — producing an autoregulation-first mesocycle structure (zone + RPE targets, reps as ranges, weight as a suggestion).

**Architecture:** Extend the live v2 engine in `src/engine/`. Two new pure modules (`quality.js`, `periodizationModel.js`); adapt `volume`/`tuner`/`selector`/`generate`/`periodization`/`deload` from goal-based to quality-blend-based; update UI (store, InputForm, RoutineView, CSV, i18n, LimitsPanel). Everything stays deterministic and Vitest-tested. Reuse exercise DB / variation / accessory / region-status / templates / e1rm / autoreg unchanged.

**Tech Stack:** Vite + React, Vitest (+ jsdom for components), plain ES modules, Node ≥ 18. JSON imports `with { type: 'json' }`.

## Global Constraints

- Engine modules are PURE: no `Date.now()`, no `Math.random()`, no I/O, deterministic. ES modules, `.js`.
- Component test files begin with `// @vitest-environment jsdom` (first line). Pure-logic tests run in node. `src/test/setup.js` already polyfills localStorage — do not add shims.
- Quality keys are exactly `power, strength, hypertrophy, endurance`. A blend is `{power, strength, hypertrophy, endurance}` of non-negative numbers; `normalizeBlend` divides by the sum to fractions (sum 1); all-zero → `DEFAULT_BLEND = {power:0, strength:0.5, hypertrophy:0.4, endurance:0.1}`.
- **ZONES (verbatim):** power `{reps:[2,4], repAnchor:3, pct:[0.55,0.70], loading:'pct', rpeTarget:null}`; strength `{reps:[2,5], repAnchor:3, pct:[0.82,0.92], loading:'rpe', rpeTarget:8.5}`; hypertrophy `{reps:[6,12], repAnchor:9, pct:[0.67,0.78], loading:'rpe', rpeTarget:8.5}`; endurance `{reps:[12,20], repAnchor:16, pct:[0.50,0.62], loading:'rpe', rpeTarget:8}`.
- **PRESETS (verbatim, fractions):** powerlifting `{0.10,0.70,0.20,0.00}`, powerbuilding `{0.10,0.45,0.45,0.00}`, bodybuilding `{0.00,0.20,0.80,0.00}`, athletic `{0.40,0.40,0.20,0.00}`, general `{0.15,0.30,0.40,0.15}` (order: power,strength,hypertrophy,endurance).
- **Exercise shape changes:** `reps` becomes `[min,max]`; add `repAnchor:number`, `quality`, `autoregulate:true`. `pct` = zone %1RM midpoint (engine-set; planAdapter no longer computes it). Weight = e1RM-derived suggestion via `repAnchor` (power: `e1rm*0.625`). `velocity` stays null.
- Periodization models: `linear|undulating|block`; `profile.periodizationModel: 'auto'|'linear'|'undulating'|'block'` (`'auto'` → `recommendModel`). Competition peak/taper only when `competition.date` set.
- Volume is MRV-capped at generation (no per-lift weekly working sets above the chosen band's `mrv`). The full fatigue/overreaching monitor is OUT of SP1 (SP3).
- Korean UI labels via `src/ui/i18n.js`; engine values English.
- **Migration note:** replacing `goal` and changing `reps` shape breaks consumers mid-build (selector/tuner/volume/generate/periodization/planAdapter/InputForm/RoutineView). Each task runs FOCUSED tests; the full `npm test` is temporarily red and is restored green at the final task. Do not run the full suite mid-migration.
- Spec: `docs/superpowers/specs/2026-06-25-v3-sp1-quality-model-design.md`.

---

### Task 1: Quality module (`quality.js`)

**Files:**
- Create: `src/engine/quality.js`
- Test: `src/engine/quality.test.js`

**Interfaces:**
- Consumes: `roundToIncrement`, `workingWeight` from `./e1rm.js`.
- Produces:
  - `QUALITIES = ['power','strength','hypertrophy','endurance']`, `ZONES`, `DEFAULT_BLEND`, `PRESETS`.
  - `normalizeBlend(blend): {power,strength,hypertrophy,endurance}` — fractions summing 1; all-zero → normalized DEFAULT_BLEND.
  - `presetBlend(key): blend | null`.
  - `dominantQuality(blend): string` — key with max value (tie-break by QUALITIES order).
  - `weightFor(quality, e1rm): number` — power → `roundToIncrement(e1rm*0.625)`; else `workingWeight(e1rm, ZONES[q].repAnchor, ZONES[q].rpeTarget)`.
  - `allocateSets(total, blend): {power,strength,hypertrophy,endurance}` — integer counts summing exactly `total`, proportional (largest-remainder).
  - `weeklyQualitySchedule(totalSets, blend): string[]` — length `totalSets`, ordered by priority `['strength','power','hypertrophy','endurance']`, emitting `allocateSets` copies of each.

- [ ] **Step 1: Write the failing tests**

`src/engine/quality.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { QUALITIES, ZONES, DEFAULT_BLEND, PRESETS, normalizeBlend, presetBlend, dominantQuality, weightFor, allocateSets, weeklyQualitySchedule } from './quality.js'

describe('constants', () => {
  it('four qualities and zone shapes', () => {
    expect(QUALITIES).toEqual(['power','strength','hypertrophy','endurance'])
    expect(ZONES.strength.reps).toEqual([2,5])
    expect(ZONES.hypertrophy.repAnchor).toBe(9)
    expect(ZONES.power.loading).toBe('pct')
  })
})

describe('normalizeBlend', () => {
  it('scales to sum 1', () => {
    const n = normalizeBlend({ power:0, strength:2, hypertrophy:2, endurance:0 })
    expect(n.strength).toBeCloseTo(0.5, 5)
    expect(n.hypertrophy).toBeCloseTo(0.5, 5)
  })
  it('all-zero falls back to default', () => {
    expect(normalizeBlend({ power:0, strength:0, hypertrophy:0, endurance:0 })).toEqual(DEFAULT_BLEND)
  })
})

describe('presetBlend & dominantQuality', () => {
  it('powerbuilding is strength+hypertrophy', () => {
    expect(presetBlend('powerbuilding')).toEqual({ power:0.10, strength:0.45, hypertrophy:0.45, endurance:0.00 })
    expect(presetBlend('nope')).toBeNull()
  })
  it('dominant of a strength-led blend', () => {
    expect(dominantQuality({ power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 })).toBe('strength')
  })
})

describe('weightFor', () => {
  it('power uses 0.625 of e1rm', () => {
    expect(weightFor('power', 200)).toBe(125) // 200*0.625=125
  })
  it('strength uses RPE via repAnchor', () => {
    // workingWeight(200, 3, 8.5) = 200 * pctOf1RM(3,8.5)/100 = 200*0.878=175.6 -> 175
    expect(weightFor('strength', 200)).toBe(175)
  })
})

describe('allocateSets', () => {
  it('sums exactly and is proportional', () => {
    const a = allocateSets(10, { power:0, strength:0.5, hypertrophy:0.4, endurance:0.1 })
    expect(a.strength + a.hypertrophy + a.endurance + a.power).toBe(10)
    expect(a.strength).toBe(5)
    expect(a.hypertrophy).toBe(4)
    expect(a.endurance).toBe(1)
  })
})

describe('weeklyQualitySchedule', () => {
  it('emits the allocated counts ordered strength,power,hyper,endurance', () => {
    const s = weeklyQualitySchedule(6, { power:0, strength:0.5, hypertrophy:0.5, endurance:0 })
    expect(s).toHaveLength(6)
    expect(s.filter((q) => q === 'strength')).toHaveLength(3)
    expect(s.filter((q) => q === 'hypertrophy')).toHaveLength(3)
    expect(s[0]).toBe('strength') // strength first
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/quality.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/quality.js`**

```js
import { roundToIncrement, workingWeight } from './e1rm.js'

export const QUALITIES = ['power', 'strength', 'hypertrophy', 'endurance']

export const ZONES = {
  power:       { reps: [2, 4],   repAnchor: 3,  pct: [0.55, 0.70], loading: 'pct', rpeTarget: null },
  strength:    { reps: [2, 5],   repAnchor: 3,  pct: [0.82, 0.92], loading: 'rpe', rpeTarget: 8.5 },
  hypertrophy: { reps: [6, 12],  repAnchor: 9,  pct: [0.67, 0.78], loading: 'rpe', rpeTarget: 8.5 },
  endurance:   { reps: [12, 20], repAnchor: 16, pct: [0.50, 0.62], loading: 'rpe', rpeTarget: 8 },
}

export const DEFAULT_BLEND = { power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 }

export const PRESETS = {
  powerlifting:  { power: 0.10, strength: 0.70, hypertrophy: 0.20, endurance: 0.00 },
  powerbuilding: { power: 0.10, strength: 0.45, hypertrophy: 0.45, endurance: 0.00 },
  bodybuilding:  { power: 0.00, strength: 0.20, hypertrophy: 0.80, endurance: 0.00 },
  athletic:      { power: 0.40, strength: 0.40, hypertrophy: 0.20, endurance: 0.00 },
  general:       { power: 0.15, strength: 0.30, hypertrophy: 0.40, endurance: 0.15 },
}

export function normalizeBlend(blend) {
  const sum = QUALITIES.reduce((a, q) => a + (blend[q] || 0), 0)
  if (sum <= 0) return { ...DEFAULT_BLEND }
  const out = {}
  for (const q of QUALITIES) out[q] = (blend[q] || 0) / sum
  return out
}

export function presetBlend(key) {
  return PRESETS[key] ? { ...PRESETS[key] } : null
}

export function dominantQuality(blend) {
  let best = QUALITIES[0]
  for (const q of QUALITIES) if ((blend[q] || 0) > (blend[best] || 0)) best = q
  return best
}

export function weightFor(quality, e1rm) {
  const z = ZONES[quality] ?? ZONES.strength
  if (z.loading === 'pct') {
    const mid = (z.pct[0] + z.pct[1]) / 2
    return roundToIncrement(e1rm * mid)
  }
  return workingWeight(e1rm, z.repAnchor, z.rpeTarget)
}

export function allocateSets(total, blend) {
  const n = normalizeBlend(blend)
  const raw = {}, floors = {}
  let used = 0
  for (const q of QUALITIES) {
    raw[q] = n[q] * total
    floors[q] = Math.floor(raw[q])
    used += floors[q]
  }
  let remaining = total - used
  const byRemainder = [...QUALITIES].sort((a, b) => (raw[b] - floors[b]) - (raw[a] - floors[a]))
  for (const q of byRemainder) {
    if (remaining <= 0) break
    floors[q] += 1
    remaining -= 1
  }
  return floors
}

const PRIORITY = ['strength', 'power', 'hypertrophy', 'endurance']

export function weeklyQualitySchedule(totalSets, blend) {
  const alloc = allocateSets(totalSets, blend)
  const out = []
  for (const q of PRIORITY) for (let i = 0; i < alloc[q]; i++) out.push(q)
  return out
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/quality.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/quality.js src/engine/quality.test.js
git commit -m "feat(engine): quality zones, blend, presets, set allocation"
```

---

### Task 2: Periodization model (`periodizationModel.js`)

**Files:**
- Create: `src/engine/periodizationModel.js`
- Test: `src/engine/periodizationModel.test.js`

**Interfaces:**
- Consumes: `QUALITIES`, `dominantQuality` from `./quality.js`.
- Produces:
  - `MODELS = { linear, undulating, block }` (each `{ weekOffsets: number[], undulation, emphasisConcentration }`; `weekOffsets = [0,0.5,1.0]`).
  - `recommendModel({ competition, blend, progressTrend }): 'linear'|'undulating'|'block'` — pure. Rules: `competition?.on && competition?.date` → `block`; else `progressTrend === 'stall'` → `block`; else `blend.strength >= 0.6` (normalized) → `linear`; else `undulating`.
  - `weekPlan(model, weekIndex, blend, competition): { rpeOffset, blend }` — `block` concentrates: emphasize one quality per week (qualities with blend>0 sorted desc, rotated by weekIndex) returning a one-hot blend; `linear`/`undulating` return the full blend. `rpeOffset = MODELS[model].weekOffsets[weekIndex] ?? 0`.

- [ ] **Step 1: Write the failing tests**

`src/engine/periodizationModel.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { MODELS, recommendModel, weekPlan } from './periodizationModel.js'

describe('recommendModel', () => {
  it('a meet date recommends block', () => {
    expect(recommendModel({ competition: { on: true, date: '2026-09-01' }, blend: { power:0, strength:0.5, hypertrophy:0.5, endurance:0 } })).toBe('block')
  })
  it('no meet, strength-dominant recommends linear', () => {
    expect(recommendModel({ competition: { on: false }, blend: { power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 } })).toBe('linear')
  })
  it('no meet, balanced recommends undulating', () => {
    expect(recommendModel({ competition: { on: false }, blend: { power:0.15, strength:0.3, hypertrophy:0.4, endurance:0.15 } })).toBe('undulating')
  })
  it('a stall recommends block', () => {
    expect(recommendModel({ competition: { on: false }, blend: { power:0, strength:0.5, hypertrophy:0.5, endurance:0 }, progressTrend: 'stall' })).toBe('block')
  })
})

describe('weekPlan', () => {
  const blend = { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 }
  it('undulating spreads the full blend each week', () => {
    expect(weekPlan('undulating', 0, blend, { on: false }).blend).toEqual(blend)
  })
  it('block concentrates one quality per week (rotating)', () => {
    const w0 = weekPlan('block', 0, blend, { on: false }).blend
    const w1 = weekPlan('block', 1, blend, { on: false }).blend
    const onehot = (b) => Object.values(b).filter((v) => v === 1).length
    expect(onehot(w0)).toBe(1)
    expect(onehot(w1)).toBe(1)
    // different emphasis across weeks
    expect(w0).not.toEqual(w1)
  })
  it('rpeOffset follows the wave', () => {
    expect(weekPlan('linear', 2, blend, { on: false }).rpeOffset).toBe(1.0)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/periodizationModel.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/periodizationModel.js`**

```js
import { QUALITIES, normalizeBlend } from './quality.js'

const WAVE = [0, 0.5, 1.0]

export const MODELS = {
  linear:     { weekOffsets: WAVE, undulation: 0,   emphasisConcentration: 0 },
  undulating: { weekOffsets: WAVE, undulation: 0.5, emphasisConcentration: 0 },
  block:      { weekOffsets: WAVE, undulation: 0.3, emphasisConcentration: 1 },
}

export function recommendModel({ competition, blend, progressTrend = 'unknown' }) {
  if (competition && competition.on && competition.date) return 'block'
  if (progressTrend === 'stall') return 'block'
  const n = normalizeBlend(blend)
  if (n.strength >= 0.6) return 'linear'
  return 'undulating'
}

function oneHot(quality) {
  const b = {}
  for (const q of QUALITIES) b[q] = q === quality ? 1 : 0
  return b
}

export function weekPlan(model, weekIndex, blend, competition) {
  const rpeOffset = (MODELS[model] ?? MODELS.undulating).weekOffsets[weekIndex] ?? 0
  if (model === 'block') {
    const order = QUALITIES.filter((q) => (blend[q] || 0) > 0).sort((a, b) => (blend[b] || 0) - (blend[a] || 0))
    const emphasis = order.length ? order[weekIndex % order.length] : 'strength'
    return { rpeOffset, blend: oneHot(emphasis) }
  }
  return { rpeOffset, blend }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/periodizationModel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/periodizationModel.js src/engine/periodizationModel.test.js
git commit -m "feat(engine): periodization models + fluid recommendation"
```

---

### Task 3: Volume & tuner — blend band + MRV cap

**Files:**
- Modify: `src/engine/volume.js`
- Modify: `src/engine/tuner.js`
- Test: `src/engine/volume.test.js` (update), `src/engine/tuner.test.js` (update)

**Interfaces:**
- Consumes: `dominantQuality` from `./quality.js`.
- Produces:
  - `volume.js`: `bandForBlend(blend): 'strength'|'balanced'|'hypertrophy'` (power+strength dominant → strength; hypertrophy dominant → hypertrophy; else balanced). `weeklySets(blend, years, fatigue): number` — same band math as v2 but band chosen by `bandForBlend`, result clamped to `[4, band.mrv]` (MRV cap unchanged from v2's clamp top = mrv). Keep `BANDS`, `yearsProgress`, `fatigueScale` exports.
  - `tuner.js`: `tune({ blend, years, daysPerWeek, fatigue })` (replaces `goal` with `blend`) → `{ weeklySets, frequency, setsPerSession }` (same shape as v2).

- [ ] **Step 1: Update the tests**

In `src/engine/volume.test.js`, replace the `weeklySets` describe block with:
```js
import { bandForBlend } from './volume.js'

describe('bandForBlend', () => {
  it('strength-dominant -> strength band', () => {
    expect(bandForBlend({ power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 })).toBe('strength')
  })
  it('hypertrophy-dominant -> hypertrophy band', () => {
    expect(bandForBlend({ power:0, strength:0.2, hypertrophy:0.8, endurance:0 })).toBe('hypertrophy')
  })
})

describe('weeklySets (blend-keyed)', () => {
  it('strength blend, 5yr, low fatigue hits the strength MAV', () => {
    expect(weeklySets({ power:0, strength:1, hypertrophy:0, endurance:0 }, 5, 1)).toBe(BANDS.strength.mav)
  })
  it('never exceeds MRV', () => {
    const v = weeklySets({ power:0, strength:0, hypertrophy:1, endurance:0 }, 10, 1)
    expect(v).toBeLessThanOrEqual(BANDS.hypertrophy.mrv)
  })
})
```
In `src/engine/tuner.test.js`, change the `profile` fixture from `goal: 'strength'` to `blend: { power:0, strength:1, hypertrophy:0, endurance:0 }` and `tune(profile)` calls stay; the weeklySets expectations (squat/bench/deadlift = 10 at strength/5yr) remain valid.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/volume.test.js src/engine/tuner.test.js`
Expected: FAIL — `bandForBlend` missing / `weeklySets`/`tune` signatures changed.

- [ ] **Step 3: Update `src/engine/volume.js` and `tuner.js`**

In `volume.js`, add the import and `bandForBlend`, and change `weeklySets`:
```js
import { dominantQuality } from './quality.js'

export function bandForBlend(blend) {
  const dom = dominantQuality(blend)
  if (dom === 'hypertrophy') return 'hypertrophy'
  if (dom === 'power' || dom === 'strength') return 'strength'
  return 'balanced'
}

export function weeklySets(blend, years, fatigue) {
  const band = BANDS[bandForBlend(blend)]
  const base = band.mev + (band.mav - band.mev) * yearsProgress(years)
  const scaled = Math.round(base * fatigueScale(fatigue))
  return clamp(scaled, 4, band.mrv) // top clamp = MRV cap
}
```
(Keep `BANDS`, `yearsProgress`, `fatigueScale`, `clamp` as in v2.)

In `tuner.js`, change `tune` to take `blend`:
```js
import { weeklySets } from './volume.js'
import { desiredFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ blend, years, daysPerWeek, fatigue }) {
  const perLiftWeekly = weeklySets(blend, years, fatigue)
  const frequency = desiredFrequency('strength', daysPerWeek) // frequency is goal-agnostic in v2
  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = Math.max(1, Math.round(perLiftWeekly / frequency[lift]))
  }
  return { weeklySets: weeklySetsMap, frequency, setsPerSession }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/volume.test.js src/engine/tuner.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/volume.js src/engine/tuner.js src/engine/volume.test.js src/engine/tuner.test.js
git commit -m "feat(engine): volume band from blend + MRV cap; tuner takes blend"
```

---

### Task 4: Selector — dominant quality

**Files:**
- Modify: `src/engine/selector.js`
- Test: `src/engine/selector.test.js` (update)

**Interfaces:**
- Consumes: `dominantQuality` from `./quality.js`.
- Produces: `selectTemplate({ blend, years, daysPerWeek }): string` — `dominantQuality(blend) === 'hypertrophy'` → `'hypertrophyBlock'`; else `years < 1` → `'linearLP'`; else dominant strength/power & days≥5 → `'highFreqPct'`; days≤4 → `'fiveThreeOne'`; else `'dup'`.

- [ ] **Step 1: Update the tests**

Replace `src/engine/selector.test.js` with:
```js
import { describe, it, expect } from 'vitest'
import { selectTemplate } from './selector.js'

const B = (o) => ({ power:0, strength:0, hypertrophy:0, endurance:0, ...o })

describe('selectTemplate (blend)', () => {
  it('hypertrophy-dominant -> hypertrophyBlock', () => {
    expect(selectTemplate({ blend: B({ hypertrophy: 1 }), years: 8, daysPerWeek: 6 })).toBe('hypertrophyBlock')
  })
  it('beginner -> linearLP', () => {
    expect(selectTemplate({ blend: B({ strength: 1 }), years: 0.5, daysPerWeek: 3 })).toBe('linearLP')
  })
  it('strength-dominant high-freq -> highFreqPct', () => {
    expect(selectTemplate({ blend: B({ strength: 1 }), years: 3, daysPerWeek: 5 })).toBe('highFreqPct')
  })
  it('strength-dominant low-freq -> fiveThreeOne', () => {
    expect(selectTemplate({ blend: B({ strength: 1 }), years: 3, daysPerWeek: 4 })).toBe('fiveThreeOne')
  })
  it('balanced intermediate -> dup', () => {
    expect(selectTemplate({ blend: B({ strength: 0.3, hypertrophy: 0.3, power: 0.2, endurance: 0.2 }), years: 3, daysPerWeek: 4 })).toBe('dup')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/selector.test.js`
Expected: FAIL — selectTemplate still keys on `goal`.

- [ ] **Step 3: Update `src/engine/selector.js`**

```js
import { dominantQuality } from './quality.js'

export function selectTemplate({ blend, years, daysPerWeek }) {
  const dom = dominantQuality(blend)
  // A balanced blend (top two qualities tied, e.g. powerbuilding 0.45/0.45)
  // has no clear specialization → DUP/undulating, not a specialized template.
  const sorted = Object.values(blend).sort((a, b) => b - a)
  const isBalanced = sorted[0] === sorted[1]
  if (dom === 'hypertrophy' && !isBalanced) return 'hypertrophyBlock'
  if (years < 1) return 'linearLP'
  const heavy = dom === 'strength' || dom === 'power'
  if (heavy && !isBalanced && daysPerWeek >= 5) return 'highFreqPct'
  if (heavy && !isBalanced && daysPerWeek <= 4) return 'fiveThreeOne'
  return 'dup'
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/selector.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/selector.js src/engine/selector.test.js
git commit -m "feat(engine): selector keys on dominant quality"
```

---

### Task 5: Periodization — quality-zone slots

**Files:**
- Modify: `src/engine/periodization.js`
- Test: `src/engine/periodization.test.js` (update)

**Interfaces:**
- Consumes: `getTemplate`, `slotTypeForRole` (templates.js); `compVariant` (style.js); `pick` (variations.js); `volumeScale` (regionStatus.js); `byName` (exercises.js); `ZONES`, `weightFor`, `weeklyQualitySchedule` (quality.js); `weekPlan` (periodizationModel.js).
- Produces: `buildSession(daySlots, weekIndex, ctx)` where `ctx = { e1rm, setsPerSession, style, stickingPoint, equipment, advanced, regionStatus, qualitySchedule }`. `qualitySchedule` is `{ [lift]: string[] }` — a per-lift list of qualities for the slots in THIS session, consumed in order via a per-lift counter held by the caller (see buildWorkingWeeks). Each exercise: resolve name (comp/variation as v2); `quality` from the schedule; `z = ZONES[quality]`; `reps = z.reps` (array), `repAnchor = z.repAnchor`, `pct = Math.round((z.pct[0]+z.pct[1])/2*100)`, `rpeTarget = z.loading==='rpe' ? cap(z.rpeTarget + weekRpeOffset) : null`, `weight = weightFor(quality, ctx.e1rm[baseLift])` (region-scaled sets unchanged), `autoregulate: true`, `velocity: null`. `buildWorkingWeeks(templateKey, daysPerWeek, ctx)` builds 3 weeks; for EACH week it computes `weekPlan(ctx.model, w, ctx.blend, ctx.competition)`, derives that week's per-lift quality schedule = `weeklyQualitySchedule(ctx.setsPerSession[lift] * <slots of that lift this week>, weekBlend)` distributed across the week's slots, and threads a per-lift index so each slot pulls its quality. `weekRpeOffset` = `weekPlan(...).rpeOffset`.

  Simplify: precompute, per week, for each lift, a flat quality list sized to that lift's total working slots in the layout; assign slot-by-slot. ctx for buildWorkingWeeks adds `model`, `blend`, `competition`.

- [ ] **Step 1: Write/Update the tests**

Replace the v2 buildSession/buildWorkingWeeks describes in `src/engine/periodization.test.js` with:
```js
import { describe, it, expect } from 'vitest'
import { buildWorkingWeeks } from './periodization.js'
import { byName } from './exercises.js'

const ctx = {
  e1rm: { squat: 200, bench: 140, deadlift: 240 },
  setsPerSession: { squat: 4, bench: 4, deadlift: 4 },
  style: { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } },
  stickingPoint: { squat: 'none', bench: 'none', deadlift: 'none' },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks'],
  advanced: false,
  regionStatus: {},
  model: 'undulating',
  blend: { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 },
  competition: { on: false, date: '' },
}

describe('buildWorkingWeeks v3', () => {
  it('builds 3 weeks and tags every exercise with a quality + rep range', () => {
    const weeks = buildWorkingWeeks('dup', 3, ctx)
    expect(weeks).toHaveLength(3)
    const exs = weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(exs.length).toBeGreaterThan(0)
    for (const e of exs) {
      expect(['power','strength','hypertrophy','endurance']).toContain(e.quality)
      expect(Array.isArray(e.reps)).toBe(true)
      expect(e.reps).toHaveLength(2)
      expect(e.autoregulate).toBe(true)
      expect(Number.isFinite(e.weight)).toBe(true)
    }
  })
  it('a strength slot uses the strength rep range [2,5]', () => {
    const weeks = buildWorkingWeeks('dup', 3, ctx)
    const strengthEx = weeks[0].sessions.flatMap((s) => s.exercises).find((e) => e.quality === 'strength')
    expect(strengthEx.reps).toEqual([2, 5])
  })
  it('block model concentrates a single quality in week 1', () => {
    const weeks = buildWorkingWeeks('dup', 3, { ...ctx, model: 'block' })
    const qualities = new Set(weeks[0].sessions.flatMap((s) => s.exercises).map((e) => e.quality))
    expect(qualities.size).toBe(1)
  })
}
)
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: FAIL — buildSession/buildWorkingWeeks still use ROLE/role-based reps.

- [ ] **Step 3: Update `src/engine/periodization.js`**

```js
import { getTemplate, slotTypeForRole } from './templates.js'
import { compVariant } from './style.js'
import { pick } from './variations.js'
import { volumeScale } from './regionStatus.js'
import { byName } from './exercises.js'
import { ZONES, weightFor, weeklyQualitySchedule } from './quality.js'
import { weekPlan } from './periodizationModel.js'

export function cap(rpe) { return Math.min(9.5, rpe) }

function resolveName(slot, ctx) {
  if (slotTypeForRole(slot.role) === 'comp') return compVariant(slot.lift, ctx.style[slot.lift])
  const v = pick(slot.lift, ctx.stickingPoint[slot.lift], ctx.style[slot.lift], ctx.equipment, ctx.advanced)
  return v ? v.name : compVariant(slot.lift, ctx.style[slot.lift])
}

function buildExercise(slot, quality, rpeOffset, ctx) {
  const name = resolveName(slot, ctx)
  const ex = byName(name)
  const z = ZONES[quality]
  const scale = ex ? volumeScale(ex, ctx.regionStatus ?? {}) : 1
  const rpeTarget = z.loading === 'rpe' ? cap(z.rpeTarget + rpeOffset) : null
  return {
    lift: name,
    baseLift: slot.lift,
    quality,
    sets: Math.max(1, Math.round(ctx.setsPerSession[slot.lift] * scale)),
    reps: z.reps,
    repAnchor: z.repAnchor,
    pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
    rpeTarget,
    weight: weightFor(quality, ctx.e1rm[slot.lift]),
    velocity: null,
    autoregulate: true,
  }
}

export function buildWorkingWeeks(templateKey, daysPerWeek, ctx) {
  const template = getTemplate(templateKey)
  const layout = template.layouts[daysPerWeek]
  if (!layout) throw new Error(`template ${templateKey} has no layout for ${daysPerWeek} days`)

  // count working slots per lift in the layout
  const slotCounts = {}
  for (const day of layout) for (const slot of day) slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1

  const weeks = []
  for (let w = 0; w < 3; w++) {
    const wp = weekPlan(ctx.model, w, ctx.blend, ctx.competition)
    // per-lift quality schedule for this week + a consuming index
    const sched = {}, idx = {}
    for (const lift of Object.keys(slotCounts)) {
      sched[lift] = weeklyQualitySchedule(slotCounts[lift], wp.blend)
      idx[lift] = 0
    }
    const sessions = layout.map((daySlots, dayIdx) => {
      const exercises = daySlots.map((slot) => {
        const quality = sched[slot.lift][idx[slot.lift]++] ?? 'strength'
        return buildExercise(slot, quality, wp.rpeOffset, ctx)
      })
      return { day: dayIdx + 1, exercises }
    })
    weeks.push({ index: w + 1, isDeload: false, sessions })
  }
  return weeks
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/periodization.js src/engine/periodization.test.js
git commit -m "feat(engine): periodization builds quality-zone slots via week plan"
```

---

### Task 6: Deload — repAnchor + carry new fields

**Files:**
- Modify: `src/engine/deload.js`
- Test: `src/engine/deload.test.js` (update)

**Interfaces:**
- Consumes: `workingWeight` from `./e1rm.js`.
- Produces: `buildDeloadWeek(workingWeek, ctx)` — for each exercise: halve sets (`ceil/2`), `rpeTarget = 6`, `weight = workingWeight(ctx.e1rm[ex.baseLift ?? ex.lift], ex.repAnchor ?? 5, 6)`, `velocity:null`; spread `...ex` carries `reps`, `quality`, `repAnchor`, `autoregulate`. No mutation. `needsDeload` unchanged.

- [ ] **Step 1: Update the test fixture**

In `src/engine/deload.test.js`, change the working-week exercise fixture to the v3 shape, e.g.:
```js
const workingWeek = {
  index: 3, isDeload: false,
  sessions: [{ day: 1, exercises: [
    { lift: 'Back Squat (Low Bar)', baseLift: 'squat', quality: 'strength', sets: 5, reps: [2,5], repAnchor: 3, pct: 87, rpeTarget: 9, weight: 180, velocity: null, autoregulate: true },
  ] }],
}
```
Keep the assertions: deload `isDeload` true, `sets` = `ceil(5/2)=3`, `rpeTarget` 6, `weight` < 180, and add `expect(wk.sessions[0].exercises[0].reps).toEqual([2,5])` (range carried).

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/deload.test.js`
Expected: FAIL — weight uses `ex.reps` (now an array) → NaN, and range not asserted yet.

- [ ] **Step 3: Update `src/engine/deload.js`**

```js
import { workingWeight } from './e1rm.js'

export function buildDeloadWeek(workingWeek, ctx) {
  const sessions = workingWeek.sessions.map((session) => ({
    day: session.day,
    exercises: session.exercises.map((ex) => ({
      ...ex,
      sets: Math.ceil(ex.sets / 2),
      rpeTarget: 6,
      weight: workingWeight(ctx.e1rm[ex.baseLift ?? ex.lift], ex.repAnchor ?? 5, 6),
      velocity: null,
    })),
  }))
  return { index: workingWeek.index + 1, isDeload: true, sessions }
}

export function needsDeload(weekIndex, fatigue) {
  if (weekIndex >= 4) return true
  if (fatigue >= 5 && weekIndex >= 3) return true
  return false
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/deload.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/deload.js src/engine/deload.test.js
git commit -m "feat(engine): deload uses repAnchor, carries quality/reps range"
```

---

### Task 7: Generate — qualities + model orchestration

**Files:**
- Modify: `src/engine/generate.js`
- Test: `src/engine/generate.test.js` (update)

**Interfaces:**
- Consumes: `e1rmFrom` (e1rm.js); `selectTemplate` (selector.js); `tune` (tuner.js); `buildWorkingWeeks` (periodization.js); `buildDeloadWeek` (deload.js); `MAIN_LIFTS`, `byName` (exercises.js); `select` (accessories.js); `pick` (variations.js); `shouldSwap` (regionStatus.js); `normalizeBlend`, `DEFAULT_BLEND` (quality.js); `recommendModel` (periodizationModel.js).
- Produces: `generate(profile)` → `{ template, model, weeks }`. `profile` has `qualities` (blend), `periodizationModel` ('auto'|model), `years, daysPerWeek, fatigue, lifts, style?, stickingPoint?, regionStatus?, equipment?, competition?`. Resolve: `blend = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)`; `model = profile.periodizationModel === 'auto' || !profile.periodizationModel ? recommendModel({ competition: profile.competition, blend }) : profile.periodizationModel`. Build ctx with `blend, model, competition`. Accessories/region-swap pass as v2 (now with `session.notes` preserved). `resolveE1rm` unchanged.

- [ ] **Step 1: Update the tests**

Replace `goal` in the v2 generate tests with a blend, and add v3 assertions. The fixture profile:
```js
const profile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, fatigue: 2,
  qualities: { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 },
  periodizationModel: 'auto',
}
```
Tests:
```js
import { describe, it, expect } from 'vitest'
import { generate, resolveE1rm } from './generate.js'

describe('generate v3', () => {
  it('returns a model and a 4-week plan ending in deload', () => {
    const plan = generate(profile)
    expect(['linear','undulating','block']).toContain(plan.model)
    expect(plan.weeks).toHaveLength(4)
    expect(plan.weeks[3].isDeload).toBe(true)
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
})
```
(Delete any remaining v2 test asserting `goal`/`template==='dup'` by string if the blend changes the template; keep template assertions only where still valid — a strength+hypertrophy balanced blend at years3/days4 → dominant tie strength → not hypertrophyBlock; selectTemplate → dup. So `plan.template` may still be 'dup' — keep that assertion if present.)

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/generate.test.js`
Expected: FAIL — generate still uses goal.

- [ ] **Step 3: Update `src/engine/generate.js`**

```js
import { e1rmFrom } from './e1rm.js'
import { selectTemplate } from './selector.js'
import { tune } from './tuner.js'
import { buildWorkingWeeks } from './periodization.js'
import { buildDeloadWeek } from './deload.js'
import { MAIN_LIFTS, byName } from './exercises.js'
import { select } from './accessories.js'
import { pick } from './variations.js'
import { shouldSwap } from './regionStatus.js'
import { normalizeBlend, DEFAULT_BLEND } from './quality.js'
import { recommendModel } from './periodizationModel.js'

const DEFAULT_STYLE = { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } }
const DEFAULT_STICK = { squat: 'none', bench: 'none', deadlift: 'none' }

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function sparingSwap(ex, baseLift, style, stickingPoint, equipment, advanced, regionStatus) {
  const bad = new Set(Object.entries(regionStatus).filter(([, v]) => v >= 2).map(([k]) => k))
  const candidate = pick(baseLift, stickingPoint, style, equipment, advanced)
  if (candidate && !candidate.stress.some((r) => bad.has(r))) return candidate.name
  return ex
}

export function generate(profile) {
  const { years, daysPerWeek, fatigue, lifts } = profile
  const blend = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)
  const competition = profile.competition ?? { on: false, date: '' }
  const model = (!profile.periodizationModel || profile.periodizationModel === 'auto')
    ? recommendModel({ competition, blend })
    : profile.periodizationModel
  const style = profile.style ?? DEFAULT_STYLE
  const stickingPoint = profile.stickingPoint ?? DEFAULT_STICK
  const regionStatus = profile.regionStatus ?? {}
  const equipment = profile.equipment ?? ['barbell', 'rack', 'bench']
  const advanced = years >= 3

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const template = selectTemplate({ blend, years, daysPerWeek })
  const tuned = tune({ blend, years, daysPerWeek, fatigue })
  const ctx = { e1rm, setsPerSession: tuned.setsPerSession, style, stickingPoint, equipment, advanced, regionStatus, blend, model, competition }

  const working = buildWorkingWeeks(template, daysPerWeek, ctx)
  const deload = buildDeloadWeek(working[working.length - 1], ctx)
  const allWeeks = [...working, deload]

  const weeks = allWeeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => {
      const notes = []
      const exercises = s.exercises
        .map((e) => {
          const ex = byName(e.lift)
          if (ex && shouldSwap(ex, regionStatus)) {
            return { ...e, lift: sparingSwap(e.lift, e.baseLift, style[e.baseLift], stickingPoint[e.baseLift], equipment, advanced, regionStatus) }
          }
          return e
        })
      const kept = exercises.filter((e) => {
        if (e.sets >= 1) return true
        if (MAIN_LIFTS.includes(e.baseLift)) {
          const ex = byName(e.lift)
          const region = (ex ? ex.stress : []).find((r) => (regionStatus[r] ?? 0) === 3) ?? 'injury'
          notes.push(`${e.baseLift} omitted this week due to severe ${region} status`)
        }
        return false
      })
      const primary = kept[0]?.baseLift ?? 'squat'
      const accessories = select({ lift: primary, style: style[primary], stickingPoint: stickingPoint[primary], equipmentAvailable: equipment, sessionTimeLimit: profile.sessionTimeLimit, regionStatus })
      return { ...s, exercises: kept, accessories, notes }
    }),
  }))

  return { template, model, weeks }
}
```

- [ ] **Step 4: Run to verify pass; then the whole engine suite**

Run: `npx vitest run src/engine/`
Expected: PASS across all engine tests (engine fully migrated).

- [ ] **Step 5: Commit**

```bash
git add src/engine/generate.js src/engine/generate.test.js
git commit -m "feat(engine): generate orchestrates blend + periodization model"
```

---

### Task 8: Plan adapter — pass blend/model, reps range

**Files:**
- Modify: `src/ui/lib/planAdapter.js`
- Test: `src/ui/lib/planAdapter.test.js` (update)

**Interfaces:**
- Produces: `toEngineProfile(form)` returns `{ lifts, years, daysPerWeek, fatigue, qualities, periodizationModel, style, stickingPoint, regionStatus, equipment, sessionTimeLimit, competition }` (drops `goal`; adds `qualities`, `periodizationModel`, `competition`). `enrichExercise` is REMOVED (engine sets `pct`); `buildPlan` maps weeks/sessions through directly, keeping engine `pct`, `reps` (range), `quality`, `accessories`, `notes`.

- [ ] **Step 1: Update the tests**

In `src/ui/lib/planAdapter.test.js`, change the `form` fixture: drop `goal`, add `qualities: { power:0, strength:0.5, hypertrophy:0.5, endurance:0 }`, `periodizationModel: 'auto'`, `competition: { on:false, date:'' }`. Replace assertions:
```js
describe('toEngineProfile v3', () => {
  it('passes blend + model, drops goal', () => {
    const ep = toEngineProfile(form)
    expect(ep.qualities.strength).toBe(0.5)
    expect(ep.periodizationModel).toBe('auto')
    expect(ep).not.toHaveProperty('goal')
  })
})
describe('buildPlan v3', () => {
  it('4 weeks; exercises keep engine quality + reps range', () => {
    const plan = buildPlan(form)
    expect(plan.weeks).toHaveLength(4)
    const ex = plan.weeks[0].sessions[0].exercises[0]
    expect(ex).toHaveProperty('quality')
    expect(Array.isArray(ex.reps)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: FAIL — toEngineProfile still emits goal / enrichExercise computes pct from a range.

- [ ] **Step 3: Update `src/ui/lib/planAdapter.js`**

```js
import { generate } from '../../engine/generate.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    daysPerWeek: form.daysPerWeek,
    fatigue: form.fatigue,
    qualities: form.qualities,
    periodizationModel: form.periodizationModel,
    style: form.style,
    stickingPoint: form.stickingPoint,
    regionStatus: form.regionStatus,
    equipment: form.equipment,
    sessionTimeLimit: form.sessionTimeLimit,
    competition: form.competition,
  }
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  return { template: raw.template, model: raw.model, weeks: raw.weeks }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/lib/planAdapter.js src/ui/lib/planAdapter.test.js
git commit -m "feat(ui): plan adapter passes blend/model; engine sets pct"
```

---

### Task 9: i18n — quality / preset / model labels

**Files:**
- Modify: `src/ui/i18n.js`
- Test: `src/ui/i18n.test.js` (extend)

**Interfaces:**
- Produces: `qualityLabel(k)` (power 파워, strength 근력, hypertrophy 근비대, endurance 근지구력), `presetLabel(k)` (powerlifting 파워리프팅, powerbuilding 파워빌딩, bodybuilding 보디빌딩, athletic 파워·운동선수, general 일반·균형), `modelLabel(k)` (auto 자동 추천, linear 선형, undulating 비선형(DUP), block 블록). Each falls back to the raw key.

- [ ] **Step 1: Write the failing tests (extend)**

Append to `src/ui/i18n.test.js`:
```js
import { qualityLabel, presetLabel, modelLabel } from './i18n.js'

describe('i18n v3', () => {
  it('quality labels', () => {
    expect(qualityLabel('hypertrophy')).toBe('근비대')
    expect(qualityLabel('power')).toBe('파워')
  })
  it('preset + model labels', () => {
    expect(presetLabel('powerbuilding')).toBe('파워빌딩')
    expect(modelLabel('block')).toBe('블록')
    expect(modelLabel('auto')).toBe('자동 추천')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/i18n.test.js`
Expected: FAIL — helpers not exported.

- [ ] **Step 3: Extend `src/ui/i18n.js`**

```js
const QUALITY = { power:'파워', strength:'근력', hypertrophy:'근비대', endurance:'근지구력' }
const PRESET = { powerlifting:'파워리프팅', powerbuilding:'파워빌딩', bodybuilding:'보디빌딩', athletic:'파워·운동선수', general:'일반·균형' }
const MODEL = { auto:'자동 추천', linear:'선형', undulating:'비선형(DUP)', block:'블록' }

export const qualityLabel = (k) => QUALITY[k] ?? k
export const presetLabel = (k) => PRESET[k] ?? k
export const modelLabel = (k) => MODEL[k] ?? k
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/i18n.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/i18n.js src/ui/i18n.test.js
git commit -m "feat(ui): i18n quality/preset/model labels"
```

---

### Task 10: Store — qualities, model, presets

**Files:**
- Modify: `src/ui/store/profileStore.js`
- Test: `src/ui/store/profileStore.test.js` (extend)

**Interfaces:**
- Produces: `DEFAULT_PROFILE` drops `goal`, adds `qualities: { power:0, strength:0.5, hypertrophy:0.4, endurance:0.1 }` and `periodizationModel: 'auto'`. Actions `setQuality(q, value)`, `applyPreset(key)` (sets qualities from `PRESETS` via `presetBlend`), `setPeriodizationModel(value)`. `selectIsValid` unchanged (still keys on lifts/daysPerWeek/years; `goal` removed from its check). The persist `merge` from the white-screen fix already deep-fills new fields — extend it to also fill `qualities`/`periodizationModel` from defaults.

- [ ] **Step 1: Write the failing tests (extend)**

Append to `src/ui/store/profileStore.test.js`:
```js
describe('v3 quality fields', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults include qualities + auto model, no goal', () => {
    const p = useProfileStore.getState().profile
    expect(p.qualities.strength).toBe(0.5)
    expect(p.periodizationModel).toBe('auto')
    expect(p).not.toHaveProperty('goal')
  })
  it('setQuality / applyPreset / setPeriodizationModel', () => {
    const s = useProfileStore.getState()
    s.setQuality('power', 0.3)
    expect(useProfileStore.getState().profile.qualities.power).toBe(0.3)
    s.applyPreset('powerbuilding')
    expect(useProfileStore.getState().profile.qualities.hypertrophy).toBe(0.45)
    s.setPeriodizationModel('block')
    expect(useProfileStore.getState().profile.periodizationModel).toBe('block')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: FAIL — fields/actions absent.

- [ ] **Step 3: Update `src/ui/store/profileStore.js`**

In `DEFAULT_PROFILE` remove `goal: '...'` and add:
```js
  qualities: { power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 },
  periodizationModel: 'auto',
```
Add an import `import { presetBlend } from '../../engine/quality.js'` and these actions (next to `setField`):
```js
      setQuality: (q, value) =>
        set((s) => ({ profile: { ...s.profile, qualities: { ...s.profile.qualities, [q]: value } } })),
      applyPreset: (key) =>
        set((s) => { const b = presetBlend(key); return b ? { profile: { ...s.profile, qualities: b } } : {} }),
      setPeriodizationModel: (value) =>
        set((s) => ({ profile: { ...s.profile, periodizationModel: value } })),
```
In the persist `merge`, add to the nested profile fill:
```js
            qualities: { ...current.profile.qualities, ...(p.qualities || {}) },
            periodizationModel: p.periodizationModel ?? current.profile.periodizationModel,
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/store/profileStore.js src/ui/store/profileStore.test.js
git commit -m "feat(ui): store holds quality blend, presets, periodization model"
```

---

### Task 11: InputForm — presets, sliders, model select

**Files:**
- Modify: `src/ui/components/InputForm.jsx`
- Test: `src/ui/components/InputForm.test.jsx` (update)

**Interfaces:**
- Consumes: store actions `setQuality, applyPreset, setPeriodizationModel`; `qualityLabel, presetLabel, modelLabel` (i18n). Removes the goal `<select>`.

- [ ] **Step 1: Update the test (replace the goal-related test)**

Keep the Generate-enable + onGenerate tests. Add:
```js
  it('applies a preset to the quality blend', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /파워빌딩/ }))
    expect(useProfileStore.getState().profile.qualities.hypertrophy).toBe(0.45)
  })
  it('selects a periodization model', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/주기화 모델/), 'block')
    expect(useProfileStore.getState().profile.periodizationModel).toBe('block')
  })
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/components/InputForm.test.jsx`
Expected: FAIL — preset buttons / model select absent.

- [ ] **Step 3: Update `src/ui/components/InputForm.jsx`**

Remove the goal `<select>` block. Add imports `import { qualityLabel, presetLabel, modelLabel } from '../i18n.js'` and store actions `setQuality, applyPreset, setPeriodizationModel`. Add before the days/fatigue controls:
```jsx
      <fieldset>
        <legend>목표 (프리셋)</legend>
        {['powerlifting','powerbuilding','bodybuilding','athletic','general'].map((k) => (
          <button type="button" key={k} onClick={() => applyPreset(k)}>{presetLabel(k)}</button>
        ))}
      </fieldset>
      <fieldset>
        <legend>목표 배분</legend>
        {['power','strength','hypertrophy','endurance'].map((q) => (
          <label key={q}>{qualityLabel(q)}
            <input type="range" min="0" max="1" step="0.05" value={profile.qualities[q]}
              onChange={(e) => setQuality(q, Number(e.target.value))} />
            <span>{Math.round(profile.qualities[q] * 100)}%</span>
          </label>
        ))}
      </fieldset>
      <label>주기화 모델
        <select value={profile.periodizationModel} onChange={(e) => setPeriodizationModel(e.target.value)}>
          {['auto','linear','undulating','block'].map((m) => <option key={m} value={m}>{modelLabel(m)}</option>)}
        </select>
      </label>
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/components/InputForm.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/InputForm.jsx src/ui/components/InputForm.test.jsx
git commit -m "feat(ui): quality presets/sliders + periodization model select"
```

---

### Task 12: RoutineView + CSV + LimitsPanel + full verify

**Files:**
- Modify: `src/ui/components/RoutineView.jsx`
- Modify: `src/ui/lib/exportCsv.js`
- Modify: `src/ui/components/LimitsPanel.jsx`
- Modify: `src/engine/demo.js`
- Test: `src/ui/components/RoutineView.test.jsx` (update), `src/ui/lib/exportCsv.test.js` (update)

**Interfaces:**
- Produces: RoutineView renders reps as `"min–max"`, the `quality` tag (via `qualityLabel`), and an autoregulate hint; CSV exports reps as `"min-max"` and adds a `quality` column; LimitsPanel adds the v3 honest-limits; demo profile updated to v3 shape.

- [ ] **Step 1: Update RoutineView + CSV tests**

In `src/ui/components/RoutineView.test.jsx`, change the plan fixture exercises to the v3 shape (`reps:[2,5]`, `repAnchor:3`, `quality:'strength'`, `pct:87`, `autoregulate:true`), and assert `screen.getByText(/2–5/)` (rep range, en-dash) and `screen.getByText(/근력/)` (quality tag) render.
In `src/ui/lib/exportCsv.test.js`, update the fixture exercises to the v3 shape and the expected header to `'주차,디로드,일차,종목,목표,세트,반복,%1RM,RPE,중량'` and a row like `'1,아니오,1,스쿼트,근력,5,2-5,87,9,162.5'`.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/components/RoutineView.test.jsx src/ui/lib/exportCsv.test.js`
Expected: FAIL — reps rendered as `[object]`/old shape, CSV missing quality column.

- [ ] **Step 3: Update the three components + demo**

`RoutineView.jsx` ExerciseRow — render reps range, quality, autoregulate:
```jsx
import { liftLabel, templateLabel, qualityLabel } from '../i18n.js'

function ExerciseRow({ ex }) {
  const pct = ex.pct == null ? '—' : `${ex.pct}%`
  const reps = Array.isArray(ex.reps) ? `${ex.reps[0]}–${ex.reps[1]}` : ex.reps
  const rpe = ex.rpeTarget == null ? '' : ` / RPE ${ex.rpeTarget}`
  return (
    <li className="exercise-row">
      <span className="ex-q">[{qualityLabel(ex.quality)}]</span>{' '}
      <span className="ex-lift">{liftLabel(ex.lift)}</span>{' '}
      <span className="ex-scheme">{ex.sets}×{reps}</span>{' '}
      <span className="ex-load">@ {pct}{rpe}</span>{' '}
      <span className="ex-weight">≈ {ex.weight} (자동조절)</span>
    </li>
  )
}
```
`exportCsv.js`:
```js
import { liftLabel, qualityLabel } from '../i18n.js'

export function planToCsv(plan) {
  const rows = ['주차,디로드,일차,종목,목표,세트,반복,%1RM,RPE,중량']
  for (const wk of plan.weeks) {
    for (const s of wk.sessions) {
      for (const ex of s.exercises) {
        const pct = ex.pct == null ? '' : ex.pct
        const reps = Array.isArray(ex.reps) ? `${ex.reps[0]}-${ex.reps[1]}` : ex.reps
        const rpe = ex.rpeTarget == null ? '' : ex.rpeTarget
        rows.push([
          wk.index, wk.isDeload ? '예' : '아니오', s.day, liftLabel(ex.lift), qualityLabel(ex.quality),
          ex.sets, reps, pct, rpe, ex.weight,
        ].join(','))
      }
    }
  }
  return rows.join('\n') + '\n'
}
```
`LimitsPanel.jsx` — append inside the `<ul>`:
```jsx
        <li>무게는 RPE로 자동조절할 <strong>제안치</strong>이며 고정 처방이 아닙니다. 표시된 반복 범위 안에서 목표 RPE에 맞춰 무게를 정하세요.</li>
        <li>4가지 목표(파워·근력·근비대·근지구력)의 zone 수치는 검증된 연속체에 기반한 합리적 기본값일 뿐 정확한 최적값은 아닙니다.</li>
        <li>주기화 모델 간 차이는 볼륨이 같으면 미미합니다. 부상 예측용 ACWR 지표는 신뢰성 문제로 사용하지 않습니다.</li>
```
`src/engine/demo.js` — set the demo profile to v3: replace `goal: 'strength'` with `qualities: { power:0, strength:0.5, hypertrophy:0.5, endurance:0 }, periodizationModel: 'auto'`; print `${e.quality} ${e.lift} ${e.sets}x${e.reps[0]}-${e.reps[1]} ≈ ${e.weight}` and the plan `model`.

- [ ] **Step 4: Run to verify pass; FULL suite + demo + build**

Run: `npx vitest run src/ui/components/RoutineView.test.jsx src/ui/lib/exportCsv.test.js`
Expected: PASS.
Run: `npm test`
Expected: **FULL suite GREEN** (engine + UI). If a file outside this task fails, STOP and report it.
Run: `node src/engine/demo.js`
Expected: prints a model name and 4 weeks of quality-tagged exercises with rep ranges + numeric weights, week 4 DELOAD.
Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/RoutineView.jsx src/ui/lib/exportCsv.js src/ui/components/LimitsPanel.jsx src/engine/demo.js src/ui/components/RoutineView.test.jsx src/ui/lib/exportCsv.test.js
git commit -m "feat(ui): render quality tags + rep ranges + autoregulate; v3 limits; full green"
```

---

## Self-Review

**1. Spec coverage:**
- §4 quality→zone (reps ranges, repAnchor, loading, weightFor) → Task 1. ✓
- §5 blend allocation + schedule → Task 1. ✓
- §5b presets → Task 1 (data) + Task 10/11 (UI). ✓
- §5c periodization models + fluid recommend + weekPlan + competition branch → Task 2 + Task 5/7. ✓
- §6 engine changes (quality/periodizationModel new; volume/tuner/selector/generate/periodization adapted; MRV cap) → Tasks 1–7. ✓
- §6 deload repAnchor → Task 6. ✓
- §7 data model (reps [min,max], repAnchor, quality, autoregulate, pct from zone; planAdapter stops computing pct; RoutineView/CSV/deload updated) → Tasks 5,6,8,12. ✓
- §8 UI (presets, sliders, model select, RoutineView quality tag + rep range + autoregulate, LimitsPanel v3, i18n) → Tasks 9–12. ✓
- §10 testing → every task TDD; Task 7 engine integration; Task 12 full suite. ✓
- §11 honest limits in UI → Task 12 LimitsPanel. ✓
- §2 non-goals (fatigue monitor, progress-switch, wizard, recommendation engine, readiness) → not built (SP2/SP3); `recommendModel` ships pure with `progressTrend='unknown'` default (Task 2). ✓

**2. Placeholder scan:** No "TBD"/"handle errors"/"similar to Task N". Each step has concrete code + expected output. The migration's intermediate red full-suite is explicitly scoped (focused tests per task; full green at Task 12).

**3. Type consistency:** Blend shape `{power,strength,hypertrophy,endurance}` consistent across Tasks 1,2,3,4,7,8,10. `ZONES[q]` fields (`reps[min,max]`, `repAnchor`, `pct[min,max]`, `loading`, `rpeTarget`) consistent in Tasks 1,5,6. Exercise shape `{lift,baseLift,quality,sets,reps:[min,max],repAnchor,pct,rpeTarget,weight,velocity,autoregulate}` consistent in Tasks 5,6,7,8,12. `ctx` for periodization (`+blend,model,competition,qualitySchedule via slotCounts`) consistent Task 5↔7. `tune({blend,...})`/`weeklySets(blend,...)`/`selectTemplate({blend,...})` consistent Tasks 3,4,7. `recommendModel`/`weekPlan` signatures consistent Tasks 2,5,7.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-25-v3-sp1-quality-model.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batched checkpoints.

**Which approach?**
