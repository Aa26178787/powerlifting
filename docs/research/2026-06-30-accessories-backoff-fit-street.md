# 보조운동 확장 · 백오프 조절 · 적합도 판정 · 스트리트 리프팅 (2026-06-30)

5개 사용자 요청에 대한 다관점(코칭·아키텍처·회의론) 심의 결과와 적용 결정 기록.
심의: Workflow 5 perspectives(strength-coach / hypertrophy-coach / street-specialist / architect / skeptic) → director 종합 spec.

## 배경 — 핵심 진단
- 보조운동 카탈로그는 이미 134종이나, `generate()` 기본 `equipment=['barbell','rack','bench']`로 **머신/케이블/덤벨 보조 127종이 자동 선택에서 제외**되어 7종만 노출됨(`accessoryPreference` 기본 'machine'와 모순). 병목은 카탈로그 크기가 아닌 **장비 게이팅**.
- 백오프 부하 = `loadForRpe(e1rm, reps, rpeTarget−1)`. 저반복에서 RPE 1단계 차이는 ~3~8%p에 불과 → 사용자 체감 "과중".

## 결정 (근거 등급)
1. **보조 확장** — exercises.json에 +32행(전완·그립, 리어/사이드 델트 머신, 머신 프레스, 상부가슴, 글루트·내전근, 코어, 스트리트 보조). 기존 토큰만 사용(종아리·목은 taxonomy 변경 필요 → 보류). 모두 `stickingPoint:"none"`(integrity case 9–10 우회). **장비 게이팅 해소**: (a) 변경 피커가 전체 카탈로그(allEquipment) 노출 — override는 장비 필터 우회, (b) 옵트인 "풀짐" 토글로 자동 선택 확장(기본 off → byte-identical). 엔진 기본 장비를 넓히면 메인 변형 선택까지 바뀌어(스코프 외) 채택 안 함. 등급: **컨센서스**.
2. **백오프 조절** — `profile.backoffRpeDrop ∈ [0,2.5]` step .5, **기본 0 = 현재 출력 동일**, lighter-only. 유효 백오프 RPE는 `loadForRpe` 호출 전 [6,10]·0.5 스냅 클램프. topSetBackoff/topSingleBackoff/strengthHypertrophy 3개 expander에 적용. 등급: 방향 컨센서스 / 폭 **휴리스틱**.
   - **잠복 버그 발견·수정**: `risingRpe`가 백오프 표시 RPE를 5~5.5로 내릴 수 있고, periodization의 데드리프트 rep-cap 재계산이 그 RPE를 `loadForRpe`→`pctOf1RM`(6–10만 정의)에 투입 → 차트 도메인 크래시. 기본 플랜은 데드 백오프 RPE≥6.5라 미발생이나 노브가 노출. 재계산 경로에 `clampBackoffRpe` 적용(기본 출력 불변).
3. **보조 세트·반복 편집** — `profile.accessorySchemeOverrides[name] = {sets,reps,rpe?}`. 클램프 sets[1,8]/reps[3,30]/rpe[5,10]. 적용 시 스트레이트 강제, **디로드 제외**(디로드는 이미 straight×2). 등급: 기본값 컨센서스 / 편집값 사용자 책임.
4. **적합도 판정** — 순수 모듈 `accessoryFit.js`. 사유코드/최악-심각도 verdict(good/ok/caution/avoid). **차단/자동적용 없음**. 부위상태(2→caution,3→avoid)·MRV 초과·강조 일치/이탈·스티킹 일치·타깃 불일치. 추천은 동일 패턴·부위안전·emphasis 랭킹 상위 3. 등급: **휴리스틱**.
5. **스트리트 리프팅** — `streetLifting.js`(옵트인). 4번째 MAIN_LIFT 아님(`MAIN_LIFTS` 하드코드 리팩터 회피). 총-시스템 1RM `sys=k·BW+added`(k 딥0.95/풀0.90)에 strength zone top+backoff 적용 → 벨트 추가중량으로 환산 표시. 주차별 모드 belt/bodyweight/assisted. 디로드 RPE6·세트 절반. backoffRpeDrop·동일 클램프 연동. 기본 off → street 키 없음 → byte-identical. 등급: 구조 컨센서스 / k·차트 외삽 **휴리스틱**.

## 백워드 호환 불변식 (전부 충족 확인)
- `generate(defaultProfile)` 해시 `14b1d71e…` 불변(신규 필드 기본값 전부). 805 테스트 그린, 빌드 OK.
- 신규 중첩 필드(backoffRpeDrop / accessorySchemeOverrides / streetLifting) 각각 DEFAULT_PROFILE + persist `merge` 딥필 + 엔진 `?? default` 가드 + 재수화 테스트.
- i18n.js의 evidence 배지는 consensus·heuristic 모두 '근거 약함' → 신규 정직 구분은 모두 LimitsPanel 텍스트로.

## 풀짐 확장의 부수효과(수용)
- 풀장비 골든 테스트에서 신규 케이블 보조가 결정론 선택에 진입 → 골든 재기준화. 단 벤치 세션에 `Cable Fly`+`Low-to-High Cable Fly`(둘 다 가슴 계열)가 공존 가능: diversity guard가 raw 문자열('chest' vs 'upper-chest')로 중복 판정 → 못 거름. canonical 키로 바꾸면 기본 출력(Military vs Overhead Press 등) 변경 → byte-identity 깨짐 → guard 유지, 중복은 적합도 판정 + 수동 변경으로 처리.

## 보류 (스코프 외)
- 종아리·목 근육군(muscleVolume taxonomy + movementPattern + integrity 변경 필요)
- 스트리트 = 정식 메인 리프트(레이아웃/빈도/주기화 슬롯) — MAIN_LIFTS 리팩터
- 스트리트 스마트 요일 배치(딥→푸시일/풀→저부하일), CSV에 스트리트 블록 포함
- topSingleBackoff rising-RPE ramp 변경(기본 출력 변경 → 보류, 노브로 대체)
- diversity guard canonical-muscle 중복제거(기본 출력 변경 위험)
