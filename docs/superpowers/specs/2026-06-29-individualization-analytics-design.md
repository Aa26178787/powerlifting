# Spec 3 — Individualization Analytics & Readiness Intelligence (2026-06-29)

Part of the overhaul: `docs/superpowers/specs/2026-06-29-overload-and-programming-overhaul-design.md` (L3).
Evidence base: `docs/research/2026-06-29-overload-and-programming-evidence.md` (A4 monotony/strain, A5 individual variability, A3 ACWR contested; Fitness-Fatigue Banister/Busso).

Engine stays **pure, deterministic, kg-internal**. **This spec is entirely ADDITIVE and advisory** — it computes metrics/predictions from the existing performance log and displays them. It does **not** change plan generation, so the engine's generated plans are **byte-for-byte identical**. The data-driven dose loop (`loadFeedback.effectiveLiftE1rm`, EWMA) already exists and is unchanged; this spec adds the analytics/prediction layer on top, with honest caveats.

The differentiator (vs a static spreadsheet): the engine **models, individualizes, and predicts** from the user's own logged data.

## Current state
- Performance log entries: `{ lift, week, day, weight, reps, rpe, flag }` (see `loadFeedback.liftEntries`/`logE1rm`). `logE1rm` derives e1RM per entry.
- `readiness.js` / `overreaching.js` already score readiness + flag overreaching trends.
- No fitness-fatigue model, no monotony/strain, no e1RM band, no ACWR.

## Honesty (tiers)
- Daily strength variability ±~20% (A5) — advisory band, not a prescription change.
- Monotony/strain (A4 Foster) — **중**; the RT load proxy (rpe×reps) is a simplification (`근거 약함`).
- Fitness-Fatigue (Banister) — model is established but parameters are individual; we use literature defaults (`근거 약함` for the exact τ/k).
- ACWR (A3) — **contested/`근거 약함`**; shown as an illustrative context number with an explicit caveat, never a gate.
- Autoregulation benefit is mixed in the literature — stated in the panel.

---

## Fix 1 — `analytics.js`: e1RM band + ACWR

**Files:** new `src/engine/analytics.js` + test.

```js
// Daily strength varies ~±20% (A5). Advisory band around the (already feedback-
// adjusted) e1RM — does NOT change prescribed loads. Returns null on bad input.
export function e1rmBand(e1rm, frac = 0.20) {
  if (!Number.isFinite(e1rm) || e1rm <= 0) return null
  return { low: e1rm * (1 - frac), point: e1rm, high: e1rm * (1 + frac) }
}

// Acute:Chronic Workload Ratio — CONTESTED (A3). Illustrative only, never a gate.
// acute = mean of last `acute` daily loads; chronic = mean of last `chronic`.
// Returns null when there is insufficient chronic history (avoids the low-chronic
// math blow-up the critiques warn about).
export function acwr(loads, { acute = 7, chronic = 28 } = {}) {
  if (!Array.isArray(loads) || loads.length < chronic) return null
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length
  const a = mean(loads.slice(-acute))
  const c = mean(loads.slice(-chronic))
  if (c <= 0) return null
  return a / c
}
```

## Fix 2 — `analytics.js`: daily loads + Foster monotony + strain

```js
// Session-RPE training load proxy for resistance training: load = rpe × reps
// (McGuigan/Foster RT adaptation, A4). Aggregates a performance log into one
// load per (week,day), ordered by (week,day). Entries with non-finite rpe/reps
// contribute 0. Pure.
export function dailyLoads(log = []) {
  const byDay = new Map()
  for (const e of log) {
    const key = `${e.week ?? 0}-${e.day ?? 0}`
    const rpe = Number.isFinite(e.rpe) ? e.rpe : 0
    const reps = Number.isFinite(e.reps) ? e.reps : 0
    byDay.set(key, (byDay.get(key) ?? 0) + rpe * reps)
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => {
      const [aw, ad] = a.split('-').map(Number); const [bw, bd] = b.split('-').map(Number)
      return (aw - bw) || (ad - bd)
    })
    .map(([, load]) => load)
}

// Foster monotony = mean / populationSD of daily loads (A4). High (>2) + high load
// → overtraining risk. Null when <2 loads or SD 0 (undefined ratio). Pure.
export function trainingMonotony(loads) {
  if (!Array.isArray(loads) || loads.length < 2) return null
  const mean = loads.reduce((s, x) => s + x, 0) / loads.length
  const variance = loads.reduce((s, x) => s + (x - mean) ** 2, 0) / loads.length
  const sd = Math.sqrt(variance)
  if (sd === 0) return null
  return mean / sd
}

// Foster strain = total weekly load × monotony (A4). Null when monotony null.
export function trainingStrain(loads) {
  const m = trainingMonotony(loads)
  if (m == null) return null
  return loads.reduce((s, x) => s + x, 0) * m
}
```

## Fix 3 — `analytics.js`: Banister Fitness-Fatigue + peak-day prediction

```js
// Banister impulse-response. loads is a per-day series (index = program day; gaps
// are implicit-equal-spacing — a simplification). fitness/fatigue accumulate and
// decay; performance = k1·fitness − k2·fatigue. Defaults τ1=42 (fitness, slow),
// τ2=7 (fatigue, fast), k1=1, k2=2 (literature ranges; `근거 약함` for exact values).
// Returns { performance: number[], fitness: number[], fatigue: number[] }. Pure.
export function fitnessFatigue(loads, { tau1 = 42, tau2 = 7, k1 = 1, k2 = 2 } = {}) {
  const fitness = [], fatigue = [], performance = []
  let g = 0, h = 0
  for (let t = 0; t < loads.length; t++) {
    g = g * Math.exp(-1 / tau1) + loads[t]
    h = h * Math.exp(-1 / tau2) + loads[t]
    fitness.push(g); fatigue.push(h); performance.push(k1 * g - k2 * h)
  }
  return { performance, fitness, fatigue }
}

// Given a training series, simulate `horizon` future days at zero load and return
// the day offset (1..horizon) where modeled performance peaks — i.e. how long to
// taper for the supercompensation peak. Null when no loads. Pure/deterministic.
export function predictPeakDay(loads, opts = {}) {
  if (!Array.isArray(loads) || loads.length === 0) return null
  const horizon = opts.horizon ?? 28
  const extended = [...loads, ...Array.from({ length: horizon }, () => 0)]
  const { performance } = fitnessFatigue(extended, opts)
  let bestOffset = 0, best = -Infinity
  for (let d = 0; d <= horizon; d++) {
    const p = performance[loads.length - 1 + d]
    if (p > best) { best = p; bestOffset = d }
  }
  return bestOffset   // days of zero-load taper to reach modeled peak
}
```

## Fix 4 — `InsightsPanel` UI (advisory display)

**Files:** new `src/ui/components/InsightsPanel.jsx` + test; wire into `RoutineView` (which already has the performance log + plan e1RM context). New `src/ui/i18n` labels as needed.

- Renders, only when there is log data:
  - **e1RM band** per main lift: `low–high (point)` with a "일일 ±20% 변동" caption.
  - **Monotony / Strain**: numbers + a warning row when monotony > 2 ("단조로움↑ — 부하 변동 권장").
  - **예상 피크 시점**: `predictPeakDay` → "현재 부하 기준 약 N일 테이퍼 시 기량 피크 예측" with a `근거 약함` caveat.
  - **ACWR**: shown only when non-null, with the caveat "참고용 — 신뢰성 논란(하드 기준 아님)". Color/flag at ≥1.5.
  - A footer caveat: "오토레귤레이션·예측은 개인차가 크며 보조 지표입니다."
- Pure presentational component; receives computed metrics (compute in the panel or a small adapter). No store mutation. Bit-identical: additive panel, does not touch generation.

## Fix 5 — honest disclosure
**Files:** `LimitsPanel.jsx`, `PROJECT_STATUS.md §3` + §4 roadmap (mark "진행 추적 / 사이클 간 진전" partially addressed via analytics).
- Bullets: e1RM band (일일 변동 ±20% advisory); monotony/strain (Foster `근거 중`, RT proxy `근거 약함`); fitness-fatigue peak prediction (Banister, 파라미터 `근거 약함`); ACWR (contested, illustrative only); autoregulation benefit mixed.

---

## Determinism & purity
All `analytics.js` helpers are pure functions of their args; no `Date`/random. Program-day spacing is implicit-equal (documented simplification). Same inputs → same metrics.

## Bit-identity
Entire spec is additive (new module + new panel + disclosure). No plan-generation code path changes → all existing engine goldens unchanged.

## Testing (TDD)
- `analytics.test.js`: e1rmBand (band math, null guards); acwr (ratio, null on short/zero-chronic); dailyLoads (grouping/order/non-finite→0); monotony (mean/SD, null on <2 or SD 0); strain; fitnessFatigue (monotone accumulation, decay, known small-series values); predictPeakDay (zero-load taper finds a positive offset for a fatigued series; null on empty).
- `InsightsPanel.test.jsx`: renders band/monotony/peak from a sample log; hides when no log; shows ACWR only when non-null; monotony warning at >2.
