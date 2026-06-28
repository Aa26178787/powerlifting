# Programming Fundamentals Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the engine-wide programming-fundamentals corrections from Spec 1 (proximity-to-failure by quality, frequency strength differential, volume honesty, lagging-first ordering, lengthened-position emphasis, variation/free-weight guards, model-superiority honesty).

**Architecture:** Pure deterministic engine (`src/engine/*.js`, kg-internal). Each fix is a bounded change to one or two modules plus a co-located `*.test.js`. Bit-identity is preserved everywhere except the intentional hypertrophy-zone load change (Task 1), whose goldens are re-baselined with documented rationale.

**Tech Stack:** JavaScript (ES modules), Vitest, React/jsdom for component tests. `npm test` runs the suite.

## Global Constraints

- Engine stays pure & deterministic: no `Date`, no `Math.random`. Same inputs → same plan.
- kg internal; UI converts for display.
- Every new coefficient labeled 강/중/약; 약 items surfaced in `LimitsPanel` + `PROJECT_STATUS.md §3`.
- Evidence base: `docs/research/2026-06-29-overload-and-programming-evidence.md`.
- Spec: `docs/superpowers/specs/2026-06-29-programming-fundamentals-refresh-design.md`.
- RPE chart values are fixed in `src/data/rpeChart.json`; goldens derive from it.
- Run `npm test` (full suite) before each commit; a task is done only when the whole suite is green.

## Deviations from Spec 1 (confirm before execution)

1. **Task 1 (proximity):** spec proposed changing strength (8.5→8), hypertrophy (8.5→9), endurance (8→8.5). This plan changes **hypertrophy only (8.5→9)**. That already satisfies the evidence (hypertrophy closer to failure than strength: 9 > 8.5) while keeping all strength/endurance goldens bit-identical — far less churn for the same evidence outcome. Strength/endurance changes can be a later optional task if desired.
2. **Task 7 (phase potentiation):** the `phaseProfile` *mechanic* (phases shifting reps/intensity) is **deferred to Spec 2** (block periodization), where it belongs and won't double-count with the existing week-indexed `weekPlan`/`volumeRamp`/`loadRamp`. Spec 1 keeps only the **model-superiority honesty copy** change (C1).
3. Volume diminishing-returns (Task 3) is implemented as a **regression test + honest doc** asserting the already-present strength-band < hypertrophy-band relationship, not a ramp-shape rewrite (avoids churn; the bands already encode strength saturating earlier).

---

### Task 1: Hypertrophy proximity-to-failure (rpeTarget 8.5 → 9)

**Files:**
- Modify: `src/engine/quality.js:8` (ZONES.hypertrophy.rpeTarget)
- Test: `src/engine/quality.test.js` (weightFor hypertrophy), plus golden re-baseline across the suite

**Interfaces:**
- Consumes: `loadForRpe(e1rm, reps, rpe)` from `e1rm.js` (unchanged).
- Produces: hypertrophy-zone working load rises. `weightFor('hypertrophy', 200)` becomes **152.5** (was 150): `200 × pctOf1RM(9,9)=73.9% × highRepCorrection(9)=1.032 = 152.53 → round 2.5 → 152.5`.

- [ ] **Step 1: Update the hypertrophy weightFor golden (failing test)**

In `src/engine/quality.test.js`, change the `weightFor` block to add the hypertrophy case and its rationale:

```js
describe('weightFor', () => {
  it('power uses 0.625 of e1rm', () => {
    expect(weightFor('power', 200)).toBe(125) // 200*0.625=125
  })
  it('strength uses RPE via repAnchor (unchanged: rpeTarget 8.5)', () => {
    expect(weightFor('strength', 200)).toBe(175) // 200*pctOf1RM(3,8.5)=87.8% → 175
  })
  it('hypertrophy proximity to failure: rpeTarget 9 → 152.5', () => {
    // 200 * pctOf1RM(9,9)=73.9% * highRepCorrection(9)=1.032 = 152.53 → 152.5
    expect(weightFor('hypertrophy', 200)).toBe(152.5)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/engine/quality.test.js`
Expected: FAIL — hypertrophy case expects 152.5, current code returns 150.

- [ ] **Step 3: Make the change**

In `src/engine/quality.js`, edit the hypertrophy zone:

```js
hypertrophy: { reps: [6, 12],  repAnchor: 9,  pct: [0.67, 0.78], loading: 'rpe', rpeTarget: 9 },
```

(was `rpeTarget: 8.5`. Rationale: 2024 meta — hypertrophy benefits from closer proximity to failure than strength; ~1 RIR. Direction 강; exact RPE 9 heuristic `근거 약함`.)

- [ ] **Step 4: Run the quality test to verify it passes**

Run: `npm test -- src/engine/quality.test.js`
Expected: PASS.

- [ ] **Step 5: Re-baseline downstream goldens**

Run the full suite: `npm test`
Hypertrophy-zone loads also appear in `setSchemes.test.js` (hypertrophy/strengthHypertrophy backoff), `generate.test.js`, `deload.test.js`, and `src/ui/components/RoutineView.test.jsx` / `exportCsv.test.js` fixtures. For each failing assertion that is a hypertrophy-zone or strengthHypertrophy-backoff weight, recompute with `rpeTarget 9` and update the expected value. Add a trailing comment on each changed literal: `// proximity differentiation (plan Task 1)`. Do NOT change strength-zone (RPE 8.5) loads — if a strength load fails, investigate (it should not).

- [ ] **Step 6: Run the full suite to verify green**

Run: `npm test`
Expected: PASS (all goldens re-baselined).

- [ ] **Step 7: Commit**

```bash
git add src/engine/quality.js src/engine/quality.test.js src/engine/setSchemes.test.js src/engine/generate.test.js src/engine/deload.test.js src/ui/components/RoutineView.test.jsx src/ui/lib/exportCsv.test.js
git commit -m "feat(engine): hypertrophy proximity-to-failure (rpeTarget 8.5→9)"
```

---

### Task 2: Frequency strength differential (recommendedFrequency)

**Files:**
- Modify: `src/engine/frequency.js` (add `recommendedFrequency`)
- Modify: `src/engine/generate.js:106` (use it when frequency unset)
- Test: `src/engine/frequency.test.js` (create if absent)

**Interfaces:**
- Produces: `recommendedFrequency(blend, daysPerWeek) -> { squat, bench, deadlift }`. Strength/power-dominant non-mixed blends get +1 squat/bench frequency when `daysPerWeek` allows; all other blends return exactly `defaultFrequency(daysPerWeek)` (bit-identical).
- Consumes: `classifyBlend` from `quality.js`, `defaultFrequency` from this module.

- [ ] **Step 1: Write the failing test**

Create `src/engine/frequency.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { defaultFrequency, recommendedFrequency } from './frequency.js'
import { PRESETS } from './quality.js'

describe('recommendedFrequency', () => {
  it('hypertrophy blend → identical to defaultFrequency (frequency = volume distribution only)', () => {
    expect(recommendedFrequency(PRESETS.bodybuilding, 5)).toEqual(defaultFrequency(5))
  })
  it('strength-dominant blend with room → +1 squat frequency vs default', () => {
    const def = defaultFrequency(5)
    const rec = recommendedFrequency(PRESETS.powerlifting, 5)
    expect(rec.squat).toBe(def.squat + 1) // strength benefits independently from frequency (강)
  })
  it('no room (daysPerWeek 3) → does not exceed default (bit-identical)', () => {
    expect(recommendedFrequency(PRESETS.powerlifting, 3)).toEqual(defaultFrequency(3))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/engine/frequency.test.js`
Expected: FAIL — `recommendedFrequency` is not exported.

- [ ] **Step 3: Implement recommendedFrequency**

Append to `src/engine/frequency.js`:

```js
import { classifyBlend } from './quality.js'

// Strength gains rise independently with frequency (Pelland/Zourdos 2025 meta, 강);
// hypertrophy gains track volume, with frequency only distributing it (negligible
// independent effect). So strength/power-dominant non-mixed blends get one extra
// squat/bench session when the weekly day budget allows. Everything else returns
// defaultFrequency unchanged (bit-identical). Exact +1 bias = heuristic (근거 약함).
export function recommendedFrequency(blend, daysPerWeek) {
  const base = defaultFrequency(daysPerWeek)
  const { dom, isMixed } = classifyBlend(blend)
  if (isMixed || (dom !== 'strength' && dom !== 'power')) return base
  const used = base.squat + base.bench + base.deadlift
  let room = Math.max(0, daysPerWeek - used)
  const out = { ...base }
  for (const lift of ['squat', 'bench']) {
    if (room <= 0) break
    out[lift] += 1
    room -= 1
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/engine/frequency.test.js`
Expected: PASS.

- [ ] **Step 5: Wire into generate (default path only)**

In `src/engine/generate.js`, change line 106 from:

```js
  const freqInput = profile.frequency ?? defaultFrequency(daysPerWeek)
```

to:

```js
  const freqInput = profile.frequency ?? recommendedFrequency(blend, daysPerWeek)
```

and add `recommendedFrequency` to the import from `./frequency.js` (line 12).

- [ ] **Step 6: Re-baseline strength-blend default-frequency goldens**

Run: `npm test`
`generate.test.js` cases that use a strength/power-dominant blend AND no explicit `frequency` now get the +1 frequency. Update those expected session/volume counts; annotate `// recommendedFrequency strength +1 (plan Task 2)`. Cases that set `frequency` explicitly or use mixed/hyp blends are unchanged.

- [ ] **Step 7: Run the full suite to verify green**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/engine/frequency.js src/engine/frequency.test.js src/engine/generate.js src/engine/generate.test.js
git commit -m "feat(engine): strength-biased recommended frequency (independent strength driver)"
```

---

### Task 3: Volume diminishing-returns honesty (strength band < hypertrophy band)

**Files:**
- Test: `src/engine/volume.test.js` (add regression)
- Modify: `docs/PROJECT_STATUS.md §3` (honest note) — folded into Task 8

**Interfaces:** none new; asserts existing `BANDS` relationship.

- [ ] **Step 1: Write the failing/guard test**

Add to `src/engine/volume.test.js`:

```js
import { BANDS } from './volume.js'

describe('volume dose-response honesty', () => {
  it('strength band saturates earlier than hypertrophy (strength diminishes faster)', () => {
    // Pelland/Zourdos 2025: gains rise with volume but diminish; strength faster.
    // Encoded as lower strength MRV/MAV than hypertrophy. Regression guard.
    expect(BANDS.strength.mrv).toBeLessThan(BANDS.hypertrophy.mrv)
    expect(BANDS.strength.mav).toBeLessThan(BANDS.hypertrophy.mav)
  })
})
```

- [ ] **Step 2: Run the test**

Run: `npm test -- src/engine/volume.test.js`
Expected: PASS immediately (bands already satisfy this: strength mrv 12 < hypertrophy 22). This is a regression guard locking the relationship in.

- [ ] **Step 3: Commit**

```bash
git add src/engine/volume.test.js
git commit -m "test(engine): lock strength-faster-diminishing volume band relationship"
```

---

### Task 4: Lagging/priority-first accessory ordering

**Files:**
- Modify: `src/engine/accessories.js` (add `orderByPriority`)
- Modify: `src/engine/generate.js` (apply to per-session accessories)
- Test: `src/engine/accessories.test.js`

**Interfaces:**
- Produces: `orderByPriority(accessories, { priorityLift, goalBias }) -> accessories[]`. Stable; when `goalBias >= 0` and `priorityLift` is set, accessories whose `targetLift === priorityLift` move to the front (first-in-session gets most adaptation). When `goalBias < 0` (strength/power) or no `priorityLift`, returns the input order unchanged (bit-identical).

- [ ] **Step 1: Write the failing test**

Add to `src/engine/accessories.test.js`:

```js
import { orderByPriority } from './accessories.js'

describe('orderByPriority', () => {
  const accs = [
    { name: 'A', targetLift: 'bench' },
    { name: 'B', targetLift: 'squat' },
    { name: 'C', targetLift: 'general' },
  ]
  it('hyp-leaning + priorityLift squat → squat-targeted first, stable otherwise', () => {
    const out = orderByPriority(accs, { priorityLift: 'squat', goalBias: 1 })
    expect(out.map((a) => a.name)).toEqual(['B', 'A', 'C'])
  })
  it('strength-leaning (goalBias < 0) → unchanged', () => {
    const out = orderByPriority(accs, { priorityLift: 'squat', goalBias: -1 })
    expect(out.map((a) => a.name)).toEqual(['A', 'B', 'C'])
  })
  it('no priorityLift → unchanged', () => {
    const out = orderByPriority(accs, { priorityLift: undefined, goalBias: 1 })
    expect(out.map((a) => a.name)).toEqual(['A', 'B', 'C'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/engine/accessories.test.js`
Expected: FAIL — `orderByPriority` not exported.

- [ ] **Step 3: Implement orderByPriority**

Append to `src/engine/accessories.js`:

```js
// First-in-session work gets the greatest adaptation (B6, 중). When the goal is
// hypertrophy-leaning (goalBias >= 0) and the user declared a priority lift,
// surface that lift's accessories first. Strength/power plans (goalBias < 0) keep
// competition-specific order. Stable: relative order within each group preserved.
export function orderByPriority(accessories, { priorityLift, goalBias = 0 } = {}) {
  if (goalBias < 0 || !priorityLift) return accessories
  const first = [], rest = []
  for (const a of accessories) (a.targetLift === priorityLift ? first : rest).push(a)
  return [...first, ...rest]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/engine/accessories.test.js`
Expected: PASS.

- [ ] **Step 5: Apply in generate**

In `src/engine/generate.js`, import `orderByPriority` from `./accessories.js` (line 6 area) and apply it to the assembled accessories before they are returned. Replace the `withAccessoryScheme(allRaw, …)` line (~281) so the raw list is priority-ordered first:

```js
      const orderedRaw = orderByPriority(allRaw, { priorityLift: profile.priorityLift, goalBias })
      const accessories = withAccessoryScheme(orderedRaw, {
        weekIndex: wk.index - 1,
        advanced,
        phase,
        isDeload: wk.isDeload,
      })
```

- [ ] **Step 6: Re-baseline / verify goldens**

Run: `npm test`
Only `generate.test.js` cases with `priorityLift` set AND a hyp-leaning blend change accessory order. Update those expected orders; annotate `// lagging-first ordering (plan Task 4)`. All other cases bit-identical.

- [ ] **Step 7: Commit**

```bash
git add src/engine/accessories.js src/engine/accessories.test.js src/engine/generate.js src/engine/generate.test.js
git commit -m "feat(engine): lagging/priority-first accessory ordering for hypertrophy goals"
```

---

### Task 5: Lengthened-position hypertrophy emphasis (additive flag)

**Files:**
- Modify: `src/engine/accessories.js` (add `lengthenedNote`)
- Modify: `src/engine/generate.js` (attach flag to hyp-leaning accessories)
- Test: `src/engine/accessories.test.js`

**Interfaces:**
- Produces: `lengthenedNote(ex) -> string | null`. Returns a Korean note for stretch-biased accessory stems, else null. Additive field `lengthenedEmphasis` on accessories is non-breaking (ignored by existing tests).

- [ ] **Step 1: Write the failing test**

Add to `src/engine/accessories.test.js`:

```js
import { lengthenedNote } from './accessories.js'

describe('lengthenedNote', () => {
  it('tags a stretch-biased movement', () => {
    expect(lengthenedNote({ name: 'Romanian Deadlift' })).toMatch(/긴 근육 길이/)
  })
  it('returns null for a non-stretch movement', () => {
    expect(lengthenedNote({ name: 'Leg Extension' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/engine/accessories.test.js`
Expected: FAIL — `lengthenedNote` not exported.

- [ ] **Step 3: Implement lengthenedNote**

Append to `src/engine/accessories.js`:

```js
// Lengthened-position / lengthened-partial emphasis (B4, 중-강). Including the
// stretched range is the primary ROM consideration for hypertrophy. We tag
// accessories whose movement is biased toward long muscle length by name stem
// (no DB schema change). Selection specifics heuristic (근거 약함).
const LENGTHENED_RX = /romanian|rdl|stiff-leg|incline|overhead|deficit|split squat|bulgarian|lunge|pullover|preacher|seated|deep|stretch/i
export function lengthenedNote(ex) {
  return LENGTHENED_RX.test(ex?.name ?? '')
    ? '긴 근육 길이 강조 — 늘어난 구간(스트레치)에서 통제하면 근비대 자극↑ (lengthened-position)'
    : null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/engine/accessories.test.js`
Expected: PASS.

- [ ] **Step 5: Attach flag in generate (hyp-leaning only)**

In `src/engine/generate.js`, import `lengthenedNote`, and after `withAccessoryScheme(...)` returns `accessories`, map an additive field on when hyp-leaning:

```js
      const accessoriesTagged = goalBias >= 0
        ? accessories.map((a) => {
            const note = lengthenedNote(a)
            return note ? { ...a, lengthenedEmphasis: true, lengthenedNote: note } : a
          })
        : accessories
```

and use `accessoriesTagged` in the returned session object (`accessories: accessoriesTagged`).

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS (additive field; existing assertions don't inspect it). If any deep-equal accessory assertion fails, update it to include the additive field; annotate `// lengthenedEmphasis additive (plan Task 5)`.

- [ ] **Step 7: Commit**

```bash
git add src/engine/accessories.js src/engine/accessories.test.js src/engine/generate.js src/engine/generate.test.js
git commit -m "feat(engine): lengthened-position emphasis flag for hypertrophy accessories"
```

---

### Task 6: Variation block-stability + free-weight specificity guards

**Files:**
- Test: `src/engine/variations.test.js` (add cases; create if absent)

**Interfaces:** none new; locks existing deterministic behavior.

- [ ] **Step 1: Write the guard tests**

Add to `src/engine/variations.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { pick } from './variations.js'

const EQUIP = ['barbell', 'rack', 'bench', 'dumbbell', 'machine', 'cables']

describe('variation stability (systematic, not random — B7)', () => {
  it('same inputs → same variation (deterministic; no week churn)', () => {
    const a = pick('squat', 'none', { bar: 'low' }, EQUIP, true, [])
    const b = pick('squat', 'none', { bar: 'low' }, EQUIP, true, [])
    expect(a?.name).toBe(b?.name)
  })
})
```

- [ ] **Step 2: Run the test**

Run: `npm test -- src/engine/variations.test.js`
Expected: PASS (`pick` is pure and takes no week index → constant across the mesocycle, confirming systematic block-stable variation).

- [ ] **Step 3: Add free-weight specificity guard test**

Add to `src/engine/accessories.test.js` (free-weight preference biases free movements — B8, strength specificity):

```js
import { movementTypeOf } from './accessories.js'

describe('free-weight specificity (B8)', () => {
  it('classifies a machine accessory as machine, a barbell one as free', () => {
    expect(movementTypeOf({ name: 'Leg Press', equipment: ['machine'] })).toBe('machine')
    expect(movementTypeOf({ name: 'Barbell Row', equipment: ['barbell'] })).toBe('free')
  })
})
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/engine/accessories.test.js`
Expected: PASS (confirms `accessoryPreference: 'free'` can bias toward free movements via `prefBonus`).

- [ ] **Step 5: Commit**

```bash
git add src/engine/variations.test.js src/engine/accessories.test.js
git commit -m "test(engine): lock variation block-stability + free-weight specificity"
```

---

### Task 7: Periodization model-superiority honesty copy

**Files:**
- Modify: `src/ui/wizard/steps/StepPeriodization.jsx:18-25`
- Test: `src/ui/wizard/steps/StepPeriodization.test.jsx`

**Interfaces:** UI copy only. (The `phaseProfile` mechanic is deferred to Spec 2 — see Deviations.)

- [ ] **Step 1: Write the failing copy test**

Add to `src/ui/wizard/steps/StepPeriodization.test.jsx`:

```js
it('frames the hybrid as secondary to volume/intensity/proximity (no model-superiority claim)', () => {
  render(<StepPeriodization />)
  expect(screen.getByText(/볼륨·강도·실패 근접도/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/ui/wizard/steps/StepPeriodization.test.jsx`
Expected: FAIL — copy not present.

- [ ] **Step 3: Update the copy**

In `src/ui/wizard/steps/StepPeriodization.jsx`, add a sentence after the intro `<p>` (around line 19):

```jsx
      <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
        주기화 <em>모델</em> 선택(선형/비선형/블록)은 결과에 미치는 영향이 작습니다 —
        볼륨이 같으면 모델 간 차이는 거의 없습니다(메타분석). 실제 성과는
        <strong> 볼륨·강도·실패 근접도</strong>가 결정합니다.
      </p>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/ui/wizard/steps/StepPeriodization.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard/steps/StepPeriodization.jsx src/ui/wizard/steps/StepPeriodization.test.jsx
git commit -m "docs(ui): periodization model choice is secondary to volume/intensity/proximity"
```

---

### Task 8: Honest disclosure (LimitsPanel + PROJECT_STATUS §3)

**Files:**
- Modify: `src/ui/components/LimitsPanel.jsx`
- Modify: `docs/PROJECT_STATUS.md` (§3 limits)
- Test: `src/ui/components/LimitsPanel.test.jsx` (if it asserts bullet count/content)

**Interfaces:** none.

- [ ] **Step 1: Add LimitsPanel bullets**

In `src/ui/components/LimitsPanel.jsx`, add list items:

```jsx
<li>근비대 세트는 근력 세트보다 <strong>실패에 더 가깝게</strong> 처방합니다(목표 RPE 9 vs 8.5). 방향은 2024 메타분석 근거, 정확한 RPE 값은 추정치입니다(<strong>근거 약함</strong>).</li>
<li>훈련 <strong>빈도</strong>는 근력 향상에 독립적으로 기여하지만(메타분석), 근비대에는 같은 볼륨이면 영향이 작습니다(볼륨 분배 수단). 그래서 근력 위주 블렌드는 빈도를 한 세션 더 권장합니다(바이어스는 추정치).</li>
<li>주기화 <strong>모델</strong>(선형/비선형/블록) 선택은 볼륨이 같으면 결과 차이가 거의 없습니다 — 모델보다 볼륨·강도·실패 근접도가 중요합니다.</li>
<li>약점/우선 종목 보조운동을 세션 앞에 배치합니다(첫 운동이 적응 이득이 큼 — 컨센서스).</li>
<li>근비대 보조에 <strong>긴 근육 길이(스트레치) 강조</strong> 안내를 답니다(최근 근거, 종목 선정은 휴리스틱).</li>
```

- [ ] **Step 2: Add PROJECT_STATUS §3 bullets**

In `docs/PROJECT_STATUS.md` §3, append matching honest-limit bullets (proximity differentiation, frequency strength/hyp, model parity, lagging-first, lengthened emphasis) with 강/중/약 tiers.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS. If `LimitsPanel.test.jsx` asserts a bullet count, update it.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/LimitsPanel.jsx src/ui/components/LimitsPanel.test.jsx docs/PROJECT_STATUS.md
git commit -m "docs: honest disclosure for programming-fundamentals refresh"
```

---

## Self-Review

**Spec coverage:**
- B3 proximity → Task 1 (hypertrophy-only per Deviation 1). ✓
- B2 frequency → Task 2. ✓
- B1 volume diminishing → Task 3. ✓
- B6 lagging-first → Task 4. ✓
- B4 lengthened → Task 5. ✓
- B7 variation + B8 free-weight → Task 6. ✓
- C1 model honesty → Task 7. ✓ | C2 phase mechanic → deferred to Spec 2 (Deviation 2). ✓
- Honest disclosure → Task 8. ✓

**Placeholder scan:** none — every step has exact code/commands/expected output.

**Type consistency:** `recommendedFrequency(blend, daysPerWeek)`, `orderByPriority(accessories, { priorityLift, goalBias })`, `lengthenedNote(ex)`, `movementTypeOf(ex)` used consistently across tasks and matching existing signatures in source.

## Notes on bit-identity
- Task 1 is the only intentional break (hypertrophy loads). Goldens re-baselined + annotated.
- Tasks 2 & 4 change output only for specific gated cases (strength default-frequency; priority-lift + hyp blend). Tasks 3, 5, 6 are additive/test-only. Task 7 is UI copy. Task 8 is docs/UI copy.
