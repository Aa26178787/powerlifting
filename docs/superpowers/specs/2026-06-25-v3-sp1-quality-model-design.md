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
- The fatigue / overreaching monitor (RPE-creep, readiness & pain trends, accumulated-volume-vs-MRV → early-deload/volume-cut) — SP3, since it needs logged history. SP1 only enforces a generation-time MRV cap (no overvolume prescribed) and `recommendModel` accepts a `progressTrend` arg (default `'unknown'`) so SP3 can drive progress-based model switching later.
- Progress-driven automatic periodization-model switching — SP3 (needs logged progress/stall). SP1 ships `recommendModel` as a pure, re-runnable function.
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

Each quality defines a zone used to build a working set. Reps are a **range** `[min, max]` (the lifter autoregulates within it to the target RPE); `repAnchor` is the single rep used to compute the suggested weight; `pct` is a fraction-of-1RM range (midpoint used for the suggestion / shown). Loading mode is RPE-derived (via the Tuchscherer chart) EXCEPT Power, which is %1RM-derived (power is about velocity/intent, not proximity to failure):

| quality | reps `[min,max]` | repAnchor | %1RM range | loading | rpeTarget | RIR/intent |
|---|---|---|---|---|---|---|
| `power` | `[2, 4]` | 3 | 0.55–0.70 | %1RM (midpoint 0.625) | — | explosive, far from failure (~RIR 4+) |
| `strength` | `[2, 5]` | 3 | 0.82–0.92 | RPE | 8.5 | RIR 1–2, heavy |
| `hypertrophy` | `[6, 12]` | 9 | 0.67–0.78 | RPE | 8.5 | RIR ~1–2, volume-driven |
| `endurance` | `[12, 20]` | 16 | 0.50–0.62 | RPE | 8 | RIR ~2, short rest |

`ZONES` is the lookup. Each working exercise carries `reps: [min,max]` (rendered as "min–max") and `repAnchor`. `weightFor(quality, e1rm)` → Power: `roundToIncrement(e1rm * 0.625)`; others: `workingWeight(e1rm, repAnchor, rpeTarget)` (reuses Tuchscherer/e1rm.js). `pct` on the exercise = the zone %1RM midpoint (display).

## 5. Blend → Weekly Allocation (`quality.js`)

- Profile field `qualities: { power, strength, hypertrophy, endurance }` — non-negative numbers; `normalizeBlend` divides by the sum so they form fractions (sum 1). Default `{ power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 }`.
- `allocateSets(totalWeeklySets, blend)` → integer set counts per quality, proportional to the blend, summing exactly to `totalWeeklySets` (largest-remainder rounding; zero-fraction qualities get 0).
- `weeklyQualitySchedule(perLiftWeeklySets, blend, frequency)` → for each main lift, a flat list of qualities (one per working slot across the week) reflecting the allocation, ordered heaviest-first within the week (strength/power earlier when fresh, endurance later) for sensible session ordering.

## 5b. Blend presets (`quality.js`)

Named quick-start blends that set the four-quality sliders; the user then fine-tunes. `PRESETS`:

| preset (key / 한국어) | power | strength | hypertrophy | endurance |
|---|---|---|---|---|
| `powerlifting` / 파워리프팅 | 0.10 | 0.70 | 0.20 | 0.00 |
| `powerbuilding` / 파워빌딩 | 0.10 | 0.45 | 0.45 | 0.00 |
| `bodybuilding` / 보디빌딩 | 0.00 | 0.20 | 0.80 | 0.00 |
| `athletic` / 파워·운동선수 | 0.40 | 0.40 | 0.20 | 0.00 |
| `general` / 일반·균형 | 0.15 | 0.30 | 0.40 | 0.15 |

`presetBlend(key)` returns the blend (or `null` for unknown). Powerbuilding is just a `strength+hypertrophy` blend — no special mode.

## 5c. Periodization model (`periodization.js` + `periodizationModel.js`)

A periodization **model** governs week-to-week progression and how the quality blend maps to weeks. SP1 ships three, as adjustable presets on three axes — `progressionRate` (how fast load climbs), `undulation` (how much intensity varies within/across weeks; 0 = linear), `emphasisConcentration` (concurrent-spread ↔ block-concentrated):

- **`linear`** — load climbs week to week, low undulation, blend spread within each week (concurrent). RPE wave like v2 (e.g. 7.5→8→8.5→deload).
- **`undulating` (DUP)** — intensity/quality varies across the week; blend spread WITHIN each week (the §5 allocation). Default for general training.
- **`block`** — blend concentrated ACROSS weeks: each week/block emphasizes one quality (e.g. hypertrophy block → strength block), rotating. With competition mode (meet date) the last block is a peak/taper; without a meet it loops accumulation→deload→repeat (NO peak).

**Recommendation is fluid and signal-based, NOT experience-tier-locked** (`recommendModel(signals)` — a PURE function so it can be re-run as signals change):
- meet date present & near → `block` (peak/taper from the meet date); far → `block` or `undulating` by blend.
- no meet → driven by the blend + preference: strength/power-dominant → `linear` or `undulating`; balanced/hypertrophy → `undulating` (default); "focus one quality for a phase" intent → `block` (emphasis rotation, no peak).
- progress/stall trend would shift the recommendation (progressing → keep simple/linear; stalling → undulating/block) — but the stall signal needs logged history, so **the progress-driven auto-switch matures in SP3**; SP1's `recommendModel` accepts a `progressTrend` arg defaulting to `'unknown'`.
- The user can always OVERRIDE the recommended model.

**Honest limit:** periodization-model choice has little effect when volume is equated (LP≈DUP, prior + v3 research); the recommendation is context/preference-driven, not "this model is superior."

`profile` gains `periodizationModel: 'linear'|'undulating'|'block'|'auto'` (`'auto'` = use `recommendModel`) and `competition: { on, date }` (already present). Competition mode adds the peak/taper layer ONLY when a date is set.

## 6. Engine Changes (extends v2 `src/engine/`)

- `quality.js` — NEW: `ZONES`, `normalizeBlend`, `allocateSets`, `weeklyQualitySchedule`, `weightFor`, `PRESETS`, `presetBlend`, `dominantQuality`.
- `periodizationModel.js` — NEW: `MODELS` (linear/undulating/block + their progressionRate/undulation/emphasisConcentration axis values), `recommendModel(signals)` (pure: meet date/proximity, blend, `progressTrend='unknown'` → model), `weekPlan(model, weekIndex, blend, competition)` (per-week intensity offset + which qualities this week emphasizes — concurrent for linear/undulating, concentrated for block; competition date adds peak/taper on the final block).
- `generate.js` — CHANGED: profile uses `qualities` (not `goal`) + `periodizationModel`. Resolve model via `recommendModel` when `'auto'`. Volume from v2 `volume.js`/`tuner.js` (band derived from the blend, see below), then **capped at MRV** (no per-lift weekly working sets above the quality band's `mrv`). The per-slot **role→reps/rpe** is replaced by a **quality→zone** assignment from `weeklyQualitySchedule` shaped by `weekPlan` (block models concentrate the week's qualities). Each working exercise becomes `{ lift, baseLift, quality, sets, reps:[min,max], repAnchor, pct, rpeTarget, weight, velocity:null, autoregulate:true }`.
- `volume.js`/`tuner.js` — ADAPTED: the goal→band mapping is replaced by deriving a band from the blend via `dominantQuality` (power+strength→strength band, hypertrophy→hypertrophy band, mixed→balanced), preserving v2 volume logic, and the result is MRV-capped at generation time (overvolume guard; the full fatigue/overreaching monitor — RPE-creep, readiness & pain trends, accumulated-volume-vs-MRV — lives in SP3 since it needs logged history).
- `selector.js` — ADAPTED: template choice keys on `dominantQuality` (hypertrophy-dominant→hypertrophyBlock, else by years/days as today).
- `periodization.js` — CHANGED: `buildSession` resolves each slot's `quality` from the schedule (shaped by `weekPlan`) and pulls reps/rpe/weight from `ZONES`/`weightFor` instead of `ROLE`. Region-status volume scaling, comp/variation slot resolution, velocity stub all unchanged.
- Reused unchanged: `exercises.js`, `variations.js`, `accessories.js`, `regionStatus.js`, `style.js`, `templates.js` (layouts), `deload.js`, `e1rm.js`, `autoreg.js`.

## 7. Output / Data Model

`Exercise` shape changes from v2's `reps: number` to **`reps: [min, max]`** plus `repAnchor: number`, and gains `quality` and `autoregulate: true`. `pct` carries the zone %1RM midpoint (engine-populated; NO longer derived from `pctOf1RM(reps, rpe)` since reps is now a range — `planAdapter.enrichExercise` stops computing pct and just passes the engine's pct through). Weight is the e1RM-derived suggestion (computed from `repAnchor`). Consumers updated: RoutineView renders reps as "min–max"; CSV exports the range as `"min-max"`. Mesocycle/Week/Session shapes otherwise unchanged; `velocity` stub stays. Deload recomputes at RPE 6 using `repAnchor` (not the range).

## 8. UI (minimal for SP1; full wizard is SP2)

Replace the goal `<select>` with: (a) **preset buttons** (파워리프팅/파워빌딩/보디빌딩/파워·운동선수/일반) that set the blend; (b) **four quality sliders** (0–100 each) + a normalized display, storing `profile.qualities`; (c) a **periodization model** select (자동 추천/선형/비선형DUP/블록 → `profile.periodizationModel`, default `'auto'`) showing the recommended model when on auto; (d) the existing competition toggle + meet date (drives peak/taper only when set). RoutineView shows each exercise's **quality tag** + reps as "min–max" + an "autoregulate" hint next to the suggested weight. LimitsPanel adds: "무게는 RPE로 자동조절할 제안치이며 고정 처방이 아닙니다" + "주기화 모델 차이는 볼륨이 같으면 미미합니다" + the SP1 honest gaps (§3, §11). i18n adds quality labels (파워/근력/근비대/근지구력), preset/model labels, and the autoregulate hint.

## 9. Error Handling

All-zero blend → fall back to default (strength-leaning). Normalize guards divide-by-zero. Unknown quality → treated as strength. Allocation always sums exactly to the target (no lost/extra sets).

## 10. Testing (TDD)

Golden tests: `normalizeBlend` (sums to 1; all-zero→default), `allocateSets` (proportional, exact sum, largest-remainder), `weeklyQualitySchedule` (right counts per quality, ordering), `weightFor` (power=%·e1rm, others=Tuchscherer via repAnchor), `ZONES` shape (reps `[min,max]` + repAnchor), `presetBlend` (powerbuilding=strength+hypertrophy), `dominantQuality`. periodizationModel: `recommendModel` (meet near→block; no-meet balanced→undulating; override respected), `weekPlan` (block concentrates qualities across weeks; linear/undulating spread within), MRV cap (no per-lift weekly sets > band.mrv). Integration: a fixed blend+model → a mesocycle whose per-lift weekly working sets match the allocated quality counts (≤ MRV), every exercise carries a valid `quality`, `reps:[min,max]`, `autoregulate`, finite weight; block model emphasizes different qualities per week; region/variation/deload still applied. UI: presets set the blend; sliders + model select update the store; RoutineView shows quality tags + rep ranges.

## 11. Honest Limits (UI)

- Zone midpoints are reasonable defaults from the verified continuum, not proven optima; Prilepin/rest-interval specifics unverified.
- Autoregulation is ≥ fixed %, not dramatically superior — the value is daily flexibility, not a magic edge.
- ACWR-based load guardrails are NOT used (the injury-prediction model is discredited).
- Power is the most readiness-sensitive quality (SP3 will cut it first when readiness is low).

## 12. Scope / Sequencing

SP1 ships the quality engine + minimal slider UI. SP2 (wizard + recommendation + strength standards) and SP3 (daily check-in readiness) follow as their own spec→plan→build cycles. v2 stays live until SP1–SP3 land.
