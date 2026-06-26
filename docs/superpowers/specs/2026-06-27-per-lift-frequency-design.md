# 종목별 주 빈도 제어 (Design Spec, 2026-06-27)

라이브 v3 앱 위에 적층. 사용자가 스쿼트·벤치·데드의 **주당 일수**를 직접 정하고, 엔진이 그 빈도대로 주간 layout을 생성한다. 고정 template 선택을 은퇴하고 **layout 생성기**로 단일화한다.

**Decisions (user, 2026-06-27):**
- 직접 입력(종목별 주 일수) → **layout 생성**. 고정 template 대체.
- daysPerWeek = 훈련일 수(canvas). 각 종목 빈도 ≤ daysPerWeek. 엔진이 회복 간격 두고 요일 분배, 하루 여러 종목 허용, 한 종목 하루 최대 1회.
- **freq 0 허용**(종목 완전 제외).
- **생성기 단일화**: `selectTemplate`/고정 layout 은퇴, 출력 `template` 라벨 = `'custom'`.
- 분배 알고리즘·역할 배정·기본값 = 제시안 그대로.

## 핵심 통찰
종목별 빈도가 **layout(슬롯 분포) AND tuner(setsPerSession = weekly/freq) 단일 소스**가 된다. 현재 `frequency.js`(하드코딩)와 template slotCount가 어긋날 수 있던 잠재 불일치가 제거된다. quality 스케줄·setSchemes·periodization 레이어는 layout/slotCounts를 generic하게 소비하므로 주기화 "성격"은 보존된다.

## Global Constraints

- 순수 결정론 엔진(no Date.now/Math.random/I/O). 한글 표시/영어 식별자. 무게 `roundToIncrement`.
- 컴포넌트 테스트 첫 줄 `// @vitest-environment jsdom`. zustand persist `merge` deep-fill, 버전 범프 없음.
- `MAIN_LIFTS = ['squat','bench','deadlift']`. Day = `{lift, role}[]`; layout = `Day[]`(주간, 훈련일만).
- 빈도 분배·역할 = 휴리스틱(균등 간격), 개인 회복차 있음 → 정직고지.

## 컴포넌트 A — Layout 생성기 (신규 `src/engine/layoutGenerator.js`)

```js
import { MAIN_LIFTS } from './exercises.js'

const PHASE = { squat: 0, bench: 1, deadlift: 2 }   // 종목 간 요일 오프셋(분산)

// f회를 D일 canvas에 균등·distinct 배치. f<=D면 floor(i*D/f) 강증가→distinct,
// phase+mod D는 bijection이라 distinct 보존. 결정론.
export function distinctDays(f, D, phase) {
  const days = []
  for (let i = 0; i < f; i++) days.push((phase + Math.floor((i * D) / f)) % D)
  return days
}

// 역할: 첫 세션 heavy(comp), 이후 volume/light 교대(variation).
function roleFor(i) {
  if (i === 0) return 'heavy'
  return i % 2 === 1 ? 'volume' : 'light'
}

// buildLayout -> Day[] (훈련일만, canvas 오름차순). 빈 날은 제외.
export function buildLayout({ daysPerWeek, frequency }) {
  const D = Math.max(1, daysPerWeek)
  const byDay = new Map()   // canvasDay -> slots[]
  for (const lift of MAIN_LIFTS) {
    const f = Math.max(0, Math.min(D, frequency?.[lift] ?? 0))
    if (f === 0) continue
    const days = distinctDays(f, D, PHASE[lift])
    days.forEach((day, i) => {
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day).push({ lift, role: roleFor(i) })
    })
  }
  return [...byDay.keys()].sort((a, b) => a - b).map((d) => byDay.get(d))
}
```

- `frequency` 전부 0 → 빈 layout `[]`(working week 0세션, deload만 가능). generate가 graceful 처리.
- 한 canvas day에 여러 종목 누적 → 하루 다종목 세션.

## 컴포넌트 B — 빈도 기본값 (`src/engine/frequency.js`)

`desiredFrequency`를 기본값 제공자로 재명명·유지(현재 값 보존):

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
(기존 `desiredFrequency(goal, daysPerWeek)` 호출부는 tuner뿐 — 컴포넌트 D에서 교체. 함수 자체는 `defaultFrequency`로 대체.)

## 컴포넌트 C — generate 통합 (`src/engine/generate.js`)

- import 교체: `selectTemplate`/`getTemplate` 제거, `buildLayout`(layoutGenerator) + `defaultFrequency` 추가.
- 빈도 해석: `const frequency = profile.frequency ?? defaultFrequency(daysPerWeek)`. 각 종목 `clamp(0, daysPerWeek)`.
- layout: `const layout = buildLayout({ daysPerWeek, frequency })`.
- `slotCounts`는 layout에서 계산(현행 로직 그대로, 단 template 대신 layout).
- `template` 라벨: `selectTemplate` 제거 → 반환 객체 `template: 'custom'`.
- `cappedSetsPerSession`: 현행 유지(mrv/slotCount 캡). freq 0 종목은 layout에 부재 → slotCount undefined(`|| 1`), e1rm/cappedSetsPerSession이 계산돼도 소비할 슬롯이 없어 **무해**(미사용). e1rm은 위저드가 3종목 1RM 필수라 항상 해석됨.
- `buildWorkingWeeks` 호출: templateKey 대신 **layout** 전달(컴포넌트 E).

## 컴포넌트 D — tuner 빈도 소스 (`src/engine/tuner.js`)

```js
import { weeklySets } from './volume.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ blend, years, daysPerWeek, fatigue, age, frequency }) {
  const perLiftWeekly = weeklySets(blend, years, fatigue, age)
  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    const f = frequency?.[lift] ?? 0
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = f > 0 ? Math.max(1, Math.round(perLiftWeekly / f)) : 0
  }
  return { weeklySets: weeklySetsMap, frequency, setsPerSession }
}
```
- `desiredFrequency` import 제거. `frequency`를 generate가 전달(해석된 값). f=0 → setsPerSession 0(슬롯 없음과 일관, 0 나눗셈 방지).
- generate `tune({...})` 호출에 `frequency` 추가.

## 컴포넌트 E — buildWorkingWeeks가 layout 수용 (`src/engine/periodization.js`)

- 시그니처: `buildWorkingWeeks(layout, ctx, totalWeeks = 3)` (templateKey/daysPerWeek 제거 — layout이 일·슬롯 모두 보유).
- `getTemplate` import 제거. `slotTypeForRole` import 유지.
- 내부: `const layoutDays = layout`(직접). slotCounts·주차 빌드 동일 로직, `template.layouts[daysPerWeek]` 대신 `layout` 사용.
- 빈 layout(`[]`) → weeks의 sessions `[]` (graceful).
- generate 호출부 갱신: `buildWorkingWeeks(layout, ctx, mesoWeeks)`.

## 컴포넌트 F — templates/selector 은퇴

- `src/engine/selector.js`: `selectTemplate` 제거 → 파일 삭제. `selector.test.js` 삭제.
- `src/engine/templates.js`: `TEMPLATES`/`getTemplate`/layout 상수 제거. **`slotTypeForRole` 유지**(periodization 사용). `ROLE`은 미사용이면 제거. `templates.test.js`는 잔존 export(slotTypeForRole)만 테스트하도록 갱신.
- 다른 import 깨짐 없음 확인(grep: selectTemplate/getTemplate은 generate·periodization만).

## 컴포넌트 G — 배선 (store/adapter/UI)

- `profileStore.js`: `DEFAULT_PROFILE`에 `frequency: { squat: 2, bench: 2, deadlift: 1 }` 추가; `merge`에 deep-fill `frequency: { ...current.profile.frequency, ...(p.frequency||{}) }`; 신규 액션 `setFrequency: (lift, value) => set((s) => ({ profile: { ...s.profile, frequency: { ...s.profile.frequency, [lift]: value } } }))` (style/stickingPoint 패턴 동형).
- `planAdapter.js` `toEngineProfile`: `frequency: form.frequency` 추가.
- UI: `StepEquipment.jsx`(daysPerWeek 옆)에 종목별 `<select>` 3개(0..p.daysPerWeek), `setFrequency(lift, Number(value))`로 갱신. 라벨 한글(스쿼트/벤치/데드리프트 주 빈도).

## 컴포넌트 H — 정직고지

- `LimitsPanel.jsx` + `PROJECT_STATUS.md §3`: 빈도 분배·역할 배정 = 균등 간격 휴리스틱(개인 회복차 있음); 종목당 컴페티션 1일 + 변형 구성. honest tier.

## 데이터 흐름

`profileStore.frequency` → `toEngineProfile` → `generate`: `frequency` 해석(clamp/default) → `buildLayout`(layout) + `tune`(setsPerSession). layout → `buildWorkingWeeks`.

## 테스트

- **생성기(`layoutGenerator.test`)**: `distinctDays(3,5,0)` distinct·범위; `buildLayout` 종목별 슬롯수 = freq; 종목 하루 1회(한 day에 같은 lift 중복 없음); 종목당 heavy 정확히 1; freq 0 → 그 종목 부재; 전부 0 → `[]`.
- **tuner(`tuner.test`)**: setsPerSession = round(weekly/freq); freq 0 → 0; 기존 age 테스트 `frequency` 추가해 갱신.
- **generate(`generate.test`)**: 커스텀 빈도(예 squat3/bench1/deadlift0) → squat 3슬롯·bench 1·deadlift 0; `template==='custom'`; 빈도 합 = 총 메인 슬롯. 기존 골든(template 이름 등) 갱신.
- **은퇴**: `selector.test` 삭제; `templates.test` slotTypeForRole만.
- **배선(`planAdapter.test`)**: frequency 통과. UI jsdom 토글.

## Out of scope (후속)
- 빈도별 회복 경고(예: 데드 4x 과함) 자동 안내.
- 종목별 빈도에 따른 볼륨 랜드마크 재보정(현재 종목 무관 동일 weekly).
- 운동명 한글화.
