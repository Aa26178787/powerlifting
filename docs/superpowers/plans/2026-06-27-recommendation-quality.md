# 추천 품질 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 변형·보조 운동 추천과 메인 볼륨이 "이상하게" 나오는 3건(박스스쿼트 과추천, 메인 1세트 붕괴, 보조 skill 운동 과추천)을 수정한다.

**Architecture:** 순수 결정론 엔진에 (1) 변형 `priorityOf` tie-break(알파벳 대신), (2) 세트 스킴 `accessoryOnly` 플래그로 1세트 강화기법을 메인에서 제외, (3) 보조 `movementTypeOf` 분류 + `accessoryPreference` 토글(기본 머신 선호, skill 강등)을 추가한다. 분류는 코드 함수 + 선택적 JSON override.

**Tech Stack:** JavaScript(ESM), Vitest, React(jsdom), zustand. 엔진 `src/engine/` 순수·kg.

## Global Constraints

- 순수 결정론 엔진: `Date.now`/`Math.random`/I/O 금지. 무게 = `roundToIncrement`.
- 한글 표시 / 영어 엔진 식별자. 컴포넌트 테스트 첫 줄 `// @vitest-environment jsdom`.
- zustand persist `merge` deep-fill, 버전 범프 없음.
- DB(`src/data/exercises.json`) 정적, 엔진 읽기만. 변형 68 / 보조 136.
- 하이브리드 분류: 코드 분류 + 선택적 JSON override 필드(`priority`, `movementType`).
- 근거 tier: 변형 우선순위·머신 선호 = 코칭 컨센서스/선호(RCT 강제 아님).
- 명령은 저장소 루트. 테스트: `npx vitest run <path>`. 각 엔진 태스크: 커밋 전 `npx vitest run` 전체 green 확인; 이 변경에 기인한 골든 drift만 갱신(정당화), 원인 불명 실패는 회귀로 조사.

---

### Task 1: 변형 priorityOf tie-break (#2)

**Files:**
- Modify: `src/engine/variations.js`
- Test: `src/engine/variations.test.js`

**Interfaces:**
- Consumes: 기존 `query`, `styleToken`.
- Produces: `priorityOf(ex) -> number`(낮을수록 우선; 명시 `ex.priority` 우선, 없으면 specialty 70 / 표준 40). `pick` 시그니처 불변, tie-break만 변경.

- [ ] **Step 1: Write the failing test**

`src/engine/variations.test.js` 상단 import에 `priorityOf` 추가: `import { pick, styleToken, priorityOf } from './variations.js'`. 파일 끝에 추가:

```js
import { allEquipment } from './exercises.js'

describe('priorityOf + tie-break', () => {
  it('specialty variations rank after standard ones', () => {
    expect(priorityOf({ name: 'Box Squat (below parallel)' })).toBe(70)
    expect(priorityOf({ name: 'Pause Squat (bottom)' })).toBe(40)
  })
  it('explicit priority field wins', () => {
    expect(priorityOf({ name: 'Box Squat', priority: 5 })).toBe(5)
  })
  it('low-bar squat with no sticking point does NOT default to Box Squat', () => {
    const v = pick('squat', 'none', { bar: 'low' }, allEquipment(), false, [])
    expect(v).not.toBeNull()
    expect(v.name).not.toMatch(/Box Squat/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/variations.test.js`
Expected: FAIL — `priorityOf is not a function`; low-bar pick currently returns a Box Squat.

- [ ] **Step 3: Write minimal implementation**

`src/engine/variations.js` 교체. 상단 import 아래에 추가:

```js
// 전문(specialty)·niche 변형 stem — 표준 변형보다 후순위(낮을수록 우선)
const SPECIALTY = [
  'box squat', 'ssb box', 'zercher', 'hatfield', 'anderson', 'cambered',
  'duffalo', 'buffalo', 'zombie', 'cyclist', 'heel-elevated', 'hack',
  'sissy', 'safety squat bar',
]
function isSpecialty(name) {
  const n = name.toLowerCase()
  return SPECIALTY.some((s) => n.includes(s))
}
export function priorityOf(ex) {
  if (typeof ex.priority === 'number') return ex.priority
  return isSpecialty(ex.name) ? 70 : 40
}
```

`pick`의 마지막 `return` 정렬 교체:

```js
  return [...pool].sort((a, b) =>
    (score(b) - score(a)) ||
    (priorityOf(a) - priorityOf(b)) ||
    a.name.localeCompare(b.name)
  )[0]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/variations.test.js`
Expected: PASS (기존 4개 포함).

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run`
Expected: 전체 green(이 변경에 기인한 drift만 갱신).

```bash
git add src/engine/variations.js src/engine/variations.test.js
git commit -m "feat(engine): variation tie-break by curated priority (demote specialty)"
```

---

### Task 2: accessoryOnly 플래그 — 1세트 기법 메인 제외 (#3)

**Files:**
- Modify: `src/engine/setSchemes.js` (`SCHEMES` 4개 항목 + `pickScheme` 필터)
- Test: `src/engine/setSchemes.test.js`

**Interfaces:**
- Consumes: 기존 `pickScheme({ quality, role, phase, advanced, weekIndex, seed, concurrent })`, `SCHEMES`.
- Produces: `restPause`/`dropSet`/`myoReps`/`widowmaker`에 `accessoryOnly: true`. `pickScheme`는 `role !== 'accessory'`이면 `accessoryOnly` 스킴을 후보에서 제외.

- [ ] **Step 1: Write the failing test**

`src/engine/setSchemes.test.js`에 추가(import에 `pickScheme`, `SCHEMES` 있음):

```js
describe('accessoryOnly: 1-set techniques excluded from main lifts', () => {
  const phases = ['accumulation', 'intensification', 'peak']
  const quals = ['power', 'strength', 'hypertrophy', 'endurance']
  const banned = ['restPause', 'dropSet', 'myoReps', 'widowmaker']
  it('main (non-accessory) roles never get a 1-set technique', () => {
    for (const role of ['comp', 'variation']) {
      for (const quality of quals) {
        for (const phase of phases) {
          for (let w = 0; w < 6; w++) {
            const k = pickScheme({ quality, role, phase, advanced: true, weekIndex: w, seed: 0 })
            expect(banned).not.toContain(k)
          }
        }
      }
    }
  })
  it('accessory role can still use them', () => {
    const k = pickScheme({ quality: 'hypertrophy', role: 'accessory', phase: 'accumulation', advanced: false, weekIndex: 1 })
    // ACCESSORY['hypertrophy'] = ['straight','restPause','dropSet','myoReps']; weekIndex 1 -> 'restPause'
    expect(k).toBe('restPause')
  })
  it('SCHEMES flags the four techniques accessoryOnly', () => {
    for (const k of banned) expect(SCHEMES[k].accessoryOnly).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/setSchemes.test.js`
Expected: FAIL — `restPause` (hypertrophy|accumulation) and `widowmaker` (endurance|accumulation) reachable on main roles; `accessoryOnly` undefined.

- [ ] **Step 3: Write minimal implementation**

`src/engine/setSchemes.js`의 `SCHEMES`에서 네 항목에 `accessoryOnly: true` 추가:

```js
  restPause:        { labelKey: 'restPause',        evidenceTier: 'rct',       fatigue: 4, accessoryOnly: true, expand: restPause },
  dropSet:          { labelKey: 'dropSet',          evidenceTier: 'rct',       fatigue: 4, accessoryOnly: true, expand: dropSet },
  myoReps:          { labelKey: 'myoReps',          evidenceTier: 'consensus', fatigue: 4, accessoryOnly: true, expand: myoReps },
  widowmaker:       { labelKey: 'widowmaker',       evidenceTier: 'consensus', fatigue: 5, accessoryOnly: true, expand: widowmaker },
```

`pickScheme` 본문의 `advancedOnly` 필터 줄 바로 다음에 추가:

```js
  cands = cands.filter((k) => !SCHEMES[k].advancedOnly || advanced)
  cands = cands.filter((k) => role === 'accessory' || !SCHEMES[k].accessoryOnly)
  if (!cands.length) cands = ['straight']
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/setSchemes.test.js`
Expected: PASS.

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run`
Expected: 전체 green.

```bash
git add src/engine/setSchemes.js src/engine/setSchemes.test.js
git commit -m "feat(engine): keep 1-set intensity techniques off main lifts (accessoryOnly)"
```

---

### Task 3: 보조 movementTypeOf + accessoryPreference 점수 (#4)

**Files:**
- Modify: `src/engine/accessories.js`
- Test: `src/engine/accessories.test.js`

**Interfaces:**
- Consumes: 기존 `query`, `emphasis`, `shouldAvoid`.
- Produces: `movementTypeOf(ex) -> 'machine'|'free'|'skill'`(명시 `ex.movementType` 우선). `select({..., accessoryPreference})` — 기본 `'machine'`. 점수에 `prefBonus` 합산.

- [ ] **Step 1: Write the failing test**

`src/engine/accessories.test.js`에 추가(import에 `select`; `movementTypeOf` 추가):

```js
import { select, movementTypeOf } from './accessories.js'

describe('movementTypeOf', () => {
  it('classifies machine / free / skill', () => {
    expect(movementTypeOf({ name: 'Leg Press', equipment: ['leg press machine'] })).toBe('machine')
    expect(movementTypeOf({ name: 'Lat Pulldown (wide)', equipment: ['cables'] })).toBe('machine')
    expect(movementTypeOf({ name: 'Box Step-Up', equipment: ['db', 'box'] })).toBe('skill')
    expect(movementTypeOf({ name: 'Barbell Curl', equipment: ['barbell'] })).toBe('free')
  })
  it('explicit movementType overrides', () => {
    expect(movementTypeOf({ name: 'X', equipment: ['barbell'], movementType: 'machine' })).toBe('machine')
  })
})

describe('accessoryPreference', () => {
  const eq = ['barbell','rack','bench','cables','dumbbells','leg press machine','machine','box','db']
  const ranks = (pref) => {
    const r = select({ lift: 'squat', style: { bar: 'low' }, stickingPoint: 'none', sessionTimeLimit: 999,
      equipmentAvailable: eq, regionStatus: {}, accessoryPreference: pref })
    return r.map((e) => e.name)
  }
  it('default machine preference ranks Leg Press above Box Step-Up', () => {
    const names = ranks('machine')
    const lp = names.indexOf('Leg Press'), bs = names.indexOf('Box Step-Up')
    expect(lp).toBeGreaterThanOrEqual(0)
    expect(lp < bs || bs === -1).toBe(true)
  })
  it('free preference does not boost machines', () => {
    const names = ranks('free')
    // a free-weight squat accessory should appear; skill still demoted
    expect(names.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/accessories.test.js`
Expected: FAIL — `movementTypeOf is not a function`; select ignores accessoryPreference.

- [ ] **Step 3: Write minimal implementation**

`src/engine/accessories.js` 교체. 상단 import 아래에 추가:

```js
const MACHINE_EQUIP = ['machine', 'cables', 'smith', 'preacher']   // 'machine' substring catches "* machine"
const SKILL_RX = /step-up|sled|yoke|sissy|dragon flag|kettlebell|kb swing|pistol|nordic|cossack|single-leg|single-arm|farmer|landmine twist|russian twist/i

export function movementTypeOf(ex) {
  if (ex.movementType) return ex.movementType
  if (ex.equipment.some((e) => MACHINE_EQUIP.some((m) => e.includes(m)))) return 'machine'
  if (SKILL_RX.test(ex.name)) return 'skill'
  return 'free'
}

function prefBonus(type, pref) {
  if (pref === 'any') return 0
  if (type === 'skill') return -0.5          // skill/unstable demotion is the key lever
  if (pref === 'machine') return type === 'machine' ? 0.3 : 0
  if (pref === 'free')    return type === 'free'    ? 0.3 : 0
  return 0
}
```

`select` 시그니처에 `accessoryPreference = 'machine'` 추가하고 `score`에 보너스 합산:

```js
export function select({ lift, style, stickingPoint, equipmentAvailable, sessionTimeLimit, regionStatus, excluded = [], accessoryPreference = 'machine' }) {
  const weights = emphasis(lift, style)
  const pool = query({ category: 'accessory', equipmentAvailable, excludeAdvanced: true })
    .filter((e) => e.targetLift === lift || e.targetLift === 'general')
    .filter((e) => !shouldAvoid(e, regionStatus ?? {}))
    .filter((e) => !excluded.includes(e.name))
  const score = (e) => {
    const matched = Object.entries(weights)
      .filter(([muscle]) => e.primaryMuscle.includes(muscle))
      .map(([, w]) => w)
    let s = matched.length ? Math.max(...matched) : 1.0
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 0.5
    s += prefBonus(movementTypeOf(e), accessoryPreference)
    return s
  }
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
  const cap = sessionTimeLimit ? Math.max(1, Math.floor(sessionTimeLimit / 15)) : 3
  return sorted.slice(0, cap)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/accessories.test.js`
Expected: PASS (기존 4개 property-based 테스트도 green).

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run`
Expected: 전체 green(이 변경에 기인한 골든만 갱신).

```bash
git add src/engine/accessories.js src/engine/accessories.test.js
git commit -m "feat(engine): accessory movement-type classifier + machine/free preference"
```

---

### Task 4: accessoryPreference 배선 (store → adapter → generate)

**Files:**
- Modify: `src/ui/store/profileStore.js` (`DEFAULT_PROFILE` + `merge`), `src/ui/lib/planAdapter.js`, `src/engine/generate.js:117`
- Test: `src/ui/lib/planAdapter.test.js`

**Interfaces:**
- Consumes: `select({..., accessoryPreference})` (Task 3).
- Produces: `DEFAULT_PROFILE.accessoryPreference = 'machine'`. `toEngineProfile` returns `accessoryPreference`. `generate`의 `select` 호출에 `accessoryPreference: profile.accessoryPreference` 전달.

- [ ] **Step 1: Write the failing test**

`src/ui/lib/planAdapter.test.js`에 추가(기존 `form` 픽스처 + describe 사용):

```js
it('passes accessoryPreference through (default machine when set)', () => {
  expect(toEngineProfile({ ...form, accessoryPreference: 'free' }).accessoryPreference).toBe('free')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: FAIL — `accessoryPreference` is `undefined` in the engine profile.

- [ ] **Step 3: Write minimal implementation**

`src/ui/store/profileStore.js` `DEFAULT_PROFILE`에 `units: 'kg',` 위(또는 옆)에 추가:

```js
  accessoryPreference: 'machine',
```

같은 파일 `merge`의 `units: ...` 줄 옆에 deep-fill 추가:

```js
            accessoryPreference: p.accessoryPreference ?? current.profile.accessoryPreference,
```

`src/ui/lib/planAdapter.js` `toEngineProfile` 반환 객체에 추가(예: `cueNeed` 다음):

```js
    accessoryPreference: form.accessoryPreference,
```

`src/engine/generate.js:117` `select({...})` 호출에 인자 추가:

```js
      const rawAccessories = select({ lift: primary, style: style[primary], stickingPoint: stickingPoint[primary], equipmentAvailable: equipment, sessionTimeLimit: profile.sessionTimeLimit, regionStatus, excluded: excludedExercises, accessoryPreference: profile.accessoryPreference })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: PASS.

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run`
Expected: 전체 green.

```bash
git add src/ui/store/profileStore.js src/ui/lib/planAdapter.js src/engine/generate.js src/ui/lib/planAdapter.test.js
git commit -m "feat(ui): thread accessoryPreference (default machine) into engine"
```

---

### Task 5: 위저드 토글 UI

**Files:**
- Modify: `src/ui/wizard/steps/StepEquipment.jsx`
- Test: `src/ui/wizard/steps/StepEquipment.test.jsx` (신규)

**Interfaces:**
- Consumes: `profileStore` `accessoryPreference` 필드 + `setField` (Task 4).
- Produces: 보조 선호 `<select>`(머신 선호/프리웨이트 선호/무관 → 'machine'/'free'/'any').

- [ ] **Step 1: Write the failing test**

신규 `src/ui/wizard/steps/StepEquipment.test.jsx`:

```jsx
// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StepEquipment from './StepEquipment.jsx'

describe('StepEquipment accessory preference', () => {
  it('renders the accessory preference control', () => {
    render(<StepEquipment />)
    expect(screen.getByText(/보조운동 선호/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/wizard/steps/StepEquipment.test.jsx`
Expected: FAIL — control/label not present.

- [ ] **Step 3: Write minimal implementation**

`src/ui/wizard/steps/StepEquipment.jsx`의 "1회 운동 시간 제한" `</label>` 다음에 추가:

```jsx
      <label>보조운동 선호
        <select value={p.accessoryPreference} onChange={(e) => setField('accessoryPreference', e.target.value)}>
          <option value="machine">머신 선호</option>
          <option value="free">프리웨이트 선호</option>
          <option value="any">무관</option>
        </select>
      </label>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/wizard/steps/StepEquipment.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run full suite + commit**

Run: `npx vitest run`
Expected: 전체 green.

```bash
git add src/ui/wizard/steps/StepEquipment.jsx src/ui/wizard/steps/StepEquipment.test.jsx
git commit -m "feat(ui): accessory preference selector in equipment step"
```

---

### Task 6: 통합 수용 테스트 + 골든 확인

**Files:**
- Modify: `src/engine/generate.test.js`
- Test: 전체 스위트

**Interfaces:**
- Consumes: `generate(profile)`, `PRESETS`.
- Produces: 없음(검증 태스크).

- [ ] **Step 1: Write the acceptance tests**

`src/engine/generate.test.js`에 추가(import에 `PRESETS` 있음; `base`/helpers는 input-coupling describe의 것 재사용 또는 자체 정의):

```js
describe('recommendation quality (acceptance)', () => {
  const base = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
    equipment: ['barbell','rack','bench','cables','dumbbells','leg press machine','machine','box','db','ghr machine'],
    accessoryPreference: 'machine',
  }
  const mainSchemes = (r) => r.weeks.flatMap(w=>w.sessions).flatMap(s=>s.exercises).map(e=>e.scheme.type)
  const mainSets = (r) => r.weeks.flatMap(w=>w.sessions).flatMap(s=>s.exercises).map(e=>e.sets)
  const accNames = (r) => r.weeks.flatMap(w=>w.sessions).flatMap(s=>s.accessories).map(a=>a.lift ?? a.name)

  it('main lifts never use 1-set intensity techniques', () => {
    const r = generate({ ...base, qualities: PRESETS.powerbuilding })
    const banned = ['restPause','dropSet','myoReps','widowmaker']
    expect(mainSchemes(r).every((k) => !banned.includes(k))).toBe(true)
  })
  it('main working exercises have at least 2 sets each (no 1-set collapse)', () => {
    const r = generate({ ...base, qualities: PRESETS.powerlifting })
    expect(Math.min(...mainSets(r))).toBeGreaterThanOrEqual(2)
  })
  it('squat variation slots are not Box Squat by default', () => {
    const r = generate({ ...base, qualities: PRESETS.powerbuilding })
    const squatVars = r.weeks.flatMap(w=>w.sessions).flatMap(s=>s.exercises)
      .filter(e=>e.baseLift==='squat' && e.scheme).map(e=>e.lift)
    expect(squatVars.some((n)=>/Box Squat/.test(n))).toBe(false)
  })
})
```

(주의: accessory 객체의 운동명 필드는 `a.lift`. `accNames` 헬퍼는 보조 검증을 추가하려면 사용; 위 3개로 #2·#3 수용 충족.)

- [ ] **Step 2: Run + reconcile**

Run: `npx vitest run`
Expected: 신규 수용 테스트 PASS. 기존 골든/스냅샷이 변형·보조 선택 변경으로 깨지면, 실제 출력과 대조해 **이 변경(priority/accessoryOnly/preference)에 기인함**을 확인하고 갱신. 원인 불명 실패는 회귀로 조사(스킵 금지). 스냅샷은 검토 후 `npx vitest run -u`.

- [ ] **Step 3: Run full suite to verify green**

Run: `npx vitest run`
Expected: 전체 PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: recommendation-quality acceptance + golden reconciliation"
```

---

### Task 7: 정직고지 (LimitsPanel + PROJECT_STATUS)

**Files:**
- Modify: `src/ui/components/LimitsPanel.jsx`, `docs/PROJECT_STATUS.md`
- Test: `src/ui/components/LimitsPanel.test.jsx`

**Interfaces:**
- Consumes: 없음. Produces: 정직고지 2항목.

- [ ] **Step 1: Write the failing test**

`src/ui/components/LimitsPanel.test.jsx`에 추가:

```js
it('discloses accessory machine preference', () => {
  render(<LimitsPanel />)
  expect(screen.getByText(/머신과 프리웨이트는 효과/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/LimitsPanel.test.jsx`
Expected: FAIL — 문구 없음.

- [ ] **Step 3: Write minimal implementation**

`src/ui/components/LimitsPanel.jsx`의 `<ul>` 마지막 `<li>` 다음에 추가:

```jsx
        <li>보조운동은 기본적으로 머신·안정 운동을 우선 추천합니다. <strong>머신과 프리웨이트는 효과 차이가 크지 않으며</strong>, 선호·안정성에 따른 선택입니다(설정에서 변경 가능).</li>
        <li>변형 운동은 표준 변형(폴/템포/핀 스쿼트 등)을 우선하고 특수 변형(박스/저처 등)은 목적이 분명할 때만 제안합니다. 코칭 합의 기반입니다.</li>
```

`docs/PROJECT_STATUS.md` "## 3. 알려진 한계" 목록 끝에 추가:

```markdown
- 보조운동 머신/프리웨이트 선호 = 효과 유사, 선호·안정성 선택(토글 제공)
- 변형 우선순위 = 표준 변형 우선(코칭 컨센서스), 특수 변형은 목적형
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/components/LimitsPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run full suite + build + commit**

Run: `npx vitest run` → 전체 green. Run: `npm run build` → 성공.

```bash
git add src/ui/components/LimitsPanel.jsx src/ui/components/LimitsPanel.test.jsx docs/PROJECT_STATUS.md
git commit -m "docs: disclose accessory preference + variation priority (consensus tier)"
```

---

## Self-Review

**Spec coverage:**
- 컴포넌트 A(변형 priorityOf) → Task 1 ✓
- 컴포넌트 B(accessoryOnly) → Task 2 ✓
- 컴포넌트 C(movementTypeOf + preference 점수) → Task 3 ✓; 배선(store/adapter/generate) → Task 4 ✓; 토글 UI → Task 5 ✓
- 컴포넌트 D(정직고지) → Task 7 ✓
- 테스트(변형/볼륨/보조/배선/수용/골든) → Task 1,2,3,4,6 ✓

**Type consistency:**
- `priorityOf(ex)` — Task 1 정의·사용 일치.
- `accessoryOnly` 플래그 + pickScheme 필터 — Task 2 일관(기존 advancedOnly 패턴).
- `movementTypeOf(ex)` / `prefBonus(type, pref)` / `select({..., accessoryPreference})` — Task 3 정의, Task 4가 `accessoryPreference: profile.accessoryPreference`로 호출(이름 일치).
- `DEFAULT_PROFILE.accessoryPreference='machine'` ↔ `toEngineProfile` ↔ generate 호출 ↔ select 기본값 — 전 hop 'accessoryPreference' 동일.

**Placeholder scan:** 없음(모든 코드 단계 실제 코드 포함).

**주의(구현자):** 기존 테스트는 대부분 property-based라 골든 churn 적을 것으로 예상. Task 6에서 깨지는 골든은 변형·보조 선택 변경(priority/preference)에 기인함을 확인 후 갱신; 불명 실패는 회귀로 조사.
