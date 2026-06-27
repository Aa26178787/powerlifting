# 사용자 볼륨 Override + 자동추천 (2026-06-28)

> 3관점(dose 모델 엔지니어·UX/제품·스포츠과학/안전) 병렬 설계 → 디렉터 합성. 볼륨 파이프라인(generate.js:116-127·tuner·periodization·buildExercise) 코드 검증. 사용자 요청: 메인/보조 주간·세션당 세트 직접 선택 + "자동추천" 버튼.

## 핵심 결론
**override = `setsPerSession`(시작주 floor) literal 대체. 기본 모드는 generate.js 한 곳 주입 → 기존 ramp/taper/cap/floor 합성 경로 그대로 → 추천값 적용 시 현 plan 비트동일. 고정 모드는 periodization 1줄 가드로 ramp·cap 해제(경고). 모든 경계는 차단 아닌 경고.**

## Override 항목
| 대상 | store | 단위 | 범위 |
|---|---|---|---|
| 메인 세션당 (종목별 독립) | `main.setsPerSession[lift]` | 세트/세션/슬롯 | 1–12 |
| 메인 주간 | (UI 파생, 미저장) | 세트/주(시작주) | — |
| 보조 세션당 (공유 개수) | `accessory.setsPerSession` | 보조 운동 개수 | 0–8 |

- **canonical = setsPerSession 단일**(weekly는 UI 파생 = `setsPerSession×freq`). 2-source-of-truth·라운드트립 손실 회피(관점 갈림1 수렴).
- 보조 세트수는 override 불가(scheme 자동) → 레버는 "세션당 보조 개수"뿐(정직 고지).

## Override × 파이프라인 의미론 (핵심)
**2모드 명시 선택, 기본 = `rampFromFloor`.**

| 요소 | Mode A `rampFromFloor`(기본) | Mode B `fixed`(opt-in) |
|---|---|---|
| accumulate/maintain ramp | **적용**(override=시작주 base) | 무시(flat) |
| taper(대회 peaking) | **적용**(inverse-V 보존·피크 감량) | 무시, 최고경고 |
| PER_SESSION_CAP·MRV cap | **clamp**(+경고) | 해제(warn-only) |
| taperFloor | 적용 | 적용(안전 하한) |
| 데드 0.6× · priority +1 | override 종목 우회/skip | 우회/skip |
| regionStatus 0세트 안전 | 유지 | 유지 |

### ★핵심 불변식 (Mode A=clamp 이유)
"override 미지정→비트동일" ∧ "추천=현 엔진 산출(적용 시 현 plan 재현)" 동시 만족하려면: 추천값=`cappedSetsPerSession`(cap 반영 floor) 채움 + Mode A에서 **caps가 clamp로 살아있어야** ramp가 후반 cap 초과 시 auto와 동일 재클램프 → **추천→적용 비트동일**. caps를 풀면(Mode B) overshoot 종목서 불변식 깨짐 → 모드로 분기. "차단 아님"은 Mode B(한 클릭)가 보장 → 실질 차단 0.

## 자동추천
버튼 → `recommendVolume(profile)` = `resolveAutoSetsPerSession`(generate.js:116-127 **공유 추출** = drift 방지) → 입력칸 채움 + enabled=true + mode=rampFromFloor. 데드 0.6·cap·priority 반영된 전달값 표시. **추천→무수정 적용→비트동일** 검증됨.

## 구현 (배치 V1 엔진 / V2 UI)
- **V1(44f7dbb)**: 신규 `volumeOverride.js`(resolveAutoSetsPerSession·recommendVolume·volumeWarnings·effectiveBand); generate.js override 분기(가드)+ctx 2필드+보조 분기; periodization.js Mode B 1줄 가드. **no-override 비트동일**(515 불변), 추천→적용 비트동일.
- **V2(b751e78)**: profileStore(volumeOverride 필드+merge deep+6액션), planAdapter passthrough, i18n(VOL·경고라벨·heuristic), StepEquipment `<details>` fieldset(접힘 기본)+자동추천/지우기 버튼+종속 입력+VolumeWarnings, LimitsPanel 불릿. 신규 step 없음(step수 8 불변).

## 검증 (probe)
- 추천값: squat6/bench6/deadlift4(0.6 반영)/보조3. **추천→적용 비트동일 TRUE.**
- Mode A squat=8 → 시작주 cap 6 clamp. Mode B squat=10 → 매주 20 고정(ramp/cap 무시).
- 575 테스트 green(+60), 엔진 골든 churn 0(no-override). build clean.

## 경고 (비차단, tier 배지)
underMev(consensus)/overMrv(heuristic)/overCap(heuristic)/deadInfo(consensus)/taperDefeat(heuristic 최고)/accHigh/accZero/regionTrim/deliverMismatch. Next 버튼 절대 비활성 안 함. 패널 고지: "직접 입력은 본인 책임, 경고는 안내."

## 정직고지
MEV/MAV/MRV·PER_SESSION_CAP·데드 0.6·ramp 폭 = 방향 consensus / 정확값 heuristic(`근거 약함`). 보조 추천은 시간제한 없는 대표값(시간제한 시 실제 더 적을 수 있음). weekly 반올림 분배 시 전달≠입력 가능(info).

## 관점 갈림 → 수렴
- canonical: 세션당 단일(주간 UI파생) — 라운드트립 손실 회피.
- override×ramp 기본: ramp 유지(시작주) — 추천→적용 비트동일 정합. 이견(flat 정직성)→fixed 모드·UI 라벨로 해소.
- caps: 모드 분기(A clamp / B 해제) — 불변식 보존. "자유"는 fixed가 담당.
- fixed×taper: 무력화+최고경고 — "매주 고정" 정의상 자기모순 회피.
- 만장일치: 데드0.6/priority 우회, regionStatus 안전 유지, StepEquipment fieldset(신규 step 아님), tuner.js 불변, 추천=auto 공유함수, 경계 비차단.

## 후속
weekly↔perSession 고빈도 반올림 UI 경고(deliverMismatch) 표면화 / 보조 시간제한 분기 정확 추천.

## 방법
3관점 병렬(opus, 파이프라인 코드 검증) → 합성(opus high-effort). ~207k token.
