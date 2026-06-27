# 메인 강도 차별화 — PL vs PB (2026-06-28)

> 3관점(파워리프팅 근력 코치·파워빌딩 근비대 코치·스포츠과학+엔지니어) 병렬 설계 → 디렉터 합성. "근거상 정당한 만큼만 차별화" 프레임. 코드 라인 전수 검증(concurrent 게이트 `years≥1` 조건 포함). `docs/research/` 근거 정박.

## 문제 (PL/PB 재비교서 발견)
PL{str0.70/hyp0.20}·PB{str0.45/hyp0.45} 메인 평균 강도 **동일(80.8%1RM)**. 원인 = heavy:moderate 세트 비율이 blend 불변(둘 다 top 88%/backoff 70% bimodal, ~57% heavy). PB는 세트만 많고 비율 동일.

## 근거 판정 (차별화 정당한가?)
- **근비대 = 부하 무관**(Schoenfeld; 30-85% 실패근접 동등, ES 0.01–0.04) → PB는 잉여 볼륨을 중강도로 → 평균↓ + 관절/CNS 피로↓ 정당.
- **근력 = 부하 의존·특이성**(SAID; ES 0.58–1.03) → PL·PB 둘 다 일부 heavy 필요, **top-end 보존 필수**.
- 결론: 차별화는 **top 강도가 아니라 heavy:moderate 비율(평균·분포)** 에서만 정당. 과도(메인을 가볍게)는 PB 근력 component 손상 → 거부.

## 결정 (3관점 수렴)
| 항목 | 결정 | tier |
|---|---|---|
| **A 레버** | heavy 세트 *개수* share를 strengthShare로. zone%(검증값) 이동 거부 | 방향 META·비율 휴리스틱 |
| **B top-end** | PL·PB 둘 다 92%(피크 97.8%) 보존 — heavy 무게 미건드, 개수만 | 만장일치 consensus |
| **C 구현** | strengthHypertrophy heavyShare 분할 + pickScheme dilution 제거. concurrent 경로 한정 | — |
| **D 안전** | PL은 concurrent 게이트 밖(isMixed=false) → bit-identical 자동 보존 | 검증됨 |

`strengthShare(blend) = clamp(str/(str+hyp), HEAVY_FLOOR 0.40, 1)` → PL **0.778**, PB **0.50**. power(둘 다 0.10)는 별도 zone이라 분모 제외.

### 관점 갈림 → 디렉터 결정
- **PL 자체 상향(topSetBackoff 분할)**: pl-strength/pb는 "PL 과소" 주장, sport-sci는 "PL 58:42은 0.778의 binned 표현, 정상". 근거 강하고 사용자 우선순위(PL 보존·과도 거부)에 맞는 **sport-sci 수렴 → v1 PL 미건드**. PL 상향은 opt-in Phase 2(PL 골든 재생성 필요).
- power 분모 포함 여부: pb-hyp는 `(str+pwr)/total` 주장, 채택 안 함(power=contrast 무관·zone 분리, 차이 미미).

## 구현 (commit 4ddb71a)
- `quality.js`: `HEAVY_FLOOR=0.40` + `strengthShare()`.
- `setSchemes.js`: `strengthHypertrophy` heavyShare 분할(null=현행 bit-identical, 전달 시 `heavyN=clamp(round(N·share),1,N−1)`); `pickScheme` dilution → `CONC_DENOM=3, hits=max(1,round(hypShare·3))`(PB 2/3주 발현, 기존 1/4서 상향).
- `periodization.js`: `ss=strengthShare(blend)` → `hypShare:1−ss` to pickScheme, `heavyShare:ss` to expand. strengthHypertrophy만 구조분해 → PL 경로 무시.

## 검증 (probe 실측 — 4일·4주·years3)
| | strengthHypertrophy 빈도 | heavy 비율(≥85%) | top% |
|---|---|---|---|
| **PL** | 0/18 (never) | **79.4%** | 98.2% |
| **PB** | 8/12 (66.7%) | **66.2%** | 96.4% |

→ **heavy 비율 PB 66% < PL 79% (−13pp), top 둘 다 ≥92% 보존**. 방향 정확·과도 아님. PL bit-identical(게이트 밖). engine 전체 green(+15 신규 테스트, PB 근력 하한 가드 ≥30% 포함).

> **테스트 주의:** `src/App.test.jsx` E2E wizard 2건이 전체 suite 동시실행 시 간헐 실패(타이밍 flaky) — **main에서도 동일 실패**, 격리 실행 시 3/3 통과. 본 변경과 무관(pre-existing). 별도 후속.

## 정직고지
> 메인 평균 강도는 근력 비중 높을수록 heavy 세트 비중↑. PB는 동일 top(~92%) 유지하되 일부를 중강도 백오프로 → 평균↓. 방향(근력 부하의존/근비대 부하무관)은 메타근거이나, 정확 heavy:moderate 비율·HEAVY_FLOOR 0.40·CONC_DENOM 3·분할 라운딩은 휴리스틱(`근거 약함`). 최고 강도 세트(특이성)는 양 목표 보존. 실현 착지점은 emergent → probe 실측값.

## 미해결·후속
- ~~**Phase 2(opt-in)**: PL topSetBackoff 분할로 PL heavy 비중 추가 상향(PL 골든 재baseline 필요) — 부분 정당, 보류.~~ → **검토 후 정당한 no-op 결정**: 3관점 만장일치, 원 Phase 2는 오조준(topSetBackoff가 wk1 accumulation에 부재)+미존재 문제+안전위반(PL heavyN=5/6 @92% 그라인더). PL 67-78% 작업은 정당한 변형종목 근비대 볼륨(부하무관). 상세 [[2026-06-28-pl-intensity-noop]]. **코드 무변경.**
- ~~App.test.jsx flaky 안정화(별도).~~ → **해소**(commit 525f5d8: delay:null + 15s 타임아웃, 470/470 안정).

## 방법
3관점 병렬 설계(opus, 코드 라인 전수 검증) → 합성(opus high-effort). ~223k token.
