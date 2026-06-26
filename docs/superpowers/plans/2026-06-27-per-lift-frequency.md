# 종목별 주 빈도 제어 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 스쿼트·벤치·데드의 주당 일수를 직접 정하고, 엔진이 그 빈도로 주간 layout을 생성한다(고정 template 은퇴).

**Architecture:** 종목별 빈도를 단일 소스로, 결정론 `buildLayout` 생성기가 주간 layout을 만든다(요일 균등 분배). 같은 빈도가 tuner의 `setsPerSession = weekly/freq`도 구동한다. `selectTemplate`/고정 layout은 은퇴하고 `template` 라벨은 `'custom'`.

**Tech Stack:** JavaScript(ESM), Vitest, React(jsdom), zustand. 엔진 `src/engine/` 순수·kg.

## Global Constraints

- 순수 결정론 엔진(no Date.now/Math.random/I/O). 한글 표시/영어 식별자. 무게 `roundToIncrement`.
- 컴포넌트 테스트 첫 줄 `// @vitest-environment jsdom`. zustand persist `merge` deep-fill, 버전 범프 없음.
- `MAIN_LIFTS = ['squat','bench','deadlift']`. Day = `{lift, role}[]`; layout = `Day[]`(훈련일만).
- 각 종목 freq는 `clamp(0, daysPerWeek)`; freq 0 = 종목 제외(슬롯·setsPerSession 0).
- 명령은 저장소 루트. 테스트: `npx vitest run <path>`. 엔진 태스크: 커밋 전 `npx vitest run` 전체 green; 이 변경에 기인한 골든만 갱신(정당화), 불명 실패는 회귀로 조사.

---

### Task 1: layoutGenerator (신규 모듈)

**Files:**
- Create: `src/engine/layoutGenerator.js`
- Test: `src/engine/layoutGenerator.test.js`

**Interfaces:**
- Consumes: `MAIN_LIFTS` (exercises.js).
- Produces: `distinctDays(f, D, phase) -> number[]` (f개 distinct canvas day). `buildLayout({ daysPerWeek, frequency }) -> Day[]` (훈련일만, canvas 오름차순; 종목당 첫 슬롯 role 'heavy', 이후 'volume'/'light' 교대).

- [ ] **Step 1: Write the failing test**

`src/engine/layoutGenerator.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { distinctDays, buildLayout } from './layoutGenerator.js'

describe('distinctDays', () => {
  it('returns f distinct days within 0..D-1', () => {
    const ds = distinctDays(3, 5, 0)
    expect(ds).toHaveLength(3)
    expect(new Set(ds).size).toBe(3)
    expect(ds.every((d) => d >= 0 && d < 5)).toBe(true)
  })
  it('phase shifts deterministically', () => {
    expect(distinctDays(2, 4, 0)).toEqual([0, 2])
    expect(distinctDays(2, 4, 1)).toEqual([1, 3])
  })
})

describe('buildLayout', () => {
  const freq = { squat: 3, bench: 1, deadlift: 0 }
  it('emits one slot per lift-session, none for freq 0', () => {
    const layout = buildLayout({ daysPerWeek: 5, frequency: freq })
    const slots = layout.flat()
    expect(slots.filter((s) => s.lift === 'squat')).toHaveLength(3)
    expect(slots.filter((s) => s.lift === 'bench')).toHaveLength(1)
    expect(slots.filter((s) => s.lift === 'deadlift')).toHaveLength(0)
  })
  it('a lift appears at most once per day', () => {
    const layout = buildLayout({ daysPerWeek: 5, frequency: freq })
    for (const day of layout) {
      const lifts = day.map((s) => s.lift)
      expect(new Set(lifts).size).toBe(lifts.length)
    }
  })
  it('each lift has exactly one heavy (comp) slot', () => {
    const layout = buildLayout({ daysPerWeek: 5, frequency: freq })
    const squatHeavy = layout.flat().filter((s) => s.lift === 'squat' && s.role === 'heavy')
    expect(squatHeavy).toHaveLength(1)
  })
  it('all-zero frequency yields an empty layout', () => {
    expect(buildLayout({ daysPerWeek: 4, frequency: { squat: 0, bench: 0, deadlift: 0 } })).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/layoutGenerator.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/engine/layoutGenerator.js`:

```js
import { MAIN_LIFTS } from './exercises.js'

const PHASE = { squat: 0, bench: 1, deadlift: 2 }   // 종목 간 요일 오프셋(분산)

// f회를 D일 canvas에 균등·distinct 배치. f<=D면 floor(i*D/f) 강증가→distinct,
// (phase + .) % D는 bijection이라 distinct 보존. 결정론.
export function distinctDays(f, D, phase) {
  const days = []
  for (let i = 0; i < f; i++) days.push((phase + Math.floor((i * D) / f)) % D)
  return days
}

// 첫 세션 heavy(comp), 이후 volume/light 교대(variation).
function roleFor(i) {
  if (i === 0) return 'heavy'
  return i % 2 === 1 ? 'volume' : 'light'
}

export function buildLayout({ daysPerWeek, frequency }) {
  const D = Math.max(1, daysPerWeek)
  const byDay = new Map()
  for (const lift of MAIN_LIFTS) {
    const f = Math.max(0, Math.min(D, frequency?.[lift] ?? 0))
    if (f === 0) continue
    distinctDays(f, D, PHASE[lift]).forEach((day, i) => {
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day).push({ lift, role: roleFor(i) })
    })
  }
  return [...byDay.keys()].sort((a, b) => a - b).map((d) => byDay.get(d))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/layoutGenerator.test.js`
Expected: PASS.

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run` → 전체 green(신규 모듈, 기존 무영향).

```bash
git add src/engine/layoutGenerator.js src/engine/layoutGenerator.test.js
git commit -m "feat(engine): deterministic per-lift frequency layout generator"
```

---

### Task 2: tuner frequency 소스 + defaultFrequency

**Files:**
- Modify: `src/engine/frequency.js`, `src/engine/tuner.js`
- Test: `src/engine/tuner.test.js`, `src/engine/frequency.test.js`

**Interfaces:**
- Consumes: `weeklySets` (volume.js), `MAIN_LIFTS`.
- Produces: `defaultFrequency(daysPerWeek) -> { squat, bench, deadlift }`. `tune({ blend, years, daysPerWeek, fatigue, age, frequency }) -> { weeklySets, frequency, setsPerSession }`. `frequency` 미전달 시 `defaultFrequency(daysPerWeek)` 사용; freq 0 → setsPerSession 0.

- [ ] **Step 1: Write the failing test**

`src/engine/frequency.test.js` 교체(기존 desiredFrequency 테스트가 있으면 갱신):

```js
import { describe, it, expect } from 'vitest'
import { defaultFrequency } from './frequency.js'

describe('defaultFrequency', () => {
  it('preserves the legacy distribution', () => {
    expect(defaultFrequency(4)).toEqual({ squat: 2, bench: 2, deadlift: 1 })
    expect(defaultFrequency(5)).toEqual({ squat: 2, bench: 2, deadlift: 2 })
    expect(defaultFrequency(6)).toEqual({ squat: 2, bench: 3, deadlift: 2 })
  })
})
```

`src/engine/tuner.test.js`에 추가/갱신(import에 `tune`):

```js
it('uses explicit frequency for setsPerSession', () => {
  const blend = { power: 0, strength: 1, hypertrophy: 0, endurance: 0 }
  const t = tune({ blend, years: 5, daysPerWeek: 4, fatigue: 1, frequency: { squat: 4, bench: 2, deadlift: 1 } })
  expect(t.setsPerSession.squat).toBe(Math.max(1, Math.round(t.weeklySets.squat / 4)))
  expect(t.setsPerSession.bench).toBe(Math.max(1, Math.round(t.weeklySets.bench / 2)))
})
it('frequency 0 yields 0 sets (no division by zero)', () => {
  const blend = { power: 0, strength: 1, hypertrophy: 0, endurance: 0 }
  const t = tune({ blend, years: 5, daysPerWeek: 4, fatigue: 1, frequency: { squat: 2, bench: 2, deadlift: 0 } })
  expect(t.setsPerSession.deadlift).toBe(0)
})
it('falls back to defaultFrequency when none given', () => {
  const blend = { power: 0, strength: 1, hypertrophy: 0, endurance: 0 }
  const t = tune({ blend, years: 5, daysPerWeek: 4, fatigue: 1 })
  expect(t.frequency).toEqual({ squat: 2, bench: 2, deadlift: 1 })
})
```

(기존 tuner 테스트 중 `desiredFrequency`/예전 frequency 형태에 의존하는 단언은 위 패턴에 맞게 갱신.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/frequency.test.js src/engine/tuner.test.js`
Expected: FAIL — `defaultFrequency` 미정의; tune이 frequency 인자 무시.

- [ ] **Step 3: Write minimal implementation**

`src/engine/frequency.js` 전체 교체:

```js
// 사용자가 빈도 미설정 시 기본값(현재 동작 보존). daysPerWeek로 시드.
export function defaultFrequency(daysPerWeek) {
  return {
    squat: 2,
    bench: daysPerWeek >= 6 ? 3 : 2,
    deadlift: daysPerWeek >= 5 ? 2 : 1,
  }
}
```

`src/engine/tuner.js` 전체 교체:

```js
import { weeklySets } from './volume.js'
import { defaultFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ blend, years, daysPerWeek, fatigue, age, frequency }) {
  const perLiftWeekly = weeklySets(blend, years, fatigue, age)
  const freq = frequency ?? defaultFrequency(daysPerWeek)
  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    const f = freq?.[lift] ?? 0
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = f > 0 ? Math.max(1, Math.round(perLiftWeekly / f)) : 0
  }
  return { weeklySets: weeklySetsMap, frequency: freq, setsPerSession }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/frequency.test.js src/engine/tuner.test.js`
Expected: PASS.

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run` → 전체 green(generate는 아직 frequency 미전달 → defaultFrequency fallback으로 기존 동작 유지).

```bash
git add src/engine/frequency.js src/engine/tuner.js src/engine/frequency.test.js src/engine/tuner.test.js
git commit -m "feat(engine): tuner reads per-lift frequency (defaultFrequency fallback)"
```

---

### Task 3: generate + periodization 통합 (layout 생성) + 골든 갱신

**Files:**
- Modify: `src/engine/generate.js` (import + frequency 해석 + buildLayout + tune frequency + buildWorkingWeeks(layout) + template 라벨), `src/engine/periodization.js` (`buildWorkingWeeks` 시그니처)
- Test: 전체 스위트 (golden 갱신)

**Interfaces:**
- Consumes: `buildLayout` (Task 1), `tune({...frequency})`/`defaultFrequency` (Task 2).
- Produces: `generate` 출력 `template: 'custom'`. `buildWorkingWeeks(layout, ctx, totalWeeks = 3)` (templateKey/daysPerWeek 인자 제거).

- [ ] **Step 1: 실패 테스트 (수용 시드)**

`src/engine/generate.test.js`에 추가(import에 `generate`; PRESETS 불필요):

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/engine/generate.test.js`
Expected: FAIL — 현재 template layout 사용, frequency 무시, `template` ≠ 'custom'.

- [ ] **Step 3: 구현**

`src/engine/generate.js` 수정:

import 줄에서 제거: `import { selectTemplate } from './selector.js'` 와 `import { getTemplate } from './templates.js'`.
추가:
```js
import { buildLayout } from './layoutGenerator.js'
import { defaultFrequency } from './frequency.js'
```

`const advanced = years >= 3` 다음에 frequency 해석 추가:
```js
  const freqInput = profile.frequency ?? defaultFrequency(daysPerWeek)
  const frequency = {}
  for (const lift of MAIN_LIFTS) frequency[lift] = Math.max(0, Math.min(daysPerWeek, freqInput[lift] ?? 0))
```

`const template = selectTemplate({ blend, years, daysPerWeek })` 줄 삭제.
`const tuned = tune({ blend, years, daysPerWeek, fatigue, age: profile.age })` →
```js
  const tuned = tune({ blend, years, daysPerWeek, fatigue, age: profile.age, frequency })
```
`const layout = getTemplate(template).layouts[daysPerWeek]` →
```js
  const layout = buildLayout({ daysPerWeek, frequency })
```
`const working = buildWorkingWeeks(template, daysPerWeek, ctx, mesoWeeks)` →
```js
  const working = buildWorkingWeeks(layout, ctx, mesoWeeks)
```
반환 `return { template, model, weeks }` →
```js
  return { template: 'custom', model, weeks }
```

`src/engine/periodization.js` 수정:
1행 import: `import { getTemplate, slotTypeForRole } from './templates.js'` → `import { slotTypeForRole } from './templates.js'`.
`buildWorkingWeeks` 시그니처/머리 교체:
```js
export function buildWorkingWeeks(layout, ctx, totalWeeks = 3) {
  if (!layout) throw new Error('buildWorkingWeeks requires a layout')
  const slotCounts = {}
  for (const day of layout) for (const slot of day) slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1
  ctx.totalWeeks = totalWeeks
```
(이후 본문 — weekPlan/sched/idx/sessions 빌드 — 그대로. 기존의 `const template = getTemplate(templateKey)` / `const layout = template.layouts[daysPerWeek]` / `if (!layout) throw ...` 세 줄은 위 교체로 제거됨.)

- [ ] **Step 4: 수용 테스트 PASS + 골든 갱신**

Run: `npx vitest run`
Expected: 신규 frequency 테스트 PASS. 기존 골든 다수 FAIL 예상(`template` 이름이 'custom'으로, layout이 생성기 분포로 바뀜). 각 실패를 실제 출력과 대조해 **이 변경(layout 생성·template 라벨)에 기인함**을 확인하고 갱신. `template`을 특정 이름('dup' 등)으로 단언하던 테스트 → 'custom'. layout 구조(요일별 슬롯) 단언 → 생성기 분포로. 원인 불명 실패는 회귀로 조사(스킵 금지). 스냅샷은 검토 후 `npx vitest run -u`.

- [ ] **Step 5: 전체 green 확인 + commit**

Run: `npx vitest run` → 전체 PASS.

```bash
git add -A
git commit -m "feat(engine): generate layout from per-lift frequency (template=custom)"
```

---

### Task 4: selector/templates 은퇴 (dead code 삭제)

**Files:**
- Delete: `src/engine/selector.js`, `src/engine/selector.test.js`
- Modify: `src/engine/templates.js` (slotTypeForRole만 유지), `src/engine/templates.test.js`

**Interfaces:**
- Consumes: 없음(Task 3가 이미 generate/periodization에서 import 제거).
- Produces: `templates.js`는 `slotTypeForRole(role) -> 'comp'|'variation'`만 export.

- [ ] **Step 1: 사전 확인 (사용처 없음)**

Run: `npx vitest run` → 현재 green인지 확인(Task 3 직후 상태).
selectTemplate/getTemplate/TEMPLATES/ROLE이 src(비-test)에서 더 import되지 않음을 전제(Task 3에서 제거함).

- [ ] **Step 2: 삭제 + 축소**

`src/engine/selector.js` 삭제. `src/engine/selector.test.js` 삭제.

`src/engine/templates.js` 전체 교체:
```js
// 역할 -> 슬롯 타입. heavy = 컴페티션 동작; 그 외 = 변형 슬롯.
export function slotTypeForRole(role) {
  return role === 'heavy' ? 'comp' : 'variation'
}
```

`src/engine/templates.test.js` 전체 교체:
```js
import { describe, it, expect } from 'vitest'
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

- [ ] **Step 3: 전체 스위트 확인**

Run: `npx vitest run`
Expected: 전체 PASS(삭제한 코드와 그 테스트가 함께 사라짐; 다른 파일이 selector/getTemplate을 import하면 여기서 에러 → Task 3 누락분 조사).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(engine): retire selectTemplate + fixed template layouts"
```

---

### Task 5: store + adapter 배선

**Files:**
- Modify: `src/ui/store/profileStore.js` (`DEFAULT_PROFILE` + `merge` + `setFrequency` 액션), `src/ui/lib/planAdapter.js`
- Test: `src/ui/lib/planAdapter.test.js`

**Interfaces:**
- Consumes: generate가 `profile.frequency` 사용(Task 3).
- Produces: `DEFAULT_PROFILE.frequency = { squat: 2, bench: 2, deadlift: 1 }`. `setFrequency(lift, value)` 액션. `toEngineProfile`가 `frequency: form.frequency` 반환.

- [ ] **Step 1: Write the failing test**

`src/ui/lib/planAdapter.test.js`에 추가(기존 `form` 픽스처 사용):

```js
it('passes per-lift frequency through', () => {
  const p = toEngineProfile({ ...form, frequency: { squat: 3, bench: 2, deadlift: 1 } })
  expect(p.frequency).toEqual({ squat: 3, bench: 2, deadlift: 1 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: FAIL — `frequency` undefined.

- [ ] **Step 3: Write minimal implementation**

`src/ui/store/profileStore.js`:
`DEFAULT_PROFILE`에 추가(예: `daysPerWeek` 근처):
```js
  frequency: { squat: 2, bench: 2, deadlift: 1 },
```
액션 추가(`setStickingPoint` 패턴 옆):
```js
      setFrequency: (lift, value) =>
        set((s) => ({ profile: { ...s.profile, frequency: { ...s.profile.frequency, [lift]: value } } })),
```
`merge`의 profile deep-fill에 추가(`stickingPoint` 줄 옆):
```js
            frequency: { ...current.profile.frequency, ...(p.frequency || {}) },
```

`src/ui/lib/planAdapter.js` `toEngineProfile` 반환 객체에 추가:
```js
    frequency: form.frequency,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: PASS.

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run` → 전체 green.

```bash
git add src/ui/store/profileStore.js src/ui/lib/planAdapter.js src/ui/lib/planAdapter.test.js
git commit -m "feat(ui): persist + thread per-lift frequency"
```

---

### Task 6: 위저드 빈도 토글 UI

**Files:**
- Modify: `src/ui/wizard/steps/StepEquipment.jsx`
- Test: `src/ui/wizard/steps/StepEquipment.test.jsx`

**Interfaces:**
- Consumes: `profileStore` `frequency` + `setFrequency` (Task 5).
- Produces: 종목별 빈도 `<select>` 3개(0..daysPerWeek).

- [ ] **Step 1: Write the failing test**

`src/ui/wizard/steps/StepEquipment.test.jsx`에 추가(기존 import/describe 재사용):

```js
it('renders per-lift frequency controls', () => {
  render(<StepEquipment />)
  expect(screen.getByText(/스쿼트 주 빈도/)).toBeInTheDocument()
  expect(screen.getByText(/벤치 주 빈도/)).toBeInTheDocument()
  expect(screen.getByText(/데드리프트 주 빈도/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/wizard/steps/StepEquipment.test.jsx`
Expected: FAIL — controls absent.

- [ ] **Step 3: Write minimal implementation**

`src/ui/wizard/steps/StepEquipment.jsx`: store 훅에 `setFrequency` 추가:
```js
  const setFrequency = useProfileStore((s) => s.setFrequency)
```
"주당 훈련일" `</label>` 다음에 추가:
```jsx
      <fieldset>
        <legend>종목별 주 빈도 (0 = 제외)</legend>
        {[['squat','스쿼트'],['bench','벤치'],['deadlift','데드리프트']].map(([lift, ko]) => (
          <label key={lift}>{ko} 주 빈도
            <select value={p.frequency[lift]} onChange={(e) => setFrequency(lift, Number(e.target.value))}>
              {Array.from({ length: p.daysPerWeek + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
      </fieldset>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/wizard/steps/StepEquipment.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run` → 전체 green.

```bash
git add src/ui/wizard/steps/StepEquipment.jsx src/ui/wizard/steps/StepEquipment.test.jsx
git commit -m "feat(ui): per-lift frequency selectors in equipment step"
```

---

### Task 7: 통합 수용 테스트

**Files:**
- Modify: `src/engine/generate.test.js`
- Test: 전체 스위트

**Interfaces:**
- Consumes: `generate(profile)`, `defaultFrequency`. Produces: 없음(검증).

- [ ] **Step 1: Write the acceptance tests**

`src/engine/generate.test.js`의 frequency describe(Task 3)에 추가:

```js
it('default (no frequency) preserves legacy-ish distribution: squat 2, bench 2, deadlift 1 at 4 days', () => {
  const r = generate({ ...base, daysPerWeek: 4, frequency: undefined })
  expect(liftSlots(r, 'squat')).toBe(2)
  expect(liftSlots(r, 'bench')).toBe(2)
  expect(liftSlots(r, 'deadlift')).toBe(1)
})
it('total main slots equal the sum of frequencies', () => {
  const freq = { squat: 2, bench: 3, deadlift: 1 }
  const r = generate({ ...base, daysPerWeek: 5, frequency: freq })
  const total = r.weeks[0].sessions.flatMap(s=>s.exercises).filter(e=>['squat','bench','deadlift'].includes(e.baseLift)).length
  expect(total).toBe(6)
})
it('clamps frequency above daysPerWeek', () => {
  const r = generate({ ...base, daysPerWeek: 3, frequency: { squat: 9, bench: 0, deadlift: 0 } })
  expect(liftSlots(r, 'squat')).toBe(3)   // clamped to daysPerWeek
})
```

- [ ] **Step 2: Run + reconcile**

Run: `npx vitest run`
Expected: 신규 수용 테스트 PASS. 추가 골든 drift가 있으면 Task 3과 동일 기준으로 갱신(layout 생성 기인 확인). 불명 실패는 회귀 조사.

- [ ] **Step 3: 전체 green 확인 + commit**

Run: `npx vitest run` → 전체 PASS.

```bash
git add src/engine/generate.test.js
git commit -m "test: per-lift frequency acceptance (defaults, sum, clamp)"
```

---

### Task 8: 정직고지 (LimitsPanel + PROJECT_STATUS)

**Files:**
- Modify: `src/ui/components/LimitsPanel.jsx`, `docs/PROJECT_STATUS.md`
- Test: `src/ui/components/LimitsPanel.test.jsx`

**Interfaces:**
- Consumes: 없음. Produces: 정직고지 1항목.

- [ ] **Step 1: Write the failing test**

`src/ui/components/LimitsPanel.test.jsx`에 추가:

```js
it('discloses frequency distribution heuristic', () => {
  render(<LimitsPanel />)
  expect(screen.getByText(/종목별 빈도는 요일에 균등 간격/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/LimitsPanel.test.jsx`
Expected: FAIL — 문구 없음.

- [ ] **Step 3: Write minimal implementation**

`src/ui/components/LimitsPanel.jsx`의 `<ul>` 마지막 `<li>` 다음에 추가:
```jsx
        <li>종목별 빈도는 요일에 균등 간격으로 분배하고 종목당 컴페티션 1일 + 변형으로 구성합니다. 회복은 개인차가 있으니 무리한 빈도는 조정하세요. 코칭 합의 기반입니다.</li>
```

`docs/PROJECT_STATUS.md` "## 3. 알려진 한계" 목록 끝에 추가:
```markdown
- 종목별 빈도 분배 = 균등 간격 휴리스틱(개인 회복차 있음), 종목당 컴페티션 1일 + 변형
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/components/LimitsPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run full suite + build + commit**

Run: `npx vitest run` → 전체 green. Run: `npm run build` → 성공.

```bash
git add src/ui/components/LimitsPanel.jsx src/ui/components/LimitsPanel.test.jsx docs/PROJECT_STATUS.md
git commit -m "docs: disclose per-lift frequency distribution heuristic"
```

---

## Self-Review

**Spec coverage:**
- 컴포넌트 A(layoutGenerator) → Task 1 ✓
- 컴포넌트 B(defaultFrequency) → Task 2 ✓
- 컴포넌트 C(generate 통합) → Task 3 ✓
- 컴포넌트 D(tuner frequency) → Task 2 ✓
- 컴포넌트 E(buildWorkingWeeks layout) → Task 3 ✓
- 컴포넌트 F(selector/templates 은퇴) → Task 4 ✓
- 컴포넌트 G(store/adapter/UI) → Task 5,6 ✓
- 컴포넌트 H(정직고지) → Task 8 ✓
- 테스트(생성기/tuner/generate/은퇴/배선/수용) → Task 1,2,3,4,5,7 ✓

**Type consistency:**
- `buildLayout({daysPerWeek, frequency})` / `distinctDays(f,D,phase)` — Task 1 정의, Task 3 사용 일치.
- `defaultFrequency(daysPerWeek)` — Task 2 정의, Task 2(tuner)·Task 3(generate) 호출 일치.
- `tune({...frequency})` — Task 2 시그니처, Task 3 호출에 frequency 추가 일치.
- `buildWorkingWeeks(layout, ctx, totalWeeks)` — Task 3에서 시그니처 변경 + 호출 동시 갱신(generate). periodization import에서 getTemplate 제거.
- `setFrequency(lift, value)` / `DEFAULT_PROFILE.frequency` — Task 5 정의, Task 6 사용 일치.
- 출력 `template: 'custom'` — Task 3.

**Placeholder scan:** 없음(모든 코드 단계 실제 코드 포함).

**주의(구현자):** Task 3·7의 골든 churn은 의도(template 라벨='custom', layout이 생성기 분포). 매 실패가 layout 생성/template 라벨 변경에 기인함을 확인 후 갱신; 불명 실패는 회귀로 조사. Task 4는 Task 3가 selector/getTemplate import를 모두 제거했음을 전제 — 삭제 후 import 에러가 나면 Task 3 누락분.
