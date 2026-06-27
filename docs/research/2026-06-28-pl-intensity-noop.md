# PL-side 강도 후속 — 정당한 no-op 결정 (2026-06-28)

> 3관점(파워리프팅 근력 코치·스포츠과학 근거주의·엔지니어링 실용주의) 병렬 설계 → 디렉터 합성. 독립 probe + 코드 라인 전수 확인. 만장일치 **no-op**. `docs/research/` 근거 정박. [[intensity-differentiation]] 후속.

## 배경
직전 강도 차별화([[2026-06-28-intensity-differentiation]]) spec이 "Phase 2 = PL topSetBackoff heavyShare 분할로 PL heavy 비중 상향"을 opt-in 후속으로 남김. PL/PB 재비교 중 사용자가 후속 진행 요청.

## 진단 (probe로 확인)
PL{str0.70/hyp0.20} 메인 wk1 = **bimodal: 85-90% 14세트 / 70-71% 10세트, 중간대(75-85%) 전무**. 70% 세트 = strength backoff 아니라 **hypertrophy-quality 변형종목 메인 슬롯**(reversePyramid/straight, hyp zone 0.67-0.78). PL hyp0.20 share가 weeklyQualitySchedule로 일부 메인을 hyp quality로 배정한 결과.

## 결정: no-op (만장일치, 코드 검증)
원 Phase 2는 **3중 결함**으로 폐기. PL bit-identical 유지, 470테스트·골든 무변경.

### 원 Phase 2(topSetBackoff 분할) 거부 3사유 (코드 확정)
1. **오조준**: `CANDIDATES['strength|accumulation'] = ['straight','ascendingPyramid','amrapTop']` — **topSetBackoff 부재**(검증됨). 70% 작업이 발생하는 wk1 accumulation에 topSetBackoff 미등장 → 건드려도 그 작업에 안 닿음.
2. **미존재 문제**: topSetBackoff는 wk2-4(intensification)에만 발현. 그 주 중간대(75-85%)는 backoff(`loadForRpe(e1rm,5,7.5)`≈80-82%)·wave가 이미 채움. wk1 중간대 공백은 DUP의 heavy일/volume일 분리 의도.
3. **안전위반(결정적)**: topSetBackoff top = `e1rm*0.92`. heavyShare 분할 적용 시 PL strengthShare=**0.778**(검증) → N=6 → heavyN=**5세트 @92%** + 1 백오프 = wk2-4 PL 메인을 **90%+ 그라인더**로 전환 → "누적기 PL 전부 90%+ 금지" 제약 명문 위반.

### 질문 1 — PL의 67-78% 작업은 정당한가? → **정당**
"근력 위주 선수 moderate는 80-85%여야"는 전제 **기각**:
- 그 작업 = 변형종목 근비대 볼륨이지 moderate 근력 아님. comp-1RM 기준 62-71% 표시는 변형 e1rmModifier 효과, 운동 자기 e1rm 대비는 정상 hyp zone(67-78%).
- 근비대 = **부하무관**(META/high, F2/F3: HL vs ML ES 0.01-0.04). 82%로 올리면 근비대 이득 0 + 특이성 0(여전히 변형) + 관절/CNS 피로만↑.
- 근력 = 부하의존(F1)이나 heavy의 *존재*를 요구할 뿐 *전면화* 아님 — comp top ≥92% 이미 보존. 근력 볼륨 수확체감(F4) → 저피로 moderate 볼륨 유지가 기전적 정답.

### 레버 판정
| 레버 | 판정 | 근거 |
|---|---|---|
| (a) hyp-quality 메인 슬롯 비중↓ | 거부 | 사용자 입력 hyp0.20 임의 하향=입력 위반, 근비대 볼륨 손상 |
| (b) hyp 슬롯 → strength backoff 치환(70→82%) | 거부(최악) | 부하무관 정면 위배, 특이성 0, 순피로↑ |
| (c) 원 Phase 2 topSetBackoff 분할 | 거부 | 위 3중 결함 |
| **(d) 무변경** | **채택** | PL concurrent 게이트 밖→bit-identical, 골든 안정, 재baseline 0 |

## "bimodal"은 아티팩트
PL concurrent 게이트 미진입(`isMixed=false` + hyp0.20<0.25) → strengthHypertrophy 0회. heavyShare(ss)는 PL에도 전달되나 strengthHypertrophy만 destructure → PL bit-identical. 메소 전체는 연속 heavy-modal(top≥92% 보존). "bimodal"은 **wk1 단일주 스냅샷 + loadRamp 디플레이션 표시 아티팩트**이지 결함 아님(`adaptiveConcentration`이 wk2-4에 hyp→str lerp).

## 정직 근거tier
방향(부하무관/부하의존/볼륨 수확체감)=**META/high**. 정확 zone 경계·heavy:moderate 비율=휴리스틱. polarized > 단봉 직접 RCT 없음 — bimodal "정당"은 두 검증 finding 합성이지 직접 근거 아님(정직 고지).

## opt-in 후보 (기본 거부, work-capacity 불만 구체화 시만)
- **A**: `strength|accumulation` CANDIDATES에 `topSetBackoff` 추가(분할 없이) → wk1 중간대 채움, 무게 미상향. consensus/heuristic. **PL 골든 churn.**
- **B**: strength-dom hyp anchor 78%로 → 78-82 갭 메움. **전 blend 골든 재baseline 필요**, marginal. 근거 약함.
둘 다 근거상 불필요 → 기록만.

## 부수 발견 (조치 불필요)
- 결정론 nit: wk1 slotCount=2 lift의 hyp 슬롯 배정은 `allocateSets` largest-remainder FP 동점으로 결정(재현가능·결정론적). dominant-tiebreak로 바꾸면 근비대 볼륨 과교정 소멸 → 권하지 않음.

## 결론
**차별화를 위한 차별화 거부.** 67-78% 작업 = 정당한 변형종목 근비대 볼륨, 메소 이미 heavy-modal·top≥92%·wk2-4 backoff 중간대 실현 중, 원 Phase 2는 닿지 않는 곳을 건드려 안전을 깸. **정답 = no-op.** 코드·테스트·골든 무변경.

## 방법
3관점 병렬(opus, 독립 probe·코드 전수) → 합성(opus high-effort). ~259k token. 디렉터 spot-check: CANDIDATES·strengthShare 0.778·heavyN=5 코드 재확인.
