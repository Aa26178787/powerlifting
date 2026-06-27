# 보조 deficit-fill 게이팅 수정 — PB 차별화 (2026-06-27)

> 3관점(파워리프팅 특이성 코치·파워빌딩/근비대 코치·엔지니어링 실용주의) 병렬 설계 → 디렉터 합성. on-disk 코드·classifyBlend API·테스트 픽스처 Read로 검증. `docs/research/` 근거 정박.

## 문제 (PL/PB 재비교서 발견)
보조 deficit-fill 조향(미달 근육군으로 보조 유도)이 이진 게이트: `baseDeficit = (dom==='strength'||dom==='power') ? 0 : 0.6`.
정식 powerbuilding 프리셋 {power0.10, **strength0.45, hypertrophy0.45**} → str·hyp 동률 → `classifyBlend` stable-sort가 **dom='strength'** 반환 → baseDeficit=0 → **PB 보조가 PL과 bit-identical**. 즉 PB가 hypertrophy 근육-완전성 혜택을 전혀 못 받음 → "루틴 다 비슷" 우려 잔존 지점.

## 결정 — hyp 점유율 선형 램프 (3관점 수렴)
strength/power 지배 가지 안에서 `n.hypertrophy`(실제 근비대 점유율)로 선형 램프 + dead-zone 클램프:
```js
const DEFICIT_FULL = 0.6, HYP_DEFICIT_LO = 0.30, HYP_DEFICIT_HI = 0.50
function deficitBaseWeight({ dom, n }) {
  if (dom !== 'strength' && dom !== 'power') return DEFICIT_FULL   // hyp 지배 불변
  const ramp = Math.max(0, Math.min(1, (n.hypertrophy - HYP_DEFICIT_LO) / (HYP_DEFICIT_HI - HYP_DEFICIT_LO)))
  return DEFICIT_FULL * ramp
}
```

### 프리셋별 결과
| preset | dom | n.hyp | OLD | **NEW** |
|---|---|---|---|---|
| powerlifting {str0.70} | strength | 0.20 | 0 | **0** (dead-zone, 불변) |
| **powerbuilding {str0.45/hyp0.45}** | strength(동률) | 0.45 | 0 | **0.45** (활성) |
| bodybuilding | hypertrophy | 0.80 | 0.6 | **0.6** (불변) |
| athletic | power | 0.20 | 0 | **0** (불변) |
| general | hypertrophy | 0.40 | 0.6 | **0.6** (불변) |

그라데이션 **bodybuilding 0.6 > PB 0.45 > PL 0** — 코칭 의도 충족.

### 관점 충돌 → 디렉터 결정
- **채택(B 근비대·D 엔지니어 수렴)**: 램프 PB=0.45. B가 격리 probe로 **활성 바닥 ≈0.40**, dw=0.30은 inert(픽 변화 없음) 실측. D가 패치 적용→441 통과→되돌림 실측.
- **이견(A 특이성)**: 게이트형 `0.6×nHyp`(PB=0.27), 신규 상수 0. 그러나 0.27 < 활성 바닥(0.30 inert) → 차별화 조용히 소멸 = 버그 재발 위험 → 미채택, 폴백 기록.
- **HI=0.50 고정 제약**: HI를 올리면 PB가 활성 바닥 미달 → 차별화 소멸. 램프의 유일 함정.
- **peaking 합성(C)**: 만장일치 곱 유지 — `baseDeficit × deficitPhaseScale`. PB 자동 테이퍼 0.45→0.225→0.

## 검증 (수정 후)
| | 보조 개수 | 근육 타깃 |
|---|---|---|
| **PL** | 8 (불변·bit-identical) | quads/glutes·hamstrings·chest·triceps (컴파운드 주동근) |
| **PB** | 8 (동일 개수) | **biceps·측delt·lats**·triceps·hamstrings (SBD 미달근육 채움) |

개수 동일(`goalBias` 무수정), **타깃 근육만 이동**. 454 테스트 green(+13). PL bit-identical(명시 배열 회귀), bodybuilding/general/athletic 불변(churn 0). 의도 churn = 50/50 테스트 픽스처 0→0.6(구조적 단언이라 통과).

## 정직고지
> 보조 근육 타깃팅 강도는 RCT 아닌 휴리스틱(consensus 외삽). PB가 PL과 달리 미달 근육군 보조 받는 *방향*은 근거 지지(부하 무관 근비대 Schoenfeld 2017; 근력 수확체감 Pelland/Zourdos 2026)이나, 정확 계수(full 0.6·활성 시작 hyp 0.30·포화 0.50)·MEV/MAV/MRV 밴드는 컨센서스·추정치. PL은 SBD 특이성 위해 deficit-fill 0 유지.

## 범위 한계
- "어느 근육"만 차별화, "몇 개"는 보존(`goalBias` 무수정). PB에 보조 볼륨/개수까지 늘리려면 별도 결정(범위 밖).
- 2-메인 세션(liftCap=1)은 최상위 특이성 픽 보호 → 차별화는 주로 단일-메인 세션 2번째 슬롯서 발현(보수적 의도).
- 강도(top 88%·avg 80.8%)는 PL·PB 동일 — 정상(둘 다 근력 특이성 위해 무겁게). 차별화는 볼륨(PB accumulate ramp·6세트) + scheme(strengthHypertrophy) + **보조 타깃(이 수정)**.

## 방법
3관점 병렬 설계(opus, 격리 probe·패치-검증-되돌림 실측) → 합성(opus high-effort). ~316k token.
