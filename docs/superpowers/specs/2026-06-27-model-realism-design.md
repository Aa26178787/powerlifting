# Spec — Three Model-Realism Fixes (2026-06-27)

Evidence base: `docs/research/2026-06-27-powerlifting-vs-powerbuilding-evidence.md` (findings A–F).
Multi-perspective design debate (strength-coach / hypertrophy / RP-volume-landmark / evidence-skeptic) converged on the design below.

The engine stays **pure, deterministic, kg-internal**. All three fixes are **bounded** and tier-honest (consensus vs RCT flagged in UI).

---

## Problem (confirmed by `node src/engine/demo.js`)

1. **Per-session volume blow-up.** `tuner.js` sets `setsPerSession = round(weeklySets / frequency)` with the only ceiling being `floor(mrv / slotCount)`. A low-frequency lift (deadlift freq 1) dumps the entire weekly volume into one session → **deadlift 11–15 working sets/session**.
2. **Weight↔RPE inconsistency.** `strengthHypertrophy` backoff uses a **fixed** `e1rm × ZONES.hypertrophy.pct[0]` (≈0.67) but **labels** it "9 reps @ RPE 8.5"; the RPE chart says 9@8.5 = **72.8%**. The load is ~6 pp too light vs its own label, and the chart itself **underestimates** %1RM at high reps (finding C).
3. **No week-to-week load progression.** `ctx.e1rm` is constant every week; `weightFor` ignores the RPE offset → **top-set weight is identical week 1 vs week 8** (175/122.5/210). Only the volume ramp (set count) and a decorative RPE-label creep move — "fake" progression (finding E).

---

## Fix 1 — Absolute per-session working-set cap (← findings B, D, F)

Add per-lift absolute caps, **deadlift strictest** (highest axial/CNS fatigue, finding D):

```js
// volume.js
export const PER_SESSION_CAP = { squat: 6, bench: 8, deadlift: 4 }
```

Applied at every place a per-session set count is derived:
- `tuner.js`: `setsPerSession[lift] = min(round(weekly/freq), CAP[lift])`
- `generate.js`: `cappedSetsPerSession` and the `priorityLift` bump both `min(…, CAP[lift])`
- `periodization.js` weekly ramp: `weekSets[lift] = min(round(base×ramp), CAP[lift], floor(mrv/slotCount))`

**Overflow handling — honest, not fabricated.** When weekly volume exceeds `CAP×frequency`, the engine delivers `CAP×frequency` and **does not stack** the residual onto one session (stacked sets past the cap are junk volume, finding B). We do **not** silently auto-raise frequency (it would re-shape the whole layout). The shortfall is disclosed in the UI honesty panel: "to add volume, add a session for that lift."

Rationale tiers: deadlift-lowest ordering = consensus (well-accepted); exact cap integers = consensus heuristic (label `근거 약함`).

## Fix 2 — RPE-derived backoff + bounded high-rep correction (← findings A, C)

New helper in `e1rm.js`:

```js
export function highRepCorrection(reps) {           // chart underestimates %1RM at high reps
  return Math.min(1.06, 1 + 0.008 * Math.max(0, reps - 5))   // 0 below 6 reps; ~+2–4 pp at 9–12 reps; cap +6% mult
}
export function loadForRpe(e1rm, reps, rpe, inc = 2.5) {
  const r = Math.min(12, reps)
  return roundToIncrement(e1rm * (pctOf1RM(r, rpe) / 100) * highRepCorrection(r), inc)
}
```

- `quality.js weightFor` (rpe branch) → `loadForRpe` instead of `workingWeight`.
  Strength `repAnchor 3` (≤5) → correction = 1.0 → **strength loads unchanged** (no golden churn).
  Hypertrophy `repAnchor 9` → 72.8% → ~**75%** (consistent with its RPE-8.5 label, finding C).
- `setSchemes.js strengthHypertrophy` backoff → `loadForRpe(e1rm, hZ.repAnchor, hZ.rpeTarget)` (was fixed `e1rm×0.67`).
- `deload.js` uses `loadForRpe(…, 6)` for the same consistency.

Decision (per debate): fix the **load**, keep the **label** — the RPE 8.5 label is the autoregulation contract shared with the strength top set and `ZONES.hypertrophy.rpeTarget`. Magnitude (+2–4 pp) = RCT-direction / consensus-exact (label `근거 약함`).

## Fix 3 — Bounded week-to-week load progression (← finding E)

```js
// volume.js — companion to volumeRamp
export function loadRamp(weekIndex, totalWeeks) {
  if (totalWeeks <= 1) return 1
  const MAX = 0.04                                  // +4% effective-1RM by the last working week, bounded
  return 1 + MAX * (weekIndex / (totalWeeks - 1))
}
```

- `periodization.js buildExercise`: `eff = base × loadRamp(weekIndex, totalWeeks)` where `base = e1rm × e1rmModifier`. Top sets (and all set loads) climb across the meso → **visible progressive overload** (squat top 175→~182).
- **Safety ceiling** (prevents pct-anchored peak schemes — `wave` 0.98, `ramping` 0.95 — from compounding past 1RM): every working set weight is clamped to `≤ roundToIncrement(base × 0.975)` (unramped base). You never program a working load above ~97.5% of the entered max.
- **RPE-label creep removed**: weekly progression is now via **load at a constant target RPE** (`rpeTarget = cap(z.rpeTarget)`), which also restores weight↔RPE-label consistency. The old `rpeOffset` label bump (8.5→9.5 at flat weight) is dropped.
- **Deload** rebuilds from base `e1rm` at RPE 6 with no `loadRamp` → cleanly resets each cycle.

Total bound = +4% top-set load across the meso; per-week step = `4%/(weeks−1)` (~1–1.3%/wk for a 4-wk block) — conservative within the ACSM 2–10% / textbook 2–5%/wk window (finding E). Tier: consensus/textbook (`근거 약함` for the exact step).

---

## Determinism & purity
No `Date`/random; all helpers pure functions of their args. Same inputs → same plan.

## Honest disclosure (LimitsPanel + PROJECT_STATUS §3)
Three new bullets: per-session caps (consensus, deadlift-lowest), high-rep RPE correction (chart well-validated only at low reps), bounded weekly load progression (textbook step, not meta-analytic).
