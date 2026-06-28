# Individualization Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Checkbox steps.

**Goal:** Add an advisory analytics layer (e1RM band, monotony/strain, Banister fitness-fatigue peak prediction, ACWR) computed from the user's performance log, displayed with honest caveats. Entirely additive — generated plans stay byte-identical.

**Architecture:** One pure engine module `src/engine/analytics.js` (all metrics) + a presentational `InsightsPanel` wired into RoutineView. No plan-generation changes.

**Tech Stack:** JavaScript (ES modules), Vitest, React/jsdom.

## Global Constraints
- Pure & deterministic: no `Date`, no `Math.random`. kg internal.
- **Additive only:** no change to plan generation; all existing engine goldens must stay unchanged.
- Evidence tiers: monotony/strain Foster 중 (RT proxy 약함); fitness-fatigue Banister (params 약함); ACWR contested/약함 (illustrative, never a gate); e1RM band ±20% advisory.
- Spec (contains the full helper code, verbatim): `docs/superpowers/specs/2026-06-29-individualization-analytics-design.md`.
- `npm test` (full) green before each commit.

---

### Task 1: analytics.js (all pure helpers) + tests

**Files:** Create `src/engine/analytics.js` (transcribe Fix 1, 2, 3 code blocks from the spec VERBATIM — `e1rmBand`, `acwr`, `dailyLoads`, `trainingMonotony`, `trainingStrain`, `fitnessFatigue`, `predictPeakDay`). Create `src/engine/analytics.test.js`.

- [ ] **Step 1: Write the failing tests** — `src/engine/analytics.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { e1rmBand, acwr, dailyLoads, trainingMonotony, trainingStrain, fitnessFatigue, predictPeakDay } from './analytics.js'

describe('e1rmBand', () => {
  it('±20% band around point', () => {
    expect(e1rmBand(200)).toEqual({ low: 160, point: 200, high: 240 })
  })
  it('null on bad input', () => {
    expect(e1rmBand(0)).toBeNull(); expect(e1rmBand(NaN)).toBeNull()
  })
})

describe('dailyLoads', () => {
  it('groups by (week,day), sums rpe*reps, ordered', () => {
    const log = [
      { week: 1, day: 1, rpe: 8, reps: 3 },   // 24
      { week: 1, day: 1, rpe: 8, reps: 5 },   // +40 = 64
      { week: 1, day: 2, rpe: 9, reps: 2 },   // 18
    ]
    expect(dailyLoads(log)).toEqual([64, 18])
  })
  it('non-finite rpe/reps contribute 0', () => {
    expect(dailyLoads([{ week: 1, day: 1, rpe: null, reps: 5 }])).toEqual([0])
  })
})

describe('trainingMonotony / strain', () => {
  it('mean/SD; null when <2 or SD 0', () => {
    expect(trainingMonotony([10])).toBeNull()
    expect(trainingMonotony([10, 10, 10])).toBeNull() // SD 0
    const m = trainingMonotony([10, 20])  // mean 15, popSD 5 → 3.0
    expect(m).toBeCloseTo(3, 5)
  })
  it('strain = total × monotony', () => {
    expect(trainingStrain([10, 20])).toBeCloseTo(30 * 3, 5)
    expect(trainingStrain([10, 10, 10])).toBeNull()
  })
})

describe('fitnessFatigue', () => {
  it('accumulates and decays; performance = k1*fit - k2*fat', () => {
    const { fitness, fatigue, performance } = fitnessFatigue([100], { tau1: 42, tau2: 7, k1: 1, k2: 2 })
    expect(fitness[0]).toBeCloseTo(100, 5)
    expect(fatigue[0]).toBeCloseTo(100, 5)
    expect(performance[0]).toBeCloseTo(1 * 100 - 2 * 100, 5) // -100
  })
  it('fatigue decays faster than fitness after load stops', () => {
    const { fitness, fatigue } = fitnessFatigue([100, 0, 0, 0, 0, 0, 0, 0])
    // after a week of zero load, fatigue (tau2=7) has decayed more than fitness (tau1=42)
    expect(fatigue[7] / fatigue[0]).toBeLessThan(fitness[7] / fitness[0])
  })
})

describe('predictPeakDay', () => {
  it('a fatigued series peaks after some zero-load taper (offset > 0)', () => {
    const loads = Array.from({ length: 14 }, () => 100) // heavy block
    const offset = predictPeakDay(loads, { horizon: 28 })
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThanOrEqual(28)
  })
  it('null on empty', () => expect(predictPeakDay([])).toBeNull())
})

describe('acwr', () => {
  it('null when fewer than chronic days', () => {
    expect(acwr(Array.from({ length: 10 }, () => 50))).toBeNull()
  })
  it('ratio of acute mean to chronic mean', () => {
    const loads = Array.from({ length: 28 }, () => 50)
    expect(acwr(loads)).toBeCloseTo(1, 5)
  })
})
```

- [ ] **Step 2: Run → FAIL** `npm test -- src/engine/analytics.test.js` (module missing).

- [ ] **Step 3: Implement** — create `src/engine/analytics.js`, transcribing the `e1rmBand`, `acwr` (Fix 1), `dailyLoads`, `trainingMonotony`, `trainingStrain` (Fix 2), `fitnessFatigue`, `predictPeakDay` (Fix 3) functions from the spec verbatim (with their doc comments).

- [ ] **Step 4: Run → PASS** the file, then `npm test` (full — additive module, nothing else affected).

- [ ] **Step 5: Commit** `git add src/engine/analytics.js src/engine/analytics.test.js && git commit -m "feat(engine): individualization analytics (band, monotony/strain, fitness-fatigue, ACWR)"`

---

### Task 2: InsightsPanel + wire into RoutineView

**Files:** Create `src/ui/components/InsightsPanel.jsx` + `src/ui/components/InsightsPanel.test.jsx`. Modify `src/ui/components/RoutineView.jsx` to render it. Maybe `src/ui/i18n.js` for labels.

**Context:** RoutineView already receives the performance log (it renders LiftLogRow). Read RoutineView.jsx first to find the log prop/source and the effective e1RM per lift. InsightsPanel takes the log + the per-lift e1RM map and renders metrics via `analytics.js`.

- [ ] **Step 1: Write the failing test** — `src/ui/components/InsightsPanel.test.jsx`:
```js
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InsightsPanel from './InsightsPanel.jsx'

const log = Array.from({ length: 28 }, (_, i) => ({ lift: 'squat', week: Math.floor(i / 3) + 1, day: (i % 3) + 1, weight: 150, reps: 3, rpe: 8 }))

describe('InsightsPanel', () => {
  it('renders e1RM band and peak prediction when log present', () => {
    render(<InsightsPanel log={log} e1rm={{ squat: 200, bench: 140, deadlift: 240 }} />)
    expect(screen.getByText(/일일.*변동|±20/)).toBeInTheDocument()
    expect(screen.getByText(/피크|테이퍼/)).toBeInTheDocument()
  })
  it('renders nothing when log empty', () => {
    const { container } = render(<InsightsPanel log={[]} e1rm={{ squat: 200 }} />)
    expect(container.textContent).toBe('')
  })
})
```

- [ ] **Step 2: Run → FAIL** `npm test -- src/ui/components/InsightsPanel.test.jsx`.

- [ ] **Step 3: Implement InsightsPanel** — returns `null` when `!log?.length`. Otherwise compute `dailyLoads(log)` once, then render: e1RM band per lift (`e1rmBand`), monotony/strain (with a warning row when monotony > 2), `predictPeakDay` ("약 N일 테이퍼 시 기량 피크 예측" + `근거 약함` caption), and `acwr` only when non-null (with the "참고용 — 신뢰성 논란" caveat). Footer caveat: "오토레귤레이션·예측은 개인차가 크며 보조 지표입니다." Pure presentational; no store writes. Match the existing component/JSX/i18n style (read a sibling like LimitsPanel.jsx).

- [ ] **Step 4: Wire into RoutineView** — render `<InsightsPanel log={<the log RoutineView already has>} e1rm={<the per-lift e1RM map RoutineView has>} />` in an appropriate section. If RoutineView lacks the e1RM map directly, derive it from the plan or the props it already receives (read the file; do NOT add new store plumbing — use what's there). Keep it additive.

- [ ] **Step 5: Run → PASS** the panel test; then `npm test` (full). If a RoutineView snapshot/text test changes due to the added panel, update it minimally (additive section) and annotate `// InsightsPanel (S3 Task 2)` — do not weaken assertions.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(ui): InsightsPanel advisory analytics in RoutineView"`

---

### Task 3: Honest disclosure

**Files:** `src/ui/components/LimitsPanel.jsx`, `docs/PROJECT_STATUS.md` (§3 + §4 roadmap). Test: `LimitsPanel.test.jsx` if it asserts counts.

- [ ] **Step 1: Add bullets** — LimitsPanel `<li>`s:
```jsx
<li>e1RM은 하루에도 약 <strong>±20%</strong> 변동할 수 있어 추정 1RM을 <strong>범위(밴드)</strong>로 함께 표시합니다(처방 부하는 바뀌지 않는 보조 표시).</li>
<li><strong>단조로움(monotony)·strain</strong> 지표로 과훈련 경향을 모니터합니다(Foster — 방향 <strong>근거 중</strong>, RPE×반복 부하 프록시는 <strong>근거 약함</strong>).</li>
<li><strong>예상 피크 시점</strong>은 Fitness-Fatigue 모델(Banister)로 추정합니다 — 모델 방향은 확립됐으나 개인 파라미터는 <strong>근거 약함</strong>인 보조 지표입니다.</li>
<li><strong>ACWR</strong>(급성:만성 부하비)는 <strong>신뢰성 논란</strong>이 있어 참고용으로만 표시하며 기준(게이트)으로 쓰지 않습니다(<strong>근거 약함</strong>).</li>
```

- [ ] **Step 2: PROJECT_STATUS** — append matching §3 bullets; in §4 note "진행 추적 / 사이클 간 진전" partially addressed (analytics layer: band, monotony/strain, fitness-fatigue peak, ACWR).

- [ ] **Step 3: Run** `npm test` (full); update LimitsPanel.test.jsx if it asserts a bullet count.

- [ ] **Step 4: Commit** `git commit -am "docs: honest disclosure for individualization analytics"`

---

## Self-Review
- analytics helpers → Task 1; panel + wiring → Task 2; disclosure → Task 3. ✓
- No placeholders: helper code is in the spec verbatim; Task 1 tests are complete; Task 2 gives the panel contract + test. Task 2 wiring depends on the live RoutineView (implementer reads it; "use existing props, no new store plumbing" gate keeps it additive).
- Types: analytics signatures match the spec; `InsightsPanel({ log, e1rm })` consistent across Task 2.

## Bit-identity
Entire spec additive. Task 1 = new module. Task 2 = new panel + a render call in RoutineView (no generation change). Task 3 = docs/copy. No engine plan goldens change.
