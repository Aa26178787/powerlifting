# 가까운 우선순위 4종 (워밍업·휴식·운동명 한글·로깅 피드백) (2026-06-28)

> 로드맵 §4 "가까운 우선순위(실전 디테일)" 4종 구현. 1·2·3은 결정론 직접 구현, 4(로깅 피드백)는 3관점 토론 설계. 전부 additive·하위호환·정직고지.

## ① 워밍업 세트 자동생성
- 신규 `src/engine/warmup.js` `warmupSets(topWorkingWeight, {increment, lightestWorkingWeight, barWeight})`: 탑 워킹세트의 40/60/80% × 5/3/2 reps, increment 라운딩. 워킹세트보다 무거우면 드롭, **빈 바(20kg) 미만은 바로 clamp + 중복제거**.
- 메인 종목만(보조 제외), 가산 필드 `ex.warmup`. RoutineView 세트표에 워밍업 행 prepend.
- tier: 램프 프로토콜 = consensus/practice(Sheiko/RTS/Starting Strength), 정확 40/60/80% = 휴리스틱.

## ② 세트 간 휴식시간 표시
- `restRange(quality)` (quality.js): power/strength {3,5}분, hypertrophy {1,2}, endurance {1,1}. `restLabel` i18n.
- RoutineView 메인+보조 운동에 "세트 간 휴식 N–M분" 표시(quality 파생, 엔진 churn 0).
- tier: 목표별 휴식 = NSCA/ACSM consensus.

## ③ 운동명 한글화
- i18n `EXERCISE_NAME` 맵 **205/205 전수**, `exerciseName(k)=EXERCISE_NAME[k] ?? LIFT[k] ?? k`. 괄호 수식어 포함 번역(예 "Box Squat (above parallel)"→"박스 스쿼트 (평행 위)"). 표준 약어 유지(SSB/GHD/RDL/T2K/JM).
- RoutineView ex.lift + acc.name, exportCsv 한글화. **커버리지 가드 테스트**(영어 fallthrough 0 + DB 205개 고정).

## ④ 로깅 → 다음 세션 피드백 (3관점 토론)
> 핵심: 로그는 store SoT, 재생성 시 순수·결정론 함수가 `lifts.oneRM`을 평활·클램프 파생 → generate에 주입. generate/autoreg/e1rm **무수정**. 로그 없으면 **바이트동일**.

- **2채널**: (A) per-set advisory(기존 `loadAdjustment`, 휘발 표시 "다음 세션 권장 탑") + (B) **e1RM 갱신**(신규 `loadFeedback.js`, 명시 재생성 시 다음 사이클 전체 부하 반영).
- **신규 `src/engine/loadFeedback.js`**: `effectiveLiftE1rm(seed, entries, {suppressUp})` = 시간순({week,day}) EWMA(α=0.3) + per-obs 비대칭 클램프(상 +5%/하 −10%) + 누적 밴드(+15%/−20%). `liftEntries`가 flag `pain`/`cut` 제외, reps 1..12 클램프.
- **주입 = planAdapter** `buildPlan(form, liftLog, opts)`: 빈로그 단락→현 경로 문자동일. generate.js 0변경.
- **profileStore** `liftLog`(checkinLog 패턴 복제, upsert by {lift,week,day}), 버전범프 없음.
- **UI**: RoutineView 메인 탑세트에 `LiftLogRow`(접힘 `<details>`, prefill, 통증/중단 flag, advisory, "추정 1RM seed→effective" 배지) — 죽은 `자동조절` placeholder 대체. App "기록 반영 재생성" + "미반영 N개" 배지.

### 다층 노이즈/과조정 가드
사이클 중 자동변경 0(advisory만) · per-obs 비대칭 클램프 · EWMA α=0.3(1세션 ≤+1.5%) · 누적 밴드 +15/−20% · flag 제외(통증≠약화) · reps 클램프 · 과로 시 `suppressUp`(상향 전면봉쇄).

### 검증 (probe)
- 스쿼트 175 → easy로그(RPE7) → **177.5**(+1.4%, EWMA+클램프 보수). 로그없음 바이트동일.
- 단일 outlier(weight×10) → per-obs 클램프 흡수. 20회 상향 → CAP_UP +15% 정지.

## tier 정직고지
- ④ 방향(실수행 자동조절·추세>단일세션·과로 상향억제·평활/클램프 방향) = consensus(Helms/RTS·Zourdos). 정확 상수(α0.3·±5/10%·+15/−20%) = 휴리스틱. 고반복 탑세트 로그는 RPE차트 불확실성 큼.
- ①②③ tier 위 각 항.

## 결정론·하위호환
4종 전부 additive·격리. 로깅은 로그=직렬화 입력→generate 순수 결정론. 엔진 607 골든 churn 0(generate 직접호출 무경유). 668 테스트 green(+93). 빈로그/미설정→비트동일.

## 구현 (배치 W1-W3)
- W1(65ca1bd)+fix(8131b92): 워밍업+휴식. W2(78b39b1): 운동명 205. W3a(3229d9b): loadFeedback+planAdapter+store. W3b(4772960): LiftLogRow+App+i18n/고지.

## 후속 (로드맵 잔여)
중기(다종목 묶음·진행추적·스타일인식 통증교체·데드 저빈도 큐) / 장기(VBT·모바일 반응형·HRV/여성·연령).

## 방법
④만 3관점 병렬(opus, 코드 라인 검증) → 합성(opus high-effort, ~220k token). ①②③ 직접 spec.
