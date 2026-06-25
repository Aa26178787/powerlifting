# v3 Program-Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add configurable mesocycle length, variation control (tool exclusion + per-lift override), and an evidence-grounded set-structure engine that renders each set concretely.

**Architecture:** New pure engine module `setSchemes.js` (scheme registry + per-set expanders + deterministic picker). `periodizationModel.js` scales its intensity wave to any week count. `periodization.js`/`generate.js`/`deload.js` thread the new params and attach `ex.scheme`. UI: two existing wizard steps gain controls; `RoutineView`/`exportCsv` render per-set. Spec: `docs/superpowers/specs/2026-06-26-v3-sp-program-structure-design.md`. Research: `docs/research/2026-06-26-set-schemes-catalog.md`.

**Tech Stack:** Vite + React 18, zustand, Vitest (+jsdom), pure ES modules.

## Global Constraints

- Pure deterministic engine (no Date.now/Math.random/I/O). JSON imports `with { type: 'json' }`.
- Korean display via i18n maps; engine values English. Weights via `roundToIncrement` (2.5 kg). Weight = autoregulation suggestion ("자동조절"), never fixed.
- Component tests: first line `// @vitest-environment jsdom`. Node 26 MemoryStorage polyfill already in `src/test/setup.js`.
- Persist `merge` deep-fills new fields; **no version bump**.
- 8-step wizard count unchanged. Breaking change: `ex` gains `scheme`; migrate `RoutineView`/CSV in the same pass. Focused tests per task; **full suite green at Task 12**.

---

### Task 1: setSchemes.js — registry + per-set expanders

**Files:** Create `src/engine/setSchemes.js`, `src/engine/setSchemes.test.js`

**Interfaces:**
- Produces: `SCHEMES` (object keyed by scheme key, each `{ labelKey, evidenceTier:'rct'|'consensus', advancedOnly?:bool, fatigue:1-5, expand(ctx) }`); `expand` is `(ctx) => { sets:[{weight,reps,rpe?,label?,note?}], note?, group? }` where `ctx = { quality, e1rm, zone, baseSets, weekIndex }`.

- [ ] **Step 1: Write the failing test** `src/engine/setSchemes.test.js`

```js
import { describe, it, expect } from 'vitest'
import { SCHEMES } from './setSchemes.js'
import { ZONES } from './quality.js'

const ctx = (over = {}) => ({ quality: 'strength', e1rm: 200, zone: ZONES.strength, baseSets: 3, weekIndex: 0, ...over })

describe('setSchemes expanders', () => {
  it('straight: N identical sets', () => {
    const r = SCHEMES.straight.expand(ctx())
    expect(r.sets).toHaveLength(3)
    expect(new Set(r.sets.map((s) => s.weight)).size).toBe(1)
  })
  it('topSetBackoff: heavy top then lighter back-offs', () => {
    const r = SCHEMES.topSetBackoff.expand(ctx())
    expect(r.sets[0].weight).toBeGreaterThan(r.sets[1].weight)
    expect(r.sets[1].reps).toBeGreaterThanOrEqual(r.sets[0].reps)
  })
  it('ascendingPyramid: weight rises, reps fall', () => {
    const s = SCHEMES.ascendingPyramid.expand(ctx()).sets
    expect(s[s.length - 1].weight).toBeGreaterThan(s[0].weight)
    expect(s[s.length - 1].reps).toBeLessThanOrEqual(s[0].reps)
  })
  it('reversePyramid: heaviest first', () => {
    const s = SCHEMES.reversePyramid.expand(ctx()).sets
    expect(s[0].weight).toBeGreaterThanOrEqual(s[s.length - 1].weight)
  })
  it('amrapTop: final set is AMRAP', () => {
    const s = SCHEMES.amrapTop.expand(ctx()).sets
    expect(s[s.length - 1].reps).toBe('AMRAP')
  })
  it('cluster/restPause/dropSet/widowmaker carry a note and concrete weights', () => {
    for (const k of ['cluster', 'restPause', 'dropSet', 'widowmaker', 'myoReps']) {
      const r = SCHEMES[k].expand(ctx({ quality: 'hypertrophy', zone: ZONES.hypertrophy }))
      expect(r.sets.length).toBeGreaterThan(0)
      expect(r.sets.every((s) => Number.isFinite(s.weight) && s.weight > 0)).toBe(true)
    }
  })
  it('every scheme has label + tier + a working expander', () => {
    for (const k of Object.keys(SCHEMES)) {
      const r = SCHEMES[k].expand(ctx())
      expect(SCHEMES[k].labelKey).toBeTruthy()
      expect(['rct', 'consensus']).toContain(SCHEMES[k].evidenceTier)
      expect(Array.isArray(r.sets)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run to verify fail** `npx vitest run src/engine/setSchemes.test.js` → FAIL (module missing).

- [ ] **Step 3: Implement** `src/engine/setSchemes.js` (transcribe exactly):

```js
import { ZONES, weightFor } from './quality.js'
import { roundToIncrement } from './e1rm.js'

const r = roundToIncrement

function straight({ quality, e1rm, zone, baseSets }) {
  const w = weightFor(quality, e1rm)
  return { sets: Array.from({ length: baseSets }, () => ({ weight: w, reps: zone.repAnchor, rpe: zone.rpeTarget })) }
}
function topSetBackoff({ e1rm, zone, baseSets }) {
  const top = r(e1rm * zone.pct[1])
  const sets = [{ weight: top, reps: zone.reps[0], rpe: zone.rpeTarget, label: '탑' }]
  for (let i = 1; i < baseSets; i++) sets.push({ weight: r(top * 0.88), reps: zone.reps[1], rpe: zone.rpeTarget == null ? null : zone.rpeTarget - 1, label: '백오프' })
  return { sets }
}
function topSingleBackoff({ e1rm, baseSets }) {
  const top = r(e1rm * 0.90)
  const sets = [{ weight: top, reps: 1, rpe: 8.5, label: '탑싱글' }]
  for (let i = 1; i < baseSets; i++) sets.push({ weight: r(top * 0.85), reps: 3, rpe: 8, label: '백오프' })
  return { sets }
}
function ascendingPyramid({ e1rm, zone, baseSets }) {
  const n = Math.max(2, baseSets)
  const sets = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const pct = zone.pct[0] + (zone.pct[1] - zone.pct[0]) * t
    const reps = Math.round(zone.reps[1] + (zone.reps[0] - zone.reps[1]) * t)
    sets.push({ weight: r(e1rm * pct), reps, rpe: null })
  }
  return { sets }
}
function reversePyramid(ctx) {
  return { sets: ascendingPyramid(ctx).sets.slice().reverse() }
}
function wave({ e1rm, zone, baseSets }) {
  const waves = baseSets >= 6 ? 2 : 1
  const repsSeq = [3, 2, 1]
  const sets = []
  for (let wv = 0; wv < waves; wv++) for (let i = 0; i < 3; i++) {
    const pct = Math.min(0.98, zone.pct[0] + 0.05 * i + 0.03 * wv)
    sets.push({ weight: r(e1rm * pct), reps: repsSeq[i], rpe: null, label: `웨이브${wv + 1}` })
  }
  return { sets }
}
function amrapTop({ quality, e1rm, zone, baseSets }) {
  const w = weightFor(quality, e1rm)
  const sets = []
  for (let i = 0; i < baseSets - 1; i++) sets.push({ weight: w, reps: zone.reps[1], rpe: zone.rpeTarget })
  sets.push({ weight: w, reps: 'AMRAP', rpe: null, note: '한계까지(+세트)' })
  return { sets }
}
function ramping({ e1rm, baseSets }) {
  const n = Math.max(3, Math.min(5, baseSets))
  const sets = []
  for (let i = 0; i < n; i++) {
    const pct = 0.80 + (0.95 - 0.80) * (i / (n - 1))
    sets.push({ weight: r(e1rm * pct), reps: 1, rpe: i === n - 1 ? 9 : null, label: i === n - 1 ? '탑' : null })
  }
  return { sets }
}
function cluster({ e1rm, baseSets }) {
  const w = r(e1rm * 0.85)
  return { sets: Array.from({ length: baseSets }, () => ({ weight: w, reps: '2+2+2', rpe: null, note: '세트내 20-30s 휴식' })), note: '클러스터' }
}
function restPause({ quality, e1rm }) {
  const w = weightFor(quality, e1rm)
  return { sets: [{ weight: w, reps: '8+4+2', rpe: 9, note: '15-20s 후 재개' }] }
}
function dropSet({ quality, e1rm }) {
  const top = weightFor(quality, e1rm)
  return { sets: [
    { weight: top, reps: 10, rpe: 9, label: '탑' },
    { weight: r(top * 0.80), reps: 8, note: '즉시 -20%' },
    { weight: r(top * 0.64), reps: 8, note: '즉시 -20%' },
  ], note: '드롭세트(연속)' }
}
function myoReps({ quality, e1rm }) {
  const w = weightFor(quality, e1rm)
  const sets = [{ weight: w, reps: 12, rpe: 9, label: '활성화' }]
  for (let i = 0; i < 3; i++) sets.push({ weight: w, reps: 4, note: '3-5호흡 후' })
  return { sets, note: '마이오렙' }
}
function widowmaker({ e1rm }) {
  return { sets: [{ weight: r(e1rm * 0.50), reps: 20, rpe: 9.5 }], note: '위도우메이커' }
}
function contrastPAP(ctx) {
  return { sets: topSingleBackoff(ctx).sets, note: '폭발 종목과 세트 교대 (180s, ≥48h 회복)', group: 'contrast' }
}

export const SCHEMES = {
  straight:         { labelKey: 'straight',         evidenceTier: 'rct',       fatigue: 2, expand: straight },
  topSetBackoff:    { labelKey: 'topSetBackoff',    evidenceTier: 'consensus', fatigue: 3, expand: topSetBackoff },
  topSingleBackoff: { labelKey: 'topSingleBackoff', evidenceTier: 'consensus', fatigue: 4, expand: topSingleBackoff },
  ascendingPyramid: { labelKey: 'ascendingPyramid', evidenceTier: 'consensus', fatigue: 3, expand: ascendingPyramid },
  reversePyramid:   { labelKey: 'reversePyramid',   evidenceTier: 'consensus', fatigue: 3, expand: reversePyramid },
  wave:             { labelKey: 'wave',             evidenceTier: 'consensus', fatigue: 3, expand: wave },
  amrapTop:         { labelKey: 'amrapTop',         evidenceTier: 'consensus', fatigue: 3, expand: amrapTop },
  ramping:          { labelKey: 'ramping',          evidenceTier: 'consensus', fatigue: 4, expand: ramping },
  cluster:          { labelKey: 'cluster',          evidenceTier: 'rct',       fatigue: 3, advancedOnly: true, expand: cluster },
  restPause:        { labelKey: 'restPause',        evidenceTier: 'rct',       fatigue: 4, expand: restPause },
  dropSet:          { labelKey: 'dropSet',          evidenceTier: 'rct',       fatigue: 4, expand: dropSet },
  myoReps:          { labelKey: 'myoReps',          evidenceTier: 'consensus', fatigue: 4, expand: myoReps },
  widowmaker:       { labelKey: 'widowmaker',       evidenceTier: 'consensus', fatigue: 5, expand: widowmaker },
  contrastPAP:      { labelKey: 'contrastPAP',      evidenceTier: 'rct',       fatigue: 4, advancedOnly: true, expand: contrastPAP },
}
```

- [ ] **Step 4: Run** `npx vitest run src/engine/setSchemes.test.js` → PASS.
- [ ] **Step 5: Commit** `git add src/engine/setSchemes.js src/engine/setSchemes.test.js && git commit -m "feat(engine): set-scheme registry + per-set expanders"`

---

### Task 2: pickScheme + phaseFor (deterministic picker)

**Files:** Modify `src/engine/setSchemes.js`, `src/engine/setSchemes.test.js`; Modify `src/engine/periodizationModel.js`

**Interfaces:**
- Produces: `pickScheme({ quality, role, phase, advanced, weekIndex }) -> schemeKey` (role ∈ `'comp'|'variation'|'accessory'`, phase ∈ `'accumulation'|'intensification'|'peak'`). `phaseFor(weekIndex, totalWeeks, peaking) -> phase` (exported from `periodizationModel.js`).

- [ ] **Step 1: Failing tests** (append to `setSchemes.test.js`):

```js
import { pickScheme } from './setSchemes.js'
describe('pickScheme', () => {
  it('accessory hypertrophy cycles intensity techniques by week', () => {
    const keys = [0,1,2,3].map((w) => pickScheme({ quality:'hypertrophy', role:'accessory', phase:'accumulation', advanced:true, weekIndex:w }))
    expect(keys[0]).toBe('straight')
    expect(new Set(keys).size).toBeGreaterThan(1)
  })
  it('power comp in intensification favors cluster/contrast for advanced', () => {
    expect(['cluster','contrastPAP','topSingleBackoff']).toContain(
      pickScheme({ quality:'power', role:'comp', phase:'intensification', advanced:true, weekIndex:0 }))
  })
  it('drops advancedOnly schemes for novices (falls back)', () => {
    const k = pickScheme({ quality:'power', role:'comp', phase:'intensification', advanced:false, weekIndex:0 })
    expect(k).not.toBe('cluster'); expect(k).not.toBe('contrastPAP')
  })
  it('strength peak uses peaking schemes', () => {
    expect(['topSingleBackoff','ramping']).toContain(
      pickScheme({ quality:'strength', role:'comp', phase:'peak', advanced:true, weekIndex:0 }))
  })
})
```
And in `periodizationModel.test.js`:
```js
import { phaseFor } from './periodizationModel.js'
describe('phaseFor', () => {
  it('maps mesocycle position to phase', () => {
    expect(phaseFor(0, 4, true)).toBe('accumulation')
    expect(phaseFor(3, 4, true)).toBe('peak')
    expect(phaseFor(3, 4, false)).toBe('intensification')
  })
})
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Add to `setSchemes.js`:
```js
const CANDIDATES = {
  'power|accumulation': ['straight', 'cluster'],
  'power|intensification': ['cluster', 'contrastPAP', 'topSingleBackoff'],
  'power|peak': ['topSingleBackoff', 'cluster'],
  'strength|accumulation': ['straight', 'ascendingPyramid', 'amrapTop'],
  'strength|intensification': ['topSetBackoff', 'wave', 'cluster'],
  'strength|peak': ['topSingleBackoff', 'ramping'],
  'hypertrophy|accumulation': ['straight', 'reversePyramid', 'restPause'],
  'hypertrophy|intensification': ['straight', 'topSetBackoff'],
  'hypertrophy|peak': ['straight'],
  'endurance|accumulation': ['straight', 'widowmaker'],
  'endurance|intensification': ['straight'],
  'endurance|peak': ['straight'],
}
const ACCESSORY = {
  hypertrophy: ['straight', 'restPause', 'dropSet', 'myoReps'],
  endurance: ['straight', 'widowmaker'],
  power: ['straight'], strength: ['straight'],
}
export function pickScheme({ quality, role, phase, advanced, weekIndex = 0 }) {
  let cands = role === 'accessory'
    ? (ACCESSORY[quality] ?? ['straight'])
    : (CANDIDATES[`${quality}|${phase}`] ?? ['straight'])
  cands = cands.filter((k) => !SCHEMES[k].advancedOnly || advanced)
  if (!cands.length) cands = ['straight']
  return cands[weekIndex % cands.length]
}
```
Add to `periodizationModel.js`:
```js
export function phaseFor(weekIndex, totalWeeks, peaking) {
  if (totalWeeks <= 1) return peaking ? 'peak' : 'intensification'
  const frac = weekIndex / (totalWeeks - 1)
  if (frac < 0.34) return 'accumulation'
  if (frac < 0.67) return 'intensification'
  return peaking ? 'peak' : 'intensification'
}
```
- [ ] **Step 4: Run** both test files → PASS.
- [ ] **Step 5: Commit** `feat(engine): deterministic set-scheme picker + phaseFor`

---

### Task 3: excludableTools.js — tool-group → tag map

**Files:** Create `src/engine/excludableTools.js`, `src/engine/excludableTools.test.js`

**Interfaces:** Produces `TOOL_GROUPS` (`{ key: tags[] }`), `TOOL_GROUP_KEYS` (string[]), `excludeTags(excluded: string[]) -> string[]` (flat).

- [ ] **Step 1: Failing test**
```js
import { describe, it, expect } from 'vitest'
import { TOOL_GROUPS, TOOL_GROUP_KEYS, excludeTags } from './excludableTools.js'
describe('excludableTools', () => {
  it('expands group keys to DB tags', () => {
    expect(excludeTags(['band'])).toContain('band')
    expect(excludeTags(['board'])).toEqual(expect.arrayContaining(['1 board', '2 boards']))
  })
  it('empty exclusion -> empty tags', () => { expect(excludeTags([])).toEqual([]) })
  it('keys list matches the map', () => { expect(TOOL_GROUP_KEYS).toEqual(Object.keys(TOOL_GROUPS)) })
})
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**
```js
export const TOOL_GROUPS = {
  band: ['band', 'bands', 'cables/band'],
  chain: ['chains'],
  board: ['1 board', '2 boards', '3 boards', '4–5 boards'],
  box: ['box'],
  deficit: ['deficit'],
  pin: ['pins', 'rack pins', 'rack uprights'],
  specialtyBar: ['swiss bar', 'cambered bar', 'duffalo bar', 'ssb', 'safety squat bar'],
  sled: ['sled'],
}
export const TOOL_GROUP_KEYS = Object.keys(TOOL_GROUPS)
export function excludeTags(excluded = []) {
  const out = []
  for (const k of excluded) for (const t of (TOOL_GROUPS[k] ?? [])) out.push(t)
  return out
}
```
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(engine): excludable tool-group map`

---

### Task 4: periodizationModel.js — week-count scaling

**Files:** Modify `src/engine/periodizationModel.js`, `src/engine/periodizationModel.test.js`

**Interfaces:** `weekPlan(model, weekIndex, blend, competition, totalWeeks=3)` (new last arg; default 3 preserves current behaviour). New `weekOffset(weekIndex, totalWeeks)`.

- [ ] **Step 1: Failing tests** (append):
```js
import { weekOffset } from './periodizationModel.js'
describe('week-count scaling', () => {
  it('weekOffset ramps 0..1 over N weeks', () => {
    expect(weekOffset(0, 3)).toBe(0)
    expect(weekOffset(2, 3)).toBe(1)
    expect(weekOffset(0, 6)).toBe(0)
    expect(weekOffset(5, 6)).toBe(1)
  })
  it('weekPlan with totalWeeks=5 scales the wave', () => {
    expect(weekPlan('linear', 4, blend, { on: false }, 5).rpeOffset).toBe(1)
    expect(weekPlan('linear', 0, blend, { on: false }, 5).rpeOffset).toBe(0)
  })
})
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Replace the fixed `WAVE` usage:
```js
function ramp(w, N) { return N <= 1 ? 0 : w / (N - 1) }
export function weekOffset(weekIndex, totalWeeks) { return ramp(weekIndex, totalWeeks) }
```
In `weekPlan`, set `const rpeOffset = weekOffset(weekIndex, totalWeeks)` and pass `totalWeeks` into `adaptiveConcentration`, where `weekProg = ramp(weekIndex, totalWeeks) * 0.75`. Keep `MODELS` for metadata but the offset now comes from `weekOffset`. Default `totalWeeks = 3` so existing assertions (week2→1.0, even-blend week0 concurrent) hold. `block` branch unchanged.
- [ ] **Step 4: Run** full `periodizationModel.test.js` → PASS (old + new).
- [ ] **Step 5: Commit** `feat(engine): scale periodization wave to any week count`

---

### Task 5: periodization.js — attach scheme + variation override

**Files:** Modify `src/engine/periodization.js`, `src/engine/periodization.test.js`

**Interfaces:** Consumes `ctx.variationOverride` (`{lift:name|null}`), `ctx.totalWeeks`, `ctx.advanced`, `ctx.peaking`. `buildWorkingWeeks(templateKey, daysPerWeek, ctx, totalWeeks=3)` loops `w < totalWeeks`. Each `ex` gains `ex.scheme` (`{ type, evidenceTier, sets, note?, group? }`) and `ex.sets = ex.scheme.sets.length`.

- [ ] **Step 1: Failing tests** (append):
```js
describe('set schemes + overrides in working weeks', () => {
  it('every exercise carries a scheme with concrete sets', () => {
    const weeks = buildWorkingWeeks('dup', 3, { ...ctx, advanced: true, totalWeeks: 3 }, 3)
    const ex = weeks[0].sessions[0].exercises[0]
    expect(ex.scheme).toBeTruthy()
    expect(ex.scheme.sets.length).toBeGreaterThan(0)
    expect(ex.sets).toBe(ex.scheme.sets.length)
  })
  it('respects a totalWeeks of 5', () => {
    expect(buildWorkingWeeks('dup', 3, { ...ctx, totalWeeks: 5 }, 5)).toHaveLength(5)
  })
  it('variationOverride forces the chosen variation name on its lift slots', () => {
    const weeks = buildWorkingWeeks('dup', 3, { ...ctx, variationOverride: { squat: 'box squat', bench: null, deadlift: null } }, 3)
    const squatVar = weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
      .find((e) => e.baseLift === 'squat' && e.lift === 'box squat')
    expect(squatVar).toBeTruthy()
  })
})
```
(The shared `ctx` literal already has `advanced: false`; add `variationOverride: {}, peaking: false`. `totalWeeks` is passed as the 4th arg to `buildWorkingWeeks`, not read from the literal.)

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** In `resolveName`, after picking a variation, honor override:
```js
import { SCHEMES, pickScheme } from './setSchemes.js'
import { phaseFor } from './periodizationModel.js'
// in resolveName: for non-comp slots
const override = ctx.variationOverride?.[slot.lift]
if (override && byName(override)) return override
```
In `buildExercise`, compute role + effective e1rm + scheme:
```js
const role = slotTypeForRole(slot.role) === 'comp' ? 'comp' : (slot.role === 'accessory' ? 'accessory' : 'variation')
const eff = ctx.e1rm[slot.lift] * (byName(name)?.e1rmModifier ?? 1)
const baseSets = Math.max(1, Math.round(ctx.setsPerSession[slot.lift] * scale))
const phase = phaseFor(ctx.weekIndex, ctx.totalWeeks ?? 3, ctx.peaking)
const key = pickScheme({ quality, role, phase, advanced: !!ctx.advanced, weekIndex: ctx.weekIndex })
const scheme = SCHEMES[key]
const expanded = scheme.expand({ quality, e1rm: eff, zone: z, baseSets, weekIndex: ctx.weekIndex })
return { lift: name, baseLift: slot.lift, quality, reps: z.reps, repAnchor: z.repAnchor,
  pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100), rpeTarget,
  weight: weightFor(quality, eff), velocity: null, autoregulate: true,
  scheme: { type: key, evidenceTier: scheme.evidenceTier, sets: expanded.sets, note: expanded.note, group: expanded.group },
  sets: expanded.sets.length }
```
Inside `buildWorkingWeeks`, set `ctx.totalWeeks = totalWeeks` once and `ctx.weekIndex = w` per week before building that week's sessions (so `buildExercise` reads both). Pass `totalWeeks` to `weekPlan(ctx.model, w, ctx.blend, ctx.competition, totalWeeks)`. The loop bound becomes `w < totalWeeks`.

- [ ] **Step 4: Run** `npx vitest run src/engine/periodization.test.js` → PASS.
- [ ] **Step 5: Commit** `feat(engine): attach set scheme + honor variation override per exercise`

---

### Task 6: generate.js — mesoWeeks, deload toggle, new ctx fields

**Files:** Modify `src/engine/generate.js`, `src/engine/generate.test.js`

**Interfaces:** Reads `profile.mesoWeeks` (default 4), `profile.deloadEnabled` (default true), `profile.variationOverride` (default `{}`). `ctx` gains `variationOverride`, `advanced`, `peaking`, `totalWeeks`. `plan.weeks.length === mesoWeeks + (deloadEnabled ? 1 : 0)`.

- [ ] **Step 1: Failing tests** (append):
```js
it('honors mesoWeeks + deload toggle', () => {
  expect(generate({ ...profile, mesoWeeks: 5, deloadEnabled: true }).weeks).toHaveLength(6)
  expect(generate({ ...profile, mesoWeeks: 5, deloadEnabled: false }).weeks).toHaveLength(5)
})
it('exercises carry concrete scheme sets', () => {
  const ex = generate(profile).weeks[0].sessions[0].exercises[0]
  expect(ex.scheme.sets.length).toBeGreaterThan(0)
})
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Compute:
```js
const mesoWeeks = Math.max(3, Math.min(8, profile.mesoWeeks ?? 4))
const deloadEnabled = profile.deloadEnabled ?? true
const peaking = !!(competition.on && competition.date)
const variationOverride = profile.variationOverride ?? {}
```
Add to `ctx`: `variationOverride, advanced, peaking, totalWeeks: mesoWeeks`. **Note the real signatures:** `buildWorkingWeeks(template, daysPerWeek, ctx, mesoWeeks)` and `buildDeloadWeek(lastWorkingWeek, ctx)` (deload takes the last working week and halves it — it does NOT take template/index). Replace the current lines 64-66:
```js
const working = buildWorkingWeeks(template, daysPerWeek, ctx, mesoWeeks)
const allWeeks = deloadEnabled ? [...working, buildDeloadWeek(working[working.length - 1], ctx)] : working
```
Leave the existing `allWeeks.map(...)` post-processing (accessories/notes/swaps) and `return { template, model, weeks }` unchanged — it already operates on `allWeeks`. `buildDeloadWeek` numbers the deload as `lastWorking.index + 1`, which is correct for any mesoWeeks.
- [ ] **Step 4: Run** `npx vitest run src/engine/generate.test.js` → PASS.
- [ ] **Step 5: Commit** `feat(engine): configurable mesocycle length + deload toggle`

---

### Task 7: deload.js — straight scheme shape

**Files:** Modify `src/engine/deload.js`, `src/engine/deload.test.js`

**Interfaces:** `buildDeloadWeek(workingWeek, ctx)` signature unchanged. Each deload exercise's `scheme` is REBUILT as `straight` at the reduced weight/sets (the spread `...ex` would otherwise carry the stale working-week scheme with the wrong weight). `ex.scheme.sets.length === ex.sets`.

- [ ] **Step 1: Failing test** (append): a deload exercise has `ex.scheme.type === 'straight'`, `ex.scheme.sets.length === ex.sets`, and every scheme set `weight === ex.weight` (the reduced deload weight, not the working-week scheme weight).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** In the `exercises.map`, after computing the reduced `sets`/`weight`/`rpeTarget` for each `ex`, rebuild the scheme so it matches:
```js
const sets = Math.ceil(ex.sets / 2)
const weight = workingWeight(ctx.e1rm[ex.baseLift ?? ex.lift] * (byName(ex.lift)?.e1rmModifier ?? 1), Math.min(12, ex.repAnchor ?? 5), 6)
const reps = ex.repAnchor ?? 5
return { ...ex, sets, rpeTarget: 6, weight, velocity: null,
  scheme: { type: 'straight', evidenceTier: 'rct', sets: Array.from({ length: sets }, () => ({ weight, reps, rpe: 6 })) } }
```
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(engine): deload weeks emit straight scheme`

---

### Task 8: store — new fields + actions + persist merge

**Files:** Modify `src/ui/store/profileStore.js`, `src/ui/store/profileStore.test.js`

**Interfaces:** `DEFAULT_PROFILE` gains `mesoWeeks:4, deloadEnabled:true, excludedTools:[], variationOverride:{squat:null,bench:null,deadlift:null}`. Actions `toggleExcludedTool(tool)`, `setVariationOverride(lift, name)`. `merge` deep-fills all four.

- [ ] **Step 1: Failing tests** (append): defaults present; `toggleExcludedTool('band')` adds then removes; `setVariationOverride('squat','box squat')` sets; a persisted profile missing these fields rehydrates with defaults (merge test).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Add fields/actions; extend `merge` profile block:
```js
mesoWeeks: p.mesoWeeks ?? current.profile.mesoWeeks,
deloadEnabled: p.deloadEnabled ?? current.profile.deloadEnabled,
excludedTools: p.excludedTools ?? current.profile.excludedTools,
variationOverride: { ...current.profile.variationOverride, ...(p.variationOverride || {}) },
```
- [ ] **Step 4: Run** `npx vitest run src/ui/store/profileStore.test.js` → PASS.
- [ ] **Step 5: Commit** `feat(store): mesocycle + variation-control fields`

---

### Task 9: planAdapter — exclusion filter + override passthrough

**Files:** Modify `src/ui/lib/planAdapter.js`, `src/ui/lib/planAdapter.test.js`

**Interfaces:** `toEngineProfile` adds `mesoWeeks`, `deloadEnabled`, `variationOverride`, and `equipment: allEquipment().filter(t => !excludeTags(form.excludedTools).includes(t))`.

- [ ] **Step 1: Failing tests** (append): `toEngineProfile({...form, mesoWeeks:6}).mesoWeeks === 6`; excluding `'band'` removes band tags from `.equipment`; `variationOverride` carried.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Import `excludeTags`; build the filtered equipment; add the three fields. (`form.excludedTools ?? []`, `form.variationOverride ?? {}`.)
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(ui): adapter wires exclusion + override + mesoWeeks`

---

### Task 10: i18n — scheme/tool/phase/evidence labels

**Files:** Modify `src/ui/i18n.js`, `src/ui/i18n.test.js`

**Interfaces:** `schemeLabel(key)`, `toolGroupLabel(key)`, `evidenceLabel(tier)`, `phaseLabel(key)`.

- [ ] **Step 1: Failing test** (append): `schemeLabel('topSetBackoff') === '탑세트+백오프'`; `toolGroupLabel('band') === '밴드'`; `evidenceLabel('rct') === '검증'` / `'consensus' === '근거 약함'`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Add maps:
```js
const SCHEME = { straight:'스트레이트', topSetBackoff:'탑세트+백오프', topSingleBackoff:'탑싱글+백오프', ascendingPyramid:'어센딩 피라미드', reversePyramid:'역피라미드', wave:'웨이브(3-2-1)', amrapTop:'AMRAP·PR세트', ramping:'램핑(데일리맥스)', cluster:'클러스터', restPause:'레스트포즈', dropSet:'드롭세트', myoReps:'마이오렙', widowmaker:'위도우메이커(20회)', contrastPAP:'콘트라스트(PAP)' }
const TOOLGROUP = { band:'밴드', chain:'체인', board:'보드', box:'박스', deficit:'디피싯', pin:'핀·랙풀', specialtyBar:'스페셜티 바', sled:'슬레드' }
const EVIDENCE = { rct:'검증', consensus:'근거 약함' }
const PHASE = { accumulation:'축적', intensification:'강화', peak:'피킹' }
export const schemeLabel = (k) => SCHEME[k] ?? k
export const toolGroupLabel = (k) => TOOLGROUP[k] ?? k
export const evidenceLabel = (k) => EVIDENCE[k] ?? k
export const phaseLabel = (k) => PHASE[k] ?? k
```
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(i18n): scheme/tool/phase/evidence labels`

---

### Task 11: Wizard UI — week + variation controls

**Files:** Modify `src/ui/wizard/steps/StepPeriodization.jsx`, `src/ui/wizard/steps/StepStyle.jsx`; Tests `StepPeriodization.test.jsx`, `src/ui/wizard/steps/StepStyle.test.jsx` (create)

**Interfaces:** `StepPeriodization` adds 운동 주차 number input (`mesoWeeks`, 3–8) + 디로드 포함 checkbox (`deloadEnabled`). `StepStyle` adds 제외할 도구 checkbox list (`TOOL_GROUP_KEYS` via `toggleExcludedTool`) + per-lift 변형 선택 dropdown (`자동` + variation candidates) via `setVariationOverride`.

- [ ] **Step 1: Failing tests.** `StepPeriodization.test.jsx` (append): set 운동 주차 to 6 → `mesoWeeks===6`; toggle 디로드 → `deloadEnabled===false`. New `StepStyle.test.jsx` (jsdom pragma): check a tool box → `excludedTools` includes it; pick a squat variation → `variationOverride.squat` set.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** In `StepPeriodization` add:
```jsx
<label>운동 주차
  <input type="number" min={3} max={8} value={p.mesoWeeks}
    onChange={(e) => setField('mesoWeeks', Math.max(3, Math.min(8, Number(e.target.value) || 4)))} />
</label>
<label><input type="checkbox" checked={p.deloadEnabled}
  onChange={(e) => setField('deloadEnabled', e.target.checked)} /> 디로드 포함</label>
```
In `StepStyle` add a fieldset of `TOOL_GROUP_KEYS` checkboxes (`toggleExcludedTool`) and per-lift variation `<select>` populated by `query({ category:'variation', targetLift: lift, equipmentAvailable: allEquipment().filter(t => !excludeTags(p.excludedTools).includes(t)) })` mapped to `<option>` (first option `자동` → value `''`, setting `setVariationOverride(lift, value || null)`). Import `query`, `allEquipment` from `../../../engine/exercises.js`, `excludeTags, TOOL_GROUP_KEYS` from `../../../engine/excludableTools.js`, `toolGroupLabel, liftLabel` from `../../i18n.js`.
- [ ] **Step 4: Run** `npx vitest run src/ui/wizard/` → PASS.
- [ ] **Step 5: Commit** `feat(ui): wizard week-count + variation-control inputs`

---

### Task 12: RoutineView + CSV per-set render + LimitsPanel + full verify

**Files:** Modify `src/ui/components/RoutineView.jsx`, `src/ui/lib/exportCsv.js`, `src/ui/components/LimitsPanel.jsx`; Tests `RoutineView.test.jsx`, `src/ui/lib/exportCsv.test.js`

**Interfaces:** `RoutineView` renders each `ex.scheme.sets` row; `planToCsv` emits one row per set.

- [ ] **Step 1: Failing tests.** `RoutineView.test.jsx`: a plan whose exercise has `scheme.sets=[{weight:100,reps:3,rpe:8}]` renders `100` and `3`. `exportCsv.test.js`: CSV has one line per set (assert a known set's weight+reps appear on their own row; header includes 세트/반복/비고).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `RoutineView ExerciseRow`: render header (lift + `[quality]` + `schemeLabel(ex.scheme.type)` + `evidenceLabel` tag + 자동조절) then `<ol>` of sets: `{i+1}세트: {s.weight}kg × {s.reps}{s.rpe!=null?` @RPE ${s.rpe}`:''}{s.note?` · ${s.note}`:''}`. If `ex.scheme.note`, show it. Group (`scheme.group`) optional 묶음 label. `planToCsv`: iterate weeks→sessions→exercises→`scheme.sets`, one row each: `주차,일차,운동,세트번호,kg,반복,RPE,비고`. Append the 3 LimitsPanel `<li>`s from the spec. Import `schemeLabel, evidenceLabel` in RoutineView.
- [ ] **Step 4: Verify.** `npx vitest run src/ui/components/RoutineView.test.jsx src/ui/lib/exportCsv.test.js` → PASS. Then `npm test` → **FULL GREEN**. Then `npm run build` → succeeds.
- [ ] **Step 5: Commit** `feat(ui): per-set routine + CSV render; SP limits; full green`

---

## Self-Review

**Spec coverage:** Feature 1 (mesoWeeks/deload) → Tasks 4,6,8,9,11. Feature 2 (exclude+override) → Tasks 3,5,8,9,11. Feature 3 (set schemes) → Tasks 1,2,5,6,7,12 + labels 10. Honest-limits → 12. ✓

**Placeholder scan:** No TBD. Multi-exercise schemes (contrast/superset) intentionally v1-represented (note/group), called out in spec Out-of-scope. ✓

**Type consistency:** `ex.scheme = { type, evidenceTier, sets:[{weight,reps,rpe?,label?,note?}], note?, group? }` consistent Tasks 5,7,12. `pickScheme`/`phaseFor`/`weekOffset`/`excludeTags` signatures consistent across producers/consumers. `buildWorkingWeeks(...,totalWeeks)` + `weekPlan(...,totalWeeks)` threaded Tasks 4,5,6. Store fields ↔ adapter ↔ engine names (`mesoWeeks`,`deloadEnabled`,`excludedTools`,`variationOverride`) consistent Tasks 6,8,9,11. ✓
