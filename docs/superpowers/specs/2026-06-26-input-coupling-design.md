# 입력-커플링 정비 (Design Spec, 2026-06-26)

라이브 v3 앱 위에 적층. 사용자 불만 "어떤 변수를 넣든 루틴이 다 비슷비슷하다"의 근본 원인을 제거한다. 핵심은 blend(자질 슬라이더)가 **연속적으로** 루틴 구조에 반영되게 하고, 동시(concurrent/powerbuilding) 훈련을 **세션 내**에서 표현하는 것.

**Decisions (user, 2026-06-26):**
- 방향 = **근거 안에서 차이 키우기**(arbitrary 변동 아님). 대표 불만: 파워빌딩이 파워리프팅과 거의 동일하게 출력 — strength 탑 + hypertrophy 백오프가 같은 세션에 있어야 함.
- 범위 = **전부(A3)**: 세션 내 혼합 + selector 세분화 + 죽은 입력 연결 + week-1 다양성.
- sex/bodyweight = **진단전용 유지 + 가시화**(루틴 수치 불변, "왜 안 바뀌는지" UI 명시). 근거 약함(PROJECT_STATUS §3·§4 "여성·연령별 보정"은 보류).
- equipment = **장비 필터 + per-exercise 수동 제외 둘 다 공존**.
- age = 회복/볼륨에 실제 연결(masters taper, consensus tier).

## 진단 (재현 완료, 2026-06-26)

엔진을 실제 실행해 확인한 3대 원인 + 1 부수:

1. **Selector knife-edge** (`selector.js`). `isBalanced = sorted[0] === sorted[1]`은 두 자질이 **정확히** 같을 때만 mixed로 본다. 프리셋(0.45===0.45)에서만 성립. 슬라이더로는 거의 never → 1% 차이로 순수 strength(`fiveThreeOne`)↔순수 hyp(`hypertrophyBlock`) 양극단만 출력. **슬라이더를 아무리 움직여도 결과가 사실상 2종.** (재현: 46/44→fiveThreeOne, 44/46→hypertrophyBlock.)
2. **세션 내 quality 미혼합** (`periodization.js`). quality는 운동 슬롯당 1종. 파워빌딩 50/50은 **요일별**로 갈림(D1·D2 순수 strength, D3·D4 순수 hyp). 단일 세션만 보면 파워리프팅 세션과 동일. "헤비 5rep 탑 + 10rep 근비대 백오프 같은 날" 구조 표현 불가. (재현: 64 strength / 64 hyp 세트지만 전부 단일-자질 세션.)
3. **Week-1 항상 straight** (`setSchemes.js pickScheme`). `cands[weekIndex % len]`, week0 = `cands[0]` = 대부분 `straight`. 모든 자질·프리셋의 1주차가 평평한 straight → 첫인상 동일.
4. (부수) **`bandForBlend` tie→strength**. mixed blend도 strength band(mev6/mav10)로 떨어져 hypertrophy 볼륨 부족.

## Global Constraints

- 순수 결정론 엔진 유지(no Date.now/Math.random/I/O). 기존 골든 테스트 패턴 따름.
- 한글 표시 = i18n 맵, 엔진 값 = 영어 식별자. 무게 = `roundToIncrement`.
- 컴포넌트 테스트 첫 줄 `// @vitest-environment jsdom`.
- zustand persist `merge`가 신규 필드 deep-fill, 버전 범프 없음(`age`는 이미 profileStore에 존재).
- 무게는 오토레귤레이션 **제안치**("자동조절") 원칙 유지.
- 근거 tier 정직고지: 신규 동시 스킴·age taper = **consensus**, RCT 아님.

## 공유 헬퍼: `src/engine/quality.js`

selector와 volume이 같은 mixed 판정을 쓰도록 단일 분류 함수 추가(중복 제거).

```js
export const MIX_GAP = 0.15   // top-2 간격이 이하이면 혼합
export const MIX_MAX = 0.55   // 최대 자질이 이하이면 (지배 자질 없음) 혼합

// classifyBlend(blend) -> { dom, second, gap, isMixed }
//   n = normalizeBlend(blend)
//   정렬해 top1/top2 자질·값 산출
//   isMixed = (n[top1] - n[top2] <= MIX_GAP) || (n[top1] < MIX_MAX)
export function classifyBlend(blend) { ... }
```

- `dom` = 최대 자질, `second` = 2위 자질, `gap` = 값 차, `isMixed` = 불리언.
- 순수 함수, 기존 `normalizeBlend`/`dominantQuality` 재사용.

## 컴포넌트 1 — Selector 연속화: `src/engine/selector.js`

`isBalanced` 정확-tie 제거, `classifyBlend` 사용.

```
selectTemplate({ blend, years, daysPerWeek }):
  if years < 1            -> 'linearLP'          // 초보 LP 우선(기존)
  const { dom, isMixed } = classifyBlend(blend)
  if isMixed             -> 'dup'                // 동시 친화(요일 undulation + 세션 내 혼합은 컴포넌트2)
  if dom === 'hypertrophy' -> 'hypertrophyBlock'
  const heavy = dom === 'strength' || dom === 'power'
  if heavy && daysPerWeek >= 5 -> 'highFreqPct'
  if heavy               -> 'fiveThreeOne'
  -> 'dup'
```

- 효과: 슬라이더가 mixed 영역(top-2 ≤0.15 간격 **또는** 최대 <0.55)을 매끄럽게 통과 → knife-edge 제거. 명확한 지배 자질일 때만 순수 template.
- `dup`을 동시 template로 재사용(신규 layout 불필요). 세션 내 혼합은 컴포넌트2가 담당.

## 컴포넌트 2 — 세션 내 quality 혼합

### 2a. 신규 스킴 `strengthHypertrophy`: `src/engine/setSchemes.js`

zone을 가로지르는 동시 스킴. 헤비 근력 탑세트 + 근비대 rep 백오프(같은 운동).

```js
function strengthHypertrophy({ e1rm, baseSets }) {
  const sZ = ZONES.strength, hZ = ZONES.hypertrophy
  const top = r(e1rm * sZ.pct[1])                 // ~0.92
  const sets = [{ weight: top, reps: sZ.reps[0], rpe: sZ.rpeTarget, label: '탑(근력)' }]
  const back = r(e1rm * hZ.pct[0])                // ~0.67 → 근비대 부하
  for (let i = 1; i < baseSets; i++)
    sets.push({ weight: back, reps: hZ.repAnchor, rpe: hZ.rpeTarget, label: '백오프(근비대)' })
  return { sets }
}
```

- 예: 185×2 @RPE8.5 탑 + 135×9 @RPE8.5 백오프 ×N. 진짜 powerbuilding 구조.
- `SCHEMES`에 등록: `{ evidenceTier: 'consensus', fatigue: 3, expand: strengthHypertrophy }`.
- 최소 baseSets 2 보장(탑+백오프 1 이상). baseSets 1이면 백오프 없이 탑만(드물게).

### 2b. 동시 배정 로직: `src/engine/periodization.js` + `pickScheme`

`buildExercise`가 ctx.blend로 동시 여부 판단. quality가 strength/power이고 blend에 hypertrophy가 유의미(`n.hypertrophy >= 0.25`)하면 `strengthHypertrophy`를 후보에 포함.

```
// pickScheme에 concurrent 플래그 추가
pickScheme({ quality, role, phase, advanced, weekIndex, seed = 0, concurrent = false }):
  let cands = role==='accessory' ? ACCESSORY[...] : CANDIDATES[`${quality}|${phase}`] ?? ['straight']
  if concurrent && (quality==='strength' || quality==='power') && role!=='accessory':
      cands = ['strengthHypertrophy', ...cands]   // 동시일 때 우선
  cands = cands.filter(advancedOnly 게이트)
  return cands[(weekIndex + seed) % cands.length]   // seed = 컴포넌트3
```

- `buildExercise`에서 `concurrent = classifyBlend(ctx.blend).isMixed && (ctx.blend.hypertrophy >= 0.25)` 계산해 전달.
- comp 슬롯·variation 슬롯 모두 적용(`role !== 'accessory'`) — 메인 리프트가 동시 구조의 핵심. accessory는 제외(이미 hyp 볼륨 담당).
- 표시용 `exercise.reps`: strengthHypertrophy일 때 합산 범위 `[sZ.reps[0], hZ.reps[1]]`(예 [2,12]) 사용. per-set 값은 `scheme.sets`가 정확히 보유(UI는 세트별 우선 표시 — 기존 동작).

## 컴포넌트 3 — Week-1 다양성: `src/engine/setSchemes.js pickScheme`

rotation에 per-슬롯 seed 도입 → 1주차가 운동마다 다른 스킴, 항상 straight 탈피.

```js
// 안정적 seed (결정론): baseLift+role → 작은 정수
export function schemeSeed(baseLift, role) {
  const liftIdx = { squat: 0, bench: 1, deadlift: 2 }[baseLift] ?? 0
  const roleIdx = { heavy: 0, volume: 1, light: 2, hyper: 0, accessory: 0 }[role] ?? 0
  return liftIdx + roleIdx
}
```

- `buildExercise`가 `seed = schemeSeed(slot.lift, slot.role)`를 `pickScheme`에 전달.
- 인덱스 = `(weekIndex + seed) % len`. week0이라도 bench/deadlift는 cands[1]/cands[2]에서 시작 → 평평한 straight 일색 제거.
- accessory는 **변경 없음**(`withAccessoryScheme`의 기존 `weekIndex + i` 유지) — 메인 리프트만 seed 적용해 churn 최소.
- **주의:** 이 변경은 다수 골든 테스트의 스킴 시퀀스를 바꾼다(의도된 churn). 골든 갱신 필요.

## 컴포넌트 4 — 볼륨 band mixed→balanced: `src/engine/volume.js`

```
bandForBlend(blend):
  const { dom, isMixed } = classifyBlend(blend)
  if dom === 'hypertrophy' && !isMixed -> 'hypertrophy'
  if isMixed                           -> 'balanced'
  if dom === 'power' || dom === 'strength' -> 'strength'
  -> 'balanced'
```

- mixed blend → `balanced` band(mev8/mav13/mrv18) → powerbuilding hypertrophy 볼륨↑.
- `generate.js`의 `mrv` 캡도 동일 `bandForBlend` 경유 → 자동 일관.

## 컴포넌트 5 — age → 회복: `src/engine/volume.js` + `tuner.js` + `generate.js` + `planAdapter.js`

```js
// volume.js
export function ageScale(age) {
  if (age == null) return 1
  if (age <= 40) return 1
  return clamp(1 - (age - 40) / 20 * 0.15, 0.85, 1)   // 40→1.0, 60+→0.85
}
export function weeklySets(blend, years, fatigue, age) {
  ... base * fatigueScale(fatigue) * ageScale(age) ...
}
```

- `tune({ blend, years, daysPerWeek, fatigue, age })` → `weeklySets(blend, years, fatigue, age)`.
- `generate.js`가 `profile.age`를 `tune`에 전달.
- `planAdapter.toEngineProfile`에 `age: form.age` 추가(현재 누락).
- 근거: masters 리프터 ~10–15% 볼륨 감소·회복 증가(consensus). UI 정직고지.

## 컴포넌트 6 — equipment 필터 + 수동 제외: `planAdapter.js` (+ 검증 `variations.js`/`accessories.js`)

- `toEngineProfile`: `equipment: allEquipment()` 하드코딩 제거 → `equipment: form.equipment`.
- `variations.pick`·`accessories.select`는 이미 `equipment` 인자로 후보 필터(검증 후 보완). per-exercise `excludedExercises`는 그 위 레이어로 유지 → **둘 공존**.
- **가드:** 메인 컴페티션 리프트(squat/bench/deadlift comp 변형)는 장비와 무관하게 항상 허용(파워리프터는 바벨 보유 전제). `resolveName`의 comp 분기(`compVariant`)는 필터 우회 — 빈 풀로 인한 크래시 방지.
- equipment 비었거나 누락 → 기본 `['barbell','rack','bench']`(기존 generate.js 기본값) fallback.

## 컴포넌트 7 — sex/bodyweight 진단전용 + 가시화: UI만

- 엔진 변경 **없음**. 루틴 수치 불변.
- `StrengthAssessment.jsx`(또는 `LimitsPanel`)에 노트 추가: sex·bodyweight는 **상대강도 진단**(IPF GoodLift / 엘리트 비율, `standards.js`)에만 사용, 프로그래밍 부하에는 근거 약해 미반영. honest tier 표기.
- 기존 `standards.assess` 진단 결과를 위저드/요약에서 더 드러냄(약점 종목·상대강도 수준).
- i18n 라벨 추가.

## 데이터 흐름 / 프로파일 변경

- `toEngineProfile` (planAdapter.js): `+age: form.age`, `equipment: form.equipment`(하드코딩 제거). sex/bodyweight는 standards 경로 유지(이미 store→StrengthAssessment).
- `generate.js`: `profile.age` → `tune`. `ctx.blend`는 이미 존재 → `buildExercise` 동시 판정에 사용.
- 신규 export: `quality.classifyBlend`/`MIX_GAP`/`MIX_MAX`, `volume.ageScale`, `setSchemes.schemeSeed`.

## 테스트 (Vitest)

신규/갱신:
- **selector 단조성**: 슬라이더 50/40·46/44·45/45·44/46·40/50 스윕 → mixed 영역이 연속(knife-edge 없음), 명확 지배일 때만 순수 template. (`selector.test`)
- **classifyBlend**: 경계값(gap=0.15, max=0.55) 판정. (`quality.test`)
- **동시 세션 구조**: powerbuilding 프리셋 → 최소 한 메인 세션에 strength rep 탑 + hypertrophy rep 백오프가 **같은 운동**에 공존(`scheme.sets`에 2rep·9rep 모두). (`generate.test`/`periodization.test`)
- **band mixed→balanced**: mixed blend → `balanced`. (`volume.test`)
- **age taper**: ageScale(35)=1, ageScale(60)=0.85, weeklySets 단조 감소. (`volume.test`)
- **equipment 필터**: 제한 장비 → 후보 풀 축소하되 comp 리프트 항상 잔존, 크래시 없음. (`variations.test`/`generate.test`)
- **week-1 비-straight**: 1주차에서 운동 간 스킴이 전부 straight가 아님. (`generate.test`)
- **골든 갱신**: 컴포넌트3 rotation 변경분 반영.

## 정직고지 갱신 (`docs/PROJECT_STATUS.md` §3)

- 동시(strength+hypertrophy 백오프) = 코칭 컨센서스(RCT 아님).
- age taper = 컨센서스(개인차 큼).
- sex/bodyweight = 진단전용(프로그래밍 부하 미반영, 근거 약함 — 의도된 한계).

## Out of scope (후속)

- sex/연령별 표준 **수치** 보정(PROJECT_STATUS 장기 항목 유지).
- 다종목 묶음 오케스트레이션, VBT, 진행 추적.
- 동시 스킴의 정밀 백오프 % 개인 보정(현재 zone 고정값).
