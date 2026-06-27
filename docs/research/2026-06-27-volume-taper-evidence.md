# 볼륨 테이퍼 방향 근거 노트 (2026-06-27)

> 이 문서는 `feat/muscle-and-taper` 브랜치의 `volumeRamp` 3-모드 구현(taper/maintain/accumulate)에 대한 근거를 정직하게 기록합니다.  
> 핵심 결론: **방향(대회 주기 볼륨↓)은 컨센서스/교과서 근거**, **정확 수치(−45%, 2/3 전환, +0.20 계수)는 검증된 값이 아닌 휴리스틱**.

---

## 방향성 — 컨센서스/교과서 근거 있음

### 블록 주기화: 강도↑ 볼륨↓ 근접 대회

블록 주기화(Issurin 2010; 교과서적 합의)에 따르면 축적(accumulation) → 전환(transmutation) → 실현(realization) 블록 순서로 볼륨은 낮아지고 강도는 높아집니다. 대회 직전 블록(realization/peaking)에서 볼륨을 줄이고 강도를 올리는 방향은 파워리프팅/역도 현장에서 광범위하게 적용되며, 고급 선수 케이스 시리즈와 텍스트북이 일관되게 지지합니다.

### 테이퍼 문헌 (Mujika & Padilla 2003)

Mujika & Padilla (2003, *Medicine & Science in Sports & Exercise*)는 지구력·파워 스포츠 전반에서 테이퍼(감량 훈련) 효과를 체계적으로 검토했습니다. 주요 결론:
- 훈련 볼륨을 41–60% 감소시키고 강도·빈도는 유지하는 점감형(progressive) 테이퍼가 성과 향상에 효과적.
- 너무 급격하거나(bolus taper) 너무 완만한 감소(flat taper)는 효과 감소.
- 최적 테이퍼 기간은 4–28일로 스포츠·훈련량에 따라 다름.

이 문헌은 파워리프팅 특화 RCT가 아니며 직접 적용에 한계가 있지만, **볼륨 감소 방향**을 지지하는 외부 근거로 기능합니다.

### ACSM 진행 원칙

ACSM(2009) 저항 훈련 포지션 스탠드는 주간 볼륨 2–10% 점진 증가 권고를 제시합니다. 테이퍼 구간에서 이 방향을 역전(볼륨↓)하는 것은 강도-특이성(SAID) 및 피로 관리 원칙과 일치합니다.

### 현 레포 내 지지 문서

- `docs/research/2026-06-27-model-realism-fixes-evidence.md` — 피킹 단계 강도 상승(~95-98%1RM 탑싱글) 근거 기록.
- `docs/research/2026-06-27-powerlifting-vs-powerbuilding-evidence.md` — PL/PB 목표 차별화와 볼륨/강도 비중 근거.

---

## 정확 수치 — 휴리스틱 (근거 약함)

아래 수치는 구현에 사용된 값이지만 **파워리프팅 RCT에서 직접 검증된 값이 아닙니다**:

| 수치 | 구현값 | 상태 |
|---|---|---|
| 피크주 볼륨 감소 폭 | −45% (0.55 배율) | **휴리스틱** — Mujika & Padilla의 41–60% 범위 중앙에서 파생, PL 특화 검증 없음 |
| 역V 전환 시점 | 총 주차의 2/3 | **휴리스틱** — phaseFor 경계와 정합, 개인·블록 길이에 따라 다름 |
| 피크 직전 최대 배율 | ×1.15 | **휴리스틱** — 수치 자의적 |
| maintain 계수 | +0.20t | **휴리스틱** — accumulate(+0.35t)보다 완만하다는 방향만 지지, 정확값 미검증 |

---

## 한계 및 정직 고지 요약

1. **방향은 컨센서스/교과서** — 대회 주기 볼륨↓강도↑ 테이퍼 방향은 블록 주기화 문헌 및 현장 합의로 지지됩니다.
2. **정확 수치는 휴리스틱** — 피크주 −45%, 2/3 전환, +0.20 계수는 모두 `근거 약함` 등급입니다. 향후 PL 특화 볼륨-테이퍼 RCT로 재보정이 필요합니다.
3. **비대회 사용자에게 테이퍼 미적용** — `peaking`(대회 준비) 플래그 없이는 taper 모드가 발동하지 않아, 일반 사용자에게 적절하지 않은 볼륨 감소가 발생하지 않습니다.
4. **Mujika & Padilla (2003)는 외부 참고 문헌** — 저장소 내 포함되지 않으며, 파워리프팅 직접 데이터가 아닙니다.

---

## 참고

- Issurin, V. B. (2010). New horizons for the methodology and physiology of training periodization. *Sports Medicine*, 40(3), 189–206.
- Mujika, I., & Padilla, S. (2003). Scientific bases for precompetition tapering strategies. *Medicine & Science in Sports & Exercise*, 35(7), 1182–1187.
- ACSM (2009). Progression models in resistance training for healthy adults. *Medicine & Science in Sports & Exercise*, 41(3), 687–708.
