import { ZONES, weightFor } from './quality.js'
import { roundToIncrement } from './e1rm.js'

const r = roundToIncrement

function straight({ quality, e1rm, zone, baseSets }) {
  const w = weightFor(quality, e1rm)
  return { sets: Array.from({ length: baseSets }, () => ({ weight: w, reps: zone.repAnchor, rpe: zone.rpeTarget })) }
}
function topSetBackoff({ e1rm, zone, baseSets }) {
  const top = r(e1rm * zone.pct[1])
  const sets = [{ weight: top, reps: zone.reps[0], rpe: zone.rpeTarget, label: '탑' }]
  for (let i = 1; i < baseSets; i++) sets.push({ weight: r(top * 0.88), reps: zone.reps[1], rpe: zone.rpeTarget == null ? null : zone.rpeTarget - 1, label: '백오프' })
  return { sets }
}
function topSingleBackoff({ e1rm, baseSets }) {
  const top = r(e1rm * 0.90)
  const sets = [{ weight: top, reps: 1, rpe: 8.5, label: '탑싱글' }]
  for (let i = 1; i < baseSets; i++) sets.push({ weight: r(top * 0.85), reps: 3, rpe: 8, label: '백오프' })
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
  const sets = []
  for (let i = 0; i < baseSets - 1; i++) sets.push({ weight: w, reps: zone.reps[1], rpe: zone.rpeTarget })
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
  restPause:        { labelKey: 'restPause',        evidenceTier: 'rct',       fatigue: 4, expand: restPause },
  dropSet:          { labelKey: 'dropSet',          evidenceTier: 'rct',       fatigue: 4, expand: dropSet },
  myoReps:          { labelKey: 'myoReps',          evidenceTier: 'consensus', fatigue: 4, expand: myoReps },
  widowmaker:       { labelKey: 'widowmaker',       evidenceTier: 'consensus', fatigue: 5, expand: widowmaker },
  contrastPAP:      { labelKey: 'contrastPAP',      evidenceTier: 'rct',       fatigue: 4, advancedOnly: true, expand: contrastPAP },
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

export function pickScheme({ quality, role, phase, advanced, weekIndex = 0 }) {
  let cands = role === 'accessory'
    ? (ACCESSORY[quality] ?? ['straight'])
    : (CANDIDATES[`${quality}|${phase}`] ?? ['straight'])
  cands = cands.filter((k) => !SCHEMES[k].advancedOnly || advanced)
  if (!cands.length) cands = ['straight']
  return cands[weekIndex % cands.length]
}
