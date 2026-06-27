# Peaking × per-muscle Ledger 상호작용 튜닝 (2026-06-27)

> 3관점(파워리프팅 피킹 코치·RP/근비대 과학자·엔지니어링 실용주의) 병렬 설계 → 피킹 디렉터 합성. 코드 라인·시그니처·테스트 단언·데드로드 index 오버플로우까지 Read로 검증. `docs/research/` 근거 3문서 정박.

## 충돌 (해소 대상)
볼륨 taper(#2)가 peak 주 메인 세트를 낮춤 → per-muscle ledger(#1)가 그 근육들을 '미달'로 봄 → **deficit-fill 보조 가점이 미달근육으로 보조를 더 밀어** taper 역행(피크 주에 보조 볼륨↑).
- **충돌 모집단 = `peaking && dom∈{hypertrophy,endurance}`** (이때만 baseDeficit=0.6). 순수 PL(strength/power dom)은 baseDeficit=0이라 무영향. powerbuilding(0.45/0.45)은 stable-sort 동률→dom='strength'라 이미 보호됨.
- **충돌 원인 = deficit 항(미달근육 *가산*)이지 MRV overflow 가드 아님** (가드는 볼륨 추가 못 하고 보류만 → taper와 동행).

## 결정 (관점 충돌 → 근거 강한 쪽 수렴)

| 항목 | 결정 | 근거 tier |
|---|---|---|
| **A deficit-fill 억제** | peaking 시 phase 승수: accumulation 1.0 / intensification 0.5 / **peak 0.0**. 비peaking=1(불변) | 방향=컨센서스(테이퍼 시 보조/잡볼륨↓) · 계수=휴리스틱 |
| **B 보조 개수 taper** | `peaking && peak && !isDeload` → `sharedCap = max(minCap, sharedCap−1)`. floor=**minCap**(1 아님), 데드로드 가드 | 방향=컨센서스 · 폭(−1)·floor=휴리스틱 |
| **C MRV overflow 가드** | **무변경**(항상 ON, deficit과 독립) — 피로안전, taper와 정합 | 방향=컨센서스 |

### 관점 갈림 → 디렉터 결정
- **B floor = minCap (rp-hyp 채택), NOT 1**: 순수 PL 피커(minCap=2 바닥)는 보조 개수 bit-identical 보존 → cross-population churn·테스트 위험 회피. 행동 델타를 충돌 모집단(hyp/end-dom, minCap=1: 4→3)에만 가둠. 이견(pl-peaking·eng: floor=1로 순수 PL도 2→1 taper)은 코칭-완결적이나 모집단 외부 영향 → `Math.max(1,…)` 한 줄로 전환 가능하게 명시만.
- **B 데드로드 가드 (rp-hyp 보정)**: 데드로드 주는 index 오버플로우로 'peak' 분류되나 이미 set-halving으로 독립 감량 → count cut 추가 시 redundant double-reduction. `!wk.isDeload`로 차단.
- **A 데드로드**: phase-순수 유지(데드로드→peak→deficit 0). 회복주가 미달근육 추격 안 하는 것이 코칭-정합.

## 구현 (배치 Q, commit 0e626a3)
- **단일 파일 `src/engine/generate.js`**, 외부 시그니처 0 변경. `deficitPhaseScale` 순수 헬퍼 + `baseDeficit` rename + 주차 `phase`/`weekDeficitWeight` 호이스트(중복 phaseFor 제거, 단일 출처) + sharedCap peak 트림 1줄.
- phase 신호 = 기존 `phaseFor(wk.index−1, mesoWeeks, peaking)` 재사용(신규 임계 0개, taper PEAK_AT=2/3과 정렬).
- 정직고지: LimitsPanel + PROJECT_STATUS §3.

## 수치 검증 (peaking hyp-dom {str0.3/hyp0.7}, 6주, 대회 on)
| 주 | phase | 보조/세션 | biceps(미달) 세트 |
|---|---|---|---|
| 1–2 | accumulation | 4 | 3 / 1 |
| 3–4 | intensification | 4 | 1 / 3 |
| **5–6** | **peak** | **3** | **0 / 0** |
→ A: peak 주 biceps 0(역행 차단). B: 보조 4→3(≥minCap). 비peaking·순수 PL peaking = **bit-for-bit 불변**(golden churn 0). 440 테스트 green(+6 엔진 회귀, +1 jsdom).

## 정직고지
> 피킹 시 보조의 deficit 보충 강도·개수는 대회 근접할수록 단계 감소(accum 유지→intens 절반→peak 차단, peak 보조 1개↓). 감량 *방향*은 블록 주기화 컨센서스(Issurin 2010; Mujika & Padilla 2003: 볼륨 41–60%↓·강도/빈도 유지)이나, 정확 계수(1.0/0.5/0.0)·감축폭(−1)·phase 임계는 **근거 약한 휴리스틱**(taper −45%·2/3·+0.20과 동급 추정치). floor 유지로 peak 주 보조 0화 안 함(근손실 경계).

## 미해결·후속
- 순수 PL 피커 보조 taper(2→1) 미활성(보수적 minCap floor). 원하면 1줄 전환.
- ACCESSORY_EST_SETS=3 평탄 추정(조향 한정, 보고는 실측) — 기존 한계 유지.

## 방법
3관점 병렬 설계(opus) → 합성(opus high-effort). 코드 라인 단위 검증 + `docs/research/` 3문서 교차. ~266k token.
