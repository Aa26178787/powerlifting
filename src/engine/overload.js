import { generate } from './generate.js'
import { MAIN_LIFTS } from './exercises.js'
import { defaultFrequency } from './frequency.js'

export const REALISTIC_MAX = 4
export const BASE_SETS = 5
export const MAINT_SETS = 3
// Aggressive-but-bounded overreach ceiling on a selected lift's WEEKLY working
// sets. Overload deliberately exceeds MRV (~12), but per-session sets × frequency
// must not blow up multiplicatively (e.g. 9×5=45). ~1.5-2× MRV is the gamble;
// deadlift lower (axial/CNS fatigue, slower recovery). Heuristic (근거 약함).
export const OVERLOAD_WEEKLY_CAP = { squat: 24, bench: 24, deadlift: 16 }

export function overloadDose(targetPct, { lifts } = {}) {
  const a = Math.max(0, Math.min(1.5, (Number(targetPct) || 0) / REALISTIC_MAX))
  return { a, volMult: 1 + a * 0.6, freqBump: Math.round(a * 2),
    selectedSets: Math.max(1, Math.round(BASE_SETS * (1 + a * 0.6))), maintSets: MAINT_SETS }
}

export function overloadRisk({ targetPct, lifts = [], overreachWeeks = 3, years, readiness } = {}) {
  let score = 0; const reasons = []
  const a = Math.max(0, Math.min(1.5, (Number(targetPct) || 0) / REALISTIC_MAX)); score += a
  if (lifts.length >= 3) { score += 1; reasons.push('3종목 동시 과부하') }
  else if (lifts.length === 2) score += 0.5
  if (overreachWeeks >= 6) { score += 1; reasons.push('과부하 기간 김(≥6주, NFOR 위험)') }
  else if (overreachWeeks >= 4) score += 0.5
  if (years != null && years < 1) { score += 1; reasons.push('경력 1년 미만') }
  if (readiness != null && readiness < 0.4) { score += 1; reasons.push('readiness 낮음') }
  if ((Number(targetPct) || 0) > REALISTIC_MAX) { score += 1; reasons.push(`목표 ${targetPct}% 비현실적(>${REALISTIC_MAX}%)`) }
  const tier = score >= 3.5 ? 'extreme' : score >= 2.5 ? 'high' : score >= 1.5 ? 'moderate' : 'low'
  return { tier, score: Math.round(score * 100) / 100, reasons }
}

export function overloadEV(dose, risk) {
  const maxGain = Math.max(1, Math.round(dose.a * REALISTIC_MAX))
  return { upside: `성공 시 단기 +1~${maxGain}% 가능 (보장 아님)`,
    downside: '실패 시 정체·부상·번아웃 (non-functional overreaching)',
    note: `성공 확률은 목표·기간이 클수록 하락. 현재 위험도: ${risk.tier}.` }
}

export const PRESETS = {
  smolovJr:    { label: 'Smolov Jr (스쿼트)',    lifts: ['squat'],          targetPct: 5, overreachWeeks: 3, faithful: true },
  russianSquat:{ label: 'Russian Squat Routine', lifts: ['squat'],          targetPct: 4, overreachWeeks: 6, faithful: true },
  superSquats: { label: 'Super Squats (20렙)',    lifts: ['squat'],          targetPct: 4, overreachWeeks: 6 },
  gvt:         { label: 'German Volume Training',  lifts: ['squat'],          targetPct: 3, overreachWeeks: 5 },
  magOrt:      { label: 'Mag/Ort (데드)',          lifts: ['deadlift'],       targetPct: 5, overreachWeeks: 6 },
  bulgarian:   { label: 'Bulgarian (쇼크)',        lifts: ['squat', 'bench'], targetPct: 6, overreachWeeks: 3 },
}
export function applyPreset(key) { return PRESETS[key] ? { ...PRESETS[key] } : null }
export function overloadCooldownWeeks(dose, overreachWeeks) { return Math.round(overreachWeeks * (1 + dose.a)) }

export function generateOverload(profile) {
  const o = profile.overload ?? {}
  const preset = o.preset ? applyPreset(o.preset) : null
  const cfg = {
    lifts: (o.lifts && o.lifts.length ? o.lifts : preset?.lifts ?? []).filter((l) => MAIN_LIFTS.includes(l)),
    targetPct: o.targetPct ?? preset?.targetPct ?? REALISTIC_MAX,
    overreachWeeks: o.overreachWeeks ?? preset?.overreachWeeks ?? 3,
  }
  const dose = overloadDose(cfg.targetPct, { lifts: cfg.lifts })
  const frequency = { ...defaultFrequency(profile.daysPerWeek), ...(profile.frequency ?? {}) }
  for (const l of cfg.lifts) frequency[l] = Math.min(profile.daysPerWeek, (frequency[l] ?? 0) + dose.freqBump)
  const setsPerSession = {}
  for (const l of MAIN_LIFTS) {
    if (!cfg.lifts.includes(l)) { setsPerSession[l] = dose.maintSets; continue }
    // Bound selected per-session sets so weekly volume (sets × frequency) stays
    // within OVERLOAD_WEEKLY_CAP — intentional overreach, not a multiplicative blow-up.
    const f = Math.max(1, frequency[l])
    const perSessionCap = Math.max(2, Math.floor((OVERLOAD_WEEKLY_CAP[l] ?? 24) / f))
    setsPerSession[l] = Math.min(dose.selectedSets, perSessionCap)
  }
  const transformed = {
    ...profile,
    mesoWeeks: cfg.overreachWeeks,
    deloadEnabled: true,
    frequency,
    volumeOverride: { main: { enabled: true, mode: 'fixed', setsPerSession }, accessory: profile.volumeOverride?.accessory },
    competition: { on: true, date: 'overload' },     // sentinel → peaking realization + intensity ramp (engine never parses the string)
  }
  const plan = generate(transformed)
  const risk = overloadRisk({ targetPct: cfg.targetPct, lifts: cfg.lifts, overreachWeeks: cfg.overreachWeeks, years: profile.years, readiness: o.readiness })
  return { ...plan, overload: { ...cfg, dose, risk, ev: overloadEV(dose, risk), cooldownWeeks: overloadCooldownWeeks(dose, cfg.overreachWeeks), preset: o.preset ?? null } }
}
