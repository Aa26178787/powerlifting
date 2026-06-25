# v3 SP3 — Daily Readiness Autoregulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Per-session daily check-in → adjusts that session's loads/volume + handles painful regions; plus an overreaching monitor.

**Architecture:** Pure engine `readiness.js` (scores), `applyReadiness.js` (adjust a built session), `overreaching.js` (trend monitor). Store gains a `checkinLog`. UI: inline `CheckinPanel` per session in RoutineView; adjusted session replaces the base display; overreaching banner. Spec: `docs/superpowers/specs/2026-06-26-v3-sp3-readiness-design.md`.

**Tech Stack:** Vite + React 18, zustand, Vitest (+jsdom).

## Global Constraints
- Pure deterministic engine (no Date.now/Math.random/I/O). Log entries carry caller `week`/`day` indices, never timestamps.
- Korean display; engine values English. Weights via `roundToIncrement`.
- Component tests: line 1 `// @vitest-environment jsdom`.
- Persist `merge` keeps `checkinLog`; no version bump.
- Full suite green at the final task.

---

### Task 1: readiness.js — scores

**Files:** Create `src/engine/readiness.js`, `src/engine/readiness.test.js`

**Interfaces:** Produces `readinessScore(checkin)->0..1`, `loadFactor(readiness,quality)->number`, `setsToDrop(readiness)->0|1|2`, `QUALITY_SENSITIVITY`.

- [ ] **Step 1: Failing test**
```js
import { describe, it, expect } from 'vitest'
import { readinessScore, loadFactor, setsToDrop } from './readiness.js'
describe('readiness scores', () => {
  it('full readiness for great sleep/low stress/low fatigue', () => {
    expect(readinessScore({ sleepHours: 8, stress: 1, systemicFatigue: 1 })).toBe(1)
  })
  it('low readiness for poor inputs', () => {
    expect(readinessScore({ sleepHours: 4, stress: 5, systemicFatigue: 5 })).toBe(0)
  })
  it('mid readiness is between', () => {
    const r = readinessScore({ sleepHours: 6, stress: 3, systemicFatigue: 3 })
    expect(r).toBeGreaterThan(0); expect(r).toBeLessThan(1)
  })
  it('loadFactor: power most sensitive, 1.0 at full readiness', () => {
    expect(loadFactor(1, 'power')).toBe(1)
    expect(loadFactor(0, 'power')).toBeLessThan(loadFactor(0, 'strength'))
    expect(loadFactor(0, 'strength')).toBeLessThan(loadFactor(0, 'endurance'))
  })
  it('setsToDrop steps with readiness', () => {
    expect(setsToDrop(0.8)).toBe(0); expect(setsToDrop(0.4)).toBe(1); expect(setsToDrop(0.2)).toBe(2)
  })
})
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (transcribe):
```js
function clamp01(x) { return Math.max(0, Math.min(1, x)) }
function round2(x) { return Math.round(x * 100) / 100 }

export const QUALITY_SENSITIVITY = { power: 1.5, strength: 1.0, hypertrophy: 0.7, endurance: 0.5 }

export function readinessScore(checkin) {
  const sleep = clamp01((checkin.sleepHours - 4) / 4)
  const stress = clamp01((5 - checkin.stress) / 4)
  const fatigue = clamp01((5 - checkin.systemicFatigue) / 4)
  return round2((sleep + stress + fatigue) / 3)
}
export function loadFactor(readiness, quality) {
  return round2(1 - (1 - readiness) * 0.10 * (QUALITY_SENSITIVITY[quality] ?? 1))
}
export function setsToDrop(readiness) {
  if (readiness < 0.3) return 2
  if (readiness < 0.5) return 1
  return 0
}
```
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(engine): readiness scoring`

---

### Task 2: overreaching.js — trend monitor

**Files:** Create `src/engine/overreaching.js`, `src/engine/overreaching.test.js`

**Interfaces:** `detectOverreaching(log)->{flag, reason?}`. `log` = array of `{week,day,readiness}`.

- [ ] **Step 1: Failing test**
```js
import { describe, it, expect } from 'vitest'
import { detectOverreaching } from './overreaching.js'
describe('detectOverreaching', () => {
  it('no flag under 3 entries', () => {
    expect(detectOverreaching([{ readiness: 0.2 }, { readiness: 0.1 }]).flag).toBe(false)
  })
  it('flags 3 consecutive declining + all <0.5', () => {
    expect(detectOverreaching([{ readiness: 0.49 }, { readiness: 0.4 }, { readiness: 0.3 }]).flag).toBe(true)
  })
  it('flags persistently very low', () => {
    expect(detectOverreaching([{ readiness: 0.3 }, { readiness: 0.34 }, { readiness: 0.2 }]).flag).toBe(true)
  })
  it('no flag when healthy', () => {
    expect(detectOverreaching([{ readiness: 0.9 }, { readiness: 0.8 }, { readiness: 0.85 }]).flag).toBe(false)
  })
})
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**:
```js
export function detectOverreaching(log) {
  if (!Array.isArray(log) || log.length < 3) return { flag: false }
  const r = log.slice(-3).map((e) => e.readiness)
  if (r[0] > r[1] && r[1] > r[2] && r.every((x) => x < 0.5)) {
    return { flag: true, reason: 'readiness 3회 연속 하락 (과피로 의심)' }
  }
  if (r.every((x) => x < 0.35)) {
    return { flag: true, reason: 'readiness 지속 매우 낮음 — 디로드 권장' }
  }
  return { flag: false }
}
```
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(engine): overreaching trend monitor`

---

### Task 3: applyReadiness.js — adjust a built session

**Files:** Create `src/engine/applyReadiness.js`, `src/engine/applyReadiness.test.js`

**Interfaces:** Consumes `readiness.js`, `byName`/`allEquipment` (exercises.js), `regionMaxStatus` (regionStatus.js), `pick` (variations.js), `roundToIncrement` (e1rm.js). Produces `applyReadiness(session, checkin) -> { session, readiness, notes }`.

- [ ] **Step 1: Failing test**
```js
import { describe, it, expect } from 'vitest'
import { applyReadiness } from './applyReadiness.js'

const mk = (over = {}) => ({
  day: 1,
  exercises: [{
    lift: 'Back Squat (High Bar)', baseLift: 'squat', quality: 'strength',
    scheme: { type: 'topSetBackoff', evidenceTier: 'consensus', sets: [
      { weight: 160, reps: 3, rpe: 9 }, { weight: 140, reps: 5 }, { weight: 140, reps: 5 },
    ] }, sets: 3,
  }],
  accessories: [{ name: 'leg press', quality: 'hypertrophy', scheme: { type: 'straight', evidenceTier: 'rct', sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] } }],
  notes: [],
  ...over,
})

describe('applyReadiness', () => {
  it('high readiness leaves loads ~unchanged and keeps all sets', () => {
    const out = applyReadiness(mk(), { sleepHours: 8, stress: 1, systemicFatigue: 1, regionStatus: {} })
    expect(out.readiness).toBe(1)
    expect(out.session.exercises[0].scheme.sets).toHaveLength(3)
    expect(out.session.exercises[0].scheme.sets[0].weight).toBe(160)
  })
  it('low readiness cuts load and trims sets', () => {
    const out = applyReadiness(mk(), { sleepHours: 4, stress: 5, systemicFatigue: 5, regionStatus: {} })
    expect(out.readiness).toBe(0)
    const sets = out.session.exercises[0].scheme.sets
    expect(sets.length).toBeLessThan(3)             // setsToDrop(0)=2 → 1 set
    expect(sets[0].weight).toBeLessThan(160)        // strength loadFactor 0.90
  })
  it('region status 3 drops the exercise with a note', () => {
    const out = applyReadiness(mk(), { sleepHours: 7, stress: 2, systemicFatigue: 2, regionStatus: { knee: 3 } })
    // Back Squat (High Bar) stresses knee → dropped
    expect(out.session.exercises.find((e) => e.baseLift === 'squat')).toBeFalsy()
    expect(out.notes.join(' ')).toMatch(/제외/)
  })
  it('accessory sets are trimmed but not weight-scaled (no weight field)', () => {
    const out = applyReadiness(mk(), { sleepHours: 4, stress: 5, systemicFatigue: 5, regionStatus: {} })
    const acc = out.session.accessories[0]
    expect(acc.scheme.sets.length).toBeLessThan(3)
    expect(acc.scheme.sets[0].weight).toBeUndefined()
  })
})
```
(Verify the chosen `lift` actually stresses `knee` in the DB; if `Back Squat (High Bar)` does not, pick a squat variation/exercise name whose `stress` includes `knee`, e.g. confirm via `byName`. Adjust the fixture name so the status-3 test is real.)

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**:
```js
import { byName, allEquipment } from './exercises.js'
import { roundToIncrement } from './e1rm.js'
import { regionMaxStatus } from './regionStatus.js'
import { pick } from './variations.js'
import { readinessScore, loadFactor, setsToDrop } from './readiness.js'

function trimSets(sets, drop) {
  if (drop <= 0 || sets.length <= 1) return sets
  return sets.slice(0, Math.max(1, sets.length - drop))
}

export function applyReadiness(session, checkin) {
  const readiness = readinessScore(checkin)
  const rs = checkin.regionStatus ?? {}
  const drop = setsToDrop(readiness)
  const notes = [...(session.notes ?? [])]

  const exercises = []
  for (const ex of session.exercises) {
    const row = byName(ex.lift)
    const status = row ? regionMaxStatus(row, rs) : 0
    if (status === 3) { notes.push(`${ex.baseLift} 오늘 통증으로 제외`); continue }
    let lift = ex.lift, rescale = 1
    if (status === 2) {
      const cand = pick(ex.baseLift, 'none', {}, allEquipment(), true, [])
      if (cand && regionMaxStatus(cand, rs) < 2 && cand.name !== ex.lift) {
        const oldMod = byName(ex.lift)?.e1rmModifier ?? 1
        const newMod = cand.e1rmModifier ?? 1
        rescale = newMod / oldMod; lift = cand.name
        notes.push(`통증 보호: ${ex.baseLift} → ${cand.name}`)
      }
    }
    const lf = loadFactor(readiness, ex.quality)
    const sets = trimSets(ex.scheme.sets, drop).map((s) =>
      typeof s.weight === 'number' ? { ...s, weight: roundToIncrement(s.weight * rescale * lf) } : s)
    exercises.push({ ...ex, lift, scheme: { ...ex.scheme, sets }, sets: sets.length })
  }

  const accessories = []
  for (const a of session.accessories ?? []) {
    const row = byName(a.name)
    if (row && regionMaxStatus(row, rs) === 3) { notes.push(`${a.name} 오늘 통증으로 제외`); continue }
    accessories.push(a.scheme ? { ...a, scheme: { ...a.scheme, sets: trimSets(a.scheme.sets, drop) } } : a)
  }

  return { session: { ...session, exercises, accessories, notes }, readiness, notes }
}
```
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(engine): applyReadiness session autoregulation`

---

### Task 4: store — checkinLog

**Files:** Modify `src/ui/store/profileStore.js`, `src/ui/store/profileStore.test.js`

**Interfaces:** Top-level state `checkinLog: []`; actions `logCheckin(entry)` (append), `clearCheckinLog()`. `merge` keeps `checkinLog` (`persisted.checkinLog ?? []`). `reset()` also clears it.

- [ ] **Step 1: Failing test** (append): `checkinLog` defaults `[]`; `logCheckin({week:1,day:1,readiness:0.5})` appends; `clearCheckinLog()` empties; rehydrate of an old persisted state (no checkinLog) yields `[]`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Add `checkinLog: []` beside `plan: null`; actions; extend `merge` top level: `checkinLog: persisted?.checkinLog ?? []`; `reset: () => set({ profile: DEFAULT_PROFILE, plan: null, checkinLog: [] })`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(store): daily check-in log`

---

### Task 5: CheckinPanel component

**Files:** Create `src/ui/components/CheckinPanel.jsx`, `src/ui/components/CheckinPanel.test.jsx`

**Interfaces:** `CheckinPanel({ session, weekIndex, onApply })`. Local state: `sleepHours`(7), `stress`(2), `systemicFatigue`(2), `regionStatus`({}). On "컨디션 반영" → `applyReadiness(session, checkin)` → `onApply({ adjusted: result.session, readiness: result.readiness, weekIndex, day: session.day })`; show `readiness` as `NN%`.

- [ ] **Step 1: Failing test** (jsdom): render with a minimal session; set sleep input, click 컨디션 반영; assert `onApply` called with an object whose `readiness` is a number in [0,1] and `adjusted` has `exercises`. Assert a `%` readiness badge appears.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Inputs: number 수면시간; selects 스트레스/전신피로 (1-5); a compact region grid (10 regions via `regionLabel`, each a 0-3 `<select>`, default 0) writing into local `regionStatus`. Button builds `checkin = { sleepHours, stress, systemicFatigue, regionStatus }`, calls `applyReadiness`, stores `readiness` in state, calls `onApply`. Import `applyReadiness` from `../../engine/applyReadiness.js`, `regionLabel` from `../i18n.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(ui): daily check-in panel`

---

### Task 6: RoutineView integration + LimitsPanel + full verify

**Files:** Modify `src/ui/components/RoutineView.jsx`, `src/ui/components/LimitsPanel.jsx`; Test `src/ui/components/RoutineView.test.jsx`

**Interfaces:** RoutineView reads `checkinLog` from the store; renders a `CheckinPanel` per session; when applied, shows the adjusted session + a `오늘 readiness NN%` badge; shows an overreaching banner when flagged.

- [ ] **Step 1: Failing tests** (extend RoutineView.test): (a) renders a CheckinPanel toggle/control per session (e.g. text 컨디션); (b) given a `checkinLog` (mock the store or pass through) that triggers `detectOverreaching`, the overreaching reason text renders. Keep existing RoutineView assertions.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - `import { useProfileStore } from '../store/profileStore.js'`, `import { detectOverreaching } from '../../engine/overreaching.js'`, `import CheckinPanel from './CheckinPanel.jsx'`.
  - `const checkinLog = useProfileStore((s) => s.checkinLog)`; `const logCheckin = useProfileStore((s) => s.logCheckin)`; `const [adjusted, setAdjusted] = useState({})`.
  - `const over = detectOverreaching(checkinLog)`; if `over.flag` render a `<div className="overreaching-banner">⚠️ {over.reason} · 디로드를 고려하세요</div>` near the top.
  - Each session: compute `key = \`${wk.index}-${s.day}\``; `const view = adjusted[key]?.session ?? s`; render the session body from `view`; under the session header render `<CheckinPanel session={s} weekIndex={wk.index} onApply={({adjusted: adj, readiness, day}) => { setAdjusted((m) => ({...m, [\`${wk.index}-${day}\`]: { session: adj, readiness }})); logCheckin({ week: wk.index, day, readiness }) }} />` plus, when `adjusted[key]`, a `오늘 readiness {Math.round(adjusted[key].readiness*100)}%` badge.
  - Append the 2 LimitsPanel `<li>` from the spec.
- [ ] **Step 4: Verify.** `npx vitest run src/ui/components/RoutineView.test.jsx src/ui/components/CheckinPanel.test.jsx` → PASS. Then `npm test` → FULL GREEN. Then `npm run build` → succeeds.
- [ ] **Step 5: Commit** `feat(ui): per-session readiness check-in + overreaching banner; full green`

---

## Self-Review
- Spec coverage: readiness scores (T1), monitor (T2), session adjust load+volume+region (T3), log (T4), panel (T5), integration+banner+limits (T6). ✓
- Placeholder scan: none. Region swap v1 ignores style (documented). ✓
- Type consistency: `applyReadiness(session,checkin)->{session,readiness,notes}` consistent T3↔T5↔T6. `checkinLog` entries `{week,day,readiness}` consistent T4↔T6↔T2. loadFactor/setsToDrop signatures consistent T1↔T3. ✓
