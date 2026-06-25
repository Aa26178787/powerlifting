# Programming v2 — Variety & Personalization Design Spec

**Date:** 2026-06-25
**Status:** Draft design (brainstorming complete, research done) — pending user scope/sequencing confirmation before plan
**Relation:** Major enhancement to the Phase-1 engine. Independent of Phase 2 (VBT video). Engine is no longer "frozen" — v2 evolves the engine + data, with tests.

---

## 1. Overview

Phase 1 generates a routine from a small profile using a tiny exercise set (3 comp lifts + a few accessories) and fixed templates. v2 makes the output **richer and individualized**: a large tagged exercise library, competition-lift **style** awareness, **sticking-point**-driven variation selection, graded **per-region status** (soreness→pain→injury) autoregulation, and a broad **accessory** pool — while keeping the competition lifts dominant (specificity).

Every new input must change the output (no fake-precision inputs). All mappings are research-grounded where evidence exists and clearly labeled coaching-consensus where not.

## 2. Goals / Non-Goals

**Goals:**
- Replace the 10-exercise DB with the ~213-exercise tagged catalog (`docs/research/2026-06-25-exercise-variation-catalog.md`), plus a `stress` joint-load tag.
- Style inputs (squat bar/stance, bench grip, deadlift stance) set the competition variant and bias variation/accessory selection by muscular emphasis.
- Per-lift sticking-region input routes comp-lift variations to that region.
- **Variation slots** in templates: heavy days run the comp lift; volume/light days run a comp-lift variation (specificity-biased, variation frequency < comp frequency).
- Per-region status (0–3) graded autoregulation via the pain traffic-light model: soft volume cut → swap to sparing variation → hard avoid/substitute.
- Broad accessory selection from a muscle/equipment-tagged pool, biased by style + sticking region, volume from Phase-1 landmarks.
- Deterministic, offline, fully unit-tested (same discipline as Phase 1).

**Non-Goals (v2):**
- VBT/velocity (Phase 2).
- Individualized load-velocity or per-person variation-transfer calibration.
- Auto-detecting style/sticking point from video.
- Medical diagnosis — region status is self-reported and advisory; pain handling is conservative, not clinical.

## 3. Evidence Base (deep-research 2026-06-25, 20 verified claims)

Source-tagged; full report retained in the research output.

- **Sticking points are by REGION and lift-specific** (Kompf & Arandjelović 2017, Sports Med): squat ~30–32° thigh angle (midrange, not the hole); bench early ascent (~30% bar height, elites) and **grip-width-dependent** (middle minimizes the sticking period ~11.4%, narrow ~17.3%, wide ~22.5% and lower in ROM); deadlift ~60° (around/above knee, not the floor). The sticking point does NOT equal the weakest isometric position. → **Route variations to the sticking REGION the lifter reports, using the catalog's `stickingPoint` tags.**
- **Bench grip emphasis:** close-grip → lockout/triceps; wide → lower sticking region (pec/off-chest). (Kompf 2017.)
- **Squat style (medium confidence, mixed lit):** low-bar > high-bar EMG across posterior chain in the eccentric at 60–65% 1RM (Murawa 2020, n=12); a 6-RM study found no difference. → low-bar ⇒ posterior-chain bias; high-bar ⇒ quad bias (treat as tendency).
- **Deadlift style:** sumo ⇒ greater vasti (VL/VM) activation; conventional ⇒ greater medial gastrocnemius (Escamilla 2002). → sumo ⇒ quad-biased accessories; conventional ⇒ hamstring/posterior + lower-leg.
- **Pain traffic-light (Silbernagel/Thomée; JOSPT 2015; AJSM 2007 Level-1 RCT):** governed by pain **level + trend**. Green = low/stable pain (progress OK); Red = rising pain (do not increase load). Acceptable ceiling **≤5/10 (Silbernagel model)**; conservative protocols use **<3/10**. RCT-validated as non-inferior to rest. **Attribution caveat:** the 3/10 ceiling is NOT Silbernagel's (theirs is ≤5/10).
- **Specificity dominant:** dynamic strength SMD 0.98 vs isometric transfer 0.42 (Saeterbakken 2025 meta). Variation use near-universal (>97.5%) but **run below comp-lift frequency**; accessories at ≥comp frequency (Amdi/Helms 2026 survey, comp vs variation freq: squat 1.64/1.50, bench 2.48/2.14, deadlift 1.37/1.26). → comp lifts dominant, variations supplementary.
- **Variable resistance (bands/chains):** benefits trained lifters only at **≥80% 1RM** (Liu 2022 meta, ES 0.76 vs 0.00 <80%). → gate band/chain variations to advanced + heavy.
- **Squat joint demand (medium):** knee-extensor demand peaks at the bottom, hip demand sustained throughout (Bryanton 2012 via SBS). → deep/paused squats = high bottom-knee stress; box/partial reduce it. Basis for `stress` tags.
- **Accessory volume:** reuse Phase-1 landmarks (Pelland/Zourdos 2025) — v2 research did not surface separate verified landmark numbers (open question).

**Honest limits (surface in UI):** exact variation→comp-lift transfer magnitudes are unmeasured (variation routing is coaching-consensus); pain thresholds come from tendinopathy rehab, externally applied to healthy lifters; low-bar/high-bar EMG is small-n and mixed; sticking-region routing uses catalog consensus tags, not per-variation RCTs.

## 4. Inputs (extends Phase-1 Profile)

**Kept:** 1RM (S/B/D), years, daysPerWeek, goal, global condition (fatigue 1–5), equipment, sessionTimeLimit.

**New — style (per lift):**
- `squatStyle`: `{ bar: 'low'|'high', stance: 'narrow'|'medium'|'wide' }`
- `benchStyle`: `{ grip: 'close'|'medium'|'wide' }`
- `deadliftStyle`: `{ stance: 'conventional'|'sumo' }`

**New — sticking region (per lift):** `stickingPoint: { squat, bench, deadlift: 'bottom'|'midrange'|'lockout'|'none' }` (self-reported where the lift stalls).

**New — per-region status (replaces binary injuries):** `regionStatus: { lowerBack, knee, shoulder, elbow, wrist, hip, hamstring, pec, bicepsTendon, ankle: 0|1|2|3 }` where 0 normal, 1 tight, 2 mild pain, 3 severe pain/injury.

UI-only (collected, not yet engine-consumed): age, bodyweight, sex, competition toggle (peaking remains minimal).

## 5. Exercise Database (`src/data/exercises.json` rewrite)

Replace the 10-item DB with the catalog as structured JSON. Each exercise:
```
{
  name, category: 'competition'|'variation'|'accessory',
  targetLift: 'squat'|'bench'|'deadlift'|'general',
  stickingPoint: 'bottom'|'midrange'|'lockout'|'none',
  primaryMuscle: string,
  equipment: string[],
  stress: string[],              // NEW: regions loaded, e.g. ['lowerBack','knee']
  styleBias?: string[],          // e.g. ['low-bar','sumo'] when a variation suits a style
  advanced?: boolean             // band/chain etc. gated to advanced + heavy
}
```
The `stress` tag is added during implementation from the catalog notes + §3 joint-demand evidence (e.g. deficit/paused deadlift → `lowerBack,hamstring`; deep/paused squat → `knee,lowerBack`; overhead/straight-bar press → `shoulder,elbow`; heavy curls/mixed-grip → `elbow,bicepsTendon`).

## 6. Engine Architecture (evolves Phase-1 `src/engine/`)

New/changed pure modules (all unit-tested):
```
src/engine/
  exercises.js     # CHANGED: query the big DB — byLift, byStickingPoint, byMuscle,
                   #          byEquipment, byStress, compVariant(style), substitute()
  style.js         # NEW: style → comp-lift variant name + muscle-emphasis weights
  variations.js    # NEW: pick a comp-lift variation for (lift, stickingPoint, style, equipment, advanced)
  accessories.js   # NEW: select accessory pool by (style emphasis, sticking region, muscle, equipment, time), volume via landmarks
  regionStatus.js  # NEW: graded autoregulation — status×stress → {volumeScale, swapToSparing, avoid}
  templates.js     # CHANGED: slots carry role + slotType ('comp'|'variation'); variation freq < comp freq
  periodization.js # CHANGED: heavy=comp lift; volume/light=variation; apply regionStatus modulation
  generate.js      # CHANGED: orchestrate style → comp variant → variation slots → accessories → region modulation
```

**Selection flow (generate):**
1. Resolve e1RM (unchanged).
2. **Style → comp variant**: e.g. `deadliftStyle.stance='sumo'` → competition lift = sumo deadlift; emphasis weights = quad-biased.
3. **Template + variation slots**: heavy days = comp variant; volume/light days = a **variation** chosen by `variations.pick(lift, stickingPoint, style, equipment, advanced)` (sticking-region match from catalog tags; band/chain only if advanced & the slot is ≥80%); variation weekly frequency set just below comp frequency per §3.
4. **Accessories**: `accessories.select(...)` pulls from the muscle/equipment pool, biased by style emphasis (low-bar→posterior, sumo→quads, bench close→triceps…) and sticking region (bench lockout→triceps; squat bottom→quads…), capped by sessionTimeLimit; weekly volume from Phase-1 landmarks; accessory frequency ≥ comp.
5. **Region-status modulation** (`regionStatus.apply`): for each region with status≥1, find exercises whose `stress` includes it →
   - **1 (tight)**: volume ×0.85 on those movements; mild bias to lower-stress variation.
   - **2 (mild pain)**: volume ×0.6 + swap that movement to a sparing variation (same targetLift, region NOT in its `stress`); drop the most-aggravating accessory.
   - **3 (severe/injury)**: avoid entirely → substitute a sparing variation or accessory (hard rule = current injury behavior).
   This is the pain traffic-light: rising status ⇒ reduce/sustain, never increase. UI explains it.
6. Deload + hybrid RPE/% prescription (unchanged from Phase 1).

## 7. Data Model (additions)

`Exercise` gains `category, targetLift, stickingPoint, primaryMuscle, stress[], styleBias?, advanced?`. `Session` gains `accessories: Exercise[]` (already present UI-side; move into engine output). Mesocycle/Week/Session/working-set shapes otherwise unchanged; `velocity` stub stays for Phase 2.

## 8. UI (extends Phase-1 React app)

New form sections (Korean, via i18n): style selectors per lift, sticking-region selectors per lift, region-status grid (10 regions × 0–3). RoutineView shows the chosen variation per slot and accessories (already rendered). Limits panel gains the v2 caveats (§3 honest limits) + a one-line pain-safety note ("rising pain = back off; this is not medical advice"). i18n maps extended for new exercise names.

## 9. Error Handling

Validate enums (style/stickingPoint/status); missing style → sensible defaults (low-bar, medium stance, conventional, medium grip); region status defaults 0; if region modulation would empty a slot, fall back to the safest available movement and surface a warning; never silently drop the competition lift.

## 10. Testing (TDD)

Golden tests per pure module: `style` (style→variant+weights), `variations.pick` (sticking region → expected variation set), `accessories.select` (style/region → expected muscle bias, equipment filter, time cap), `regionStatus.apply` (status×stress → expected volume scale / swap / avoid), `exercises` queries, and `generate` integration (a fixed rich profile → a fully-specified, internally-consistent mesocycle with comp variant, variations, accessories, and region modulation applied). DB integrity test (every exercise has required tags; every `stress`/`stickingPoint` value is from the allowed set).

## 11. Open Questions / Limits

- Variation→comp transfer magnitudes unmeasured → routing is coaching-consensus (disclosed).
- Pain thresholds from rehab populations → conservative defaults (status 2 reduces, 3 avoids), advisory only.
- Low-bar/high-bar emphasis is a tendency (mixed evidence) → small bias, not a hard rule.
- Accessory volume landmarks reuse Phase-1 hypertrophy bands (no v2-specific numbers verified).

## 12. Scope / Sequencing (decision needed)

v2 is large (DB rewrite + 4 new modules + 3 changed modules + UI). It can ship in slices:
- **Slice 1:** DB + style → comp variant + variation slots (the core "variety").
- **Slice 2:** region-status autoregulation.
- **Slice 3:** broad accessory selection.
Or all at once. **Also undecided: v2 first vs Phase 2 (VBT) first** — both are large; do not run concurrently.
