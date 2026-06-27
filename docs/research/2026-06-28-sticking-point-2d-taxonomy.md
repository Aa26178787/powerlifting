# 스티킹 포인트 2D taxonomy (위치 × 원인) (2026-06-28)

> 3관점(파워리프팅 바이오메카닉스 코치·DB/데이터모델 엔지니어·UX/엔진 통합) 병렬 설계 → 디렉터 합성. 코드 라인·205운동 cause 유도 전수 검증. 사용자가 2차원 세분화 선택.

## 동기
기존 `stickingPoint` = generic 3버킷(bottom/midrange/lockout), 종목 무관. 같은 'bottom'이 스쿼트 출좌·벤치 오프체스트·데드 바닥을 뭉뚱그림. **같은 위치라도 원인 근육이 다르면 교정 운동이 다름**(스쿼트 bottom = quad vs hip = 정반대 교정) → 2차원(위치 × 원인) 필요.

## 설계 (관점 수렴)
### cause 어휘 = 공유 7토큰
`quads · hip · back · chest · shoulder · triceps · lats` (muscleVolume 15군의 거친 별칭/부분집합 — 별도 어휘 미도입).
- 이견: data-model은 glutes/hamstrings 분리, ux-engine은 erectors/upperBack 분리 제안 → **기각**(단일 드롭다운 변별력 < 혼란, 7토큰이 브리프 예시와 1:1, 세분 시 유도 valid-set 이탈→override 폭증). YAGNI.

### POSITION_CAUSES (종목 × 위치 → 유효 cause)
```
squat:    bottom[quads,hip]  midrange[quads,hip,back]  lockout[hip,back]
bench:    bottom[chest,shoulder]  midrange[chest,shoulder,triceps]  lockout[triceps]
deadlift: bottom[quads,hip,back,lats]  midrange[hip,back,lats]  lockout[hip,back]
```
> **디렉터 결정(관점 충돌 핵심)**: biomech-coach의 *좁은* 표 적용 시 override **24건**(21건이 역학적 오태깅 — 예 Stiff-Leg DL 제한근을 quads로 강제). data-model·ux-engine **둘 다** 채택한 *확장* 표는 override **4건** + 역학적 타당(데드 off-floor=힙/레그드라이브, 스쿼트 mid grind=사두, 벤치 mid=삼두 전환). 2:1 다수 + churn 최소 → 확장표 채택. 브리프 예시는 *부분집합*으로 해석(명시 고지).

## 데이터 모델 (추가형·런타임 유도)
- `exercises.json`에 선택적 `cause` 1필드. **JSON 편집 4행만**(override), 나머지 130 위치-태깅 운동은 `primaryMuscle 첫 토큰 → canonicalToken → CANON_TO_CAUSE` 런타임 유도.
- 검증: 위치-태깅 **134/134 유도 성공, 미해소 0, override 정확 4건**.
- **override 4건**: Box/Banded/Chain Squat(lockout, quads/glutes→**hip**: 어코모데이팅 상단=힙신전), Push Press(lockout, shoulders→**triceps**: 오버헤드 락아웃=주관절).
- 정수성 테스트: causeOf 각 원소 ∈ CAUSE_VOCAB ∧ prime-mover 근육과 교집합≠∅(모순 차단) ∧ main-lift는 POSITION_CAUSES 셀 ⊆.

## 매칭 (가중치, hard-filter 아님)
- accessories: 4-tier `full 0.75 > position 0.5 > causeMiss 0.35 > none 0`.
- variations: `+2`(위치) + `+1`(원인) → 0/2/3. **specialty 승격 게이트(≥2) 불변**.
- **하위호환 핵심**: `cause` 미지정(기존 전부)→`stickTier`가 'position'(0.5/2)·'none'(0)만 반환 = 기존 `+0.5`/`+2`와 **비트동일**. 사용자 능동 지정 시만 full↑/causeMiss↓ 분기.

## UI·마이그레이션
- StepStyle 종속 드롭다운: 위치 선택 → 그 위치의 유효 cause만 표시("자동(위치만)" 기본). profileStore `stickingCause` 병렬 필드, 위치 변경 시 무효 cause 자동 리셋. `merge()`가 구프로필에 디폴트 주입(version bump 없음).
- 데드 bottom 라벨 "바닥에서 떼기(off-floor)".

## 검증
515 테스트 green(+45 신규), 기존 470 비트동일(no-cause). 골든 churn = JSON 4행 + 엔진 산출 0(cause 지정 시나리오만 순서 변동). end-to-end: cause 지정이 보조/변형 선택을 해당 원인으로 이동, 개수·구조 불변.

## 정직고지 (tier)
| 항목 | tier |
|---|---|
| 위치→실패구간 | **consensus** (Madsen & McLaughlin 1984 squat; van den Tillaar & Ettema 2010 bench; 삼두=벤치락아웃; 데드 무릎통과) |
| cause→제한근(어휘 매핑) | **consensus** (모멘트암/EMG) |
| POSITION_CAUSES 셀 경계(특히 squat/deadlift midrange 분할) | **휴리스틱(`근거 약함`)** RCT 아님 |
| 가중치 0.75/0.5/0.35·variation +1 | **휴리스틱** (기존 +0.5/+2 스케일 보정값) |
| primaryMuscle→cause 디폴트 | **결정론 데이터 사실**(134/134) |
| POSITION_CAUSES가 브리프 예시 *확장* | **명시 고지** (좁은표 21건 오태깅 회피) |

## 구현 (배치 T1-T4)
- T1(c7b27cc): stickingPoint.js 모듈 + 4 override + integrity. T2(bb009cd): accessories/variations/generate/periodization/exercises 매칭·배선. T3(31eb55c): profileStore + StepStyle + i18n + planAdapter. T4: 본 문서.

## 후속
- cause별 보조 풀이 커지면 7토큰 세분(glutes/hamstrings 등) 재검토.
- variation은 wrong-cause 미강등(풀 희소·specialty 게이트 보호) — 의도적 비대칭.

## 방법
3관점 병렬(opus, 코드·205운동 전수 검증) → 합성(opus high-effort). ~258k token. 디렉터 spot-check: override 4건·POSITION_CAUSES 확장 결정.
