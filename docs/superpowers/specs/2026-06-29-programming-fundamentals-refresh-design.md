# Spec 1 — Programming Fundamentals Refresh (2026-06-29)

Part of the overhaul: `docs/superpowers/specs/2026-06-29-overload-and-programming-overhaul-design.md` (L1 + parts of L2).
Evidence base: `docs/research/2026-06-29-overload-and-programming-evidence.md` (findings B1–B8, C1–C2).

Engine stays **pure, deterministic, kg-internal**. Changes are bounded and tier-honest. This is the **only spec in the overhaul that intentionally breaks bit-identity** — the proximity-to-failure differentiation (Fix 1) changes hypertrophy-zone loads. All other fixes preserve byte-identical output where they don't touch the changed quality. Golden tests are updated with documented rationale.

This spec lands first because the overload feature (Spec 4) builds on these primitives.

---

## Current state (confirmed in source)

- `quality.js ZONES`: `strength` and `hypertrophy` **both** use `rpeTarget 8.5` — identical proximity to failure. `endurance` uses 8. `power` uses pct loading (no RPE target).
- `quality.js` drives loads via `weightFor` → `loadForRpe(e1rm, repAnchor, rpeTarget)`.
- `generate.js` selects accessories with `select()` (accessories.js) and variations with `pick()` (variations.js); main lifts are deterministic from `buildLayout`. **Accessory order within a session = the order `select` returns** (no lagging-first priority).
- `periodizationModel.js phaseFor` returns `accumulation | intensification | peak`, but the **phase does not currently shift rep/intensity/proximity** — it only gates deficit-fill scaling and peak accessory trim in `generate.js`.
- Frequency: `frequency.js` / `tuner.js` distribute weekly volume; no explicit "frequency independently helps strength but not hypertrophy" differential.

---

## Fix 1 — Proximity-to-failure (RIR) differentiated by quality (← B3) — 강

**Problem:** strength and hypertrophy share `rpeTarget 8.5`. Evidence: hypertrophy benefits from **closer to failure** (0–3 RIR ≈ RPE 7–10, best near 0–2 RIR); strength improves across a **wider, less-close** range and does not need failure.

**Change** (`quality.js ZONES`):
```js
strength:    { reps: [2, 5],  repAnchor: 3,  pct: [0.82, 0.92], loading: 'rpe', rpeTarget: 8   },  // was 8.5 — strength needs heavy, not close-to-failure
hypertrophy: { reps: [6, 12], repAnchor: 9,  pct: [0.67, 0.78], loading: 'rpe', rpeTarget: 9   },  // was 8.5 — hypertrophy benefits from closer to failure (~1 RIR)
endurance:   { reps: [12,20], repAnchor: 16, pct: [0.50, 0.62], loading: 'rpe', rpeTarget: 8.5 },  // was 8
```
Rationale tiers: direction (hyp closer than strength) = **강** (2024 meta); exact RPE integers = consensus heuristic (`근거 약함`).

**Consequences & guards:**
- Hypertrophy-zone load **rises** (RPE 8.5→9 at repAnchor 9, with the existing high-rep correction) — visible in `strengthHypertrophy` backoff and accessory hypertrophy work. This is the intended bit-identity break.
- Strength-zone load **drops slightly** (RPE 8.5→8 at repAnchor 3). Top-set behavior changes — **verify against the model-realism load ramp + 97.5% clamp** so peak schemes stay bounded.
- The `rpeTarget` is the autoregulation contract shown in the UI; the label moves with the load (no fake creep).
- Golden tests in `quality.test.js`, `generate.test.js`, `setSchemes.test.js`, `deload.test.js` updated; each diff annotated with "proximity differentiation (Spec 1 Fix 1)".

## Fix 2 — Frequency: strength-independent benefit vs hypertrophy volume-distribution (← B2) — 강

**Problem:** frequency is treated as a pure volume-distribution knob for all qualities. Evidence: higher frequency independently helps **strength** (diminishing); for **hypertrophy** the effect is negligible when volume is equated.

**Change:** when computing recommended/default frequency and the strength-vs-hypertrophy differential, bias **strength-dominant** blends toward an extra session for a lift (within `daysPerWeek`), while hypertrophy-dominant blends gain nothing from frequency beyond volume distribution.
- Touch points: `frequency.js defaultFrequency` (or a new `recommendedFrequency(blend, daysPerWeek)`) + `tuner.js`. Keep it bounded and OFF-by-default-identical where `daysPerWeek` doesn't allow the extra session.
- Tier: direction = **강**; exact bias (e.g. strength gets +1 freq when room) = heuristic (`근거 약함`).

## Fix 3 — Volume diminishing-returns + strength-faster verification (← B1) — 강

**Problem:** confirm the volume model encodes diminishing returns with **strength diminishing faster** than hypertrophy.

**Change:** audit `volume.js` BANDS / ramp + `muscleVolume.js` PER_MUSCLE_BANDS against the Pelland/Zourdos curve. If the ramp is linear, introduce a concave (diminishing) shape and ensure the strength contribution saturates earlier than hypertrophy. If already adequate, document why and add a regression test asserting the concavity. Tier: **강** direction; exact curve = heuristic (`근거 약함`).

## Fix 4 — Priority / lagging-first exercise ordering (← B6) — 중

**Problem:** accessory order is whatever `select` returns; the first exercise in a session gets the greatest adaptation, so weak/priority work should come first when hypertrophy or weakness-correction is the goal.

**Change:** after `select` returns accessories, **stably reorder** so that exercises whose `primaryMuscle` / target matches the user's weakness (sticking point / `priorityLift` region) come first — but only when `goalBias >= 0` (hypertrophy-leaning) or a weakness is declared. Pure-strength/power plans keep the competition-lift-first order unchanged (specificity). Implement as a pure `orderByPriority(accessories, { weakness, dom })` helper in `accessories.js` or `generate.js`.
- Tier: direction = **중**; the "weakness-first when hyp-leaning" rule = consensus heuristic (`근거 약함`).

## Fix 5 — Lengthened-position hypertrophy option (← B4) — 중-강 (NEW)

**Problem:** no range-of-motion concept; lengthened-position training is the primary ROM consideration for hypertrophy.

**Change:** add an optional, additive **`lengthenedEmphasis`** marker on hypertrophy accessories (not main competition lifts). When enabled (hypertrophy-dominant blend, or an explicit toggle), eligible accessories carry a note/flag ("긴 근육 길이 강조 — lengthened-position / lengthened partials") and, where the exercise DB tags support it, prefer long-muscle-length variants.
- Additive field only — no change to set/load math → bit-identical when OFF.
- Needs a small DB tag pass (which exercises are stretch-biased); if absent, ship the note-only version and defer the tag pass.
- Tier: **중-강** direction; selection specifics = heuristic (`근거 약함`).

## Fix 6 — Variation & free-weight specificity guards (← B7, B8) — 중 / 강

- **Systematic (not random) variation:** ensure variation rotation is block-scheduled (deterministic by week/block), not changing too frequently. Audit `variations.js pick` usage; if variations can churn week-to-week, pin them per block. Tier: **중**.
- **Free-weight specificity for strength:** confirm strength/PL plans bias free-weight movements while hypertrophy accessories may use machines (matches existing `accessoryPreference`). Encode/verify in `accessories.js`. Tier: **강** (strength specificity).

## Fix 7 — Phase-potentiation phase parameters explicit (← C2) — 중 / C1 honesty

**Problem:** `phaseFor` labels phases but they don't shift rep/intensity/proximity; periodization-model framing implies a superiority that the evidence (C1: LP≈DUP) doesn't support.

**Change:**
- Make phases actually shift the working emphasis: **accumulation** (higher reps/volume, slightly further from failure), **intensification** (heavier, fewer reps), **realization/peak** (highest intensity, lowest volume). Wire a `phaseProfile(phase)` into `periodization.js` load/volume so the sequence reflects accumulation→transmutation→realization. Keep bounded; preserve the existing top-set load ramp + 97.5% clamp.
- **Honesty:** update copy in `StepPeriodization.jsx` to stop implying model superiority (LP≈DUP volume-equated); frame the hybrid as "secondary to volume/intensity/proximity."
- Tier: phase structure = **중** (consensus); potentiation magnitude = `근거 약함`; model-equivalence = **강**.

---

## Determinism & purity
No `Date`/random. New helpers (`orderByPriority`, `phaseProfile`, `recommendedFrequency`, volume concavity) are pure functions of their args. Same inputs → same plan.

## Bit-identity
- **Intentional break:** Fix 1 (proximity) changes hypertrophy + strength zone loads. Goldens updated, each diff annotated.
- **Preserved:** Fixes 2–7 are OFF-by-default-identical or additive (notes/flags/order) where they don't interact with the changed quality. Where Fix 4/7 change order/phase output, gate behind the goal/phase conditions and add focused tests rather than blanket golden churn.

## Testing (TDD)
- `quality.test.js`: new rpeTargets; monotonic load ordering strength < hypertrophy proximity.
- `frequency.test.js`: strength blend gets extra session when room; hypertrophy doesn't.
- `volume.test.js`: concavity / strength-faster-saturation regression.
- `accessories.test.js`: `orderByPriority` puts weakness-matched first only when hyp-leaning; strength order unchanged.
- `periodization.test.js`: `phaseProfile` shifts reps/intensity across phases; ramp + clamp still hold.
- Additive-field tests for `lengthenedEmphasis`; component test for updated StepPeriodization copy.

## Honest disclosure (LimitsPanel + PROJECT_STATUS §3)
New bullets: proximity-to-failure differentiation (hyp closer than strength — 2024 meta direction, exact RPE heuristic); frequency helps strength independently but not hypertrophy beyond volume; volume diminishing returns (strength faster); lagging-first ordering (consensus); lengthened-position emphasis (recent evidence, selection heuristic); periodization model choice is secondary to volume/intensity/proximity (LP≈DUP).
