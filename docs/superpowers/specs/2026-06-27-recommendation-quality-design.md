# 추천 품질 개선 (Design Spec, 2026-06-27)

라이브 v3 앱 위에 적층. 변형·보조 운동 선택과 메인 볼륨이 "이상하게" 나오는 3건을 수정한다. 공통 뿌리는 **알파벳 tie-break + 선호 신호 부재**(변형·보조)와 **세트 스킴이 처방 볼륨을 무시**(메인)다.

**Decisions (user, 2026-06-27):**
- 범위 = 추천 품질 #2/#3/#4 한 spec. 종목별 주 빈도 제어(#1)는 별도 후속 spec(레이아웃 생성 손댐).
- #2 변형 tie-break = **큐레이션 기본 우선순위**(알파벳 대신).
- #3 메인 백오프 볼륨 = **1세트 강화기법을 메인에서 제거(보조 전용) + 잔여 스킴이 처방 setsPerSession 준수**. baseline 볼륨은 그대로(근거 랜드마크 유지).
- #4 보조 = **기본 머신·안정 선호 + `accessoryPreference` 토글**(machine/free/any), 기본 'machine'.

## 진단 (재현 완료, 2026-06-27)

1. **박스스쿼트 과추천** (`variations.js`). `pick`의 정렬 tie-break이 `a.name.localeCompare(b.name)`(알파벳)뿐. low-bar 기본 스타일에서 Box/Pin/SSB Box가 `styleBias:['low-bar']`로 동점(+1)되면 `Box` < `Pin` < `SSB` → **Box Squat 항상 승**. high-bar는 전부 score 0 → `Anderson` 승. 코칭 결정이 아니라 알파벳 인공물.
2. **메인 백오프 볼륨 적음** (`setSchemes.js`). `restPause`/`dropSet`/`widowmaker`/`myoReps`는 처방 `baseSets`를 무시하고 **고정 1세트**를 낸다. `restPause`(hypertrophy|accumulation 후보)·`widowmaker`(endurance|accumulation 후보)가 **메인 컴파운드**에 배정되면 메인 세션이 working 1세트로 붕괴. 재현: 4일 powerlifting wk1 D4 bench `restPause` = 1 working set.
3. **보조 머신 선호 안 됨** (`accessories.js`). 풀에 머신 多(Leg Press, Hack Squat(machine), Leg Extension, Belt Squat, GHR machine). 단 `select` 점수 = 근육 emphasis(+stickingPoint 0.5)뿐, tie-break 알파벳. Box Step-Up(quads/glutes)이 Leg Press(quads/glutes)와 동점 → `Box` < `Leg` → **Box Step-Up 승**. 머신·안정성 선호 신호 자체가 없음.

## Global Constraints

- 순수 결정론 엔진(no Date.now/Math.random/I/O). 한글 표시/영어 엔진 식별자. 무게 = `roundToIncrement`.
- 컴포넌트 테스트 첫 줄 `// @vitest-environment jsdom`. zustand persist `merge` deep-fill, 버전 범프 없음.
- 근거 tier 정직고지: 변형 priority·머신 선호 = 코칭 컨센서스/선호(RCT 강제 아님).
- DB(`src/data/exercises.json`)는 정적; 엔진은 읽기만. 변형 68개·보조 136개.
- **하이브리드 분류**: 손으로 204개 태깅 대신 **코드 분류 + JSON override 필드**. 기본은 결정론 분류 함수, 예외만 JSON에 명시. 새 운동 자동 분류.

## 컴포넌트 A — 변형 tie-break (#2)

### A1. `src/engine/variations.js`

`priorityOf` 도입, 정렬 tie-break에 삽입(알파벳 위 우선순위, 알파벳은 최종 fallback).

```js
// 전문(specialty)·niche 변형 stem — 표준 변형보다 후순위
const SPECIALTY = [
  'box squat', 'ssb box', 'zercher', 'hatfield', 'anderson', 'cambered',
  'duffalo', 'buffalo', 'zombie', 'cyclist', 'heel-elevated', 'hack',
  'sissy', 'safety squat bar',
]
function isSpecialty(name) {
  const n = name.toLowerCase()
  return SPECIALTY.some((s) => n.includes(s))
}
// 낮을수록 우선. 명시 priority가 있으면 그것, 없으면 표준40/전문70.
export function priorityOf(ex) {
  if (typeof ex.priority === 'number') return ex.priority
  return isSpecialty(ex.name) ? 70 : 40
}
```

`pick`의 정렬 교체:

```js
return [...pool].sort((a, b) =>
  (score(b) - score(a)) ||
  (priorityOf(a) - priorityOf(b)) ||
  a.name.localeCompare(b.name)
)[0]
```

- 효과: 동점 스타일 bias에서 표준 변형(Pause/Tempo/Pin/Front/Deficit/RDL/grip·stance 변형)이 specialty(Box/Zercher/SSB 등)를 이김. Box Squat은 명시 stickingPoint가 box를 요구할 때만 점수로 올라옴.
- `pick`이 stickingPoint 일치(+2)를 우선하므로, 사용자가 특정 스티킹포인트를 고르면 그 매칭이 여전히 우선(priority는 그 다음). 의도된 순서.
- 명시 override가 필요한 소수 변형만 JSON에 `priority` 추가(예: comp-근접 pause를 더 낮게). 기본 2단계로 충분하면 JSON 변경 없음.

### A2. (선택) JSON override
`src/data/exercises.json`의 특정 변형에 `"priority": <int>` 추가는 옵션. 1차 구현은 코드 2단계(40/70)만으로 acceptance 충족; override는 필요 시.

## 컴포넌트 B — 메인 볼륨 (#3)

### B1. `src/engine/setSchemes.js`

1세트 강화기법에 `accessoryOnly: true` 플래그 추가(`advancedOnly`와 동형):

```js
restPause:   { ..., accessoryOnly: true, ... }
dropSet:     { ..., accessoryOnly: true, ... }
myoReps:     { ..., accessoryOnly: true, ... }
widowmaker:  { ..., accessoryOnly: true, ... }
```

`pickScheme` 필터에 추가(메인=비-accessory role에서 제외):

```js
cands = cands.filter((k) => !SCHEMES[k].advancedOnly || advanced)
cands = cands.filter((k) => role === 'accessory' || !SCHEMES[k].accessoryOnly)
if (!cands.length) cands = ['straight']
```

- 효과: 메인 컴파운드는 어떤 quality|phase에서도 restPause/dropSet/myoReps/widowmaker를 받지 않음 → straight/탑백오프/피라미드/wave/amrap/cluster/ramping/strengthHypertrophy 등만. 이들은 `baseSets`(처방 setsPerSession) 준수 → 메인 working 볼륨 회복.
- ACCESSORY 후보(`ACCESSORY` 테이블)는 영향 없음 — 보조는 여전히 이 기법들 사용.
- `wave`는 wave-count 고정(1웨이브=3세트, baseSets≥6=2웨이브) — ≥3이라 1세트 붕괴 아님, 허용.
- baseline `setsPerSession`/볼륨 랜드마크는 변경 없음(결정에 따름).

## 컴포넌트 C — 보조 머신 선호 (#4)

### C1. movementType 분류 — `src/engine/accessories.js`

```js
const MACHINE_EQUIP = ['machine', 'leg press machine', 'hack squat machine',
  'ghr machine', 'belt squat machine', 'cables', 'smith', 'preacher']
const SKILL_RX = /step-up|sled|yoke|sissy|dragon flag|kettlebell|kb swing|pistol|nordic|cossack|single-leg|single-arm|farmer|landmine twist|russian twist/i

// 명시 movementType 있으면 그것, 없으면 분류.
export function movementTypeOf(ex) {
  if (ex.movementType) return ex.movementType
  if (ex.equipment.some((e) => MACHINE_EQUIP.some((m) => e.includes(m)))) return 'machine'
  if (SKILL_RX.test(ex.name)) return 'skill'
  return 'free'
}
```

### C2. 선호 가중 — `src/engine/accessories.js select`

`select`에 `accessoryPreference = 'machine'` 인자 추가. 점수에 선호 보너스 합산:

```js
function prefBonus(type, pref) {
  if (pref === 'any') return 0
  // skill 운동(box step-up/sled/sissy/kb 등)을 강하게 강등(-0.5)이 핵심 레버;
  // 선호 타입(machine 또는 free)에는 가벼운 nudge(+0.3)만.
  if (type === 'skill') return -0.5
  if (pref === 'machine') return type === 'machine' ? 0.3 : 0
  if (pref === 'free')    return type === 'free'    ? 0.3 : 0
  return 0
}
```
`score(e)`에 `+ prefBonus(movementTypeOf(e), accessoryPreference)` 추가.
- skill 감점(−0.5)이 강한 레버 → box step-up/sled/sissy/kb 등은 emphasis 근소차를 넘어 강등.
- 선호 타입 nudge(+0.3) = 작아서 큰 emphasis 차(타겟이 분명히 나은 운동)는 못 뒤집고 동점·근소차만 정리.
- 검증 예(low-bar squat): Leg Press(machine, emphasis 1.2 +0.3 = 1.5) > Box Step-Up(skill, 1.2 −0.5 = 0.7).
- 기본 'machine': 머신류 우선, skill 강등. 'free': 프리웨이트 우선, skill 강등. 'any': emphasis만(현행).

### C3. 토글 배선
- `src/ui/store/profileStore.js`: `accessoryPreference: 'machine'`(기본) 추가.
- `src/ui/lib/planAdapter.js` `toEngineProfile`: `accessoryPreference: form.accessoryPreference` 추가.
- `src/engine/generate.js`: `select({ ..., accessoryPreference: profile.accessoryPreference })` 전달(현재 `select` 호출부에 인자 추가).
- 위저드 컨트롤: `StepEquipment.jsx`(또는 StepStyle)에 3-옵션 선택(머신 선호/프리웨이트 선호/무관) + i18n 라벨.

## 컴포넌트 D — 정직고지

- `LimitsPanel.jsx` + `PROJECT_STATUS.md §3`: 머신 vs 프리웨이트 = 효과 유사·선호/안정성 선택(근거 강제 아님); 변형 우선순위 = 코칭 컨센서스(표준 변형 우선, 특수 변형은 목적형). honest tier.

## 데이터 흐름

`profileStore.accessoryPreference` → `toEngineProfile` → `generate` → `select(..., accessoryPreference)`.
변형 `priorityOf`·보조 `movementTypeOf`는 정적(코드 분류 + 선택적 JSON override). 엔진 순수성 유지.

## 테스트 (Vitest)

- **변형(`variations.test`)**: low-bar squat, stickingPoint='none' → 결과가 Box Squat **아님**(표준 변형). `priorityOf`: specialty=70, 표준=40, 명시 override 반영. stickingPoint 매칭은 여전히 priority보다 우선.
- **볼륨(`setSchemes.test`/`generate.test`)**: 메인(role≠accessory)에서 `pickScheme`가 restPause/dropSet/myoReps/widowmaker 절대 반환 안 함(전 phase). 보조는 여전히 가능. 메인 세션 working 세트수 ≥ 처방(1세트 붕괴 없음).
- **보조(`accessories.test`)**: `movementTypeOf` 분류(Leg Press→machine, Box Step-Up→skill, Barbell Curl→free). 기본 machine 선호 → Leg Press류가 Box Step-Up보다 상위; 'free' → 역전(프리 우선); 'any' → emphasis만.
- **배선(`planAdapter.test`)**: accessoryPreference 통과. (UI 토글 jsdom 테스트.)
- **골든 갱신**: 변형·보조 선택 변경분(의도) 반영.

## 정직고지 갱신 (`docs/PROJECT_STATUS.md` §3)
- 보조 머신/프리웨이트 선호 = 효과 유사, 선호·안정성(근거 강제 아님).
- 변형 우선순위 = 코칭 컨센서스(표준 우선).

## Out of scope (후속)
- #1 종목별 주 빈도 직접 설정(별도 spec — 레이아웃 생성·위저드).
- 보조/변형 운동명 한글화(기존 로드맵).
- 보조 movementType의 정밀 개인 보정.
