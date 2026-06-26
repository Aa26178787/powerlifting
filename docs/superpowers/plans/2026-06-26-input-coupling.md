# 입력-커플링 정비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** blend(자질 슬라이더)이 연속적으로 루틴 구조를 바꾸고, 동시(strength 탑 + hypertrophy 백오프) 훈련을 세션 내에서 표현하게 만들어 "어떤 변수를 넣든 루틴이 비슷"한 문제를 제거한다.

**Architecture:** 순수 결정론 엔진에 (1) 공유 `classifyBlend` 헬퍼로 selector·volume의 mixed 판정을 연속화하고, (2) zone을 가로지르는 `strengthHypertrophy` 세트 스킴 + per-슬롯 seed로 세션 내 혼합·주차 다양성을 만들고, (3) age·equipment 입력을 엔진에 연결한다. sex/bodyweight는 진단전용으로 두고 LimitsPanel에 고지한다.

**Tech Stack:** JavaScript(ESM), Vitest, React(jsdom 컴포넌트 테스트), zustand. 엔진은 `src/engine/` 순수 함수·kg.

## Global Constraints

- 순수 결정론 엔진: `Date.now`/`Math.random`/I/O 금지.
- 한글 표시 = i18n/리터럴, 엔진 값 = 영어 식별자. 무게 = `roundToIncrement`(`r`).
- 컴포넌트 테스트 첫 줄: `// @vitest-environment jsdom`.
- 무게는 오토레귤레이션 **제안치** 원칙 유지.
- 근거 tier 정직고지: 신규 동시 스킴·age taper = **consensus**(RCT 아님).
- 기존 골든/스냅샷 테스트는 의도된 변경분만 갱신(스킴 시퀀스·band·동시 스킴).
- `QUALITIES = ['power','strength','hypertrophy','endurance']`, `MAIN_LIFTS` = squat/bench/deadlift.
- 명령은 저장소 루트에서 실행. 테스트 러너: `npx vitest run <path>`.

---

### Task 1: classifyBlend 공유 헬퍼

**Files:**
- Modify: `src/engine/quality.js` (파일 끝에 추가)
- Test: `src/engine/quality.test.js`

**Interfaces:**
- Consumes: 기존 `normalizeBlend`, `QUALITIES`.
- Produces: `MIX_GAP = 0.15`, `MIX_MAX = 0.55`, `classifyBlend(blend) -> { dom, second, gap, isMixed, n }` (n = 정규화된 blend).

- [ ] **Step 1: Write the failing test**

`src/engine/quality.test.js` 상단 import에 `classifyBlend`를 추가하고(예: `import { ..., classifyBlend } from './quality.js'`) 아래 describe를 파일 끝에 추가:

```js
describe('classifyBlend', () => {
  it('clear strength dominant is not mixed', () => {
    expect(classifyBlend({ power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 }).isMixed).toBe(false)
  })
  it('near-equal top two is mixed (gap <= MIX_GAP)', () => {
    expect(classifyBlend({ power:0, strength:0.57, hypertrophy:0.43, endurance:0 }).isMixed).toBe(true)
  })
  it('no quality above MIX_MAX is mixed', () => {
    expect(classifyBlend({ power:0.1, strength:0.5, hypertrophy:0.3, endurance:0.1 }).isMixed).toBe(true)
  })
  it('returns normalized blend and dominant', () => {
    const c = classifyBlend({ power:0, strength:2, hypertrophy:1, endurance:1 })
    expect(c.dom).toBe('strength')
    expect(c.n.strength).toBeCloseTo(0.5, 5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/quality.test.js`
Expected: FAIL — `classifyBlend is not a function`.

- [ ] **Step 3: Write minimal implementation**

`src/engine/quality.js` 끝에 추가:

```js
export const MIX_GAP = 0.15   // top-2 간격이 이하이면 혼합
export const MIX_MAX = 0.55   // 최대 자질이 이하이면(지배 자질 없음) 혼합

export function classifyBlend(blend) {
  const n = normalizeBlend(blend)
  const sorted = [...QUALITIES].sort((a, b) => n[b] - n[a])
  const dom = sorted[0]
  const second = sorted[1]
  const gap = n[dom] - n[second]
  const isMixed = gap <= MIX_GAP || n[dom] < MIX_MAX
  return { dom, second, gap, isMixed, n }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/quality.test.js`
Expected: PASS (기존 quality 테스트도 모두 PASS).

- [ ] **Step 5: Commit**

```bash
git add src/engine/quality.js src/engine/quality.test.js
git commit -m "feat(engine): classifyBlend shared mixed-blend classifier"
```

---

### Task 2: Selector 연속화 (knife-edge 제거)

**Files:**
- Modify: `src/engine/selector.js` (전체 교체)
- Test: `src/engine/selector.test.js`

**Interfaces:**
- Consumes: `classifyBlend` (Task 1).
- Produces: `selectTemplate({ blend, years, daysPerWeek }) -> 'linearLP'|'dup'|'hypertrophyBlock'|'highFreqPct'|'fiveThreeOne'`.

- [ ] **Step 1: Write the failing test**

`src/engine/selector.test.js`의 describe 안에 추가:

```js
it('slider strength-leaning mix -> dup (no knife-edge)', () => {
  expect(selectTemplate({ blend: B({ power:0.1, strength:0.46, hypertrophy:0.44 }), years:3, daysPerWeek:4 })).toBe('dup')
})
it('slider hyp-leaning mix -> dup (no knife-edge)', () => {
  expect(selectTemplate({ blend: B({ power:0.1, strength:0.44, hypertrophy:0.46 }), years:3, daysPerWeek:4 })).toBe('dup')
})
it('clear strength still -> fiveThreeOne', () => {
  expect(selectTemplate({ blend: B({ power:0.1, strength:0.7, hypertrophy:0.2 }), years:3, daysPerWeek:4 })).toBe('fiveThreeOne')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/selector.test.js`
Expected: FAIL — `46/44`·`44/46`이 `fiveThreeOne`/`hypertrophyBlock`을 반환(기존 knife-edge).

- [ ] **Step 3: Write minimal implementation**

`src/engine/selector.js` 전체 교체:

```js
import { classifyBlend } from './quality.js'

export function selectTemplate({ blend, years, daysPerWeek }) {
  if (years < 1) return 'linearLP'
  const { dom, isMixed } = classifyBlend(blend)
  if (isMixed) return 'dup'
  if (dom === 'hypertrophy') return 'hypertrophyBlock'
  const heavy = dom === 'strength' || dom === 'power'
  if (heavy && daysPerWeek >= 5) return 'highFreqPct'
  if (heavy) return 'fiveThreeOne'
  return 'dup'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/selector.test.js`
Expected: PASS (기존 5개 케이스 포함 전부).

- [ ] **Step 5: Commit**

```bash
git add src/engine/selector.js src/engine/selector.test.js
git commit -m "feat(engine): continuous mixed-blend template selection"
```

---

### Task 3: 볼륨 band mixed→balanced

**Files:**
- Modify: `src/engine/volume.js:1,19-24` (import + `bandForBlend`)
- Test: `src/engine/volume.test.js`

**Interfaces:**
- Consumes: `classifyBlend` (Task 1).
- Produces: `bandForBlend(blend) -> 'strength'|'balanced'|'hypertrophy'` (시그니처 동일).

- [ ] **Step 1: Write the failing test**

`src/engine/volume.test.js`의 `describe('bandForBlend', ...)` 안에 추가:

```js
it('mixed blend -> balanced band', () => {
  expect(bandForBlend({ power:0.1, strength:0.45, hypertrophy:0.45, endurance:0 })).toBe('balanced')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/volume.test.js`
Expected: FAIL — 현재 `strength` 반환(tie→strength).

- [ ] **Step 3: Write minimal implementation**

`src/engine/volume.js` 1행 import 교체:

```js
import { classifyBlend } from './quality.js'
```

`bandForBlend` 함수 교체:

```js
export function bandForBlend(blend) {
  const { dom, isMixed } = classifyBlend(blend)
  if (dom === 'hypertrophy' && !isMixed) return 'hypertrophy'
  if (isMixed) return 'balanced'
  if (dom === 'power' || dom === 'strength') return 'strength'
  return 'balanced'
}
```

(기존 `import { dominantQuality } from './quality.js'`는 `dominantQuality`가 이 파일에서 더 쓰이지 않으면 제거. 다른 사용처 있으면 import 유지.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/volume.test.js`
Expected: PASS (기존 strength/hypertrophy 케이스 포함).

- [ ] **Step 5: Commit**

```bash
git add src/engine/volume.js src/engine/volume.test.js
git commit -m "feat(engine): mixed blend resolves to balanced volume band"
```

---

### Task 4: age 회복 taper (ageScale + weeklySets)

**Files:**
- Modify: `src/engine/volume.js` (`ageScale` 추가, `weeklySets` 4번째 인자)
- Test: `src/engine/volume.test.js`

**Interfaces:**
- Consumes: 기존 `clamp`, `BANDS`, `bandForBlend`, `yearsProgress`, `fatigueScale`.
- Produces: `ageScale(age) -> number` (40 이하 1.0, 60+ 0.85). `weeklySets(blend, years, fatigue, age) -> number` (age 생략 시 기존 동작).

- [ ] **Step 1: Write the failing test**

`src/engine/volume.test.js` 상단 import에 `ageScale` 추가. 파일 끝에 추가:

```js
describe('ageScale', () => {
  it('is 1.0 up to 40 and tapers to 0.85 by 60', () => {
    expect(ageScale(undefined)).toBe(1)
    expect(ageScale(35)).toBe(1)
    expect(ageScale(40)).toBe(1)
    expect(ageScale(60)).toBeCloseTo(0.85, 5)
    expect(ageScale(80)).toBeCloseTo(0.85, 5)
  })
})

describe('weeklySets age taper', () => {
  it('older athlete gets fewer or equal sets', () => {
    const young = weeklySets({ power:0, strength:0, hypertrophy:1, endurance:0 }, 5, 1, 30)
    const old   = weeklySets({ power:0, strength:0, hypertrophy:1, endurance:0 }, 5, 1, 60)
    expect(old).toBeLessThanOrEqual(young)
    expect(old).toBeLessThan(young)
  })
  it('omitting age preserves legacy value', () => {
    expect(weeklySets({ power:0, strength:1, hypertrophy:0, endurance:0 }, 5, 1)).toBe(BANDS.strength.mav)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/volume.test.js`
Expected: FAIL — `ageScale is not a function`.

- [ ] **Step 3: Write minimal implementation**

`src/engine/volume.js`에 `ageScale` 추가(`fatigueScale` 아래):

```js
export function ageScale(age) {
  if (age == null) return 1
  if (age <= 40) return 1
  return clamp(1 - (age - 40) / 20 * 0.15, 0.85, 1)   // 40->1.0, 60+->0.85
}
```

`weeklySets` 교체:

```js
export function weeklySets(blend, years, fatigue, age) {
  const band = BANDS[bandForBlend(blend)]
  const base = band.mev + (band.mav - band.mev) * yearsProgress(years)
  const scaled = Math.round(base * fatigueScale(fatigue) * ageScale(age))
  return clamp(scaled, 4, band.mrv)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/volume.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/volume.js src/engine/volume.test.js
git commit -m "feat(engine): masters age volume taper"
```

---

### Task 5: age를 tuner→generate→planAdapter로 연결

**Files:**
- Modify: `src/engine/tuner.js:5-7`, `src/engine/generate.js:75`, `src/ui/lib/planAdapter.js:4-25`
- Test: `src/engine/tuner.test.js`

**Interfaces:**
- Consumes: `weeklySets(blend, years, fatigue, age)` (Task 4).
- Produces: `tune({ blend, years, daysPerWeek, fatigue, age })` (age 전달). `toEngineProfile(form)` 결과에 `age: form.age` 포함.

- [ ] **Step 1: Write the failing test**

`src/engine/tuner.test.js`에 추가(import에 `tune` 이미 있음):

```js
it('threads age to weeklySets (older -> fewer or equal sets)', () => {
  const blend = { power:0, strength:0, hypertrophy:1, endurance:0 }
  const young = tune({ blend, years:5, daysPerWeek:4, fatigue:1, age:30 })
  const old   = tune({ blend, years:5, daysPerWeek:4, fatigue:1, age:60 })
  expect(old.weeklySets.squat).toBeLessThanOrEqual(young.weeklySets.squat)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/tuner.test.js`
Expected: FAIL — age 미전달이라 young/old 동일(또는 단언 실패는 아님 — 아래 주의). 만약 PASS로 통과하면 Step 3 적용 후에도 의미가 검증되도록, 추가로 `expect(old.weeklySets.squat).toBeLessThan(young.weeklySets.squat)` 한 줄을 더해 FAIL을 강제.

- [ ] **Step 3: Write minimal implementation**

`src/engine/tuner.js` `tune` 시그니처/호출 교체:

```js
export function tune({ blend, years, daysPerWeek, fatigue, age }) {
  const perLiftWeekly = weeklySets(blend, years, fatigue, age)
  const frequency = desiredFrequency('strength', daysPerWeek)
  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = Math.max(1, Math.round(perLiftWeekly / frequency[lift]))
  }
  return { weeklySets: weeklySetsMap, frequency, setsPerSession }
}
```

`src/engine/generate.js:75` 교체:

```js
const tuned = tune({ blend, years, daysPerWeek, fatigue, age: profile.age })
```

`src/ui/lib/planAdapter.js`의 `toEngineProfile` 반환 객체에 한 줄 추가(예: `years` 다음):

```js
    age: form.age,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/tuner.test.js`
Expected: PASS. 위 `toBeLessThan` 추가 줄도 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/tuner.js src/engine/generate.js src/ui/lib/planAdapter.js src/engine/tuner.test.js
git commit -m "feat(engine): thread athlete age into volume tuning"
```

---

### Task 6: strengthHypertrophy 세트 스킴 (zone-cross)

**Files:**
- Modify: `src/engine/setSchemes.js:1` (import), 함수 추가, `SCHEMES` 등록
- Test: `src/engine/setSchemes.test.js`

**Interfaces:**
- Consumes: 기존 `r`(roundToIncrement), `ZONES` (quality.js).
- Produces: `SCHEMES.strengthHypertrophy` (`.expand({ e1rm, baseSets }) -> { sets:[{weight,reps,rpe,label}] }`). 첫 세트 = 근력(strength reps[0]) 헤비, 나머지 = 근비대(hypertrophy repAnchor) 백오프. 항상 ≥2 세트.

- [ ] **Step 1: Write the failing test**

`src/engine/setSchemes.test.js` 상단 import에 `ZONES`(from `./quality.js`)와 `SCHEMES`(from `./setSchemes.js`)가 있는지 확인하고 없으면 추가. 추가:

```js
describe('strengthHypertrophy scheme', () => {
  it('heavy strength top + hypertrophy-rep backoff in one exercise', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 3 })
    expect(sets.length).toBe(3)
    expect(sets[0].reps).toBe(ZONES.strength.reps[0])        // 헤비 탑 저반복
    expect(sets[1].reps).toBe(ZONES.hypertrophy.repAnchor)   // 근비대 백오프
    expect(sets[0].weight).toBeGreaterThan(sets[1].weight)   // 백오프가 더 가벼움
  })
  it('always emits at least a top + one backoff', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 1 })
    expect(sets.length).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/setSchemes.test.js`
Expected: FAIL — `SCHEMES.strengthHypertrophy` undefined.

- [ ] **Step 3: Write minimal implementation**

`src/engine/setSchemes.js` 1행 import 교체:

```js
import { weightFor, ZONES } from './quality.js'
```

`contrastPAP` 함수 아래에 추가:

```js
function strengthHypertrophy({ e1rm, baseSets }) {
  const sZ = ZONES.strength, hZ = ZONES.hypertrophy
  const top = r(e1rm * sZ.pct[1])                 // ~0.92
  const sets = [{ weight: top, reps: sZ.reps[0], rpe: sZ.rpeTarget, label: '탑(근력)' }]
  const back = r(e1rm * hZ.pct[0])                // ~0.67 → 근비대 부하
  for (let i = 1; i < Math.max(2, baseSets); i++)
    sets.push({ weight: back, reps: hZ.repAnchor, rpe: hZ.rpeTarget, label: '백오프(근비대)' })
  return { sets }
}
```

`SCHEMES` 객체에 등록(`contrastPAP` 줄 다음):

```js
  strengthHypertrophy: { labelKey: 'strengthHypertrophy', evidenceTier: 'consensus', fatigue: 3, expand: strengthHypertrophy },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/setSchemes.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/setSchemes.js src/engine/setSchemes.test.js
git commit -m "feat(engine): strengthHypertrophy cross-zone scheme (concurrent backoff)"
```

---

### Task 7: schemeSeed + pickScheme seed/concurrent

**Files:**
- Modify: `src/engine/setSchemes.js` (`schemeSeed` 추가, `pickScheme` 교체)
- Test: `src/engine/setSchemes.test.js`

**Interfaces:**
- Consumes: `SCHEMES.strengthHypertrophy` (Task 6), 기존 `CANDIDATES`/`ACCESSORY`.
- Produces: `schemeSeed(baseLift, role) -> number`. `pickScheme({ quality, role, phase, advanced, weekIndex, seed=0, concurrent=false }) -> string`. concurrent + 비-accessory + strength/power → `strengthHypertrophy`를 후보 맨 앞에 추가. 회전 인덱스 = `(weekIndex + seed) % len`.

- [ ] **Step 1: Write the failing test**

`src/engine/setSchemes.test.js`에 추가(import에 `pickScheme`, 신규 `schemeSeed` 추가):

```js
describe('pickScheme concurrent + seed', () => {
  it('concurrent strength prepends strengthHypertrophy', () => {
    const k = pickScheme({ quality:'strength', role:'comp', phase:'accumulation', advanced:false, weekIndex:0, concurrent:true })
    expect(k).toBe('strengthHypertrophy')
  })
  it('non-concurrent strength keeps default candidate', () => {
    const k = pickScheme({ quality:'strength', role:'comp', phase:'accumulation', advanced:false, weekIndex:0 })
    expect(k).toBe('straight')   // CANDIDATES['strength|accumulation'][0]
  })
  it('concurrent does not affect accessories', () => {
    const k = pickScheme({ quality:'strength', role:'accessory', phase:'accumulation', advanced:false, weekIndex:0, concurrent:true })
    expect(k).toBe('straight')
  })
  it('schemeSeed differs by lift', () => {
    expect(schemeSeed('squat','heavy')).toBe(0)
    expect(schemeSeed('bench','heavy')).toBe(1)
    expect(schemeSeed('deadlift','heavy')).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/setSchemes.test.js`
Expected: FAIL — `schemeSeed is not a function`; concurrent 분기 없음.

- [ ] **Step 3: Write minimal implementation**

`src/engine/setSchemes.js`에 `schemeSeed` 추가(`pickScheme` 위):

```js
// 결정론 seed: 운동/역할별로 주차 회전 시작점을 달리해 1주차 straight 일색 방지
export function schemeSeed(baseLift, role) {
  const liftIdx = { squat: 0, bench: 1, deadlift: 2 }[baseLift] ?? 0
  const roleIdx = { heavy: 0, volume: 1, light: 2, hyper: 0, accessory: 0 }[role] ?? 0
  return liftIdx + roleIdx
}
```

`pickScheme` 교체:

```js
export function pickScheme({ quality, role, phase, advanced, weekIndex = 0, seed = 0, concurrent = false }) {
  let cands = role === 'accessory'
    ? (ACCESSORY[quality] ?? ['straight'])
    : (CANDIDATES[`${quality}|${phase}`] ?? ['straight'])
  if (concurrent && role !== 'accessory' && (quality === 'strength' || quality === 'power')) {
    cands = ['strengthHypertrophy', ...cands]
  }
  cands = cands.filter((k) => !SCHEMES[k].advancedOnly || advanced)
  if (!cands.length) cands = ['straight']
  return cands[(weekIndex + seed) % cands.length]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/setSchemes.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/setSchemes.js src/engine/setSchemes.test.js
git commit -m "feat(engine): pickScheme concurrent candidate + per-slot rotation seed"
```

---

### Task 8: buildExercise 동시 배정 + week-1 seed 연결

**Files:**
- Modify: `src/engine/periodization.js:6,8,25-66` (import + `buildExercise`)
- Test: `src/engine/periodization.test.js`

**Interfaces:**
- Consumes: `classifyBlend` (Task 1), `pickScheme`/`schemeSeed` (Task 7), `SCHEMES.strengthHypertrophy` (Task 6).
- Produces: 동작 변경만(시그니처 동일). mixed blend(`isMixed && n.hypertrophy>=0.25`)에서 strength/power 메인 슬롯 → `strengthHypertrophy` 스킴, 표시 reps = `[strength.reps[0], hypertrophy.reps[1]]`. `ctx.blend` 없으면 concurrent=false.

- [ ] **Step 1: Write the failing test**

`src/engine/periodization.test.js`에 추가(필요 import: `buildWorkingWeeks` from `./periodization.js`, `ZONES` from `./quality.js`, `allEquipment` from `./exercises.js`):

```js
describe('buildWorkingWeeks concurrent (mixed blend)', () => {
  const ctx = () => ({
    e1rm: { squat:200, bench:140, deadlift:240 },
    setsPerSession: { squat:4, bench:4, deadlift:4 },
    style: { squat:{ bar:'low' }, bench:{ grip:'medium' }, deadlift:{ stance:'conventional' } },
    stickingPoint: { squat:'none', bench:'none', deadlift:'none' },
    equipment: allEquipment(),
    advanced: true, regionStatus: {},
    blend: { power:0.1, strength:0.45, hypertrophy:0.45, endurance:0 },
    model: 'adaptive', competition: { on:false, date:'' },
    variationOverride: {}, excludedExercises: [], cueNeed: {},
    peaking: false, totalWeeks: 4,
  })

  it('emits a strengthHypertrophy main exercise with both rep ranges', () => {
    const weeks = buildWorkingWeeks('dup', 4, ctx(), 4)
    const ex = weeks.flatMap(w => w.sessions).flatMap(s => s.exercises)
      .find(e => e.scheme.type === 'strengthHypertrophy')
    expect(ex).toBeTruthy()
    expect(ex.scheme.sets.some(s => s.reps === ZONES.strength.reps[0])).toBe(true)
    expect(ex.scheme.sets.some(s => s.reps === ZONES.hypertrophy.repAnchor)).toBe(true)
    expect(ex.reps).toEqual([ZONES.strength.reps[0], ZONES.hypertrophy.reps[1]])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: FAIL — `strengthHypertrophy` 스킴이 배정되지 않음(ex undefined).

- [ ] **Step 3: Write minimal implementation**

`src/engine/periodization.js` 6·8행 import 교체:

```js
import { ZONES, weightFor, weeklyQualitySchedule, classifyBlend } from './quality.js'
```
```js
import { SCHEMES, pickScheme, schemeSeed } from './setSchemes.js'
```

`buildExercise`에서 `const phase = ...` 줄 다음의 `key`/`scheme`/`expanded` 계산과 return을 교체:

```js
  const phase = phaseFor(ctx.weekIndex ?? 0, ctx.totalWeeks ?? 3, ctx.peaking)
  const cls = ctx.blend ? classifyBlend(ctx.blend) : null
  const concurrent = !!(cls && cls.isMixed && cls.n.hypertrophy >= 0.25)
  const seed = schemeSeed(slot.lift, slot.role)
  const key = pickScheme({ quality, role, phase, advanced: !!ctx.advanced, weekIndex: ctx.weekIndex ?? 0, seed, concurrent })
  const scheme = SCHEMES[key]
  const expanded = scheme.expand({ quality, e1rm: eff, zone: z, baseSets, weekIndex: ctx.weekIndex ?? 0 })
  const displayReps = key === 'strengthHypertrophy'
    ? [ZONES.strength.reps[0], ZONES.hypertrophy.reps[1]]
    : z.reps
  return {
    lift: name,
    baseLift: slot.lift,
    quality,
    reps: displayReps,
    repAnchor: z.repAnchor,
    pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
    rpeTarget,
    weight: weightFor(quality, eff),
    velocity: null,
    autoregulate: true,
    tempo: ex?.tempo ?? null,
    tempoStop: ex?.tempoStop ?? null,
    scheme: { type: key, evidenceTier: scheme.evidenceTier, sets: expanded.sets, note: expanded.note, group: expanded.group },
    sets: expanded.sets.length,
  }
```

(early-return `baseSets < 1` 분기는 그대로 — z.reps 유지.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: 신규 테스트 PASS. (이 파일의 기존 골든 일부가 깨질 수 있음 — Task 10에서 일괄 갱신. 지금은 신규 테스트 PASS만 확인.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/periodization.js src/engine/periodization.test.js
git commit -m "feat(engine): concurrent scheme assignment + week-1 rotation seed in buildExercise"
```

---

### Task 9: equipment 필터 연결 (planAdapter)

**Files:**
- Modify: `src/ui/lib/planAdapter.js:2,16`
- Test: `src/ui/lib/planAdapter.test.js` (신규)

**Interfaces:**
- Consumes: `toEngineProfile(form)` (Task 5에서 age 추가됨).
- Produces: `toEngineProfile` 결과 `equipment = form.equipment`(하드코딩 `allEquipment()` 제거). comp 리프트는 `compVariant`(고정 문자열)라 equipment 필터를 우회 → 항상 생존.

- [ ] **Step 1: Write the failing test**

신규 `src/ui/lib/planAdapter.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { toEngineProfile } from './planAdapter.js'

const form = {
  lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
  years: 3, daysPerWeek: 4, fatigue: 1,
  qualities: { power:0.1, strength:0.45, hypertrophy:0.45, endurance:0 },
  periodizationModel: 'auto',
  style: { squat:{bar:'low'}, bench:{grip:'medium'}, deadlift:{stance:'conventional'} },
  stickingPoint: { squat:'none', bench:'none', deadlift:'none' },
  regionStatus: {},
  equipment: ['barbell','rack','bench'],
  sessionTimeLimit: 60,
  competition: { on:false, date:'' },
  priorityLift: null,
  mesoWeeks: 4, deloadEnabled: false,
  age: 45,
}

describe('toEngineProfile', () => {
  it('passes user equipment through (not allEquipment)', () => {
    expect(toEngineProfile(form).equipment).toEqual(['barbell','rack','bench'])
  })
  it('passes age through', () => {
    expect(toEngineProfile(form).age).toBe(45)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: FAIL — `equipment`가 `allEquipment()`(전체 태그 배열)라 `['barbell','rack','bench']`와 불일치.

- [ ] **Step 3: Write minimal implementation**

`src/ui/lib/planAdapter.js`에서 `import { allEquipment } from '../../engine/exercises.js'` 줄 삭제. `toEngineProfile`의 equipment 줄 교체:

```js
    equipment: form.equipment,
```

(주석 `// Assume the athlete has all equipment...` 줄도 삭제.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/lib/planAdapter.js src/ui/lib/planAdapter.test.js
git commit -m "feat(ui): pass real equipment toggle to engine (filter + manual exclusion coexist)"
```

---

### Task 10: 통합 수용 테스트 + 골든 일괄 갱신

**Files:**
- Modify: `src/engine/generate.test.js` (수용 테스트 추가)
- Modify: 깨진 골든/스냅샷 테스트 전반(`generate.test.js`, `periodization.test.js`, 기타 엔진 테스트의 스킴 시퀀스 단언)
- Test: 전체 스위트

**Interfaces:**
- Consumes: `generate(profile)`, `PRESETS` (quality.js).
- Produces: 없음(검증 태스크).

- [ ] **Step 1: Write the headline acceptance test**

`src/engine/generate.test.js`에 추가(import에 `PRESETS` 필요):

```js
describe('input coupling: powerbuilding vs powerlifting', () => {
  const base = {
    lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
    years: 3, daysPerWeek: 4, fatigue: 1, mesoWeeks: 4, deloadEnabled: false,
  }
  const schemes = (r) => r.weeks.flatMap(w => w.sessions).flatMap(s => s.exercises).map(e => e.scheme.type)

  it('powerbuilding produces within-session concurrent (strengthHypertrophy)', () => {
    const pb = generate({ ...base, qualities: PRESETS.powerbuilding })
    expect(schemes(pb)).toContain('strengthHypertrophy')
  })
  it('powerlifting does NOT use concurrent (clear strength dominant)', () => {
    const pl = generate({ ...base, qualities: PRESETS.powerlifting })
    expect(schemes(pl)).not.toContain('strengthHypertrophy')
  })
  it('restrictive equipment keeps competition lifts and does not crash', () => {
    const r = generate({ ...base, qualities: PRESETS.powerlifting, equipment: ['barbell','rack','bench'] })
    const lifts = r.weeks[0].sessions.flatMap(s => s.exercises).map(e => e.baseLift)
    expect(lifts).toContain('squat')
  })
})
```

- [ ] **Step 2: Run test to verify it fails / surfaces golden drift**

Run: `npx vitest run`
Expected: 신규 수용 테스트는 PASS여야 함(Task 1-9 적용 후). 동시에 **기존 골든/스냅샷 일부 FAIL** — 스킴 시퀀스(seed)·band·동시 스킴 변경 때문. 실패 목록을 수집.

- [ ] **Step 3: 골든 갱신 (의도된 변경만)**

각 실패 테스트를 열어 기대값을 **실제 신규 출력과 대조**해 갱신. 반드시 변경 원인이 (a) week-1 seed 회전, (b) mixed→balanced band, (c) strengthHypertrophy 동시 스킴, (d) selector 연속화 중 하나임을 확인하고 갱신. 원인 불명 실패는 회귀로 간주하고 조사(스킵 금지). 스냅샷은 검토 후 `npx vitest run -u`로 갱신.

- [ ] **Step 4: Run full suite to verify green**

Run: `npx vitest run`
Expected: 전체 PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: acceptance tests for input coupling + golden reconciliation"
```

---

### Task 11: sex/bodyweight 진단전용 고지 + age·concurrent 고지 (LimitsPanel)

**Files:**
- Modify: `src/ui/components/LimitsPanel.jsx` (`<ul>`에 `<li>` 3개 추가)
- Test: `src/ui/components/LimitsPanel.test.jsx` (신규)

**Interfaces:**
- Consumes: 없음.
- Produces: 정직고지 3항목(sex/bodyweight 진단전용, age taper, 동시 백오프).

- [ ] **Step 1: Write the failing test**

신규 `src/ui/components/LimitsPanel.test.jsx`:

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LimitsPanel from './LimitsPanel.jsx'

describe('LimitsPanel disclosures', () => {
  it('discloses sex/bodyweight are diagnostic-only', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/성별·체중은 상대강도 진단/)).toBeTruthy()
  })
  it('discloses age recovery taper', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/나이가 많을수록 볼륨/)).toBeTruthy()
  })
})
```

(저장소의 다른 jsdom 컴포넌트 테스트가 `@testing-library/react`를 쓰는지 확인 — `StrengthAssessment.test.jsx` 패턴을 따른다. 다른 렌더 유틸을 쓰면 그 패턴에 맞춰 import 교체.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/LimitsPanel.test.jsx`
Expected: FAIL — 해당 문구 없음.

- [ ] **Step 3: Write minimal implementation**

`src/ui/components/LimitsPanel.jsx`의 `<ul>` 안 마지막 `<li>` 다음에 추가:

```jsx
        <li>성별·체중은 <strong>상대강도 진단</strong>(엘리트 대비 %·GoodLift 점수)에만 쓰이며, 프로그래밍 부하(세트·반복·무게)에는 근거가 약해 반영하지 않습니다. 의도된 한계입니다.</li>
        <li>나이가 많을수록 볼륨을 점진적으로 낮춥니다(40세까지 동일, 60세 이상 약 15% 감소). 마스터 리프터 회복 특성을 반영한 코칭 컨센서스이며 개인차가 큽니다.</li>
        <li>근력+근비대가 비슷한 비율일 때 한 운동에서 무거운 근력 탑세트 뒤에 근비대 반복의 백오프를 배정합니다(동시 훈련). 코칭 컨센서스 기반입니다.</li>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/components/LimitsPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/LimitsPanel.jsx src/ui/components/LimitsPanel.test.jsx
git commit -m "docs(ui): disclose sex/bodyweight diagnostic-only, age taper, concurrent backoff"
```

---

### Task 12: PROJECT_STATUS 정직고지 갱신 + 빌드 검증

**Files:**
- Modify: `docs/PROJECT_STATUS.md` (§3)

**Interfaces:**
- Consumes: 없음. Produces: 없음.

- [ ] **Step 1: PROJECT_STATUS §3에 항목 추가**

`docs/PROJECT_STATUS.md`의 "## 3. 알려진 한계" 목록 끝에 추가:

```markdown
- 동시(근력 탑+근비대 백오프) 구조와 나이 볼륨 감소는 코칭 컨센서스(RCT 아님)
- 성별·체중은 상대강도 진단 전용 — 프로그래밍 부하 미반영(근거 약함, 의도된 한계)
```

- [ ] **Step 2: 전체 빌드·테스트 검증**

Run: `npx vitest run`
Expected: 전체 PASS.

Run: `npm run build`
Expected: 빌드 성공(에러 없음).

- [ ] **Step 3: Commit**

```bash
git add docs/PROJECT_STATUS.md
git commit -m "docs: note concurrent/age/sex-bodyweight evidence tiers in project status"
```

---

## Self-Review

**Spec coverage:**
- 컴포넌트1(classifyBlend) → Task 1 ✓
- 컴포넌트2(selector 연속화) → Task 2 ✓
- 컴포넌트2(strengthHypertrophy + 동시 배정) → Task 6,7,8 ✓
- 컴포넌트3(week-1 seed) → Task 7,8 ✓
- 컴포넌트4(band mixed→balanced) → Task 3 ✓
- 컴포넌트5(age→회복) → Task 4,5 ✓
- 컴포넌트6(equipment 필터+수동 제외) → Task 9 (수동 제외 `excludedExercises`는 기존 유지) ✓
- 컴포넌트7(sex/bodyweight 진단전용+가시화) → Task 11 ✓
- 테스트(단조성·동시·age·equipment·week-1·골든) → Task 2,4,8,10 ✓
- 정직고지 갱신 → Task 11,12 ✓

**Type consistency:**
- `classifyBlend` 반환 `{dom,second,gap,isMixed,n}` — Task 2/3(`dom`,`isMixed`), Task 8(`isMixed`,`n.hypertrophy`)에서 일치 사용 ✓
- `pickScheme` 신규 파라미터 `seed`,`concurrent` — Task 7 정의, Task 8 호출 일치 ✓
- `weeklySets(blend,years,fatigue,age)` — Task 4 정의, Task 5 `tune`에서 호출 일치 ✓
- `schemeSeed(baseLift,role)` — Task 7 정의, Task 8 호출 일치 ✓
- `SCHEMES.strengthHypertrophy.expand({e1rm,baseSets})` — Task 6 정의, Task 8에서 `scheme.expand({quality,e1rm,zone,baseSets,weekIndex})` 호출(추가 인자 무시되어 안전) ✓

**Placeholder scan:** 없음(모든 코드 단계에 실제 코드 포함).

**주의(구현자):** Task 8·10에서 기존 골든이 깨지는 것은 **의도**. 원인이 4개 변경(seed·band·동시·selector) 중 하나임을 매 실패마다 확인하고, 불명 실패는 회귀로 조사할 것.
