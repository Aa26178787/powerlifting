# v3 Sub-Project 1 — Quality Model & Mesocycle Structure (Design Spec)

**Date:** 2026-06-25
**Status:** Approved design (brainstorming complete, research done) — pending user spec review → plan
**Part of:** v3 redesign (survey-driven, autoregulation-first, 4-quality goal model). This is SP1 of 4 (SP2 = setup wizard + recommendation engine; SP3 = daily check-in autoregulation; SP4 = video sticking-point — later). Builds on the live v2 engine; v2 stays live until v3 is ready.

---

## 1. Overview

Replace the v2 single `goal` (strength/hypertrophy/balanced) with a **four-quality blend** — Power, Strength, Hypertrophy, Endurance — that the user allocates as percentages. The engine maps each quality to a prescription **zone** (reps, %1RM, RPE/proximity-to-failure) and distributes the week's working sets across zones in proportion to the blend (concurrent). Output is a mesocycle **structure** expressed as zone + RPE targets (autoregulation-first), not fixed prescribed weights — weight is shown only as an e1RM-derived suggestion labeled "autoregulate." SP3 (daily check-in) will scale the suggestion per readiness.

Everything else from v2 is reused unchanged: exercise DB (207), template layouts, variation/accessory selection, region-status autoregulation, RPE/e1RM math, deload.

## 2. Goals / Non-Goals

**Goals (SP1):**
- 4-quality blend input replaces `goal`; engine generates a quality-blend-driven mesocycle structure.
- Evidence-based quality→zone mapping (research 2026-06-25).
- Weekly set allocation across zones proportional to the blend.
- Output = zone + RPE target per slot; weight = e1RM-derived suggestion flagged autoregulate (not a fixed prescription).
- Deterministic, fully unit-tested. v2 features (variation/accessory/region/deload) keep working.

**Non-Goals (SP1 — later sub-projects):**
- The setup survey/wizard UX (SP2) — SP1 ships a minimal 4-slider quality input replacing the goal dropdown.
- The recommendation/diagnosis engine + strength standards (SP2).
- The daily check-in readiness autoregulation (SP3) — SP1's output is the per-session structure SP3 will adjust.
- Video sticking-point (SP4).

## 3. Evidence Base (deep-research 2026-06-25, 20 verified claims)

- **Strength zone:** 1–5 reps, 80–100% 1RM (ES 0.58 for >60%). (PMC7927075)
- **Hypertrophy:** load-INDEPENDENT (≥30% 1RM, effect-size diff 0.03), volume-driven, taken near failure (RIR 0–3), ~6–15 reps. (PMC7927075)
- **Power:** explosive, far from failure, low velocity loss 10–20% (40% VL halves type IIX); trains rate of force at submaximal loads. (Front Physiol 2022)
- **Endurance:** high-rep, <60% 1RM (traditional continuum holds at the strength end).
- **Autoregulation ≥ fixed:** RPE/RIR and velocity autoregulation match or beat fixed %1RM (PMC8762534, PMC7810043) — justifies prescribing by RPE/zone rather than fixed weight. VBT velocity-loss: ≤25% favors strength, >25% favors hypertrophy.
- **Readiness (for SP3, recorded here):** acute sleep loss − strength ~2.85% (lower-body −3.42%), **power −6.26% (most sensitive)**; chronic stress slows recovery; low readiness → cut **power & lower-body** first. (PMC9584849, JSCR 2014)
- **REFUTED — do NOT use:** the ACWR injury "sweet spot" (0.8–1.3) and danger zones (refuted 0-3); the "VBT beats traditional" ranking (autoregulation is ≥ fixed, not dominant).

**Honest gaps (disclose in UI):** Prilepin's exact reps/volume table, rest-interval numbers, inter-lift ratios, and strength-level bodyweight-multiple tables did NOT survive verification — those belong to SP2 (recommendation) and will be treated as coaching-consensus + IPF GoodLift normalization, clearly labeled. SP1's zones use the verified continuum findings; the exact rep/%/RPE midpoints within each zone are reasonable defaults, not precise optima.

## 4. Quality → Zone Mapping (`quality.js`)

Each quality defines a zone used to build a working set. `pct` is a fraction-of-1RM range (midpoint used for the suggestion); `repsMain`/`repsBackoff` are representative; loading mode is RPE-derived (via the Tuchscherer chart) EXCEPT Power, which is %1RM-derived (power is about velocity/intent, not proximity to failure):

| quality | repsMain | %1RM range | loading | rpeTarget | RIR/intent |
|---|---|---|---|---|---|
| `power` | 3 | 0.55–0.70 | %1RM (midpoint 0.625) | — | explosive, far from failure (~RIR 4+) |
| `strength` | 3 | 0.82–0.92 | RPE | 8.5 | RIR 1–2, heavy |
| `hypertrophy` | 8 | 0.67–0.78 | RPE | 8.5 | RIR ~1–2, volume-driven |
| `endurance` | 15 | 0.55–0.62 | RPE | 8 | RIR ~2, short rest |

`ZONES` is the lookup. `weightFor(quality, e1rm)` → Power: `roundToIncrement(e1rm * 0.625)`; others: `workingWeight(e1rm, repsMain, rpeTarget)` (reuses Tuchscherer/e1rm.js).

## 5. Blend → Weekly Allocation (`quality.js`)

- Profile field `qualities: { power, strength, hypertrophy, endurance }` — non-negative numbers; `normalizeBlend` divides by the sum so they form fractions (sum 1). Default `{ power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 }`.
- `allocateSets(totalWeeklySets, blend)` → integer set counts per quality, proportional to the blend, summing exactly to `totalWeeklySets` (largest-remainder rounding; zero-fraction qualities get 0).
- `weeklyQualitySchedule(perLiftWeeklySets, blend, frequency)` → for each main lift, a flat list of qualities (one per working slot across the week) reflecting the allocation, ordered heaviest-first within the week (strength/power earlier when fresh, endurance later) for sensible session ordering.

## 6. Engine Changes (extends v2 `src/engine/`)

- `quality.js` — NEW: `ZONES`, `normalizeBlend`, `allocateSets`, `weeklyQualitySchedule`, `weightFor`.
- `generate.js` — CHANGED: profile uses `qualities` (not `goal`). Volume still comes from v2 `volume.js`/`tuner.js` but keyed off a derived dominant-quality or a fixed band (see below); the per-slot **role→reps/rpe** is replaced by a **quality→zone** assignment from `weeklyQualitySchedule`. Each working exercise becomes `{ lift, baseLift, quality, sets, reps, pct, rpeTarget, weight, velocity:null, autoregulate:true }`.
- `volume.js`/`tuner.js` — ADAPTED: the goal→band mapping (`strength/balanced/hypertrophy`) is replaced by deriving a volume band from the blend (e.g. hypertrophy-weighted blends get more sets). Minimal change: map the blend to one of the existing three bands by which quality dominates (power+strength→strength band, hypertrophy→hypertrophy band, mixed→balanced), preserving v2 volume logic.
- `selector.js` — ADAPTED: template choice currently keys on `goal`; switch to the dominant quality (hypertrophy-dominant→hypertrophyBlock, else by years/days as today).
- `periodization.js` — CHANGED: `buildSession` resolves each slot's `quality` from the schedule and pulls reps/rpe/weight from `ZONES`/`weightFor` instead of `ROLE`. Region-status volume scaling, comp/variation slot resolution, velocity stub all unchanged.
- Reused unchanged: `exercises.js`, `variations.js`, `accessories.js`, `regionStatus.js`, `style.js`, `templates.js` (layouts), `deload.js`, `e1rm.js`, `autoreg.js`.

## 7. Output / Data Model

`Exercise` gains `quality: 'power'|'strength'|'hypertrophy'|'endurance'` and `autoregulate: true`. `pct` carries the zone %1RM (now meaningful, populated by the engine). Weight is the e1RM-derived suggestion. Mesocycle/Week/Session shapes otherwise unchanged; `velocity` stub stays. Deload unchanged (it already recomputes at RPE 6).

## 8. UI (minimal for SP1; full wizard is SP2)

Replace the goal `<select>` with four quality sliders (0–100 each) + a normalized display of the blend; store `profile.qualities`. RoutineView shows each exercise's quality tag + an "autoregulate" hint next to the suggested weight. LimitsPanel adds: "Weights are suggestions to autoregulate by RPE, not fixed prescriptions" + the SP1 honest gaps (§3). i18n adds quality labels (파워/근력/근비대/근지구력) and the autoregulate hint.

## 9. Error Handling

All-zero blend → fall back to default (strength-leaning). Normalize guards divide-by-zero. Unknown quality → treated as strength. Allocation always sums exactly to the target (no lost/extra sets).

## 10. Testing (TDD)

Golden tests: `normalizeBlend` (sums to 1; all-zero→default), `allocateSets` (proportional, exact sum, largest-remainder), `weeklyQualitySchedule` (right counts per quality, ordering), `weightFor` (power=%·e1rm, others=Tuchscherer), `ZONES` shape. Integration: a fixed `qualities` blend → a mesocycle whose per-lift weekly working sets match the allocated quality counts, every exercise carries a valid `quality` + `autoregulate`, weights finite, region/variation/deload still applied. UI: slider updates store; RoutineView shows quality tags.

## 11. Honest Limits (UI)

- Zone midpoints are reasonable defaults from the verified continuum, not proven optima; Prilepin/rest-interval specifics unverified.
- Autoregulation is ≥ fixed %, not dramatically superior — the value is daily flexibility, not a magic edge.
- ACWR-based load guardrails are NOT used (the injury-prediction model is discredited).
- Power is the most readiness-sensitive quality (SP3 will cut it first when readiness is low).

## 12. Scope / Sequencing

SP1 ships the quality engine + minimal slider UI. SP2 (wizard + recommendation + strength standards) and SP3 (daily check-in readiness) follow as their own spec→plan→build cycles. v2 stays live until SP1–SP3 land.
