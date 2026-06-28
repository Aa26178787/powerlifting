# Spec 4 — Overload Mode & Presets (2026-06-29)

Part of the overhaul: `docs/superpowers/specs/2026-06-29-overload-and-programming-overhaul-design.md` (L4 + L5).
Evidence base: `docs/research/2026-06-29-overload-and-programming-evidence.md` (A1 functional overreaching, A2 realization taper, C3 AEL, C4 recovery, D presets).

The "gamble mode": deliberately overreach 1–3 chosen lifts for a few weeks, then a forced realization, then test — a high-risk/high-reward block. Honest by construction: non-blocking risk gating, **qualitative** EV tiers (no fabricated probabilities), forced taper, recovery-resource gate, consecutive-overload cooldown.

## Key architecture decision — overload is a thin WRAPPER over `generate()`
`generateOverload(profile)` maps the overload inputs to a **transformed profile** and delegates to the existing, fully-tested `generate()`. This reuses all machinery (layout, schemes, block periodization, Bosquet realization, per-muscle ledger, volume warnings, rendering) and keeps `generate.js` **byte-for-byte identical** (overload is a separate entry point). The transform:
- **Frequency:** selected lifts get `+freqBump` sessions (capped at `daysPerWeek`).
- **Volume (intentional MRV exceedance):** `volumeOverride.main = { enabled: true, mode: 'fixed', setsPerSession }` — `fixed` mode **releases the per-session safety caps** (existing behavior), so selected lifts can intentionally exceed MRV; the existing `VolumeWarnings` surfaces the overage **non-blocking** (exactly the "intentional MRV exceedance, honestly reported" behavior). Selected lifts: `round(BASE_SETS × volMult)`; non-selected: maintenance `MAINT_SETS`.
- **Intensity / realization:** `competition = { on: true, date: <derived> }` → `peaking` path → late-block intensity ramp (topSingle → RPE 9.5) + the Bosquet realization taper (Spec 2) as the final week. This IS the "push intensity, then realize and test."
- **Length:** `mesoWeeks = overreachWeeks`; `deloadEnabled = true`.

`generateOverload` then attaches overload **metadata** (`risk`, `ev`, `cooldown`, `mrvExceedance`) to the returned plan for the UI. The plan's week/session/exercise shape is unchanged → `RoutineView` renders it as-is.

App routing: when `profile.overload?.enabled`, the app calls `generateOverload(profile)`; otherwise `generate(profile)` (unchanged).

## Honesty (tiers)
- Functional overreaching → supercompensation: direction **중**; outcome NOT promised. targetPct shapes aggressiveness, not a guaranteed gain.
- Realization taper: Bosquet **강** direction (reused from Spec 2).
- Dose coefficients (REALISTIC_MAX, volMult/freqBump factors, BASE/MAINT sets), risk thresholds, cooldown length, EV tiers: **`근거 약함`** heuristics; coaching-consensus directions.
- AEL (C3) and wave loading: included as advisory technique notes on the realization/peak top sets (the engine already has `wave` + tempo); full AEL orchestration deferred (noted).

---

## Fix 1 — `overload.js`: dose, risk, presets, generateOverload

**Files:** new `src/engine/overload.js` + test.

### Dose mapping (blend-following; ramp/intensity come from peaking + blend zones)
```js
export const REALISTIC_MAX = 4    // honest short-term e1RM gain ceiling %, 근거 약함
export const BASE_SETS = 5        // selected-lift per-session base before volMult, 근거 약함
export const MAINT_SETS = 3       // non-selected maintenance per session, 근거 약함

export function overloadDose(targetPct, { lifts }) {
  const a = Math.max(0, Math.min(1.5, (Number(targetPct) || 0) / REALISTIC_MAX))   // aggressiveness
  return {
    a,
    volMult:  1 + a * 0.6,                              // 1.0 .. 1.9×
    freqBump: Math.round(a * 2),                        // +0 .. +2 sessions
    selectedSets: Math.max(1, Math.round(BASE_SETS * (1 + a * 0.6))),
    maintSets: MAINT_SETS,
  }
}
```

### Risk / EV (qualitative tiers — NO fabricated %)
```js
// Risk rises with aggressiveness, lift count, overreach weeks, low experience, low readiness.
// Returns { tier: 'low'|'moderate'|'high'|'extreme', reasons: string[] }. 근거 약함 thresholds.
export function overloadRisk({ targetPct, lifts, overreachWeeks, years, readiness }) { ... score → tier + reasons ... }
// EV is a qualitative statement keyed off tier (success: short-term +X% possible; failure: stall/injury/burnout;
// success probability falls as target/weeks rise). Returns { upside, downside, note }.
export function overloadEV(dose, risk) { ... }
```

### Presets (parameter bundles; override user inputs when chosen)
```js
export const PRESETS = {
  smolovJr:    { label: 'Smolov Jr (스쿼트/벤치)', lifts: ['squat'], targetPct: 5, overreachWeeks: 3, faithful: true },
  russianSquat:{ label: 'Russian Squat Routine',  lifts: ['squat'], targetPct: 4, overreachWeeks: 6, faithful: true },
  superSquats: { label: 'Super Squats (20렙)',     lifts: ['squat'], targetPct: 4, overreachWeeks: 6 },
  gvt:         { label: 'German Volume Training',   lifts: ['squat'], targetPct: 3, overreachWeeks: 5 },
  magOrt:      { label: 'Mag/Ort (데드)',           lifts: ['deadlift'], targetPct: 5, overreachWeeks: 6 },
  bulgarian:   { label: 'Bulgarian (쇼크)',         lifts: ['squat','bench'], targetPct: 6, overreachWeeks: 3 },
}
export function applyPreset(key) { return PRESETS[key] ? { ...PRESETS[key] } : null }
```
(`faithful` presets get a UI note that their exact set/rep tables are approximated by the generic dose; others are parameter seeds — disclosed.)

### Cooldown (consecutive-overload guard)
```js
// Recommend a cooldown after an overload block; running another within it escalates risk.
// length scales with aggressiveness + weeks (训练-week units, not calendar). 근거 약함.
export function overloadCooldownWeeks(dose, overreachWeeks) { return Math.round(overreachWeeks * (1 + dose.a)) }
// profile.overload.lastEndWeek (training-week) vs current → within-cooldown flag feeds risk.
```

### generateOverload wrapper
```js
import { generate } from './generate.js'
// Builds the transformed profile and delegates to generate(); attaches overload metadata.
export function generateOverload(profile) {
  const o = profile.overload ?? {}
  const cfg = o.preset ? { ...applyPreset(o.preset), ...pickUserOverrides(o) } : o   // preset, user can tweak
  const lifts = (cfg.lifts ?? []).filter((l) => MAIN_LIFTS.includes(l))
  const dose = overloadDose(cfg.targetPct, { lifts })
  const frequency = { ...defaultFrequency(profile.daysPerWeek), ...(profile.frequency ?? {}) }
  for (const l of lifts) frequency[l] = Math.min(profile.daysPerWeek, (frequency[l] ?? 0) + dose.freqBump)
  const setsPerSession = {}
  for (const l of MAIN_LIFTS) setsPerSession[l] = lifts.includes(l) ? dose.selectedSets : dose.maintSets
  const transformed = {
    ...profile,
    mesoWeeks: cfg.overreachWeeks,
    deloadEnabled: true,
    frequency,
    volumeOverride: { main: { enabled: true, mode: 'fixed', setsPerSession }, accessory: profile.volumeOverride?.accessory },
    competition: { on: true, date: deriveMeetDate(profile, cfg.overreachWeeks) },  // → peaking realization + intensity ramp
  }
  const plan = generate(transformed)
  const risk = overloadRisk({ targetPct: cfg.targetPct, lifts, overreachWeeks: cfg.overreachWeeks, years: profile.years, readiness: o.readiness })
  return { ...plan, overload: { lifts, targetPct: cfg.targetPct, overreachWeeks: cfg.overreachWeeks, dose, risk, ev: overloadEV(dose, risk), cooldownWeeks: overloadCooldownWeeks(dose, cfg.overreachWeeks), preset: o.preset ?? null } }
}
```
- `deriveMeetDate` is **deterministic** (no `Date`): it sets `competition.date` to a non-empty sentinel that makes `peaking` true (generate only checks `competition.on && competition.date` truthiness for peaking; the actual date string isn't used for load math). Use a fixed sentinel like `'overload'`. (Verify: generate's `peaking = !!(competition.on && competition.date)`; date value otherwise unused in load math.)

## Fix 2 — store + app routing
**Files:** `src/ui/store/profileStore.js` (DEFAULT_PROFILE.overload + deep-fill merge), `src/App.jsx` (or wherever generate is called) route to `generateOverload` when `profile.overload.enabled`, `src/ui/lib/planAdapter.js` pass-through.
```js
overload: { enabled: false, lifts: [], targetPct: 4, overreachWeeks: 3, preset: null, readiness: null, lastEndWeek: null }
```
- Deep-fill merge (no version bump), default OFF → existing users unaffected, app calls `generate` as before.

## Fix 3 — UI configure
**Files:** new `src/ui/components/OverloadPanel.jsx` (or a wizard step) + test. Toggle "오버로딩 모드(도박수)"; when on: lift checkboxes (1–3), per-lift/overall target% input, overreach weeks (2–8), preset dropdown (applies preset → fills inputs, editable). Writes `profile.overload` via a store action. Shows the risk tier + EV inline as inputs change.

## Fix 4 — UI risk/EV/abort + block display
**Files:** `RoutineView.jsx` (or OverloadPanel) renders, when `plan.overload`: a prominent **risk/EV banner** (⚠ 도박수 — upside/downside/tier), the **forced realization + test** note, **MRV intentional-exceedance** note (reuses VolumeWarnings — "의도적 초과(오버리칭)"), an **abort circuit** note (reuses `detectOverreaching` on the log → "abort 권고" banner when pain/readiness crash), and a **cooldown** note. Block-phase labels (과부하/realization/테스트).

## Fix 5 — honest disclosure
**Files:** `LimitsPanel.jsx`, `PROJECT_STATUS.md §3` + §4 (mark overload mode done). Bullets: overload is a gamble (no promised outcome; targetPct shapes aggressiveness); realization taper (Bosquet); dose/risk/cooldown coefficients 근거 약함; presets other than Smolov Jr/Russian are seeds; AEL/wave advisory only; recovery-resource gate; ACWR not used as a gate.

---

## Determinism & purity
`overload.js` helpers pure; `generateOverload` delegates to the pure `generate`; `deriveMeetDate` returns a fixed sentinel (no `Date`). Same inputs → same plan + metadata.

## Bit-identity
`generate.js` untouched → all existing plans byte-identical. Overload is reached only when `profile.overload.enabled` (default false). Store deep-fill defaults OFF.

## Testing (TDD)
- `overload.test.js`: overloadDose (a clamp, volMult/freqBump monotone in targetPct); overloadRisk (tier rises with lifts/weeks/targetPct, low readiness/years escalate; reasons listed); presets (applyPreset returns config, unknown→null); cooldownWeeks; generateOverload (selected lifts get more weekly sets than non-selected; mesoWeeks honored; peaking realization present as final week; metadata attached; deterministic — two calls equal; generate() itself unaffected — a normal profile still byte-identical).
- `OverloadPanel.test.jsx`: toggle reveals inputs; preset fills inputs; risk tier shown.
- RoutineView/InsightsPanel: overload banner renders when plan.overload present; absent otherwise.
