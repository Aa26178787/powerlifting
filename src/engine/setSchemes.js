import { weightFor, ZONES } from './quality.js'
import { roundToIncrement, loadForRpe } from './e1rm.js'

const r = roundToIncrement

// Sets at the SAME load accumulate fatigue: RPE rises ~0.5 per set and the LAST
// set lands on the zone target (so 170×4×3 isn't a flat RPE 8.5 — it ramps
// 7→7.5→8→8.5). Returns an array of length `count`. Null target (pct loading) →
// all null.
export function risingRpe(target, count) {
  if (target == null) return Array.from({ length: count }, () => null)
  return Array.from({ length: count }, (_, i) =>
    Math.max(5, Math.round((target - (count - 1 - i) * 0.5) * 2) / 2))
}

function straight({ quality, e1rm, zone, baseSets }) {
  const w = weightFor(quality, e1rm)
  return { sets: risingRpe(zone.rpeTarget, baseSets).map((rpe) => ({ weight: w, reps: zone.repAnchor, rpe })) }
}
function topSetBackoff({ e1rm, zone, baseSets }) {
  const top = r(e1rm * zone.pct[1])
  // Fix B: backoff is RPE-derived (consistent with its rpe label) rather than a
  // fixed 0.88× multiplier. Null-safe: pct-loaded zones fall back to the old multiplier.
  const backoffRpe = zone.rpeTarget == null ? null : zone.rpeTarget - 1
  const sets = [{ weight: top, reps: zone.reps[0], rpe: zone.rpeTarget, label: '탑' }]
  for (let i = 1; i < baseSets; i++) {
    const backW = backoffRpe == null
      ? r(top * 0.88)
      : loadForRpe(e1rm, zone.reps[1], backoffRpe)
    sets.push({ weight: backW, reps: zone.reps[1], rpe: backoffRpe, label: '백오프' })
  }
  return { sets }
}
function topSingleBackoff({ e1rm, baseSets, phase = 'accumulation', weekIndex = 0, totalWeeks = 3 }) {
  // Fix A: RPE-derived top single (chart-accurate, same helper as strengthHypertrophy).
  // Fix C: In peak phase, ramp the top-single RPE 8.5→9.5 over peak weeks, rounded
  //   to 0.5 steps and capped at 9.5 (never 100% 1RM; ceiling clamp in periodization
  //   provides a second layer of protection). Accumulation + intensification stay at 8.5.
  let topRpe = 8.5
  if (phase === 'peak') {
    const peakStart = totalWeeks <= 1 ? 0 : Math.ceil(0.67 * (totalWeeks - 1))
    const peakLen = Math.max(1, totalWeeks - peakStart)
    const peakFrac = peakLen <= 1 ? 0 : (weekIndex - peakStart) / (peakLen - 1)
    topRpe = Math.min(9.5, Math.round((8.5 + Math.max(0, peakFrac)) * 2) / 2)
  }
  const top = loadForRpe(e1rm, 1, topRpe)
  const sets = [{ weight: top, reps: 1, rpe: topRpe, label: '탑싱글' }]
  // Fix A: backoff also RPE-derived (3 reps @ RPE 8.0) instead of top×0.85.
  for (let i = 1; i < baseSets; i++) sets.push({ weight: loadForRpe(e1rm, 3, 8.0), reps: 3, rpe: 8, label: '백오프' })
  return { sets }
}
function ascendingPyramid({ e1rm, zone, baseSets }) {
  const n = Math.max(2, baseSets)
  const sets = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const pct = zone.pct[0] + (zone.pct[1] - zone.pct[0]) * t
    const reps = Math.round(zone.reps[1] + (zone.reps[0] - zone.reps[1]) * t)
    sets.push({ weight: r(e1rm * pct), reps, rpe: null })
  }
  return { sets }
}
function reversePyramid(ctx) {
  return { sets: ascendingPyramid(ctx).sets.slice().reverse() }
}
function wave({ e1rm, zone, baseSets }) {
  const waves = baseSets >= 6 ? 2 : 1
  const repsSeq = [3, 2, 1]
  const sets = []
  for (let wv = 0; wv < waves; wv++) for (let i = 0; i < 3; i++) {
    const pct = Math.min(0.98, zone.pct[0] + 0.05 * i + 0.03 * wv)
    sets.push({ weight: r(e1rm * pct), reps: repsSeq[i], rpe: null, label: `웨이브${wv + 1}` })
  }
  return { sets }
}
function amrapTop({ quality, e1rm, zone, baseSets }) {
  const w = weightFor(quality, e1rm)
  const sets = risingRpe(zone.rpeTarget, Math.max(0, baseSets - 1)).map((rpe) => ({ weight: w, reps: zone.reps[1], rpe }))
  sets.push({ weight: w, reps: 'AMRAP', rpe: null, note: '한계까지(+세트)' })
  return { sets }
}
function ramping({ e1rm, baseSets }) {
  const n = Math.max(3, Math.min(5, baseSets))
  const sets = []
  for (let i = 0; i < n; i++) {
    const pct = 0.80 + (0.95 - 0.80) * (i / (n - 1))
    sets.push({ weight: r(e1rm * pct), reps: 1, rpe: i === n - 1 ? 9 : null, label: i === n - 1 ? '탑' : null })
  }
  return { sets }
}
function cluster({ e1rm, baseSets }) {
  const w = r(e1rm * 0.85)
  return { sets: Array.from({ length: baseSets }, () => ({ weight: w, reps: '2+2+2', rpe: null, note: '세트내 20-30s 휴식' })), note: '클러스터' }
}
function restPause({ quality, e1rm }) {
  const w = weightFor(quality, e1rm)
  return { sets: [{ weight: w, reps: '8+4+2', rpe: 9, note: '15-20s 후 재개' }] }
}
function dropSet({ quality, e1rm }) {
  const top = weightFor(quality, e1rm)
  return { sets: [
    { weight: top, reps: 10, rpe: 9, label: '탑' },
    { weight: r(top * 0.80), reps: 8, note: '즉시 -20%' },
    { weight: r(top * 0.64), reps: 8, note: '즉시 -20%' },
  ], note: '드롭세트(연속)' }
}
function myoReps({ quality, e1rm }) {
  const w = weightFor(quality, e1rm)
  const sets = [{ weight: w, reps: 12, rpe: 9, label: '활성화' }]
  for (let i = 0; i < 3; i++) sets.push({ weight: w, reps: 4, note: '3-5호흡 후' })
  return { sets, note: '마이오렙' }
}
function widowmaker({ e1rm }) {
  return { sets: [{ weight: r(e1rm * 0.50), reps: 20, rpe: 9.5 }], note: '위도우메이커' }
}
function contrastPAP(ctx) {
  return { sets: topSingleBackoff(ctx).sets, note: '폭발 종목과 세트 교대 (180s, ≥48h 회복)', group: 'contrast' }
}
function strengthHypertrophy({ e1rm, baseSets }) {
  const sZ = ZONES.strength, hZ = ZONES.hypertrophy
  const top = r(e1rm * sZ.pct[1])                 // ~0.92
  const sets = [{ weight: top, reps: sZ.reps[0], rpe: sZ.rpeTarget, label: '탑(근력)' }]
  // RPE-derived (not a fixed pct): the backoff must actually BE its labeled
  // RPE 8.5 at 9 reps (chart 72.8% + high-rep correction ≈ 75%), not the old
  // ~0.67 that was a full RPE light. See research doc (A, C).
  const back = loadForRpe(e1rm, hZ.repAnchor, hZ.rpeTarget)
  for (let i = 1; i < Math.max(2, baseSets); i++)
    sets.push({ weight: back, reps: hZ.repAnchor, rpe: hZ.rpeTarget, label: '백오프(근비대)' })
  return { sets }
}

export const SCHEMES = {
  straight:         { labelKey: 'straight',         evidenceTier: 'rct',       fatigue: 2, expand: straight },
  topSetBackoff:    { labelKey: 'topSetBackoff',    evidenceTier: 'consensus', fatigue: 3, expand: topSetBackoff },
  topSingleBackoff: { labelKey: 'topSingleBackoff', evidenceTier: 'consensus', fatigue: 4, expand: topSingleBackoff },
  ascendingPyramid: { labelKey: 'ascendingPyramid', evidenceTier: 'consensus', fatigue: 3, expand: ascendingPyramid },
  reversePyramid:   { labelKey: 'reversePyramid',   evidenceTier: 'consensus', fatigue: 3, expand: reversePyramid },
  wave:             { labelKey: 'wave',             evidenceTier: 'consensus', fatigue: 3, expand: wave },
  amrapTop:         { labelKey: 'amrapTop',         evidenceTier: 'consensus', fatigue: 3, expand: amrapTop },
  ramping:          { labelKey: 'ramping',          evidenceTier: 'consensus', fatigue: 4, expand: ramping },
  cluster:          { labelKey: 'cluster',          evidenceTier: 'rct',       fatigue: 3, advancedOnly: true, expand: cluster },
  restPause:        { labelKey: 'restPause',        evidenceTier: 'rct',       fatigue: 4, accessoryOnly: true, expand: restPause },
  dropSet:          { labelKey: 'dropSet',          evidenceTier: 'rct',       fatigue: 4, accessoryOnly: true, expand: dropSet },
  myoReps:          { labelKey: 'myoReps',          evidenceTier: 'consensus', fatigue: 4, accessoryOnly: true, expand: myoReps },
  widowmaker:       { labelKey: 'widowmaker',       evidenceTier: 'consensus', fatigue: 5, accessoryOnly: true, expand: widowmaker },
  contrastPAP:         { labelKey: 'contrastPAP',         evidenceTier: 'consensus', fatigue: 4, advancedOnly: true, expand: contrastPAP },
  strengthHypertrophy: { labelKey: 'strengthHypertrophy', evidenceTier: 'consensus', fatigue: 3, expand: strengthHypertrophy },
}

const CANDIDATES = {
  'power|accumulation': ['straight', 'cluster'],
  'power|intensification': ['cluster', 'contrastPAP', 'topSingleBackoff'],
  'power|peak': ['topSingleBackoff', 'cluster'],
  'strength|accumulation': ['straight', 'ascendingPyramid', 'amrapTop'],
  'strength|intensification': ['topSetBackoff', 'wave', 'cluster'],
  'strength|peak': ['topSingleBackoff', 'ramping'],
  'hypertrophy|accumulation': ['straight', 'reversePyramid', 'restPause'],
  'hypertrophy|intensification': ['straight', 'topSetBackoff'],
  'hypertrophy|peak': ['straight'],
  'endurance|accumulation': ['straight', 'widowmaker'],
  'endurance|intensification': ['straight'],
  'endurance|peak': ['straight'],
}

const ACCESSORY = {
  hypertrophy: ['straight', 'restPause', 'dropSet', 'myoReps'],
  endurance: ['straight', 'widowmaker'],
  power: ['straight'], strength: ['straight'],
}

// 결정론 seed: 운동/역할별로 주차 회전 시작점을 달리해 1주차 straight 일색 방지
export function schemeSeed(baseLift, role) {
  const liftIdx = { squat: 0, bench: 1, deadlift: 2 }[baseLift] ?? 0
  const roleIdx = { heavy: 0, volume: 1, light: 2, hyper: 0, accessory: 0 }[role] ?? 0
  return liftIdx + roleIdx
}

export function pickScheme({ quality, role, phase, advanced, weekIndex = 0, seed = 0, concurrent = false }) {
  let cands = role === 'accessory'
    ? (ACCESSORY[quality] ?? ['straight'])
    : (CANDIDATES[`${quality}|${phase}`] ?? ['straight'])
  if (concurrent && role !== 'accessory' && (quality === 'strength' || quality === 'power')) {
    cands = ['strengthHypertrophy', ...cands]
  }
  cands = cands.filter((k) => !SCHEMES[k].advancedOnly || advanced)
  cands = cands.filter((k) => role === 'accessory' || !SCHEMES[k].accessoryOnly)
  if (!cands.length) cands = ['straight']
  return cands[(weekIndex + seed) % cands.length]
}

// Accessories have no tracked 1RM, so their schemes prescribe reps + RPE by
// feel (no weight). Returns { sets:[{reps,rpe?,note?,label?}], note? }.
const ACCESSORY_REPS = {
  hypertrophy: { reps: 10, rpe: 8 },
  endurance: { reps: 15, rpe: 8 },
}

export function expandAccessory(key, { quality = 'hypertrophy', baseSets = 3 } = {}) {
  const base = ACCESSORY_REPS[quality] ?? ACCESSORY_REPS.hypertrophy
  // Scheme-level note is omitted for accessories — the scheme label already
  // names the structure; per-set notes carry the actionable detail.
  switch (key) {
    case 'restPause':
      return { sets: [{ reps: `${base.reps}+4+3`, rpe: 9, note: '15-20s 후 재개' }] }
    case 'dropSet':
      return {
        sets: [
          { reps: base.reps + 2, rpe: 9, label: '탑' },
          { reps: base.reps, note: '즉시 무게↓' },
          { reps: base.reps, note: '즉시 무게↓' },
        ],
      }
    case 'myoReps': {
      const sets = [{ reps: base.reps, rpe: 9, label: '활성화' }]
      for (let i = 0; i < 3; i++) sets.push({ reps: 4, note: '3-5호흡 후' })
      return { sets }
    }
    case 'widowmaker':
      return { sets: [{ reps: 20, rpe: 9.5 }] }
    default: // straight
      return { sets: risingRpe(base.rpe, Math.max(1, baseSets)).map((rpe) => ({ reps: base.reps, rpe })) }
  }
}
