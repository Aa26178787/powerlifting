# Dose 파라미터 다관점 Calibration (2026-06-27)

> 5개 코칭 학파(파워리프팅·보디빌딩·RP볼륨·스포츠과학·실전) 병렬 audit → 수석 디렉터 합성. `docs/research/`의 검증된 근거 2문서에 정박. 핵심 dose 파라미터(강도·반복·세트·메인종목수·보조종목수) 보정.

## Calibration 결정

| 파라미터 | 현재 | 결정 | 근거 tier |
|---|---|---|---|
| **A 강도** | strength 82-92%/RPE8.5, hyp 67-78% — 정합. 단 `topSingleBackoff`(고정 0.90)·`topSetBackoff` 백오프(고정 0.88)가 RPE 비정박 | **변경**: 둘 다 `loadForRpe` 앵커화. 피킹 단계 탑싱글 RPE8.5→9.5 ramp(93.75→97.5%, ≤100%) | 방향 META(부하 특이성), 정확% consensus |
| **B 반복** | power2-4, strength2-5, hyp6-12, end12-20 | **유지** (6-12 충분, 6-15도 동등 — 변경 미필수) | META(부하·반복 무관 근비대) |
| **C 세트** | BANDS·floor·ramp·per-session cap | **밴드/캡/램프 유지** + 2 구조수정: tuner 보고=전달(저빈도 silent drop 제거), 데드 주간 0.6× | 밴드값 META, 구조·데드 consensus |
| **D 메인종목수** | freq squat2/bench2-3/dl1-2, 세션당 메인≤2 | **빈도수치 유지** + 축성 스택 가드(heavy squat+heavy deadlift 같은날 회피) | 빈도 META+consensus, 가드 consensus |
| **E 보조종목수** | cap=time/15 or 3, **2차메인 보조 0개 버그** | **변경**: 2차메인 보조 호출(버그수정), 시간인지 cap(메인시간 차감), 목표 스케일(hyp+1/str−1) | 버그=근거불요; 개수 consensus |

## 구현됨 (이 작업)
- A: `setSchemes.js` topSingleBackoff/topSetBackoff RPE앵커 + 피킹 ramp; periodization phase 스레딩
- C/D: `tuner.js` 데드 0.6× + 보고=전달; `layoutGenerator.js` 축성 가드
- E: `generate.js` 2차메인 보조 버그 수정; `accessories.js` 시간/목표 cap + 다양성 가드(별도)
- 정직고지: LimitsPanel + PROJECT_STATUS §3 (데드 0.6·보조 휴리스틱·피킹 강도·전달량 표기)

## agent 토론서 떠오른 새 논점

1. **per-muscle vs per-lift 회계**: ~~BANDS가 종목당 적용·보조 세트 미합산 → 실제 근육군 볼륨 오계(이중지출/미달). 올바른 해결 = 근육→세트 ledger 대형 리팩터. 현재 per-muscle MRV 정직 보고 불가.~~ **구현됨 (consensus tier)** — `src/engine/muscleVolume.js` 신규(15군 taxonomy·MEV/MAV/MRV·0.5 협력근 신용·deficit-fill·overflow 가드). 주차별 `muscleVolume` 가산 보고 + 보조 조향; PL 사용자 deficit-fill OFF.
2. **피킹 taper vs 근비대 ramp 충돌**: ~~volumeRamp +35% 단조증가는 근비대용 — 근력/피크 블록선 마지막주가 최고볼륨이 되어 taper(볼륨↓강도↑) 원칙과 반대. blend/phase 의존 ramp 필요(직접근거 없어 자동변경 안 함).~~ **구현됨 (consensus tier)** — `volumeRamp` 3-모드 확장(accumulate 1+0.35t / maintain 1+0.20t / taper 역V 1→1.15→0.55); taper는 `peaking`(대회) 전용, 방향=컨센서스·정확 수치=휴리스틱.
3. **floor 상향 vs RP "MEV 시작" 도그마**: 머지된 높은 floor가 RP·sport-sci의 MEV-근처-시작과 충돌. 되돌리지 않되 ramp 여지 압축이라는 긴장 명시.
4. **endurance 자질 계산 막다른 길**: loadForRpe 고반복 클램프 과보정 + 'endurance' 라벨이 고반복 근비대 오분류. PL/PB 프리셋선 가중≈0이라 영향 작음.

## 미해결 trade-off
- **Junk-volume 캡 vs 근비대 dose**: per-session 캡 절단은 근력엔 옳으나 근비대엔 잘린 초과분이 성장 dose. 초과분 라우팅(보조/세션추가/폐기)은 목표 의존, 단일 정답 없음.
- **SAID 특이성 vs 근육군 완전성**: 메인 SBD-only(PL) vs OHP/row 추가(BB) — 단일 기본값이 둘 다 못 만족, blend 조건화 필요.
- **정확 수치는 모두 consensus/estimate**: per-session 캡·데드 0.6·보조 개수·ramp% — 전부 미검증. UI `근거 약함` 라벨 유지 필수.
- **고반복 RPE차트 타당성**: 저반복만 검증(초보 r=−0.77). hyp/endurance 부하 정확도 한계.

## 방법
5 학파 병렬 audit(opus) → 합성(opus high-effort). 코드 사실 + `docs/research/` 2문서 교차검증. ~330k+ token.
