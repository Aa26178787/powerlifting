# v3 Sub-Project 2 — Setup Wizard & Recommendation Engine (Design Spec)

**Date:** 2026-06-26
**Status:** Approved design (brainstorming complete, research done) — pending user spec review → plan
**Part of:** v3 redesign. SP1 (quality model) is LIVE. SP2 = guided setup wizard + diagnosis/recommendation engine. SP3 (daily check-in) and SP4 (video) follow. Builds on the live SP1 engine.

---

## 1. Overview

Replace the single setup form with a **step-by-step wizard** that collects the profile AND surfaces **diagnosis/recommendations** as the user goes: a strength assessment + lagging-lift detection (from peer-reviewed inter-lift standards), a recommended quality blend, and a recommended periodization model — each user-overridable. A flagged weak lift gets a modest volume bump plus targeted weak-region accessories in the generated routine (within the MRV cap). After setup, a compact edit panel lets the user tweak any field without re-running the wizard.

Reuses SP1 unchanged: the engine (quality/periodization/generate/variation/accessory/region), the store, RoutineView/CSV/LimitsPanel.

## 2. Goals / Non-Goals

**Goals (SP2):**
- A wizard (8 steps) that writes to the existing `profileStore` and replaces the single form as the primary setup; a compact "edit" panel for post-setup tweaks.
- A pure `standards.js` diagnosis engine: strength assessment (relative-to-elite + IPF GL), lagging-lift detection (inter-lift standards), recommended quality blend, recommended periodization model.
- Recommendations surfaced inline (steps 2/4/5) and in a final summary (step 8); each is a suggestion the user can accept or override.
- A flagged weak/priority lift bumps its volume + weak-region accessories at generation (within MRV).
- Deterministic, fully unit-tested. SP1 features keep working.

**Non-Goals (SP2 — later):**
- Daily check-in readiness autoregulation + fatigue/overreaching monitor (SP3).
- Video sticking-point detection (SP4).
- Multi-level (novice/intermediate/advanced) bodyweight-multiple tables as hard truth — the research gap (see §3); SP2 reports strength as "% of elite-competitor standard" + GL points + a clearly-labeled heuristic band, not a definitive level claim.

## 3. Evidence Base (deep-research 2026-06-26)

From a peer-reviewed analysis of **809,986 drug-tested raw competition entries** (Sci-Direct S1440244024002469; PubMed 39060209):
- **Elite (90th-pct) relative strength (× bodyweight):** squat M 2.83 / F 2.26; bench M 1.95 / F 1.35; deadlift M 3.25 / F 2.66. Ordering deadlift > squat > bench (both sexes); women ≈ 80% of male relative strength.
- **Implied raw inter-lift ratios:** men bench/squat ≈ 0.69, squat/deadlift ≈ 0.87, bench/deadlift ≈ 0.60; women 0.60 / 0.85 / 0.51 — women's bench notably weaker relative to lower-body lifts.
- **IPF GL (total normalization across bodyweight & sex):** `GL = total × 100 / (A − B·e^(−C·BW))`. Classic raw coefficients: men A=1199.72839, B=1025.18162, C=0.00921; women A=610.32796, B=1045.59282, C=0.03048. (IPF, 2020 cycle.)

**Honest gaps / refuted:** A full multi-level (untrained→elite) bodyweight-multiple table did NOT survive verification, and using the 90th-percentile competitor numbers as a general "advanced" threshold was REFUTED (those are elite-competitor values, far above a typical "advanced" gym lifter). The deep-research run was also truncated by a session limit (many verify agents failed), so the surviving set is the floor, not the ceiling, of available data. → SP2's strength "level" is reported as **% of the elite-competitor standard** + **GL points**, with a coarse heuristic band clearly labeled "relative to competitive standards," NOT a definitive novice/intermediate/advanced verdict.

## 4. Diagnosis Engine (`src/engine/standards.js`, pure)

Data:
```
ELITE_REL = { male: { squat:2.83, bench:1.95, deadlift:3.25 }, female: { squat:2.26, bench:1.35, deadlift:2.66 } }
GL_COEF   = { male:   { A:1199.72839, B:1025.18162, C:0.00921 },
              female: { A:610.32796,  B:1045.59282, C:0.03048 } }
```
Functions:
- `relStandard(lift, oneRM, bodyweight, sex): number` — `(oneRM/bodyweight) / ELITE_REL[sex][lift]` = fraction of the elite-competitor standard for that lift. Sex defaults to male if unset/unknown (with a disclosure in UI).
- `weakLift(lifts, bodyweight, sex): 'squat'|'bench'|'deadlift'` — the lift with the lowest `relStandard` (each lift compared to its OWN standard, so bench being naturally lower doesn't auto-flag it; ties broken bench>squat>deadlift, i.e. the more commonly-lagging lift). Returns `null` if any 1RM missing.
- `glPoints(total, bodyweight, sex): number` — `total * 100 / (A − B·e^(−C·bodyweight))`, rounded to 2 decimals. `total` = sum of the three 1RMs.
- `levelBand(avgRelStandard): string` — heuristic label relative to elite-competitor standard: `<0.45` 입문, `0.45–0.6` 초중급, `0.6–0.75` 중상급, `0.75–0.9` 고급, `≥0.9` 엘리트급. (Labeled "competitive-standard-relative" in UI; not a clinical level.)
- `assess(lifts, bodyweight, sex): { perLift: {squat,bench,deadlift: relStandard}, weakLift, glPoints, level }`.
- `recommendBlend(years, weakLiftPresent): blend` — coaching-heuristic: < 1 yr → strength-leaning (newbie linear gains); 1–3 yr → balanced/powerbuilding; > 3 yr → user-goal-driven default (general). Returns a `{power,strength,hypertrophy,endurance}` normalized blend; the user can override via sliders/presets. (Periodization-model recommendation reuses SP1's `recommendModel`.)

## 4b. Variation load modifiers (`exercises.json` + `periodization.js`)

Today the engine computes a variation's weight from the competition lift's e1RM directly — over-prescribing, since variations are performed at a different %1RM than the comp lift. Add a per-exercise `e1rmModifier` (fraction of the base comp lift's e1RM; default **1.0** for competition lifts and accessories) and apply it: `weight = weightFor(quality, ctx.e1rm[baseLift] * (e1rmModifier ?? 1))` in `periodization.buildExercise`, and the same `* (e1rmModifier ?? 1)` in `deload.buildDeloadWeek`.

Modifiers (midpoints from PRS on the Platform, 2018, coaching-consensus; longer ROM/pause < 1, shorter ROM > 1):
- **Squat variations:** high-bar 0.94, SSB/safety 0.89, buffalo/duffalo 0.99, cambered 0.91, tempo 0.90, pause 0.93, pin 0.89, box 0.90, anderson 0.88, front 0.84, zercher 0.80, heel-elevated/cyclist 0.85.
- **Bench variations:** close-grip 0.97, wide 0.95, tempo 0.93, pause/2-second 0.95, spoto 0.94, pin press 0.94, floor 0.93, larsen 0.93, feet-up 0.93, dead bench 0.92, cambered 0.93, incline 0.82, decline 0.95, swiss/axle 0.93, slingshot 1.04, board 1.04.
- **Deadlift variations:** pause off-floor 0.93, pause below-knee 0.94, deficit 0.93, halting 0.92, block-pull-below-knee 1.00, block-pull-above-knee 1.05, rack-pull-above-knee 1.05, rack-pull-mid-shin 1.02, snatch-grip 0.85, clean-grip 0.92, RDL 0.80, stiff-leg 0.80, trap-bar 1.05, tempo 0.90, sumo-block-pull 1.05.
- Everything else (competition lifts, accessories) → `e1rmModifier` absent ⇒ treated as 1.0.

Individual variation is large (morphology); these are starting suggestions surfaced as autoregulate targets, not fixed loads (disclosed). The modifier is applied to the WEIGHT only; reps/RPE/quality come from the zone as before.

## 5. Weak-Lift → Routine (engine, small additions)

`profile.priorityLift: 'squat'|'bench'|'deadlift'|null` (set from the accepted weak-lift recommendation or chosen manually). At generation (option C, within MRV):
- **Volume bump:** the priority lift's `setsPerSession` is increased by +1 set (after the MRV cap, then re-capped so it never exceeds `band.mrv` realized).
- **Targeted accessories:** the priority lift's weak sticking region (from `profile.stickingPoint[priorityLift]`) biases accessory selection toward that region for that lift's sessions (reuse `accessories.select` with a stickingPoint emphasis already supported).
`generate.js` reads `priorityLift` and applies the bump + passes the sticking emphasis. If `priorityLift` is null, behavior is exactly SP1.

## 6. Wizard (`src/ui/wizard/`)

A `Wizard` component with a step index in local React state (not persisted), writing each field to `profileStore` as entered. Steps:
1. **기본** — sex, bodyweight, age.
2. **현재 1RM** — squat/bench/deadlift (direct, or weight×reps×rpe estimate). On completion shows the **strength assessment** (per-lift % of standard, GL points, heuristic band) + the **lagging lift** with an "이 종목 우선 보강?" toggle → sets `priorityLift`.
3. **경력** — training years.
4. **목표** — preset buttons + 4 quality sliders. Shows the **recommended blend** (from `recommendBlend(years, …)`) with an "추천 적용" button; user can override.
5. **주기화** — model select (자동 추천 shows `recommendModel` result) + competition toggle + meet date.
6. **스타일·약점** — per-lift bar/stance/grip + sticking points.
7. **장비·일정** — equipment, days/week, session time, chronic-injury region status (0–3).
8. **요약** — all diagnosis + chosen settings; "루틴 생성".

Navigation: 다음/이전 buttons; a step is "complete enough" to advance when its required fields are valid (step 2 requires the three 1RMs; others optional). The wizard is the default landing view; an "설정 수정" panel (the compact field editor) is reachable after a routine exists. Each wizard step is its own focused component file under `src/ui/wizard/steps/`.

## 7. Data Model / Store

`profileStore.DEFAULT_PROFILE` gains `priorityLift: null`. New action `setPriorityLift(value)`. The persist `merge` fills `priorityLift` from the default. No other shape change; the wizard reuses existing setters (`setField`, `setLift`, `setStyle`, `setStickingPoint`, `setRegionStatus`, `setQuality`, `applyPreset`, `setPeriodizationModel`, `toggleEquipment`).

## 8. UI Integration (`src/App.jsx`)

App shows the `Wizard` when no plan exists (or the user clicks "처음부터"); once a plan is generated, it shows the routine + a compact "설정 수정" collapsible (the existing field controls) + the toolbar (CSV/print). The single legacy `InputForm` is retired as the primary entry but its field controls are reused inside the edit panel and wizard steps. i18n adds wizard step titles, assessment labels, level bands, and recommendation copy (Korean). LimitsPanel adds the SP2 honest limits (§3): inter-lift standards are competitor-derived; strength "level" is relative to competitive standards, not a clinical grade; multi-level tables unverified.

## 9. Error Handling

Missing 1RM → assessment/weakLift return null and the wizard shows "1RM을 입력하면 진단이 나옵니다" rather than crashing. Missing sex → default male with a visible "성별 미입력 — 남성 기준" note (affects standards). Missing bodyweight → assessment hidden (relStandard needs BW). All-zero blend after override → SP1's normalize fallback. priorityLift volume bump always re-capped at MRV.

## 10. Testing (TDD)

Golden tests for `standards.js`: `relStandard` (known oneRM/BW/sex → known fraction), `weakLift` (a lifter with a clearly lagging bench → 'bench'; the natural bench<squat<deadlift ordering does NOT auto-flag bench when all are proportional), `glPoints` (known total/BW/sex → known GL within tolerance), `levelBand` boundaries, `assess` shape, `recommendBlend` per experience tier. generate/periodization: a variation with `e1rmModifier` 0.90 produces a working weight ≈ 90% of what the same slot would get at modifier 1.0 (e.g. deficit deadlift lighter than the comp deadlift at the same quality); a comp lift / accessory (no modifier) is unchanged; deload applies the modifier too. DB-integrity: every variation `e1rmModifier`, when present, is a number in [0.75, 1.10]. `priorityLift` bumps that lift's weekly sets by ~1 (still ≤ MRV) and does nothing when null. Wizard/steps: jsdom interaction — step 2 entry shows assessment + weak-lift toggle sets `priorityLift`; preset/blend recommendation applies; navigation advances only when required fields valid; full end-to-end (wizard → generate → routine renders). Full `npm test` green at the end (this is a breaking-UI migration like SP1 — focused tests per task, full green at the final task).

## 11. Honest Limits (UI)

- Inter-lift standards come from elite competition data; a "lagging" flag means weak *relative to competitive proportions*, not that the lift is bad.
- Strength "level" is reported relative to competitive standards (% of elite + GL) with a coarse heuristic band — not a definitive novice/intermediate/advanced grade (those tables are unverified).
- Sex strongly affects the standards; an un-entered sex defaults to male and skews the read.
- The weak-lift bump is modest and MRV-capped; it does not guarantee the lift catches up.

## 12. Scope / Sequencing

SP2 ships the wizard + diagnosis + priority-lift routing. SP3 (daily check-in readiness + fatigue monitor) and SP4 (video) follow as their own spec→plan→build cycles. SP1 stays live; SP2 merges incrementally when ready.
