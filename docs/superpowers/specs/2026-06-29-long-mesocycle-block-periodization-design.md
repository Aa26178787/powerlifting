# Spec 2 — Long Mesocycles & Block Periodization (2026-06-29)

Part of the overhaul: `docs/superpowers/specs/2026-06-29-overload-and-programming-overhaul-design.md` (L2).
Evidence base: `docs/research/2026-06-29-overload-and-programming-evidence.md` (A2 Bosquet taper, C1 model parity, C2 phase potentiation).

Engine stays **pure, deterministic, kg-internal**. Bounded, tier-honest. **Bit-identity guard:** `mesoWeeks ≤ 8` non-peaking plans stay byte-for-byte identical. The two intentional changes are gated: intra-cycle deload insertion fires only for `mesoWeeks > 8`; the Bosquet realization week changes only **peaking** plans (documented).

## Current state (confirmed in source)
- `generate.js:91` clamps `mesoWeeks` to `[3, 8]`. `StepPeriodization.jsx:30-31,35` input min/max 3/8 + onBlur clamp.
- `generate.js:145-146` builds `working` weeks then appends ONE `buildDeloadWeek` if `deloadEnabled`.
- `periodization.js buildWorkingWeeks` ramps `volumeRamp`/`loadRamp` over the whole `totalWeeks` via `ctx.weekIndex = w` (0..totalWeeks-1).
- `deload.js buildDeloadWeek` rebuilds every set at **RPE 6** (intensity dropped) + `ceil(sets/2)` (volume dropped) — a recovery deload.
- `volumeRamp` 'taper' mode (peaking) already drops volume to 0.55 by the last week; `topSingleBackoff` already ramps the top single to RPE 9.5 in the peak phase. So the peaking *working* weeks already approximate a Bosquet taper (cut volume, hold/raise intensity).

## Design decisions (honest)
- **Phase potentiation (C2) is already encoded** — by `volumeRamp` modes (accumulate/maintain/taper) + `weekPlan` late-cycle quality concentration + phase-keyed scheme candidates (`CANDIDATES[quality|phase]`) + the new block structure below. We do **not** add a redundant `phaseProfile` multiplier (it would double-count the existing week-indexed shaping). This is documented in LimitsPanel/PROJECT_STATUS; no new code.
- **Model parity (C1)** honesty copy already shipped in Spec 1.

---

## Fix 1 — mesoWeeks cap 8 → 24 — bit-identical for existing values

**Files:** `src/ui/wizard/steps/StepPeriodization.jsx` (input `max`, onBlur clamp), `src/engine/generate.js:91`.

- `StepPeriodization.jsx`: `max={24}` on the input; onBlur `Math.max(3, Math.min(24, ...))`.
- `generate.js:91`: `Math.max(3, Math.min(24, profile.mesoWeeks ?? 4))`.
- Raising the ceiling does not change any existing 3–8 plan. Add a clamp test for 25→24.
- Tier: **N/A** (UI bound).

## Fix 2 — `planLayout`: block periodization with intra-cycle deloads (> 8 only)

**Files:** new `src/engine/planLayout.js` (pure helper) + test.

```js
// Returns an ordered array of week descriptors describing the mesocycle shape.
// Each entry: { kind: 'work'|'deload', block: <0-based block#>, blockWeek: <0-based week within block>, blockLen: <work weeks in this block> }
// ≤8 weeks → ONE block of `mesoWeeks` work weeks + (deloadEnabled? one trailing deload). BIT-IDENTICAL to current shape.
// >8 weeks → split into blocks of ≤ BLOCK_LEN (=6) work weeks; a deload week is inserted after every block when deloadEnabled.
export const BLOCK_LEN = 6
export function planLayout(mesoWeeks, deloadEnabled) { ... }
```
- For `mesoWeeks ≤ 8`: returns `mesoWeeks` work entries (block 0, blockWeek 0..n-1, blockLen=mesoWeeks) + (if deloadEnabled) one deload entry. This exactly mirrors the current `[...working, deload]` shape.
- For `mesoWeeks > 8`: blocks of size `BLOCK_LEN` (last block holds the remainder), a deload after each block when deloadEnabled. `blockWeek`/`blockLen` drive per-block ramp reset.
- Pure, deterministic. Tier: cadence (BLOCK_LEN=6) = consensus heuristic (`근거 약함`).

## Fix 3 — per-block ramp reset (sawtooth) wired through generate/periodization

**Files:** `src/engine/generate.js`, `src/engine/periodization.js`.

- `generate.js`: build weeks by iterating `planLayout(...)`. For each `work` entry, build a working week using **block-relative** ramp: pass `weekIndex = blockWeek`, `totalWeeks = blockLen` into the per-week ramp so `volumeRamp`/`loadRamp` reset each block (sawtooth). For each `deload` entry, build `buildDeloadWeek` from the preceding working week.
- `periodization.js buildWorkingWeeks` is refactored so a single working week can be built with an explicit `(blockWeek, blockLen)` rather than always `(w, totalWeeks)`. For `mesoWeeks ≤ 8` there is exactly one block with `blockLen === mesoWeeks`, so `blockWeek === w` and `blockLen === totalWeeks` → **bit-identical**.
- `phaseFor(weekIndex, totalWeeks, peaking)` continues to receive the **whole-mesocycle** index/length (phase is a mesocycle-level concept: early blocks = accumulation, late = peak), NOT block-relative — so phase potentiation spans the whole plan while volume/load ramps reset per block. Confirm ≤8 unchanged.
- Re-baseline: only `mesoWeeks > 8` plans produce new output (no existing golden uses >8). ≤8 bit-identical.

## Fix 4 — Bosquet realization week for peaking plans (A2)

**Files:** `src/engine/deload.js` (+ wiring in generate.js), test.

- Add a realization variant: `buildDeloadWeek(workingWeek, ctx, { realization })`. When `realization` (peaking plans' final deload), **hold intensity** — keep each exercise's working `weight`/`rpeTarget` (do NOT drop to RPE 6) and cut **volume** to ~40% (`Math.max(1, round(sets * 0.4))`), matching Bosquet (volume −41–60%, intensity held). Non-realization deloads keep current RPE-6 recovery behavior.
- `generate.js`: pass `{ realization: true }` for the trailing deload **only when `peaking`**. Non-peaking deloads (and all intra-cycle deloads) stay recovery-style.
- Intentional change to peaking-plan output (documented). Non-peaking ≤8 plans bit-identical.
- Tier: direction = **강** (Bosquet meta); the 0.4 volume factor = heuristic (`근거 약함`).

## Fix 5 — honest disclosure

**Files:** `src/ui/components/LimitsPanel.jsx`, `docs/PROJECT_STATUS.md §3`, roadmap (§4 mark Spec 2 done).
- Bullets: 24-week plans use block periodization (deload every ~6 wks, consensus cadence `근거 약함`); peaking final week is a realization taper (hold intensity, cut volume — Bosquet `근거 강` direction, exact factor `근거 약함`); phase potentiation is encoded via ramp modes + concentration + block structure (not a separate model claim; LP≈DUP).

---

## Determinism & purity
No `Date`/random. `planLayout`, ramp helpers, deload variant are pure. Same inputs → same plan.

## Bit-identity
- `mesoWeeks ≤ 8` non-peaking: byte-identical (one block, trailing recovery deload, whole-cycle ramp).
- Intentional changes: `mesoWeeks > 8` (new block shape) and peaking realization week. Goldens added/updated + annotated.

## Testing (TDD)
- `planLayout.test.js`: ≤8 shape == current (n work + 1 deload); >8 inserts deload every 6, blockWeek/blockLen correct, deloadEnabled=false omits deloads.
- `periodization.test.js`: block-relative ramp resets (sawtooth) for a 12-week plan; ≤8 bit-identical (existing goldens unchanged).
- `deload.test.js`: realization holds weight/rpe + cuts volume ~0.4; recovery unchanged (RPE 6).
- `generate.test.js`: 12-week plan has the expected deload positions; peaking plan trailing week is realization; non-peaking trailing week is recovery; ≤8 goldens unchanged.
- `StepPeriodization.test.jsx`: clamp 25→24.
