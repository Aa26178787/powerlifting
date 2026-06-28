# Long Mesocycles & Block Periodization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Allow mesocycles up to 24 weeks with automatic block periodization (intra-cycle deloads + per-block ramp reset) and a Bosquet realization taper for peaking plans.

**Architecture:** Pure deterministic engine. A new pure `planLayout` helper describes the mesocycle shape; `generate.js` iterates it, building working weeks with block-relative ramps and inserting deloads. A deload realization variant holds intensity for peaking plans.

**Tech Stack:** JavaScript (ES modules), Vitest, React/jsdom.

## Global Constraints
- Pure & deterministic: no `Date`, no `Math.random`. kg internal.
- **Bit-identity:** `mesoWeeks ≤ 8` non-peaking plans must stay byte-for-byte identical. Intra-cycle deloads fire only for `mesoWeeks > 8`. Realization week changes only peaking plans.
- `BLOCK_LEN = 6` (work weeks per block). Deload cadence + 0.4 realization volume factor are heuristics (`근거 약함`); Bosquet direction (hold intensity, cut volume) is `근거 강`.
- Every new coefficient surfaced in LimitsPanel + PROJECT_STATUS §3.
- Spec: `docs/superpowers/specs/2026-06-29-long-mesocycle-block-periodization-design.md`.
- Run `npm test` (full) green before each commit.

---

### Task 1: mesoWeeks cap 8 → 24

**Files:** Modify `src/ui/wizard/steps/StepPeriodization.jsx` (input max + onBlur), `src/engine/generate.js:91`. Test: `src/ui/wizard/steps/StepPeriodization.test.jsx`.

- [ ] **Step 1: Failing clamp test** — in `StepPeriodization.test.jsx`, add:
```js
it('clamps mesoWeeks above 24 to 24 on blur', () => {
  render(<StepPeriodization />)
  const input = screen.getByLabelText(/운동 주차/)
  fireEvent.change(input, { target: { value: '25' } })
  fireEvent.blur(input)
  expect(useProfileStore.getState().profile.mesoWeeks).toBe(24)
})
```
(Match the existing test file's imports/render pattern — read it first.)

- [ ] **Step 2: Run → FAIL** `npm test -- src/ui/wizard/steps/StepPeriodization.test.jsx` (clamps to 8, not 24).

- [ ] **Step 3: Change the cap** — `StepPeriodization.jsx`: input `max={24}`; onBlur `const clamped = Math.max(3, Math.min(24, Number(e.target.value) || 4))`. `generate.js:91`: `const mesoWeeks = Math.max(3, Math.min(24, profile.mesoWeeks ?? 4))`.

- [ ] **Step 4: Run → PASS** the step test, then `npm test` (full) — existing 3–8 plans unaffected.

- [ ] **Step 5: Commit** `git commit -am "feat(ui): allow mesocycles up to 24 weeks"`

---

### Task 2: planLayout helper

**Files:** Create `src/engine/planLayout.js`. Test: `src/engine/planLayout.test.js`.

**Interfaces — Produces:**
`planLayout(mesoWeeks, deloadEnabled) -> Array<{ kind:'work'|'deload', block:number, blockWeek:number, blockLen:number }>`. `deload` entries carry the `block`/`blockLen` of the block they follow and `blockWeek = blockLen`.

- [ ] **Step 1: Failing tests** — `src/engine/planLayout.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { planLayout, BLOCK_LEN } from './planLayout.js'

describe('planLayout', () => {
  it('<=8 weeks: one block of work weeks + one trailing deload (current shape)', () => {
    const l = planLayout(4, true)
    expect(l.map((e) => e.kind)).toEqual(['work','work','work','work','deload'])
    expect(l.slice(0,4).every((e) => e.block === 0 && e.blockLen === 4)).toBe(true)
    expect(l.map((e) => e.blockWeek)).toEqual([0,1,2,3,4])
  })
  it('<=8 weeks, deload disabled: no deload entry', () => {
    expect(planLayout(5, false).map((e) => e.kind)).toEqual(['work','work','work','work','work'])
  })
  it('>8 weeks: deload inserted after every block of BLOCK_LEN', () => {
    const l = planLayout(12, true) // 6 work + deload + 6 work + deload
    expect(l.map((e) => e.kind)).toEqual([
      'work','work','work','work','work','work','deload',
      'work','work','work','work','work','work','deload',
    ])
    expect(l[7].block).toBe(1)
    expect(l[7].blockWeek).toBe(0)
    expect(l[7].blockLen).toBe(6)
  })
  it('>8 weeks, uneven remainder: last block holds the remainder', () => {
    const l = planLayout(9, true) // 6 work + deload + 3 work + deload
    expect(l.map((e) => e.kind)).toEqual([
      'work','work','work','work','work','work','deload',
      'work','work','work','deload',
    ])
    expect(l.slice(7,10).every((e) => e.block === 1 && e.blockLen === 3)).toBe(true)
  })
  it('BLOCK_LEN is 6', () => expect(BLOCK_LEN).toBe(6))
})
```

- [ ] **Step 2: Run → FAIL** `npm test -- src/engine/planLayout.test.js` (module missing).

- [ ] **Step 3: Implement** — `src/engine/planLayout.js`:
```js
// Mesocycle shape. <=8 weeks → a single block (bit-identical to the legacy
// "n work weeks + one trailing deload" shape). >8 weeks → block periodization:
// work weeks split into blocks of <= BLOCK_LEN, a deload after each block when
// enabled, so a long plan recovers every ~6 weeks. Pure/deterministic.
// Cadence is a consensus heuristic (근거 약함).
export const BLOCK_LEN = 6

export function planLayout(mesoWeeks, deloadEnabled) {
  const out = []
  if (mesoWeeks <= 8) {
    for (let w = 0; w < mesoWeeks; w++) out.push({ kind: 'work', block: 0, blockWeek: w, blockLen: mesoWeeks })
    if (deloadEnabled) out.push({ kind: 'deload', block: 0, blockWeek: mesoWeeks, blockLen: mesoWeeks })
    return out
  }
  let remaining = mesoWeeks
  let block = 0
  while (remaining > 0) {
    const blockLen = Math.min(BLOCK_LEN, remaining)
    for (let w = 0; w < blockLen; w++) out.push({ kind: 'work', block, blockWeek: w, blockLen })
    if (deloadEnabled) out.push({ kind: 'deload', block, blockWeek: blockLen, blockLen })
    remaining -= blockLen
    block += 1
  }
  return out
}
```

- [ ] **Step 4: Run → PASS** the file, then `npm test` (full).

- [ ] **Step 5: Commit** `git add src/engine/planLayout.js src/engine/planLayout.test.js && git commit -m "feat(engine): planLayout block-periodization shape helper"`

---

### Task 3: Wire planLayout + per-block ramp reset into generate/periodization

**Files:** Modify `src/engine/generate.js` (week assembly ~145-146 + the `weeks` map), `src/engine/periodization.js` (`buildWorkingWeeks` → support building a single block with block-relative ramp). Tests: `src/engine/periodization.test.js`, `src/engine/generate.test.js`.

**Context for the implementer:** Currently `generate.js:145-146`:
```js
const working = buildWorkingWeeks(layout, ctx, mesoWeeks)
const allWeeks = deloadEnabled ? [...working, buildDeloadWeek(working[working.length - 1], ctx)] : working
```
and `periodization.js buildWorkingWeeks(layout, ctx, totalWeeks)` loops `w=0..totalWeeks-1`, setting `ctx.weekIndex=w` and using `volumeRamp(w,totalWeeks,mode)`/`loadRamp(w,totalWeeks)`. `phaseFor` is called in `generate.js:170` with `(wk.index-1, mesoWeeks, peaking)` — keep phase whole-mesocycle.

**Approach:** Drive week building from `planLayout(mesoWeeks, deloadEnabled)`. For each `work` entry build a working week with **block-relative** ramp (`weekIndex=blockWeek`, `totalWeeks=blockLen`); for each `deload` entry build `buildDeloadWeek` from the previous working week. The resulting `weeks` keep a continuous 1-based `index` for `phaseFor`.

- [ ] **Step 1: Failing test (sawtooth)** — `periodization.test.js`: build a 12-week plan and assert the load ramp resets at the block boundary (week 7's top-set load ≈ week 1's, both below week 6's). Use the existing test's profile/builder pattern. Example assertion shape:
```js
it('12-week plan resets load ramp each block (sawtooth)', () => {
  const plan = generate({ ...profile, mesoWeeks: 12, deloadEnabled: true })
  const top = (wk) => plan.weeks[wk].sessions[0].exercises[0].scheme.sets[0].weight
  const w1 = plan.weeks.findIndex((w) => !w.isDeload)            // first work week
  // first work week of block 2 (the work week immediately after the first deload)
  const firstDeload = plan.weeks.findIndex((w) => w.isDeload)
  const blk2 = firstDeload + 1
  expect(top(blk2)).toBeCloseTo(top(w1), 1)  // block-relative ramp reset
})
```
(Adapt indices/fields to the real plan shape; the point is block-2 week-1 load == block-1 week-1 load.)

- [ ] **Step 2: Run → FAIL** (currently ramp is monotonic over 12 weeks).

- [ ] **Step 3: Refactor periodization to build one block** — add an exported `buildBlockWeek(layout, ctx, blockWeek, blockLen, weekNumber)` (or generalize `buildWorkingWeeks`) that builds ONE working week using `ctx.weekIndex = blockWeek` and ramps over `blockLen`, returning `{ index: weekNumber, isDeload:false, sessions }`. Keep the existing `buildWorkingWeeks(layout, ctx, totalWeeks)` behavior intact for the ≤8 single-block path (it can delegate to the new builder with `blockWeek=w, blockLen=totalWeeks` — verify bit-identical).

- [ ] **Step 4: Drive generate from planLayout** — replace `generate.js:145-146` with iteration over `planLayout(mesoWeeks, deloadEnabled)`: maintain a running 1-based `weekNumber`; for `work` build a block week (track `lastWorking`); for `deload` push `buildDeloadWeek(lastWorking, ctx)` with continuous index. Then the existing `weeks = allWeeks.map(...)` accessory/phase pass continues to use `phaseFor(wk.index-1, mesoWeeks, peaking)` — but note `mesoWeeks` here is total WORK weeks; pass the total plan length consistently with the current meaning (phase over the working-week count). Confirm ≤8 output byte-identical.

- [ ] **Step 5: Run → PASS** sawtooth test; then `npm test` (full). Re-baseline only if a >8 case (none exist yet) — ≤8 goldens MUST be unchanged. If any ≤8 golden changes, STOP: the single-block delegation is not bit-identical — fix before proceeding.

- [ ] **Step 6: Commit** `git commit -am "feat(engine): block-relative ramp + planLayout-driven week assembly"`

---

### Task 4: Bosquet realization deload for peaking plans

**Files:** Modify `src/engine/deload.js`, `src/engine/generate.js` (trailing-deload call). Test: `src/engine/deload.test.js`.

**Interfaces:** `buildDeloadWeek(workingWeek, ctx, opts?)` where `opts.realization === true` holds intensity (keep each exercise's `weight`/`rpeTarget`/scheme set loads) and cuts volume to `Math.max(1, Math.round(sets * 0.4))`. Default (no opts) = current RPE-6 recovery behavior (bit-identical).

- [ ] **Step 1: Failing tests** — `deload.test.js`:
```js
it('realization holds intensity and cuts volume ~0.4', () => {
  const wk = { index: 4, sessions: [{ day: 1, exercises: [
    { lift: 'Squat', baseLift: 'squat', repAnchor: 3, rpeTarget: 8.5, sets: 5,
      scheme: { type:'straight', sets:[{weight:200,reps:3,rpe:8.5}] }, weight: 200 } ] }] }
  const out = buildDeloadWeek(wk, { e1rm: { squat: 230 } }, { realization: true })
  const ex = out.sessions[0].exercises[0]
  expect(ex.rpeTarget).toBe(8.5)            // intensity held (not 6)
  expect(ex.weight).toBe(200)               // load held
  expect(ex.sets).toBe(2)                    // round(5*0.4)=2 volume cut
})
it('default deload still drops to RPE 6 (recovery, unchanged)', () => {
  const wk = { index: 4, sessions: [{ day: 1, exercises: [
    { lift: 'Squat', baseLift: 'squat', repAnchor: 3, sets: 5 } ] }] }
  const out = buildDeloadWeek(wk, { e1rm: { squat: 230 } })
  expect(out.sessions[0].exercises[0].rpeTarget).toBe(6)
})
```

- [ ] **Step 2: Run → FAIL** (realization not supported).

- [ ] **Step 3: Implement** — `deload.js`: add `opts = {}` param. When `opts.realization`, for each exercise keep its existing `weight`, `rpeTarget`, and scheme set weights/reps/rpe, but slice the set count to `Math.max(1, Math.round(ex.sets * 0.4))` (build the scheme.sets array from the held values). Otherwise current behavior. Keep it pure.

- [ ] **Step 4: Wire in generate** — the trailing deload uses `{ realization: true }` ONLY when `peaking`. Intra-cycle deloads (Task 3) stay recovery-style. `generate.js`: `buildDeloadWeek(lastWorking, ctx, peaking ? { realization: true } : undefined)` for the trailing deload.

- [ ] **Step 5: Run → PASS** deload tests; `npm test` (full). Peaking-plan goldens that include the trailing deload week change — re-baseline + annotate `// Bosquet realization (plan Task 4)`. Non-peaking unchanged.

- [ ] **Step 6: Commit** `git commit -am "feat(engine): Bosquet realization taper for peaking deload (hold intensity, cut volume)"`

---

### Task 5: Honest disclosure + roadmap

**Files:** `src/ui/components/LimitsPanel.jsx`, `docs/PROJECT_STATUS.md` (§3 + §4 mark Spec 2 done). Test: `src/ui/components/LimitsPanel.test.jsx` if it asserts counts.

- [ ] **Step 1: Add bullets** — LimitsPanel `<li>`s:
```jsx
<li>16~24주 장기 플랜은 <strong>블록 주기화</strong>로 약 6주마다 디로드를 자동 삽입하고 블록마다 부하 램프를 리셋합니다(주기 6주 = 컨센서스 <strong>근거 약함</strong>).</li>
<li>대회(피킹) 플랜의 마지막 주는 <strong>realization 테이퍼</strong> — 강도는 유지하고 볼륨만 ~40% 줄입니다(방향 <strong>근거 강</strong>: Bosquet 메타 / 정확 계수 <strong>근거 약함</strong>). 비대회 플랜의 디로드는 회복형(RPE 6) 유지.</li>
```

- [ ] **Step 2: PROJECT_STATUS** — append matching §3 bullets; in §4 roadmap mark the 24-week/block-periodization item done (it was listed under 중기 / implied).

- [ ] **Step 3: Run** `npm test` (full); update LimitsPanel.test.jsx if it asserts a bullet count.

- [ ] **Step 4: Commit** `git commit -am "docs: honest disclosure for long mesocycles + block periodization"`

---

## Self-Review
- Fix 1 (cap) → Task 1. Fix 2 (planLayout) → Task 2. Fix 3 (block ramp wiring) → Task 3. Fix 4 (Bosquet realization) → Task 4. Fix 5 (disclosure) → Task 5. ✓
- No placeholders: planLayout + deload code complete; Task 3 is a refactor with concrete structural steps + a sawtooth acceptance test (full code not pre-writable without the live file — implementer reads it; the delegation-must-be-bit-identical gate at Step 5 is the safety net).
- Types: `planLayout(mesoWeeks, deloadEnabled)`, `buildDeloadWeek(workingWeek, ctx, opts?)` consistent across tasks.

## Bit-identity notes
- Tasks 1, 2 additive/ceiling-raising. Task 3 must keep ≤8 byte-identical (Step 5 gate). Task 4 changes only peaking trailing deload. Task 5 docs/copy.
