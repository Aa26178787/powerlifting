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
