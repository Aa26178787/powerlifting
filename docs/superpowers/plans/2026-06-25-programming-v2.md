# Programming v2 (Variety & Personalization) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the powerlifting engine so generated routines use a large tagged exercise library with style-aware competition variants, sticking-point-driven variation slots, broad accessory selection, and graded per-region (soreness→pain→injury) autoregulation — while keeping the competition lifts dominant.

**Architecture:** Extend the existing pure-function engine in `src/engine/` and rewrite the exercise data. New pure modules (`style`, `variations`, `accessories`, `regionStatus`) plus changes to `exercises`, `templates`, `periodization`, `generate`. The big exercise DB is generated from the research catalog with an added `stress` joint-load tag. The React app gains style / sticking-point / region-status inputs. Everything stays deterministic and unit-tested (Vitest), matching Phase-1 patterns.

**Tech Stack:** Vite + React, Vitest (+ jsdom for components), plain ES modules, Node ≥ 18. JSON imports use `with { type: 'json' }`.

## Global Constraints

- Engine modules are PURE: no `Date.now()`, no `Math.random()`, no I/O, deterministic. ES modules, `.js`. JSON imports use `with { type: 'json' }`.
- Component test files begin with `// @vitest-environment jsdom` (first line). Pure-logic tests run in node. `src/test/setup.js` already polyfills localStorage — do not add shims.
- Weights round to 2.5 via `roundToIncrement` (from `e1rm.js`). RPE ∈ {6,6.5,…,10}; reps for `pctOf1RM` are integers 1..12.
- Exercise `category` ∈ {`competition`,`variation`,`accessory`}; `targetLift` ∈ {`squat`,`bench`,`deadlift`,`general`}; `stickingPoint` ∈ {`bottom`,`midrange`,`lockout`,`none`}; region keys (for `stress` and regionStatus) are exactly: `lowerBack, knee, shoulder, elbow, wrist, hip, hamstring, pec, bicepsTendon, ankle`.
- Region-status scale: 0 normal, 1 tight, 2 mild pain, 3 severe/injury. Volume scales: 0→1.0, 1→0.85, 2→0.6, 3→0.0 (avoid). status 2 ⇒ swap to a sparing variation; status 3 ⇒ avoid+substitute.
- Competition lifts stay dominant: variation weekly frequency < competition frequency; accessories ≥ competition frequency (evidence: Amdi/Helms 2026).
- Band/chain (`advanced:true`) variations only when the lifter is advanced (years ≥ 3) AND the slot is heavy (≥80% 1RM intent, i.e. role `heavy`).
- Korean UI labels via `src/ui/i18n.js`; engine-facing values stay English. Honest-limits disclosures from spec §3/§11 go in the LimitsPanel.
- The catalog source of truth is `docs/research/2026-06-25-exercise-variation-catalog.md`. The spec is `docs/superpowers/specs/2026-06-25-programming-v2-design.md`.

---

### Task 1: Exercise DB rewrite (`exercises.json`) + integrity test

**Files:**
- Modify (replace): `src/data/exercises.json`
- Create: `src/engine/exercises.integrity.test.js`

**Interfaces:**
- Produces: `exercises.json` shape `{ "exercises": Exercise[] }` where `Exercise = { name, category, targetLift, stickingPoint, primaryMuscle, equipment: string[], stress: string[], styleBias?: string[], advanced?: boolean }`.

**`stress` derivation rules (apply when transcribing the catalog):** start empty, then add regions by these deterministic rules (union):
- primaryMuscle contains `erector`/`back`/`lowerBack` OR name contains `good morning`,`deadlift`,`rdl`,`stiff`,`pendlay row`,`barbell row`,`good morning` → add `lowerBack`.
- name contains `squat`,`lunge`,`split squat`,`step-up`,`leg extension`,`sissy`,`leg press`,`hack` OR primaryMuscle `quads` → add `knee`.
- primaryMuscle `chest`/`shoulders`/`upper-chest`/`rear-delts` OR name contains `press`,`bench`,`dip`,`fly`,`raise`,`pull-up`,`pulldown`,`row` → add `shoulder`.
- name contains `press`,`extension`,`pushdown`,`skull`,`jm `,`curl`,`dip` OR primaryMuscle `triceps`/`biceps` → add `elbow`.
- primaryMuscle `hamstrings` OR name contains `rdl`,`stiff`,`leg curl`,`good morning`,`ghr`,`nordic`,`romanian` → add `hamstring`.
- name contains `sumo`,`hip thrust`,`belt squat`,`wide` OR primaryMuscle `glutes`/`adductors` → add `hip`.
- name contains `curl` (heavy elbow flexion) OR `mixed grip` → add `bicepsTendon`.
- name contains `overhead`,`snatch grip`,`front squat`,`zercher` → add `wrist`.
- primaryMuscle `core`,`obliques` → leave stress `[]` unless a region rule above also matched.
A region appears at most once. Every exercise ends with a `stress` array (may be empty for pure core/isolation with no joint-stress match).

**`styleBias`:** add when a variation suits a style — e.g. box/pin/pause squats → `["low-bar"]` where the catalog notes posterior emphasis; sumo block pull → `["sumo"]`; deficit/snatch-grip/stiff-leg/clean-grip deadlift → `["conventional"]`; close-grip/board/floor/pin bench → no styleBias (grip-driven, handled by stickingPoint). Omit when not style-specific.

**`advanced:true`:** set on every exercise whose name contains `banded`,`chain`,`band `, or `accommodating`.

- [ ] **Step 1: Write the integrity test**

`src/engine/exercises.integrity.test.js`:
```js
import { describe, it, expect } from 'vitest'
import db from '../data/exercises.json' with { type: 'json' }

const CATEGORY = ['competition', 'variation', 'accessory']
const TARGET = ['squat', 'bench', 'deadlift', 'general']
const STICK = ['bottom', 'midrange', 'lockout', 'none']
const REGIONS = ['lowerBack','knee','shoulder','elbow','wrist','hip','hamstring','pec','bicepsTendon','ankle']

describe('exercise DB integrity', () => {
  it('has a large library', () => {
    expect(db.exercises.length).toBeGreaterThanOrEqual(150)
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/engine/exercises.integrity.test.js`
Expected: FAIL — current `exercises.json` has the old 10-item shape (no `exercises` array / missing variants).

- [ ] **Step 3: Generate `src/data/exercises.json` from the catalog**

Read `docs/research/2026-06-25-exercise-variation-catalog.md`. For EVERY row in all eight sections, emit one object into `{ "exercises": [...] }` with `name, category, targetLift, stickingPoint, primaryMuscle` copied from the row; `equipment` parsed from the row's equipment list into an array of lowercase tokens; `stress` computed by the rules above; `styleBias`/`advanced` per the rules above. Ensure the five competition-variant names in the integrity test exist verbatim (add `Back Squat (Low Bar)` as `competition`, `Back Squat (High Bar)` as `variation`, `Conventional Deadlift`/`Sumo Deadlift` as `competition`, `Bench Press (Competition Grip)` as `competition`). Keep names unique (suffix disambiguate if needed, matching the catalog's parenthetical qualifiers).

- [ ] **Step 4: Run the integrity test to verify it passes**

Run: `npx vitest run src/engine/exercises.integrity.test.js`
Expected: PASS (≥150 exercises, all tags valid, comp variants present).

- [ ] **Step 5: Commit**

```bash
git add src/data/exercises.json src/engine/exercises.integrity.test.js
git commit -m "feat(engine): rewrite exercise DB from research catalog with stress tags"
```

---

### Task 2: Exercise query module (`exercises.js` rewrite)

**Files:**
- Modify (rewrite): `src/engine/exercises.js`
- Test: `src/engine/exercises.test.js` (replace old)

**Interfaces:**
- Consumes: `src/data/exercises.json`.
- Produces:
  - `MAIN_LIFTS = ['squat','bench','deadlift']`
  - `all(): Exercise[]`
  - `byName(name): Exercise | undefined`
  - `query({category?, targetLift?, stickingPoint?, primaryMuscle?, equipmentAvailable?: string[], excludeAdvanced?: boolean}): Exercise[]` — AND-filter; `equipmentAvailable` keeps exercises whose every required equipment is available; `excludeAdvanced` drops `advanced:true`.
  - `stressesRegion(ex, region): boolean`

- [ ] **Step 1: Write the failing tests**

`src/engine/exercises.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { MAIN_LIFTS, all, byName, query, stressesRegion } from './exercises.js'

describe('exercises query', () => {
  it('MAIN_LIFTS', () => { expect(MAIN_LIFTS).toEqual(['squat','bench','deadlift']) })
  it('all() returns the library', () => { expect(all().length).toBeGreaterThanOrEqual(150) })
  it('byName finds the low-bar squat', () => {
    expect(byName('Back Squat (Low Bar)').category).toBe('competition')
  })
  it('query filters by category + targetLift', () => {
    const r = query({ category: 'variation', targetLift: 'deadlift' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((e) => e.category === 'variation' && e.targetLift === 'deadlift')).toBe(true)
  })
  it('equipmentAvailable excludes exercises needing missing gear', () => {
    const r = query({ targetLift: 'squat', equipmentAvailable: ['barbell', 'rack'] })
    expect(r.every((e) => e.equipment.every((x) => ['barbell','rack'].includes(x)))).toBe(true)
  })
  it('excludeAdvanced drops band/chain work', () => {
    const r = query({ excludeAdvanced: true })
    expect(r.every((e) => !e.advanced)).toBe(true)
  })
  it('stressesRegion checks the stress tag', () => {
    const dl = byName('Conventional Deadlift')
    expect(stressesRegion(dl, 'lowerBack')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/exercises.test.js`
Expected: FAIL — new exports not defined.

- [ ] **Step 3: Implement `src/engine/exercises.js`**

```js
import db from '../data/exercises.json' with { type: 'json' }

export const MAIN_LIFTS = ['squat', 'bench', 'deadlift']

export function all() {
  return db.exercises
}

export function byName(name) {
  return db.exercises.find((e) => e.name === name)
}

export function stressesRegion(ex, region) {
  return ex.stress.includes(region)
}

export function query({ category, targetLift, stickingPoint, primaryMuscle, equipmentAvailable, excludeAdvanced } = {}) {
  const have = equipmentAvailable ? new Set(equipmentAvailable) : null
  return db.exercises.filter((e) => {
    if (category && e.category !== category) return false
    if (targetLift && e.targetLift !== targetLift) return false
    if (stickingPoint && e.stickingPoint !== stickingPoint) return false
    if (primaryMuscle && e.primaryMuscle !== primaryMuscle) return false
    if (excludeAdvanced && e.advanced) return false
    if (have && !e.equipment.every((x) => have.has(x))) return false
    return true
  })
}
```

- [ ] **Step 4: Run to verify pass; then run the integrity test still passes**

Run: `npx vitest run src/engine/exercises.test.js src/engine/exercises.integrity.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/exercises.js src/engine/exercises.test.js
git commit -m "feat(engine): exercise query module over the new DB"
```

---

### Task 3: Style module (`style.js`)

**Files:**
- Create: `src/engine/style.js`
- Test: `src/engine/style.test.js`

**Interfaces:**
- Produces:
  - `compVariant(lift, style): string` — competition exercise name for the lifter's style. squat → low/high bar; deadlift → conventional/sumo; bench → `'Bench Press (Competition Grip)'`.
  - `emphasis(lift, style): Record<string, number>` — muscle-bias multipliers (default 1.0 for unlisted muscles).

- [ ] **Step 1: Write the failing tests**

`src/engine/style.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { compVariant, emphasis } from './style.js'

describe('compVariant', () => {
  it('squat low/high bar', () => {
    expect(compVariant('squat', { bar: 'low' })).toBe('Back Squat (Low Bar)')
    expect(compVariant('squat', { bar: 'high' })).toBe('Back Squat (High Bar)')
  })
  it('deadlift conventional/sumo', () => {
    expect(compVariant('deadlift', { stance: 'conventional' })).toBe('Conventional Deadlift')
    expect(compVariant('deadlift', { stance: 'sumo' })).toBe('Sumo Deadlift')
  })
  it('bench is the competition grip name', () => {
    expect(compVariant('bench', { grip: 'close' })).toBe('Bench Press (Competition Grip)')
  })
})

describe('emphasis', () => {
  it('low-bar squat biases posterior over quad', () => {
    const e = emphasis('squat', { bar: 'low' })
    expect(e.posterior).toBeGreaterThan(1)
    expect(e.quad).toBeLessThan(1)
  })
  it('sumo deadlift biases quads', () => {
    expect(emphasis('deadlift', { stance: 'sumo' }).quad).toBeGreaterThan(1)
  })
  it('close-grip bench biases triceps', () => {
    expect(emphasis('bench', { grip: 'close' }).triceps).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/style.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/style.js`**

```js
const COMP = {
  squat: (s) => (s.bar === 'high' ? 'Back Squat (High Bar)' : 'Back Squat (Low Bar)'),
  deadlift: (s) => (s.stance === 'sumo' ? 'Sumo Deadlift' : 'Conventional Deadlift'),
  bench: () => 'Bench Press (Competition Grip)',
}

const EMPHASIS = {
  'squat:low': { posterior: 1.3, quad: 0.8, hamstrings: 1.2, glutes: 1.2 },
  'squat:high': { quad: 1.3, posterior: 0.8 },
  'deadlift:conventional': { hamstrings: 1.3, posterior: 1.2 },
  'deadlift:sumo': { quad: 1.3, glutes: 1.2, adductors: 1.2, hamstrings: 0.9 },
  'bench:close': { triceps: 1.4, chest: 0.9 },
  'bench:wide': { chest: 1.3, triceps: 0.9 },
  'bench:medium': {},
}

export function compVariant(lift, style) {
  return COMP[lift](style)
}

export function emphasis(lift, style) {
  const key =
    lift === 'squat' ? `squat:${style.bar}` :
    lift === 'deadlift' ? `deadlift:${style.stance}` :
    `bench:${style.grip}`
  return EMPHASIS[key] ?? {}
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/style.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/style.js src/engine/style.test.js
git commit -m "feat(engine): style -> competition variant + muscle emphasis"
```

---

### Task 4: Variation selection (`variations.js`)

**Files:**
- Create: `src/engine/variations.js`
- Test: `src/engine/variations.test.js`

**Interfaces:**
- Consumes: `query` (exercises.js).
- Produces:
  - `pick(lift, stickingPoint, style, equipmentAvailable, advanced): Exercise | null` — choose a competition-lift VARIATION addressing the sticking region. Filter: `category:'variation'`, `targetLift:lift`, `equipmentAvailable`, `excludeAdvanced:!advanced`. Among those, prefer `stickingPoint===stickingPoint` (when not `'none'`), then prefer ones whose `styleBias` includes the lifter's style token (`'low-bar'`/`'high-bar'`/`'sumo'`/`'conventional'`), then deterministic tie-break by `name` ascending. Returns `null` if no variation is available.
  - `styleToken(lift, style): string` — `'low-bar'|'high-bar'` (squat), `'sumo'|'conventional'` (deadlift), `''` (bench).

- [ ] **Step 1: Write the failing tests**

`src/engine/variations.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { pick, styleToken } from './variations.js'

describe('styleToken', () => {
  it('maps squat/deadlift styles', () => {
    expect(styleToken('squat', { bar: 'low' })).toBe('low-bar')
    expect(styleToken('deadlift', { stance: 'sumo' })).toBe('sumo')
    expect(styleToken('bench', { grip: 'close' })).toBe('')
  })
})

describe('pick', () => {
  it('returns a deadlift variation addressing the off-floor (bottom) region', () => {
    const v = pick('deadlift', 'bottom', { stance: 'conventional' }, ['barbell', 'deficit'], false)
    expect(v).not.toBeNull()
    expect(v.category).toBe('variation')
    expect(v.targetLift).toBe('deadlift')
    expect(v.stickingPoint).toBe('bottom')
  })
  it('never returns advanced (band/chain) work when advanced=false', () => {
    const v = pick('squat', 'lockout', { bar: 'low' }, ['barbell','rack','bands'], false)
    if (v) expect(v.advanced).not.toBe(true)
  })
  it('returns null when equipment rules out every variation', () => {
    const v = pick('bench', 'lockout', { grip: 'close' }, ['nonexistent-gear'], false)
    expect(v).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/variations.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/variations.js`**

```js
import { query } from './exercises.js'

export function styleToken(lift, style) {
  if (lift === 'squat') return style.bar === 'high' ? 'high-bar' : 'low-bar'
  if (lift === 'deadlift') return style.stance === 'sumo' ? 'sumo' : 'conventional'
  return ''
}

export function pick(lift, stickingPoint, style, equipmentAvailable, advanced) {
  const pool = query({
    category: 'variation',
    targetLift: lift,
    equipmentAvailable,
    excludeAdvanced: !advanced,
  })
  if (pool.length === 0) return null
  const token = styleToken(lift, style)
  const score = (e) => {
    let s = 0
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 2
    if (token && Array.isArray(e.styleBias) && e.styleBias.includes(token)) s += 1
    return s
  }
  return [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0]
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/variations.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/variations.js src/engine/variations.test.js
git commit -m "feat(engine): sticking-point + style variation selection"
```

---

### Task 5: Region-status autoregulation (`regionStatus.js`)

**Files:**
- Create: `src/engine/regionStatus.js`
- Test: `src/engine/regionStatus.test.js`

**Interfaces:**
- Consumes: `stressesRegion` (exercises.js).
- Produces:
  - `STATUS_SCALE = {0:1.0, 1:0.85, 2:0.6, 3:0.0}`
  - `regionMaxStatus(ex, regionStatus): number` — max status over the exercise's stress regions (0 if none).
  - `volumeScale(ex, regionStatus): number` — `STATUS_SCALE[regionMaxStatus]`.
  - `shouldAvoid(ex, regionStatus): boolean` — max status === 3.
  - `shouldSwap(ex, regionStatus): boolean` — max status === 2.

- [ ] **Step 1: Write the failing tests**

`src/engine/regionStatus.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { STATUS_SCALE, regionMaxStatus, volumeScale, shouldAvoid, shouldSwap } from './regionStatus.js'

const dl = { name: 'Conventional Deadlift', stress: ['lowerBack', 'hamstring'] }
const curl = { name: 'Barbell Curl', stress: ['elbow', 'bicepsTendon'] }

describe('regionStatus', () => {
  it('takes the worst region affecting the exercise', () => {
    expect(regionMaxStatus(dl, { lowerBack: 2, hamstring: 1 })).toBe(2)
    expect(regionMaxStatus(curl, { lowerBack: 3 })).toBe(0) // curl does not stress lowerBack
  })
  it('volume scales by worst status', () => {
    expect(volumeScale(dl, { lowerBack: 0 })).toBe(1.0)
    expect(volumeScale(dl, { lowerBack: 1 })).toBe(0.85)
    expect(volumeScale(dl, { lowerBack: 2 })).toBe(0.6)
    expect(volumeScale(dl, { lowerBack: 3 })).toBe(0.0)
  })
  it('swap at 2, avoid at 3', () => {
    expect(shouldSwap(dl, { lowerBack: 2 })).toBe(true)
    expect(shouldAvoid(dl, { lowerBack: 2 })).toBe(false)
    expect(shouldAvoid(dl, { lowerBack: 3 })).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/regionStatus.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/regionStatus.js`**

```js
export const STATUS_SCALE = { 0: 1.0, 1: 0.85, 2: 0.6, 3: 0.0 }

export function regionMaxStatus(ex, regionStatus = {}) {
  let max = 0
  for (const region of ex.stress) {
    const s = regionStatus[region] ?? 0
    if (s > max) max = s
  }
  return max
}

export function volumeScale(ex, regionStatus) {
  return STATUS_SCALE[regionMaxStatus(ex, regionStatus)]
}

export function shouldAvoid(ex, regionStatus) {
  return regionMaxStatus(ex, regionStatus) === 3
}

export function shouldSwap(ex, regionStatus) {
  return regionMaxStatus(ex, regionStatus) === 2
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/regionStatus.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/regionStatus.js src/engine/regionStatus.test.js
git commit -m "feat(engine): graded per-region status autoregulation"
```

---

### Task 6: Accessory selection (`accessories.js`)

**Files:**
- Create: `src/engine/accessories.js`
- Test: `src/engine/accessories.test.js`

**Interfaces:**
- Consumes: `query` (exercises.js); `emphasis` (style.js).
- Produces:
  - `select({ lift, style, stickingPoint, equipmentAvailable, sessionTimeLimit, regionStatus }): Exercise[]` — pick accessories supporting `lift`. Pool = `query({category:'accessory', equipmentAvailable, excludeAdvanced:true})` whose `targetLift` is `lift` or `'general'`. Score each by `emphasis(lift, style)[primaryMuscle] ?? 1.0`, plus +0.5 if its `stickingPoint===stickingPoint` (non-`none`). Drop any with `regionStatus` avoid (max status 3 over its stress). Sort by score desc then name; take `cap = sessionTimeLimit ? max(1, floor(sessionTimeLimit/15)) : 3`.

- [ ] **Step 1: Write the failing tests**

`src/engine/accessories.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { select } from './accessories.js'

describe('accessories.select', () => {
  const base = { equipmentAvailable: ['barbell','rack','bench','cables','dumbbells'], regionStatus: {} }

  it('close-grip bench biases triceps accessories to the top', () => {
    const r = select({ lift: 'bench', style: { grip: 'close' }, stickingPoint: 'lockout', sessionTimeLimit: null, ...base })
    expect(r.length).toBeGreaterThan(0)
    expect(r.some((e) => e.primaryMuscle === 'triceps')).toBe(true)
  })
  it('caps count by session time', () => {
    const r = select({ lift: 'squat', style: { bar: 'low' }, stickingPoint: 'none', sessionTimeLimit: 30, ...base })
    expect(r.length).toBeLessThanOrEqual(2) // floor(30/15)=2
  })
  it('drops accessories whose region is avoid (status 3)', () => {
    const r = select({ lift: 'deadlift', style: { stance: 'conventional' }, stickingPoint: 'none', sessionTimeLimit: null,
      equipmentAvailable: base.equipmentAvailable, regionStatus: { lowerBack: 3 } })
    expect(r.every((e) => !e.stress.includes('lowerBack'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/accessories.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/accessories.js`**

```js
import { query } from './exercises.js'
import { emphasis } from './style.js'
import { shouldAvoid } from './regionStatus.js'

export function select({ lift, style, stickingPoint, equipmentAvailable, sessionTimeLimit, regionStatus }) {
  const weights = emphasis(lift, style)
  const pool = query({ category: 'accessory', equipmentAvailable, excludeAdvanced: true })
    .filter((e) => e.targetLift === lift || e.targetLift === 'general')
    .filter((e) => !shouldAvoid(e, regionStatus ?? {}))
  const score = (e) => {
    let s = weights[e.primaryMuscle] ?? 1.0
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 0.5
    return s
  }
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
  const cap = sessionTimeLimit ? Math.max(1, Math.floor(sessionTimeLimit / 15)) : 3
  return sorted.slice(0, cap)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/accessories.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/accessories.js src/engine/accessories.test.js
git commit -m "feat(engine): style/region-aware accessory selection"
```

---

### Task 7: Templates — variation slots (`templates.js` change)

**Files:**
- Modify: `src/engine/templates.js`
- Test: `src/engine/templates.test.js` (extend)

**Interfaces:**
- Produces: every `DaySlot` gains `slotType: 'comp' | 'variation'`. Rule: `role === 'heavy'` → `slotType:'comp'`; roles `volume`/`light`/`hyper` → `slotType:'variation'`. Add a helper `slotTypeForRole(role): 'comp'|'variation'` and ensure all existing layout slots are read through it (do NOT hand-edit every layout — compute slotType at read time).

- [ ] **Step 1: Write the failing test (extend existing file)**

Append to `src/engine/templates.test.js`:
```js
import { slotTypeForRole } from './templates.js'

describe('slotTypeForRole', () => {
  it('heavy is a competition slot, others are variation slots', () => {
    expect(slotTypeForRole('heavy')).toBe('comp')
    expect(slotTypeForRole('volume')).toBe('variation')
    expect(slotTypeForRole('light')).toBe('variation')
    expect(slotTypeForRole('hyper')).toBe('variation')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/templates.test.js`
Expected: FAIL — `slotTypeForRole` not exported.

- [ ] **Step 3: Add the helper to `src/engine/templates.js`**

Add this export (do not change the layouts):
```js
export function slotTypeForRole(role) {
  return role === 'heavy' ? 'comp' : 'variation'
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/templates.test.js`
Expected: PASS (existing template tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/engine/templates.js src/engine/templates.test.js
git commit -m "feat(engine): slot-type (comp vs variation) from role"
```

---

### Task 8: Periodization — resolve slots + region scaling (`periodization.js` change)

**Files:**
- Modify: `src/engine/periodization.js`
- Test: `src/engine/periodization.test.js` (extend)

**Interfaces:**
- Consumes: `ROLE`, `getTemplate`, `slotTypeForRole` (templates.js); `workingWeight` (e1rm.js); `compVariant` (style.js); `pick` (variations.js); `volumeScale` (regionStatus.js).
- Produces: `buildSession(daySlots, weekIndex, ctx)` where `ctx = { e1rm, setsPerSession, style, stickingPoint, equipment, advanced, regionStatus }`. For each slot: resolve the exercise NAME — `slotType==='comp'` → `compVariant(slot.lift, style[slot.lift])`; `'variation'` → `pick(slot.lift, stickingPoint[slot.lift], style[slot.lift], equipment, advanced) ?? compVariant(...)` (fallback to comp if no variation). Compute `sets = max(1, round(setsPerSession[slot.lift] * volumeScale(resolvedExercise, regionStatus)))`. Exercise object: `{ lift: resolvedName, baseLift: slot.lift, sets, reps, rpeTarget, pct, weight, velocity: null }`. Weight uses `ctx.e1rm[slot.lift]` (e1RM keyed by the base comp lift). `buildWorkingWeeks(templateKey, daysPerWeek, ctx)` passes the richer ctx through.

  NOTE: `ctx.style` is `{squat:{bar,stance?}, bench:{grip}, deadlift:{stance}}`; `ctx.stickingPoint` is `{squat,bench,deadlift}`.

- [ ] **Step 1: Write the failing tests (extend)**

Append to `src/engine/periodization.test.js`:
```js
import { byName } from './exercises.js'

const richCtx = {
  e1rm: { squat: 200, bench: 140, deadlift: 240 },
  setsPerSession: { squat: 5, bench: 4, deadlift: 5 },
  style: { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'sumo' } },
  stickingPoint: { squat: 'bottom', bench: 'lockout', deadlift: 'bottom' },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks'],
  advanced: false,
  regionStatus: { knee: 2 },
}

describe('buildSession v2', () => {
  it('comp slot resolves to the styled competition variant', () => {
    const s = buildSession([{ lift: 'deadlift', role: 'heavy' }], 0, richCtx)
    expect(s.exercises[0].lift).toBe('Sumo Deadlift')
    expect(s.exercises[0].baseLift).toBe('deadlift')
  })
  it('variation slot resolves to a variation (not the bare comp lift name)', () => {
    const s = buildSession([{ lift: 'squat', role: 'volume' }], 0, richCtx)
    const ex = byName(s.exercises[0].lift)
    expect(ex).toBeDefined()
    expect(['variation','competition']).toContain(ex.category) // variation, or comp fallback
  })
  it('knee status 2 scales squat volume down (sets reduced)', () => {
    const s = buildSession([{ lift: 'squat', role: 'heavy' }], 0, richCtx)
    // base 5 * 0.6 = 3
    expect(s.exercises[0].sets).toBe(3)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: FAIL — buildSession does not yet resolve slots/scale.

- [ ] **Step 3: Update `src/engine/periodization.js`**

Replace `buildSession` and `buildWorkingWeeks` with:
```js
import { ROLE, getTemplate, slotTypeForRole } from './templates.js'
import { workingWeight } from './e1rm.js'
import { compVariant } from './style.js'
import { pick } from './variations.js'
import { volumeScale } from './regionStatus.js'
import { byName } from './exercises.js'

export const WEEK_RPE_OFFSET = [0, 0.5, 1.0]
export function cap(rpe) { return Math.min(9.5, rpe) }

function resolveName(slot, ctx) {
  if (slotTypeForRole(slot.role) === 'comp') return compVariant(slot.lift, ctx.style[slot.lift])
  const v = pick(slot.lift, ctx.stickingPoint[slot.lift], ctx.style[slot.lift], ctx.equipment, ctx.advanced)
  return v ? v.name : compVariant(slot.lift, ctx.style[slot.lift])
}

export function buildSession(daySlots, weekIndex, ctx) {
  const offset = WEEK_RPE_OFFSET[weekIndex] ?? 0
  const exercises = daySlots.map((slot) => {
    const role = ROLE[slot.role]
    const rpeTarget = cap(role.rpeStart + offset)
    const name = resolveName(slot, ctx)
    const ex = byName(name)
    const scale = ex ? volumeScale(ex, ctx.regionStatus ?? {}) : 1
    const baseSets = ctx.setsPerSession[slot.lift]
    return {
      lift: name,
      baseLift: slot.lift,
      sets: Math.max(1, Math.round(baseSets * scale)),
      reps: role.reps,
      rpeTarget,
      pct: undefined,
      weight: workingWeight(ctx.e1rm[slot.lift], role.reps, rpeTarget),
      velocity: null,
    }
  })
  return { day: null, exercises }
}

export function buildWorkingWeeks(templateKey, daysPerWeek, ctx) {
  const template = getTemplate(templateKey)
  const layout = template.layouts[daysPerWeek]
  if (!layout) throw new Error(`template ${templateKey} has no layout for ${daysPerWeek} days`)
  const weeks = []
  for (let w = 0; w < 3; w++) {
    const sessions = layout.map((daySlots, dayIdx) => {
      const session = buildSession(daySlots, w, ctx)
      session.day = dayIdx + 1
      return session
    })
    weeks.push({ index: w + 1, isDeload: false, sessions })
  }
  return weeks
}
```

- [ ] **Step 4: Run to verify pass (full periodization suite)**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: PASS. (Older buildSession tests that passed a plain ctx must be updated in the same file to pass the richer ctx — update their ctx object to include `style`, `stickingPoint`, `equipment`, `advanced`, `regionStatus` so they still exercise the function; keep their assertions on reps/rpeTarget/velocity.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/periodization.js src/engine/periodization.test.js
git commit -m "feat(engine): resolve comp/variation slots + region volume scaling"
```

---

### Task 9: Generate orchestrator + accessories + region swaps (`generate.js` change)

**Files:**
- Modify: `src/engine/generate.js`
- Test: `src/engine/generate.test.js` (extend)

**Interfaces:**
- Consumes: `e1rmFrom` (e1rm.js); `selectTemplate` (selector.js); `tune` (tuner.js); `buildWorkingWeeks` (periodization.js); `buildDeloadWeek` (deload.js); `MAIN_LIFTS`, `byName` (exercises.js); `select` (accessories.js); `shouldSwap`, `shouldAvoid` (regionStatus.js); `pick` (variations.js).
- Produces: `generate(profile)` → `{ template, weeks }` where each session also has `accessories: Exercise[]`. profile extends Phase-1 with `style`, `stickingPoint`, `regionStatus`, `equipment`. After building working weeks + deload:
  1. **Region swap pass** — for any working-set exercise where `shouldSwap` is true for the resolved exercise, replace it with a sparing variation (`pick` of the same baseLift whose `stress` excludes every status-2/3 region; if none, keep but the volume is already scaled). `shouldAvoid` exercises are already volume-scaled to 0 sets via Task 8 — drop sets===0? Keep them out: filter exercises with `sets` ≥ 1 after scaling (a status-3 region zeroed them).
  2. **Accessories** — for each session, `session.accessories = accessories.select({ lift: <primary baseLift of the session's first comp/variation slot>, style, stickingPoint, equipmentAvailable: profile.equipment, sessionTimeLimit: profile.sessionTimeLimit, regionStatus })`.

  `resolveE1rm(liftInput)` unchanged. Defaults: missing `style` → `{squat:{bar:'low'},bench:{grip:'medium'},deadlift:{stance:'conventional'}}`; missing `stickingPoint` → all `'none'`; missing `regionStatus` → `{}`; `advanced = years >= 3`.

- [ ] **Step 1: Write the failing tests (extend)**

Append to `src/engine/generate.test.js`:
```js
const richProfile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, goal: 'strength', fatigue: 2,
  style: { squat: { bar: 'low' }, bench: { grip: 'close' }, deadlift: { stance: 'sumo' } },
  stickingPoint: { squat: 'bottom', bench: 'lockout', deadlift: 'bottom' },
  regionStatus: { lowerBack: 3 },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks','cables','dumbbells'],
}

describe('generate v2', () => {
  it('uses the styled competition deadlift variant on heavy slots', () => {
    const plan = generate(richProfile)
    const names = plan.weeks[0].sessions.flatMap((s) => s.exercises).map((e) => e.lift)
    expect(names).toContain('Sumo Deadlift')
  })
  it('attaches accessories to every session', () => {
    const plan = generate(richProfile)
    expect(plan.weeks[0].sessions.every((s) => Array.isArray(s.accessories))).toBe(true)
    expect(plan.weeks[0].sessions.some((s) => s.accessories.length > 0)).toBe(true)
  })
  it('region status 3 (lowerBack) keeps no lowerBack-stressing main work in week 1', () => {
    const plan = generate(richProfile)
    const mains = plan.weeks[0].sessions.flatMap((s) => s.exercises)
    const offenders = mains.filter((e) => {
      const ex = byNameSafe(e.lift)
      return ex && ex.stress.includes('lowerBack')
    })
    expect(offenders.length).toBe(0)
  })
})

function byNameSafe(n) { try { return require } catch { return undefined } } // replaced below
```

NOTE for implementer: replace the placeholder `byNameSafe` with a real import: add `import { byName } from './exercises.js'` at the top of the test and use `byName(e.lift)` directly; delete the stub function. (Written this way so the assertion is explicit; do not ship the stub.)

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/generate.test.js`
Expected: FAIL — generate does not yet apply style/accessories/region swaps.

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
import { shouldSwap, regionMaxStatus } from './regionStatus.js'

const DEFAULT_STYLE = { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } }
const DEFAULT_STICK = { squat: 'none', bench: 'none', deadlift: 'none' }

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function sparingSwap(ex, baseLift, style, stickingPoint, equipment, advanced, regionStatus) {
  // pick a variation of baseLift whose stress excludes any status>=2 region
  const bad = new Set(Object.entries(regionStatus).filter(([, v]) => v >= 2).map(([k]) => k))
  const candidate = pick(baseLift, stickingPoint, style, equipment, advanced)
  if (candidate && !candidate.stress.some((r) => bad.has(r))) return candidate.name
  return ex // keep (already volume-scaled)
}

export function generate(profile) {
  const { lifts, years, daysPerWeek, goal, fatigue } = profile
  const style = profile.style ?? DEFAULT_STYLE
  const stickingPoint = profile.stickingPoint ?? DEFAULT_STICK
  const regionStatus = profile.regionStatus ?? {}
  const equipment = profile.equipment ?? ['barbell', 'rack', 'bench']
  const advanced = years >= 3

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const template = selectTemplate({ goal, years, daysPerWeek })
  const tuned = tune({ goal, years, daysPerWeek, fatigue })
  const ctx = { e1rm, setsPerSession: tuned.setsPerSession, style, stickingPoint, equipment, advanced, regionStatus }

  const working = buildWorkingWeeks(template, daysPerWeek, ctx)
  const deload = buildDeloadWeek(working[working.length - 1], ctx)
  const allWeeks = [...working, deload]

  const weeks = allWeeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => {
      const exercises = s.exercises
        .map((e) => {
          const ex = byName(e.lift)
          if (ex && shouldSwap(ex, regionStatus)) {
            const swapped = sparingSwap(e.lift, e.baseLift, style[e.baseLift], stickingPoint[e.baseLift], equipment, advanced, regionStatus)
            return { ...e, lift: swapped }
          }
          return e
        })
        .filter((e) => e.sets >= 1)
      const primary = exercises[0]?.baseLift ?? 'squat'
      const accessories = select({ lift: primary, style: style[primary], stickingPoint: stickingPoint[primary], equipmentAvailable: equipment, sessionTimeLimit: profile.sessionTimeLimit, regionStatus })
      return { ...s, exercises, accessories }
    }),
  }))

  return { template, weeks }
}
```

- [ ] **Step 4: Run to verify pass; then run the full engine suite**

Run: `npx vitest run src/engine/`
Expected: PASS across all engine tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/generate.js src/engine/generate.test.js
git commit -m "feat(engine): v2 generate — style variants, accessories, region swaps"
```

---

### Task 10: i18n — exercise/style/region labels

**Files:**
- Modify: `src/ui/i18n.js`
- Test: `src/ui/i18n.test.js`

**Interfaces:**
- Produces: extend `liftLabel` to cover the new exercise names (fallback returns the raw English name, which is acceptable for names without a Korean entry); add `styleLabel(group, value)` and `regionLabel(key)` and `statusLabel(0..3)` helpers for the form. Provide Korean for: regions (lowerBack 허리, knee 무릎, shoulder 어깨, elbow 팔꿈치, wrist 손목, hip 고관절, hamstring 햄스트링, pec 가슴, bicepsTendon 이두건, ankle 발목); statuses (0 정상, 1 뻐근, 2 가벼운 통증, 3 심한 통증/부상); style values (low 로우바, high 하이바, narrow 좁게, medium 보통, wide 넓게, close 클로즈, conventional 컨벤셔널, sumo 스모).

- [ ] **Step 1: Write the failing tests**

`src/ui/i18n.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { regionLabel, statusLabel, styleLabel, liftLabel } from './i18n.js'

describe('i18n v2 helpers', () => {
  it('region labels', () => {
    expect(regionLabel('lowerBack')).toBe('허리')
    expect(regionLabel('bicepsTendon')).toBe('이두건')
  })
  it('status labels', () => {
    expect(statusLabel(0)).toBe('정상')
    expect(statusLabel(3)).toBe('심한 통증/부상')
  })
  it('style labels', () => {
    expect(styleLabel('bar', 'low')).toBe('로우바')
    expect(styleLabel('stance', 'sumo')).toBe('스모')
  })
  it('liftLabel falls back to the raw name for un-mapped exercises', () => {
    expect(liftLabel('Sumo Block Pull')).toBe('Sumo Block Pull')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/i18n.test.js`
Expected: FAIL — helpers not exported.

- [ ] **Step 3: Extend `src/ui/i18n.js`**

Add (keeping existing exports):
```js
const REGION = { lowerBack:'허리', knee:'무릎', shoulder:'어깨', elbow:'팔꿈치', wrist:'손목', hip:'고관절', hamstring:'햄스트링', pec:'가슴', bicepsTendon:'이두건', ankle:'발목' }
const STATUS = { 0:'정상', 1:'뻐근', 2:'가벼운 통증', 3:'심한 통증/부상' }
const STYLE = { bar:{low:'로우바',high:'하이바'}, stance:{narrow:'좁게',medium:'보통',wide:'넓게',conventional:'컨벤셔널',sumo:'스모'}, grip:{close:'클로즈',medium:'보통',wide:'넓게'} }

export const regionLabel = (k) => REGION[k] ?? k
export const statusLabel = (n) => STATUS[n] ?? String(n)
export const styleLabel = (group, v) => (STYLE[group] && STYLE[group][v]) ?? v
```
(Leave `liftLabel`'s existing fallback-to-raw-name behavior; new exercise names render in English, which is acceptable per spec §8.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/i18n.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/i18n.js src/ui/i18n.test.js
git commit -m "feat(ui): i18n labels for style, regions, status"
```

---

### Task 11: Store — v2 profile fields

**Files:**
- Modify: `src/ui/store/profileStore.js`
- Test: `src/ui/store/profileStore.test.js` (extend)

**Interfaces:**
- Produces: `DEFAULT_PROFILE` gains `style: { squat:{bar:'low',stance:'medium'}, bench:{grip:'medium'}, deadlift:{stance:'conventional'} }`, `stickingPoint: { squat:'none', bench:'none', deadlift:'none' }`, `regionStatus: { lowerBack:0, knee:0, shoulder:0, elbow:0, wrist:0, hip:0, hamstring:0, pec:0, ankle:0, bicepsTendon:0 }`. Remove the old `injuries` array (replaced by regionStatus). New actions: `setStyle(lift, patch)`, `setStickingPoint(lift, value)`, `setRegionStatus(region, value)`. `toEngineProfile` stays in planAdapter (Task 13) — store just holds state.

- [ ] **Step 1: Write the failing tests (extend)**

Append to `src/ui/store/profileStore.test.js`:
```js
describe('v2 profile fields', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults include style, stickingPoint, regionStatus', () => {
    const p = useProfileStore.getState().profile
    expect(p.style.squat.bar).toBe('low')
    expect(p.stickingPoint.bench).toBe('none')
    expect(p.regionStatus.lowerBack).toBe(0)
  })
  it('setStyle / setStickingPoint / setRegionStatus update state', () => {
    const s = useProfileStore.getState()
    s.setStyle('deadlift', { stance: 'sumo' })
    s.setStickingPoint('squat', 'bottom')
    s.setRegionStatus('knee', 2)
    const p = useProfileStore.getState().profile
    expect(p.style.deadlift.stance).toBe('sumo')
    expect(p.stickingPoint.squat).toBe('bottom')
    expect(p.regionStatus.knee).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: FAIL — new defaults/actions absent.

- [ ] **Step 3: Update `src/ui/store/profileStore.js`**

In `DEFAULT_PROFILE` remove `injuries: []` and add:
```js
  style: { squat: { bar: 'low', stance: 'medium' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } },
  stickingPoint: { squat: 'none', bench: 'none', deadlift: 'none' },
  regionStatus: { lowerBack: 0, knee: 0, shoulder: 0, elbow: 0, wrist: 0, hip: 0, hamstring: 0, pec: 0, ankle: 0, bicepsTendon: 0 },
```
Add actions inside the store creator (alongside `setField`):
```js
      setStyle: (lift, patch) =>
        set((s) => ({ profile: { ...s.profile, style: { ...s.profile.style, [lift]: { ...s.profile.style[lift], ...patch } } } })),
      setStickingPoint: (lift, value) =>
        set((s) => ({ profile: { ...s.profile, stickingPoint: { ...s.profile.stickingPoint, [lift]: value } } })),
      setRegionStatus: (region, value) =>
        set((s) => ({ profile: { ...s.profile, regionStatus: { ...s.profile.regionStatus, [region]: value } } })),
```
Remove the now-unused `toggleInjury` action and the `injuries` references.

- [ ] **Step 4: Run to verify pass; check no other test references `toggleInjury`/`injuries`**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: PASS. (If InputForm or planAdapter tests reference `injuries`/`toggleInjury`, they are updated in Tasks 12–13.)

- [ ] **Step 5: Commit**

```bash
git add src/ui/store/profileStore.js src/ui/store/profileStore.test.js
git commit -m "feat(ui): store holds v2 style/stickingPoint/regionStatus"
```

---

### Task 12: Plan adapter — map v2 profile (`planAdapter.js` change)

**Files:**
- Modify: `src/ui/lib/planAdapter.js`
- Test: `src/ui/lib/planAdapter.test.js` (update)

**Interfaces:**
- Produces: `toEngineProfile(form)` now returns `{ lifts, years, daysPerWeek, goal, fatigue, style, stickingPoint, regionStatus, equipment, sessionTimeLimit }` (drops the old `injuries`). `buildPlan` unchanged in shape but `accessoriesForSession` is removed — accessories now come from the engine (`session.accessories` is produced by `generate`). `enrichExercise` still fills `pct`. `buildPlan` maps weeks/sessions/exercises through `enrichExercise` and keeps the engine-provided `session.accessories` (also enriching each accessory's display fields is not needed — accessories have no pct/weight yet; render name only).

- [ ] **Step 1: Update the tests**

Replace the `toEngineProfile`/`accessoriesForSession` tests in `src/ui/lib/planAdapter.test.js` with:
```js
const form = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 3, goal: 'balanced', fatigue: 2,
  style: { squat:{bar:'low'}, bench:{grip:'close'}, deadlift:{stance:'sumo'} },
  stickingPoint: { squat:'bottom', bench:'lockout', deadlift:'bottom' },
  regionStatus: { knee: 1 }, equipment: ['barbell','rack','bench'], sessionTimeLimit: null,
}

describe('toEngineProfile', () => {
  it('passes the v2 fields and drops UI-only ones', () => {
    const ep = toEngineProfile(form)
    expect(Object.keys(ep).sort()).toEqual(['daysPerWeek','equipment','fatigue','goal','lifts','regionStatus','sessionTimeLimit','stickingPoint','style','years'])
    expect(ep.style.deadlift.stance).toBe('sumo')
  })
})

describe('buildPlan v2', () => {
  it('produces 4 weeks with engine accessories and pct-filled exercises', () => {
    const plan = buildPlan(form)
    expect(plan.weeks).toHaveLength(4)
    const allEx = plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(allEx.every((e) => e.pct === null || typeof e.pct === 'number')).toBe(true)
    expect(plan.weeks[0].sessions[0]).toHaveProperty('accessories')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: FAIL — toEngineProfile still emits the old shape / accessoriesForSession removed.

- [ ] **Step 3: Update `src/ui/lib/planAdapter.js`**

```js
import { generate } from '../../engine/generate.js'
import { pctOf1RM } from '../../engine/e1rm.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    daysPerWeek: form.daysPerWeek,
    goal: form.goal,
    fatigue: form.fatigue,
    style: form.style,
    stickingPoint: form.stickingPoint,
    regionStatus: form.regionStatus,
    equipment: form.equipment,
    sessionTimeLimit: form.sessionTimeLimit,
  }
}

export function enrichExercise(ex) {
  const inRange = Number.isInteger(ex.reps) && ex.reps >= 1 && ex.reps <= 12
  return { ...ex, pct: inRange ? pctOf1RM(ex.reps, ex.rpeTarget) : null }
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  const weeks = raw.weeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map(enrichExercise),
      accessories: s.accessories ?? [],
    })),
  }))
  return { template: raw.template, weeks }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/lib/planAdapter.js src/ui/lib/planAdapter.test.js
git commit -m "feat(ui): plan adapter maps v2 profile; accessories from engine"
```

---

### Task 13: InputForm — style / sticking-point / region-status controls

**Files:**
- Modify: `src/ui/components/InputForm.jsx`
- Test: `src/ui/components/InputForm.test.jsx` (update)

**Interfaces:**
- Consumes: `useProfileStore`, `selectIsValid` (store); `styleLabel`, `regionLabel`, `statusLabel`, `liftLabel` (i18n); store actions `setStyle`, `setStickingPoint`, `setRegionStatus`.
- Produces: the form, with the old injuries checkboxes REMOVED and three new sections: **스타일** (squat bar low/high + stance, bench grip, deadlift stance selects), **스티킹포인트** (per-lift select: none/bottom/midrange/lockout), **부위 상태** (10 regions, each a 0–3 select). Generate button unchanged.

- [ ] **Step 1: Update the test (replace the injuries test; keep the lifts/generate tests)**

In `src/ui/components/InputForm.test.jsx`, keep the first two tests (Generate enable + onGenerate). Replace the days-per-week test region with these (and remove any injuries references):
```js
  it('updates deadlift stance style in the store', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/데드리프트 스탠스/), 'sumo')
    expect(useProfileStore.getState().profile.style.deadlift.stance).toBe('sumo')
  })
  it('updates a region status in the store', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/허리 상태/), '2')
    expect(useProfileStore.getState().profile.regionStatus.lowerBack).toBe(2)
  })
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/components/InputForm.test.jsx`
Expected: FAIL — labels not present.

- [ ] **Step 3: Update `src/ui/components/InputForm.jsx`**

Remove the `INJURIES` constant, the injuries fieldset, and `toggleInjury`. Add imports `import { styleLabel, regionLabel, statusLabel, liftLabel } from '../i18n.js'` and store actions `setStyle, setStickingPoint, setRegionStatus`. Add these sections before the Generate button:
```jsx
      <fieldset>
        <legend>스타일</legend>
        <label>스쿼트 바
          <select value={profile.style.squat.bar} onChange={(e) => setStyle('squat', { bar: e.target.value })}>
            <option value="low">{styleLabel('bar','low')}</option>
            <option value="high">{styleLabel('bar','high')}</option>
          </select>
        </label>
        <label>스쿼트 스탠스
          <select value={profile.style.squat.stance} onChange={(e) => setStyle('squat', { stance: e.target.value })}>
            {['narrow','medium','wide'].map((v) => <option key={v} value={v}>{styleLabel('stance',v)}</option>)}
          </select>
        </label>
        <label>벤치 그립
          <select value={profile.style.bench.grip} onChange={(e) => setStyle('bench', { grip: e.target.value })}>
            {['close','medium','wide'].map((v) => <option key={v} value={v}>{styleLabel('grip',v)}</option>)}
          </select>
        </label>
        <label>데드리프트 스탠스
          <select value={profile.style.deadlift.stance} onChange={(e) => setStyle('deadlift', { stance: e.target.value })}>
            {['conventional','sumo'].map((v) => <option key={v} value={v}>{styleLabel('stance',v)}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>스티킹포인트 (가장 안 올라가는 구간)</legend>
        {['squat','bench','deadlift'].map((lift) => (
          <label key={lift}>{liftLabel(lift)}
            <select value={profile.stickingPoint[lift]} onChange={(e) => setStickingPoint(lift, e.target.value)}>
              {['none','bottom','midrange','lockout'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>부위 상태 (0 정상 ~ 3 심한 통증/부상)</legend>
        {Object.keys(profile.regionStatus).map((region) => (
          <label key={region}>{regionLabel(region)} 상태
            <select value={profile.regionStatus[region]} onChange={(e) => setRegionStatus(region, Number(e.target.value))}>
              {[0,1,2,3].map((n) => <option key={n} value={n}>{statusLabel(n)}</option>)}
            </select>
          </label>
        ))}
      </fieldset>
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/components/InputForm.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/InputForm.jsx src/ui/components/InputForm.test.jsx
git commit -m "feat(ui): style, sticking-point, region-status form controls"
```

---

### Task 14: RoutineView accessories + LimitsPanel v2 notes; full verify

**Files:**
- Modify: `src/ui/components/RoutineView.jsx`
- Modify: `src/ui/components/LimitsPanel.jsx`
- Test: `src/ui/components/RoutineView.test.jsx` (update accessory shape)

**Interfaces:**
- Produces: RoutineView renders `session.accessories` as exercise objects (`{name}`) via `liftLabel(a.name)` instead of plain strings; LimitsPanel gains the v2 honest-limits bullets (variation→comp transfer unmeasured; pain thresholds from rehab; low-bar/high-bar mixed) + a one-line "rising pain = back off; not medical advice" note.

- [ ] **Step 1: Update RoutineView test for object accessories**

In `src/ui/components/RoutineView.test.jsx`, change the plan fixture's `accessories: ['leg press']` to `accessories: [{ name: 'leg press' }]` and keep the assertion `expect(screen.getByText(/레그 프레스/))` (RoutineView maps `liftLabel` over `a.name`; 'leg press' → '레그 프레스').

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/components/RoutineView.test.jsx`
Expected: FAIL — RoutineView still does `s.accessories.join`, which renders `[object Object]`.

- [ ] **Step 3: Update RoutineView + LimitsPanel**

In `src/ui/components/RoutineView.jsx`, change the accessories line to:
```jsx
              {s.accessories.length > 0 && (
                <p className="accessories">보조운동: {s.accessories.map((a) => liftLabel(a.name)).join(', ')}</p>
              )}
```
In `src/ui/components/LimitsPanel.jsx`, append these `<li>` items inside the `<ul>`:
```jsx
        <li>변형 운동이 메인 리프트로 얼마나 전이되는지 정확한 수치는 아직 측정되지 않았습니다 — 변형 선택은 코칭 합의에 기반합니다.</li>
        <li>부위 통증 기준은 재활 연구에서 가져온 보수적 값으로, 의학적 조언이 아닙니다. 통증이 커지면 무게를 줄이세요.</li>
        <li>로우바 vs 하이바 강조 차이는 연구가 혼재되어 경향일 뿐 절대 법칙이 아닙니다.</li>
```

- [ ] **Step 4: Run to verify pass; then full suite + build + demo**

Run: `npm test`
Expected: ALL tests pass (engine + ui).
Run: `node src/engine/demo.js`
Expected: prints a plan (demo profile has no style/region → defaults apply; comp variants resolve, accessories attach). If the demo errors because the old demo profile lacks v2 fields, update `src/engine/demo.js`'s profile to include `style`, `stickingPoint`, `regionStatus`, `equipment` (defaults are fine) and re-run.
Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/RoutineView.jsx src/ui/components/RoutineView.test.jsx src/ui/components/LimitsPanel.jsx src/engine/demo.js
git commit -m "feat(ui): render engine accessories + v2 honest-limits; verify full suite"
```

---

## Self-Review

**1. Spec coverage** (`2026-06-25-programming-v2-design.md`):
- §4 inputs (style, stickingPoint, regionStatus) → store Task 11, form Task 13, adapter Task 12. ✓
- §5 DB rewrite + `stress` tag → Task 1. ✓
- §6 modules style/variations/accessories/regionStatus + changed exercises/templates/periodization/generate → Tasks 2–9. ✓
- §6 selection flow (style→comp variant, variation slots, accessories, region modulation, band/chain gate) → Tasks 3,4,6,7,8,9. ✓ (band/chain gate = `advanced = years>=3` in generate Task 9 + `excludeAdvanced` in variations Task 4.)
- §7 data model (Exercise tags, session.accessories) → Tasks 1,9. ✓
- §8 UI (style/sticking/region controls, accessories render, limits) → Tasks 13,14. Korean labels Task 10. ✓
- §10 testing (golden per module + integration + DB integrity) → every task is TDD; Task 1 integrity; Task 9 integration. ✓
- §11 honest limits in UI → Task 14. ✓
- `velocity` stub preserved → periodization Task 8 keeps `velocity:null`. ✓

**2. Placeholder scan:** The only intentional "generate from catalog" step is Task 1 Step 3 — it has explicit, deterministic `stress`/`styleBias`/`advanced` rules and a verifying integrity test, so it is not an open-ended placeholder. Task 9 Step 1 contains a deliberately-flagged test stub (`byNameSafe`) with an explicit instruction to replace it with a real `byName` import before shipping — called out, not hidden. No "TBD"/"add error handling"/"similar to Task N" anywhere.

**3. Type consistency:** `Exercise` tag set is identical across Tasks 1,2,4,6,9. Region keys identical in constraints, Task 1 rules, Task 5, Task 11. `ctx` shape `{e1rm,setsPerSession,style,stickingPoint,equipment,advanced,regionStatus}` consistent between Task 8 (periodization) and Task 9 (generate). `style` per-lift shape `{squat:{bar,stance?},bench:{grip},deadlift:{stance}}` consistent across style.js (Task 3), variations.js (Task 4), store (Task 11), form (Task 13). Exercise object `{lift,baseLift,sets,reps,rpeTarget,pct,weight,velocity}` consistent Task 8→9→12. `session.accessories` is `Exercise[]` (objects) consistently Task 9→12→14.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-25-programming-v2.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batched checkpoints.

**Which approach?**
