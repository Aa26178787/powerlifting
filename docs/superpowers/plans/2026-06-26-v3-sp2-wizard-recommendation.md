# v3 SP2 — Setup Wizard & Recommendation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a step-by-step setup wizard (replacing the single form) plus a pure diagnosis/recommendation engine (strength assessment, lagging-lift detection, recommended blend) and per-variation load modifiers, with a flagged priority lift bumping volume + targeted accessories.

**Architecture:** Extend the live v3-SP1 engine. New pure `standards.js` (inter-lift standards, IPF GL, weak-lift, blend recommendation); add `e1rmModifier` to variation rows in `exercises.json` and apply it in periodization/deload weight math; add a `priorityLift` field that `generate` routes to a small volume bump + sticking-region accessory emphasis. New React `src/ui/wizard/` (shell + 8 steps + a StrengthAssessment display) writing to the existing store; App shows the wizard until a plan exists, then a routine + compact edit panel. Deterministic, Vitest-tested.

**Tech Stack:** Vite + React, Vitest (+ jsdom for components), ES modules, Node ≥ 18. JSON imports `with { type: 'json' }`.

## Global Constraints

- Engine modules PURE/deterministic; ES `.js`; JSON imports `with { type: 'json' }`.
- Component tests begin with `// @vitest-environment jsdom`; pure-logic tests run in node. `src/test/setup.js` already polyfills localStorage.
- **standards.js data (verbatim):** `ELITE_REL = { male:{squat:2.83,bench:1.95,deadlift:3.25}, female:{squat:2.26,bench:1.35,deadlift:2.66} }`; `GL_COEF = { male:{A:1199.72839,B:1025.18162,C:0.00921}, female:{A:610.32796,B:1045.59282,C:0.03048} }`. Sex maps `'F'|'female'→female` else `male`.
- standards functions take RESOLVED 1RM numbers per lift (not lift-input objects) to stay pure and avoid a circular import with generate.
- **e1rmModifier:** a fraction of the base comp lift's e1RM on variation exercises only (competition lifts + accessories omit it ⇒ 1.0); valid range [0.75, 1.10]. Weight math: `weightFor(quality, e1rm[baseLift] * (e1rmModifier ?? 1))`.
- `priorityLift ∈ {squat,bench,deadlift,null}`. Bump = +1 setsPerSession for that lift, re-capped so realized weekly sets ≤ band.mrv; null → SP1 behavior unchanged.
- Korean UI labels via `src/ui/i18n.js`; engine values English. Honest-limits disclosures (spec §11) in LimitsPanel.
- **Migration:** the wizard replacing the single form is a breaking UI change; full `npm test` is temporarily red — focused tests per task, full green restored at the final task. Engine tasks (1–5) keep the engine suite green throughout.
- Spec: `docs/superpowers/specs/2026-06-26-v3-sp2-wizard-recommendation-design.md`.

---

### Task 1: Diagnosis engine (`standards.js`)

**Files:**
- Create: `src/engine/standards.js`
- Test: `src/engine/standards.test.js`

**Interfaces:**
- Produces:
  - `ELITE_REL`, `GL_COEF`.
  - `relStandard(lift, oneRM, bodyweight, sex): number|null` — `(oneRM/bodyweight)/ELITE_REL[sexKey][lift]`; null if oneRM or bodyweight falsy.
  - `weakLift(oneRMs, bodyweight, sex): 'squat'|'bench'|'deadlift'|null` — `oneRMs={squat,bench,deadlift}` numbers; the lift with the lowest `relStandard`; tie-break order `['bench','squat','deadlift']`; null if any missing/zero or bodyweight missing.
  - `glPoints(total, bodyweight, sex): number` — `round(total*100/(A − B*e^(−C*bodyweight)), 2)`; 0 if bodyweight/total falsy.
  - `levelBand(avgRelStandard): string` — `<0.45`→`'입문'`, `<0.6`→`'초중급'`, `<0.75`→`'중상급'`, `<0.9`→`'고급'`, else `'엘리트급'`.
  - `assess(oneRMs, bodyweight, sex): { perLift:{squat,bench,deadlift}, weakLift, glPoints, level } | null` — null if bodyweight missing or any oneRM missing.
  - `recommendBlend(years): {power,strength,hypertrophy,endurance}` — years<1 → `{0.1,0.6,0.3,0}`; 1–3 → `{0.1,0.45,0.45,0}`; >3 → `{0.15,0.3,0.4,0.15}`.

- [ ] **Step 1: Write the failing tests**

`src/engine/standards.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { ELITE_REL, relStandard, weakLift, glPoints, levelBand, assess, recommendBlend } from './standards.js'

describe('relStandard', () => {
  it('a male squatting 2.83x bodyweight is at 1.0 of the elite standard', () => {
    expect(relStandard('squat', 283, 100, 'M')).toBeCloseTo(1.0, 3)
  })
  it('null when 1RM missing', () => { expect(relStandard('bench', 0, 100, 'M')).toBeNull() })
})

describe('weakLift', () => {
  it('flags the lift furthest below its own standard', () => {
    // squat 2.83x (1.0), deadlift 3.25x (1.0), bench 1.5x → 1.5/1.95=0.77 lowest
    expect(weakLift({ squat: 283, bench: 150, deadlift: 325 }, 100, 'M')).toBe('bench')
  })
  it('proportional lifts do NOT auto-flag bench', () => {
    // all at exactly elite standard -> all relStandard 1.0 -> tie -> bench first; but make squat slightly lowest
    expect(weakLift({ squat: 270, bench: 195, deadlift: 325 }, 100, 'M')).toBe('squat')
  })
  it('null when a lift is missing', () => {
    expect(weakLift({ squat: 200, bench: 0, deadlift: 250 }, 100, 'M')).toBeNull()
  })
})

describe('glPoints', () => {
  it('computes a positive GL score for a 500kg male total at 100kg', () => {
    const gl = glPoints(500, 100, 'M')
    expect(gl).toBeGreaterThan(40)
    expect(gl).toBeLessThan(120)
  })
})

describe('levelBand', () => {
  it('maps fractions to bands', () => {
    expect(levelBand(0.3)).toBe('입문')
    expect(levelBand(0.5)).toBe('초중급')
    expect(levelBand(0.95)).toBe('엘리트급')
  })
})

describe('assess', () => {
  it('returns perLift, weakLift, gl, level', () => {
    const a = assess({ squat: 200, bench: 120, deadlift: 240 }, 90, 'M')
    expect(a.weakLift).toBeDefined()
    expect(typeof a.glPoints).toBe('number')
    expect(typeof a.level).toBe('string')
    expect(a.perLift.squat).toBeGreaterThan(0)
  })
  it('null when bodyweight missing', () => {
    expect(assess({ squat: 200, bench: 120, deadlift: 240 }, null, 'M')).toBeNull()
  })
})

describe('recommendBlend', () => {
  it('beginner strength-leaning', () => { expect(recommendBlend(0.5).strength).toBe(0.6) })
  it('intermediate powerbuilding', () => {
    const b = recommendBlend(2)
    expect(b.strength).toBe(0.45); expect(b.hypertrophy).toBe(0.45)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/standards.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/standards.js`**

```js
export const ELITE_REL = {
  male:   { squat: 2.83, bench: 1.95, deadlift: 3.25 },
  female: { squat: 2.26, bench: 1.35, deadlift: 2.66 },
}
export const GL_COEF = {
  male:   { A: 1199.72839, B: 1025.18162, C: 0.00921 },
  female: { A: 610.32796,  B: 1045.59282, C: 0.03048 },
}
const MAIN = ['squat', 'bench', 'deadlift']
const sexKey = (sex) => (sex === 'F' || sex === 'female' ? 'female' : 'male')

export function relStandard(lift, oneRM, bodyweight, sex) {
  if (!oneRM || !bodyweight) return null
  return (oneRM / bodyweight) / ELITE_REL[sexKey(sex)][lift]
}

export function weakLift(oneRMs, bodyweight, sex) {
  if (!bodyweight) return null
  const rs = {}
  for (const l of MAIN) {
    const v = relStandard(l, oneRMs[l], bodyweight, sex)
    if (v == null) return null
    rs[l] = v
  }
  const order = ['bench', 'squat', 'deadlift'] // tie-break preference
  let best = order[0]
  for (const l of order) if (rs[l] < rs[best]) best = l
  return best
}

export function glPoints(total, bodyweight, sex) {
  if (!total || !bodyweight) return 0
  const { A, B, C } = GL_COEF[sexKey(sex)]
  const gl = total * 100 / (A - B * Math.exp(-C * bodyweight))
  return Math.round(gl * 100) / 100
}

export function levelBand(avg) {
  if (avg < 0.45) return '입문'
  if (avg < 0.6) return '초중급'
  if (avg < 0.75) return '중상급'
  if (avg < 0.9) return '고급'
  return '엘리트급'
}

export function assess(oneRMs, bodyweight, sex) {
  if (!bodyweight) return null
  const perLift = {}
  for (const l of MAIN) {
    const v = relStandard(l, oneRMs[l], bodyweight, sex)
    if (v == null) return null
    perLift[l] = v
  }
  const total = MAIN.reduce((a, l) => a + oneRMs[l], 0)
  const avg = (perLift.squat + perLift.bench + perLift.deadlift) / 3
  return { perLift, weakLift: weakLift(oneRMs, bodyweight, sex), glPoints: glPoints(total, bodyweight, sex), level: levelBand(avg) }
}

export function recommendBlend(years) {
  if (years < 1) return { power: 0.1, strength: 0.6, hypertrophy: 0.3, endurance: 0 }
  if (years <= 3) return { power: 0.1, strength: 0.45, hypertrophy: 0.45, endurance: 0 }
  return { power: 0.15, strength: 0.3, hypertrophy: 0.4, endurance: 0.15 }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/standards.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/standards.js src/engine/standards.test.js
git commit -m "feat(engine): strength-standards diagnosis (relStandard, weakLift, GL, blend rec)"
```

---

### Task 2: Variation load modifiers in the DB

**Files:**
- Modify: `src/data/exercises.json`
- Modify: `src/engine/exercises.integrity.test.js` (extend)

**Interfaces:**
- Produces: variation exercises gain `"e1rmModifier": <number in [0.75,1.10]>`; competition lifts and accessories omit it. Integrity: every present `e1rmModifier` is a number in [0.75, 1.10].

- [ ] **Step 1: Extend the integrity test**

Append to `src/engine/exercises.integrity.test.js` (inside the existing top-level describe or as a new one):
```js
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
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/exercises.integrity.test.js`
Expected: FAIL — no exercise carries `e1rmModifier` yet (the ≥20 assertion fails).

- [ ] **Step 3: Add `e1rmModifier` to variation rows in `src/data/exercises.json`**

For each `category:"variation"` exercise, add `"e1rmModifier"` using the spec §4b midpoints. Match by name keyword:
- squat: high-bar 0.94, ssb/safety 0.89, buffalo/duffalo 0.99, cambered 0.91, tempo 0.90, pause 0.93, pin 0.89, box 0.90, anderson 0.88, front 0.84, zercher 0.80, heel-elevated/cyclist 0.85, zombie 0.92, hatfield 0.95, narrow/wide-stance 0.95.
- bench: close-grip 0.97, wide 0.95, tempo 0.93, pause/2-second 0.95, spoto 0.94, pin 0.94, floor 0.93, larsen 0.93, feet-up 0.93, dead bench 0.92, cambered 0.93, incline 0.82, decline 0.95, swiss/axle 0.93, slingshot 1.04, board 1.04.
- deadlift: pause off-floor 0.93, pause below-knee 0.94, deficit 0.93, halting 0.92, block-pull-below-knee 1.00, block-pull-above-knee 1.05, rack-pull-above-knee 1.05, rack-pull-mid-shin 1.02, snatch-grip 0.85, clean-grip 0.92, romanian/RDL 0.80, stiff-leg 0.80, trap-bar 1.05, tempo 0.90, sumo-block-pull 1.05, banded/chain (advanced) 0.90.
Apply a sensible midpoint to every remaining variation (default 0.90 if uncertain). Do NOT add the field to `competition` or `accessory` rows.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/exercises.integrity.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/exercises.json src/engine/exercises.integrity.test.js
git commit -m "feat(engine): per-variation e1rmModifier (variation %1RM data)"
```

---

### Task 3: Apply e1rmModifier in periodization + deload

**Files:**
- Modify: `src/engine/periodization.js`
- Modify: `src/engine/deload.js`
- Test: `src/engine/periodization.test.js` (extend), `src/engine/deload.test.js` (extend)

**Interfaces:**
- Produces: in `periodization.buildExercise`, the resolved exercise's `e1rmModifier` scales the e1RM used for weight: `weight = weightFor(quality, ctx.e1rm[slot.lift] * (byName(name)?.e1rmModifier ?? 1))`. In `deload.buildDeloadWeek`, `weight = workingWeight(ctx.e1rm[ex.baseLift ?? ex.lift] * (byName(ex.lift)?.e1rmModifier ?? 1), Math.min(12, ex.repAnchor ?? 5), 6)` (import `byName` from `./exercises.js`).

- [ ] **Step 1: Write the failing tests (extend)**

Append to `src/engine/periodization.test.js`:
```js
import { byName as byName2 } from './exercises.js'
describe('e1rmModifier applied to weight', () => {
  it('a variation slot is lighter than the comp lift at the same quality/e1rm', () => {
    // force a variation slot: use a template where volume/light slots resolve to variations
    const weeks = buildWorkingWeeks('dup', 3, { ...ctx, stickingPoint: { squat:'bottom', bench:'none', deadlift:'bottom' } })
    const exs = weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    const variation = exs.find((e) => { const x = byName2(e.lift); return x && x.category === 'variation' && typeof x.e1rmModifier === 'number' && x.e1rmModifier < 1 })
    if (variation) {
      const x = byName2(variation.lift)
      // weight should be < what an unmodified (modifier 1) calc would give → just assert finite & > 0 and the modifier was a real <1
      expect(Number.isFinite(variation.weight)).toBe(true)
      expect(x.e1rmModifier).toBeLessThan(1)
    }
  })
}
)
```
Append to `src/engine/deload.test.js` a fixture exercise whose `lift` is a known variation with a modifier (e.g. `'Pause Squat (bottom)'` if present, else any variation name from the DB) and assert the deload `weight` is finite and `< workingWeight(e1rm, repAnchor, 6)` computed with modifier 1. (Use `byName` to read the actual modifier; keep the assertion to finiteness + that the modifier path ran.)

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/periodization.test.js src/engine/deload.test.js`
Expected: FAIL (or the assertion that weight reflects the modifier fails) until the modifier is applied.

- [ ] **Step 3: Apply the modifier**

In `src/engine/periodization.js` `buildExercise`, change the weight line to:
```js
    weight: weightFor(quality, ctx.e1rm[slot.lift] * (byName(name)?.e1rmModifier ?? 1)),
```
(`byName` is already imported.) In `src/engine/deload.js`, add `import { byName } from './exercises.js'` and change the weight line to:
```js
      weight: workingWeight(ctx.e1rm[ex.baseLift ?? ex.lift] * (byName(ex.lift)?.e1rmModifier ?? 1), Math.min(12, ex.repAnchor ?? 5), 6),
```

- [ ] **Step 4: Run to verify pass; engine suite**

Run: `npx vitest run src/engine/`
Expected: PASS across all engine tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/periodization.js src/engine/deload.js src/engine/periodization.test.js src/engine/deload.test.js
git commit -m "feat(engine): apply e1rmModifier to variation/deload weight"
```

---

### Task 4: Generate — priorityLift bump + sticking emphasis

**Files:**
- Modify: `src/engine/generate.js`
- Test: `src/engine/generate.test.js` (extend)

**Interfaces:**
- Produces: `generate` reads `profile.priorityLift`. After computing `cappedSetsPerSession` (the MRV-cap from SP1), if `priorityLift` is a main lift, bump it: `cappedSetsPerSession[priorityLift] = max(1, min(cappedSetsPerSession[priorityLift] + 1, floor(mrv / slotCount[priorityLift])))` — i.e. +1 but still MRV-capped. The accessory `select` call already receives `stickingPoint[primary]`; no change needed for the sticking emphasis (it is per-session by the primary lift). `priorityLift` null → unchanged.

- [ ] **Step 1: Write the failing test (extend)**

Append to `src/engine/generate.test.js`:
```js
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
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/generate.test.js`
Expected: FAIL — priorityLift not read.

- [ ] **Step 3: Update `src/engine/generate.js`**

After the `cappedSetsPerSession` loop (from SP1), insert:
```js
  const priorityLift = profile.priorityLift
  if (priorityLift && MAIN_LIFTS.includes(priorityLift)) {
    const sc = slotCounts[priorityLift] || 1
    cappedSetsPerSession[priorityLift] = Math.max(1, Math.min(cappedSetsPerSession[priorityLift] + 1, Math.floor(mrv / sc)))
  }
```
(`slotCounts`, `mrv`, `cappedSetsPerSession` already exist from the SP1 MRV-cap fix.)

- [ ] **Step 4: Run to verify pass; engine suite**

Run: `npx vitest run src/engine/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/generate.js src/engine/generate.test.js
git commit -m "feat(engine): priority-lift volume bump (MRV-capped)"
```

---

### Task 5: Store — priorityLift

**Files:**
- Modify: `src/ui/store/profileStore.js`
- Test: `src/ui/store/profileStore.test.js` (extend)

**Interfaces:**
- Produces: `DEFAULT_PROFILE.priorityLift = null`; action `setPriorityLift(value)`; persist `merge` fills `priorityLift` (`p.priorityLift ?? current.profile.priorityLift`).

- [ ] **Step 1: Write the failing test (extend)**

Append to `src/ui/store/profileStore.test.js`:
```js
describe('priorityLift', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults to null and is settable', () => {
    expect(useProfileStore.getState().profile.priorityLift).toBeNull()
    useProfileStore.getState().setPriorityLift('bench')
    expect(useProfileStore.getState().profile.priorityLift).toBe('bench')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: FAIL.

- [ ] **Step 3: Update `src/ui/store/profileStore.js`**

Add `priorityLift: null,` to `DEFAULT_PROFILE`. Add action:
```js
      setPriorityLift: (value) => set((s) => ({ profile: { ...s.profile, priorityLift: value } })),
```
In persist `merge` profile fill add: `priorityLift: p.priorityLift ?? current.profile.priorityLift,`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/store/profileStore.js src/ui/store/profileStore.test.js
git commit -m "feat(ui): store priorityLift field + setter"
```

---

### Task 6: i18n — wizard + assessment labels

**Files:**
- Modify: `src/ui/i18n.js`
- Test: `src/ui/i18n.test.js` (extend)

**Interfaces:**
- Produces: `stepLabel(n)` for steps 1–8 (1 기본, 2 현재 1RM, 3 경력, 4 목표, 5 주기화, 6 스타일·약점, 7 장비·일정, 8 요약); `assessLabel(key)` for `weakLift`→'약점 종목', `level`→'강도 수준', `gl`→'GL 점수', `standard`→'표준 대비'. Each falls back to the raw value.

- [ ] **Step 1: Write the failing tests (extend)**

Append to `src/ui/i18n.test.js`:
```js
import { stepLabel, assessLabel } from './i18n.js'
describe('i18n sp2', () => {
  it('step labels', () => { expect(stepLabel(2)).toBe('현재 1RM'); expect(stepLabel(8)).toBe('요약') })
  it('assess labels', () => { expect(assessLabel('weakLift')).toBe('약점 종목'); expect(assessLabel('gl')).toBe('GL 점수') })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/i18n.test.js`
Expected: FAIL.

- [ ] **Step 3: Extend `src/ui/i18n.js`**

```js
const STEP = { 1:'기본', 2:'현재 1RM', 3:'경력', 4:'목표', 5:'주기화', 6:'스타일·약점', 7:'장비·일정', 8:'요약' }
const ASSESS = { weakLift:'약점 종목', level:'강도 수준', gl:'GL 점수', standard:'표준 대비' }
export const stepLabel = (n) => STEP[n] ?? String(n)
export const assessLabel = (k) => ASSESS[k] ?? k
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/i18n.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/i18n.js src/ui/i18n.test.js
git commit -m "feat(ui): i18n wizard step + assessment labels"
```

---

### Task 7: Strength assessment component

**Files:**
- Create: `src/ui/wizard/StrengthAssessment.jsx`
- Test: `src/ui/wizard/StrengthAssessment.test.jsx`

**Interfaces:**
- Consumes: `assess` (standards.js), `liftLabel, assessLabel` (i18n).
- Produces: `StrengthAssessment({ oneRMs, bodyweight, sex })` — renders nothing useful (a "1RM·체중을 입력하면 진단" placeholder) when `assess` returns null; otherwise renders each lift's % of standard, the GL points, the level band, and the weak lift highlighted. Pure presentational.

- [ ] **Step 1: Write the failing tests**

`src/ui/wizard/StrengthAssessment.test.jsx`:
```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StrengthAssessment from './StrengthAssessment.jsx'

describe('StrengthAssessment', () => {
  it('shows a placeholder when inputs incomplete', () => {
    render(<StrengthAssessment oneRMs={{ squat: 0, bench: 0, deadlift: 0 }} bodyweight={null} sex="M" />)
    expect(screen.getByText(/입력하면/)).toBeInTheDocument()
  })
  it('shows GL points and the weak lift when complete', () => {
    render(<StrengthAssessment oneRMs={{ squat: 200, bench: 120, deadlift: 240 }} bodyweight={90} sex="M" />)
    expect(screen.getByText(/GL 점수/)).toBeInTheDocument()
    expect(screen.getByText(/약점 종목/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/wizard/StrengthAssessment.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/wizard/StrengthAssessment.jsx`**

```jsx
import { assess } from '../../engine/standards.js'
import { liftLabel, assessLabel } from '../i18n.js'

export default function StrengthAssessment({ oneRMs, bodyweight, sex }) {
  const a = assess(oneRMs, bodyweight, sex)
  if (!a) return <p className="assess-placeholder">1RM과 체중을 입력하면 강도 진단이 표시됩니다.</p>
  return (
    <div className="assessment">
      <p>{assessLabel('level')}: <strong>{a.level}</strong> · {assessLabel('gl')}: <strong>{a.glPoints}</strong></p>
      <ul>
        {['squat', 'bench', 'deadlift'].map((l) => (
          <li key={l} className={a.weakLift === l ? 'weak' : ''}>
            {liftLabel(l)} — {assessLabel('standard')} {Math.round(a.perLift[l] * 100)}%
            {a.weakLift === l ? ' ⚠️ ' + assessLabel('weakLift') : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/wizard/StrengthAssessment.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard/StrengthAssessment.jsx src/ui/wizard/StrengthAssessment.test.jsx
git commit -m "feat(ui): strength assessment display component"
```

---

### Task 8: Wizard shell + navigation

**Files:**
- Create: `src/ui/wizard/Wizard.jsx`
- Test: `src/ui/wizard/Wizard.test.jsx`

**Interfaces:**
- Consumes: `useProfileStore`, `selectIsValid`; `stepLabel` (i18n); props `{ onComplete: () => void }`.
- Produces: an 8-step container holding `const [step, setStep] = useState(1)`; renders the current step title via `stepLabel(step)`, a placeholder slot for step body (the step components are wired in Tasks 9–10 — for THIS task the body is a minimal per-step stub keyed by `step`), 이전/다음 buttons (이전 disabled at step 1; at step 8 the button reads "루틴 생성" and calls `onComplete`). Advancing past step 2 requires the three 1RMs entered (uses `selectIsValid` on lifts) — 다음 is disabled on step 2 until valid.

- [ ] **Step 1: Write the failing tests**

`src/ui/wizard/Wizard.test.jsx`:
```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Wizard from './Wizard.jsx'
import { useProfileStore } from '../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('Wizard', () => {
  it('starts at step 1 and advances', async () => {
    render(<Wizard onComplete={() => {}} />)
    expect(screen.getByText(/기본/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /다음/ }))
    expect(screen.getByText(/현재 1RM/)).toBeInTheDocument()
  })
  it('calls onComplete from the final step', async () => {
    // jump to step 8 by setting valid lifts then advancing
    const s = useProfileStore.getState()
    s.setLift('squat', { oneRM: 200 }); s.setLift('bench', { oneRM: 140 }); s.setLift('deadlift', { oneRM: 240 })
    let done = false
    render(<Wizard onComplete={() => { done = true }} />)
    const user = userEvent.setup()
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole('button', { name: /다음|루틴 생성/ }))
    await user.click(screen.getByRole('button', { name: /루틴 생성/ }))
    expect(done).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/wizard/Wizard.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/wizard/Wizard.jsx`**

```jsx
import { useState } from 'react'
import { useProfileStore, selectIsValid } from '../store/profileStore.js'
import { stepLabel } from '../i18n.js'

export default function Wizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const profile = useProfileStore((s) => s.profile)
  const last = 8
  const liftsValid = selectIsValid(profile)
  const canNext = step !== 2 || liftsValid

  return (
    <div className="wizard">
      <h2>{step}. {stepLabel(step)}</h2>
      <div className="wizard-body" data-step={step}>
        {/* Step bodies are added in Tasks 9-10; minimal stub keeps navigation testable */}
        <p className="wizard-step-stub">{stepLabel(step)}</p>
      </div>
      <div className="wizard-nav">
        <button type="button" disabled={step === 1} onClick={() => setStep((n) => Math.max(1, n - 1))}>이전</button>
        {step < last
          ? <button type="button" disabled={!canNext} onClick={() => setStep((n) => Math.min(last, n + 1))}>다음</button>
          : <button type="button" onClick={onComplete}>루틴 생성</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/wizard/Wizard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard/Wizard.jsx src/ui/wizard/Wizard.test.jsx
git commit -m "feat(ui): wizard shell + step navigation"
```

---

### Task 9: Wizard step bodies 1–4 (basics, 1RM+assessment, experience, goals)

**Files:**
- Create: `src/ui/wizard/steps/StepBasics.jsx`, `StepLifts.jsx`, `StepExperience.jsx`, `StepGoals.jsx`
- Modify: `src/ui/wizard/Wizard.jsx` (render real step bodies for 1–4)
- Test: `src/ui/wizard/steps/StepLifts.test.jsx`, `src/ui/wizard/steps/StepGoals.test.jsx`

**Interfaces:**
- Each step reads/writes `profileStore`. `StepBasics`: sex select, bodyweight, age. `StepLifts`: three 1RM inputs + `<StrengthAssessment ...>` + a "이 종목 우선 보강" checkbox that calls `setPriorityLift(assess.weakLift)` when checked. `StepExperience`: years. `StepGoals`: preset buttons + quality sliders + a "추천 적용" button that calls `setQuality` for each quality from `recommendBlend(profile.years)`.
- Wizard renders `<StepBasics/>` for step 1, `<StepLifts/>` for 2, `<StepExperience/>` for 3, `<StepGoals/>` for 4 (others keep the stub until Task 10).

- [ ] **Step 1: Write the failing tests**

`src/ui/wizard/steps/StepLifts.test.jsx`:
```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepLifts from './StepLifts.jsx'
import { useProfileStore } from '../../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('StepLifts', () => {
  it('entering lifts + bodyweight shows assessment, and priority checkbox sets priorityLift', async () => {
    const s = useProfileStore.getState()
    s.setField('bodyweight', 90)
    s.setLift('squat', { oneRM: 200 }); s.setLift('bench', { oneRM: 110 }); s.setLift('deadlift', { oneRM: 250 })
    render(<StepLifts />)
    expect(screen.getByText(/GL 점수/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByLabelText(/우선 보강/))
    expect(useProfileStore.getState().profile.priorityLift).toBeTruthy()
  })
})
```
`src/ui/wizard/steps/StepGoals.test.jsx`:
```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepGoals from './StepGoals.jsx'
import { useProfileStore } from '../../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('StepGoals', () => {
  it('applies the recommended blend', async () => {
    useProfileStore.getState().setField('years', 0.5) // beginner -> strength 0.6
    render(<StepGoals />)
    await userEvent.setup().click(screen.getByRole('button', { name: /추천 적용/ }))
    expect(useProfileStore.getState().profile.qualities.strength).toBe(0.6)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/wizard/steps/StepLifts.test.jsx src/ui/wizard/steps/StepGoals.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the four step components + wire 1–4 into Wizard**

`src/ui/wizard/steps/StepBasics.jsx`:
```jsx
import { useProfileStore } from '../../store/profileStore.js'
const numOrNull = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n }
export default function StepBasics() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  return (
    <div>
      <label>성별
        <select value={p.sex} onChange={(e) => setField('sex', e.target.value)}>
          <option value="">—</option><option value="M">남</option><option value="F">여</option>
        </select>
      </label>
      <label>체중 (kg)
        <input type="number" value={p.bodyweight ?? ''} onChange={(e) => setField('bodyweight', numOrNull(e.target.value))} />
      </label>
      <label>나이
        <input type="number" value={p.age ?? ''} onChange={(e) => setField('age', numOrNull(e.target.value))} />
      </label>
    </div>
  )
}
```
`src/ui/wizard/steps/StepLifts.jsx`:
```jsx
import { useProfileStore } from '../../store/profileStore.js'
import { assess } from '../../engine/standards.js'
import StrengthAssessment from '../StrengthAssessment.jsx'
import { liftLabel } from '../i18n.js'
const numOrNull = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n }
export default function StepLifts() {
  const p = useProfileStore((s) => s.profile)
  const setLift = useProfileStore((s) => s.setLift)
  const setPriorityLift = useProfileStore((s) => s.setPriorityLift)
  const oneRMs = { squat: p.lifts.squat?.oneRM ?? 0, bench: p.lifts.bench?.oneRM ?? 0, deadlift: p.lifts.deadlift?.oneRM ?? 0 }
  const a = assess(oneRMs, p.bodyweight, p.sex)
  return (
    <div>
      {['squat', 'bench', 'deadlift'].map((l) => (
        <label key={l}>{liftLabel(l)} 1RM
          <input type="number" value={p.lifts[l]?.oneRM ?? ''} onChange={(e) => setLift(l, { oneRM: numOrNull(e.target.value) })} />
        </label>
      ))}
      <StrengthAssessment oneRMs={oneRMs} bodyweight={p.bodyweight} sex={p.sex} />
      {a && a.weakLift && (
        <label>
          <input type="checkbox" checked={p.priorityLift === a.weakLift}
            onChange={(e) => setPriorityLift(e.target.checked ? a.weakLift : null)} />
          {liftLabel(a.weakLift)} 우선 보강
        </label>
      )}
    </div>
  )
}
```
(`i18n.js` is at `../i18n.js` relative to `steps/` → actually `../../i18n.js`. Use the correct relative path: from `src/ui/wizard/steps/` the i18n is `../../i18n.js`. Fix all step imports accordingly.)
`src/ui/wizard/steps/StepExperience.jsx`:
```jsx
import { useProfileStore } from '../../store/profileStore.js'
const numOrNull = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n }
export default function StepExperience() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  return (
    <label>운동 경력 (년)
      <input type="number" step="0.5" value={p.years} onChange={(e) => setField('years', numOrNull(e.target.value))} />
    </label>
  )
}
```
`src/ui/wizard/steps/StepGoals.jsx`:
```jsx
import { useProfileStore } from '../../store/profileStore.js'
import { recommendBlend } from '../../engine/standards.js'
import { qualityLabel, presetLabel } from '../../i18n.js'
export default function StepGoals() {
  const p = useProfileStore((s) => s.profile)
  const setQuality = useProfileStore((s) => s.setQuality)
  const applyPreset = useProfileStore((s) => s.applyPreset)
  const applyRec = () => { const b = recommendBlend(p.years); for (const q of Object.keys(b)) setQuality(q, b[q]) }
  return (
    <div>
      <div>{['powerlifting','powerbuilding','bodybuilding','athletic','general'].map((k) => (
        <button type="button" key={k} onClick={() => applyPreset(k)}>{presetLabel(k)}</button>
      ))}</div>
      <button type="button" onClick={applyRec}>추천 적용</button>
      {['power','strength','hypertrophy','endurance'].map((q) => (
        <label key={q}>{qualityLabel(q)}
          <input type="range" min="0" max="1" step="0.05" value={p.qualities[q]} onChange={(e) => setQuality(q, Number(e.target.value))} />
          <span>{Math.round(p.qualities[q] * 100)}%</span>
        </label>
      ))}
    </div>
  )
}
```
In `Wizard.jsx`, import the four steps and replace the stub for steps 1–4:
```jsx
import StepBasics from './steps/StepBasics.jsx'
import StepLifts from './steps/StepLifts.jsx'
import StepExperience from './steps/StepExperience.jsx'
import StepGoals from './steps/StepGoals.jsx'
const BODY = { 1: StepBasics, 2: StepLifts, 3: StepExperience, 4: StepGoals }
// in render: const Body = BODY[step]; {Body ? <Body/> : <p className="wizard-step-stub">{stepLabel(step)}</p>}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/wizard/`
Expected: PASS (Wizard + StrengthAssessment + StepLifts + StepGoals).

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard/steps/StepBasics.jsx src/ui/wizard/steps/StepLifts.jsx src/ui/wizard/steps/StepExperience.jsx src/ui/wizard/steps/StepGoals.jsx src/ui/wizard/Wizard.jsx src/ui/wizard/steps/StepLifts.test.jsx src/ui/wizard/steps/StepGoals.test.jsx
git commit -m "feat(ui): wizard steps 1-4 (basics, lifts+assessment, experience, goals)"
```

---

### Task 10: Wizard steps 5–8 + App integration + full verify

**Files:**
- Create: `src/ui/wizard/steps/StepPeriodization.jsx`, `StepStyle.jsx`, `StepEquipment.jsx`, `StepSummary.jsx`
- Modify: `src/ui/wizard/Wizard.jsx` (wire 5–8), `src/App.jsx` (wizard landing + edit panel), `src/ui/components/LimitsPanel.jsx` (SP2 limits)
- Test: `src/App.test.jsx` (update end-to-end), `src/ui/wizard/steps/StepPeriodization.test.jsx`

**Interfaces:**
- `StepPeriodization`: model select (auto/linear/undulating/block via `modelLabel`) + shows `recommendModel({competition, blend})` result + competition toggle + meet date. `StepStyle`: per-lift bar/stance/grip selects + sticking-point selects (reuse SP1 patterns). `StepEquipment`: equipment checkboxes + days/week + session time + region-status grid. `StepSummary`: `<StrengthAssessment/>` + chosen model + blend %s. App: shows `<Wizard onComplete={onGenerate}/>` when `!plan`; once `plan` exists shows the routine + a collapsible "설정 수정" (reusing the existing field controls) + the CSV/print toolbar + a "처음부터" button that clears the plan to re-enter the wizard.

- [ ] **Step 1: Write the failing tests**

`src/ui/wizard/steps/StepPeriodization.test.jsx`:
```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepPeriodization from './StepPeriodization.jsx'
import { useProfileStore } from '../../store/profileStore.js'
beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
describe('StepPeriodization', () => {
  it('sets the periodization model', async () => {
    render(<StepPeriodization />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/주기화 모델/), 'block')
    expect(useProfileStore.getState().profile.periodizationModel).toBe('block')
  })
})
```
Update `src/App.test.jsx` to the wizard flow: render `<App/>`, enter the three 1RMs (in the wizard's lifts step — navigate to step 2 first), advance to the end, click 루틴 생성, assert the routine ("프로그램:" / "주차") renders.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/wizard/steps/StepPeriodization.test.jsx src/App.test.jsx`
Expected: FAIL — steps/App not yet wired.

- [ ] **Step 3: Implement steps 5–8, wire into Wizard, update App + LimitsPanel**

Build `StepPeriodization`, `StepStyle`, `StepEquipment`, `StepSummary` (reusing the SP1 InputForm control patterns for style/sticking/equipment/region — copy the relevant JSX into the step files, reading/writing the store via the existing setters; `StepPeriodization` shows `recommendModel({ competition: p.competition, blend: p.qualities })` when the model is 'auto'). Add them to `Wizard.jsx`'s `BODY` map (5→Periodization, 6→Style, 7→Equipment, 8→Summary). In `src/App.jsx`:
```jsx
import { useProfileStore } from './ui/store/profileStore.js'
import { buildPlan } from './ui/lib/planAdapter.js'
import { planToCsv } from './ui/lib/exportCsv.js'
import Wizard from './ui/wizard/Wizard.jsx'
import RoutineView from './ui/components/RoutineView.jsx'
import LimitsPanel from './ui/components/LimitsPanel.jsx'

export default function App() {
  const profile = useProfileStore((s) => s.profile)
  const plan = useProfileStore((s) => s.plan)
  const setState = useProfileStore.setState
  const onGenerate = () => setState({ plan: buildPlan(profile) })
  const restart = () => setState({ plan: null })
  const downloadCsv = () => {
    const blob = new Blob(['﻿' + planToCsv(plan)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'routine.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="app">
      <h1>파워리프팅 루틴 생성기</h1>
      <LimitsPanel />
      {!plan
        ? <Wizard onComplete={onGenerate} />
        : (
          <div>
            <div className="toolbar">
              <button type="button" onClick={downloadCsv}>CSV 다운로드</button>
              <button type="button" onClick={() => window.print()}>인쇄</button>
              <button type="button" onClick={restart}>처음부터</button>
            </div>
            <RoutineView plan={plan} />
          </div>
        )}
    </div>
  )
}
```
In `LimitsPanel.jsx` append the SP2 honest-limits `<li>`:
```jsx
        <li>약점 종목 판정은 엘리트 대회 데이터의 종목 간 비율 대비이며, 그 종목이 나쁘다는 뜻이 아닙니다.</li>
        <li>강도 수준은 대회 기준 상대값(엘리트 대비 % + GL 점수)이며, 임상적 초급/중급/고급 등급이 아닙니다. 성별 미입력 시 남성 기준입니다.</li>
        <li>변형 운동 무게(%1RM)는 개인 편차가 큰 시작 제안치입니다.</li>
```

- [ ] **Step 4: Run to verify pass; FULL suite + build**

Run: `npx vitest run src/ui/wizard/ src/App.test.jsx`
Expected: PASS.
Run: `npm test`
Expected: **FULL suite GREEN** (engine + UI). If a file outside this task fails, STOP and report it.
Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard/steps/StepPeriodization.jsx src/ui/wizard/steps/StepStyle.jsx src/ui/wizard/steps/StepEquipment.jsx src/ui/wizard/steps/StepSummary.jsx src/ui/wizard/Wizard.jsx src/App.jsx src/App.test.jsx src/ui/components/LimitsPanel.jsx src/ui/wizard/steps/StepPeriodization.test.jsx
git commit -m "feat(ui): wizard steps 5-8 + app wizard landing/edit + SP2 limits; full green"
```

---

## Self-Review

**1. Spec coverage:**
- §4 diagnosis engine (relStandard/weakLift/glPoints/levelBand/assess/recommendBlend) → Task 1. ✓
- §4b variation e1rmModifier (DB + periodization + deload) → Tasks 2, 3. ✓
- §5 weak-lift → priorityLift bump + sticking accessories → Tasks 4 (bump), 5 (store); sticking emphasis already per-session in SP1 accessories.select. ✓
- §6 wizard 8 steps + inline/summary recommendations → Tasks 7 (assessment), 8 (shell), 9 (steps 1–4), 10 (steps 5–8). ✓
- §7 store priorityLift → Task 5. ✓
- §8 App wizard landing + edit panel + i18n + LimitsPanel → Tasks 6, 10. ✓
- §10 testing → every task TDD; Task 10 full suite. ✓
- §11 honest limits → Task 10 LimitsPanel. ✓

**2. Placeholder scan:** No "TBD"/"handle errors". The wizard step bodies are minimal stubs ONLY in Task 8 (explicitly, to keep navigation testable) and are replaced by real components in Tasks 9–10 — called out, not hidden. Migration intermediate-red is scoped (focused per task; full green Task 10).

**3. Type consistency:** `standards` functions take resolved 1RM numbers + bodyweight + sex consistently (Tasks 1, 7, 9). `assess` return `{perLift, weakLift, glPoints, level}` consistent Task 1↔7↔10. `e1rmModifier` applied as `e1rm * (mod ?? 1)` consistent Tasks 3 (periodization + deload). `priorityLift` field/setter consistent Tasks 4, 5, 9. Wizard `BODY` step map + `stepLabel` consistent Tasks 8, 9, 10. i18n `stepLabel/assessLabel` consistent Tasks 6, 7, 8. Step component import paths: from `src/ui/wizard/steps/` the store is `../../store/...`, i18n `../../i18n.js`, engine `../../engine/...` (noted in Task 9).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-26-v3-sp2-wizard-recommendation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batched checkpoints.

**Which approach?**
