import { normalizeBlend, DEFAULT_BLEND, classifyBlend } from './quality.js'
import { tune } from './tuner.js'
import { BANDS, bandForBlend, PER_SESSION_CAP, volumeRampMode } from './volume.js'
import { buildLayout } from './layoutGenerator.js'
import { defaultFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

// ── Deadlift effective-band: mev/mrv scaled ×0.6 (mirrors tuner.js calibration).
// mav intentionally left raw (MAV is a mid-range guidance value, not a hard cap).
export function effectiveBand(band, lift) {
  return lift === 'deadlift'
    ? { mev: Math.round(0.6 * band.mev), mav: band.mav, mrv: Math.round(0.6 * band.mrv) }
    : band
}

// ── Shared helper: replicates generate.js:104-127 exactly (the cappedSetsPerSession
// computation) so volumeOverride.js and generate.js stay in sync with ONE formula.
// Returns { setsPerSession, slotCounts, mrv, frequency, band }.
export function resolveAutoSetsPerSession(profile) {
  const { years, daysPerWeek, fatigue } = profile
  const blend = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)

  const freqInput = profile.frequency ?? defaultFrequency(daysPerWeek)
  const frequency = {}
  for (const lift of MAIN_LIFTS)
    frequency[lift] = Math.max(0, Math.min(daysPerWeek, freqInput[lift] ?? 0))

  const tuned = tune({ blend, years, daysPerWeek, fatigue, age: profile.age, frequency })
  const band = bandForBlend(blend)
  const mrv = BANDS[band].mrv

  const layout = buildLayout({ daysPerWeek, frequency })
  const slotCounts = {}
  for (const day of layout)
    for (const slot of day)
      slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1

  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    const sc = slotCounts[lift] || 1
    const absCap = PER_SESSION_CAP[lift] ?? 6
    setsPerSession[lift] = Math.max(1, Math.min(tuned.setsPerSession[lift], absCap, Math.floor(mrv / sc)))
  }

  const priorityLift = profile.priorityLift
  if (priorityLift && MAIN_LIFTS.includes(priorityLift)) {
    const sc = slotCounts[priorityLift] || 1
    const absCap = PER_SESSION_CAP[priorityLift] ?? 6
    setsPerSession[priorityLift] = Math.max(1, Math.min(setsPerSession[priorityLift] + 1, absCap, Math.floor(mrv / sc)))
  }

  return { setsPerSession, slotCounts, mrv, frequency, band }
}

// ── Deficit-fill base weight (inline from generate.js to avoid circular import).
// Same constants, same formula — drift is caught by case-1 bit-identical test.
const DEFICIT_FULL   = 0.6
const HYP_DEFICIT_LO = 0.30
const HYP_DEFICIT_HI = 0.50
function _deficitBaseWeight({ dom, n }) {
  if (dom !== 'strength' && dom !== 'power') return DEFICIT_FULL
  const ramp = Math.max(0, Math.min(1,
    (n.hypertrophy - HYP_DEFICIT_LO) / (HYP_DEFICIT_HI - HYP_DEFICIT_LO)))
  return DEFICIT_FULL * ramp
}

// ── Auto-recommend: main setsPerSession == resolveAutoSetsPerSession output (cap+priority
// already applied). Accessory = no-time-limit branch value (representative; actual value
// may be smaller when sessionTimeLimit is set — UI should note this).
export function recommendVolume(profile) {
  const a = resolveAutoSetsPerSession(profile)

  const blend = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)
  const cls = classifyBlend(blend)
  const baseDeficit = _deficitBaseWeight(cls)
  const goalBias = cls.dom === 'hypertrophy'
    ? 1
    : (cls.dom === 'strength' || cls.dom === 'power')
      ? (baseDeficit > 0 ? 0 : -1)
      : 0

  const minCap = goalBias < 0 ? 2 : 1
  const accessory = Math.min(5, Math.max(minCap, 3 + goalBias))

  return {
    main: { setsPerSession: a.setsPerSession },
    accessory,
  }
}

// ── Volume warnings (non-blocking). Returns array of
// { scope, lift?, level, code, msg, tier } per §6.
export function volumeWarnings(profile) {
  const ov = profile.volumeOverride
  const mainOv = ov?.main?.enabled ? ov.main : null
  const accOv  = ov?.accessory?.enabled ? ov.accessory.setsPerSession : null

  const warnings = []
  if (!mainOv && accOv == null) return warnings

  const blend   = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)
  const band    = BANDS[bandForBlend(blend)]
  const peaking = !!(profile.competition?.on && profile.competition?.date)

  if (mainOv) {
    const mode = mainOv.mode ?? 'rampFromFloor'

    // taperDefeat: Mode B + competition peaking
    if (mode === 'fixed' && peaking) {
      warnings.push({
        scope: 'main', level: 'caution', code: 'taperDefeat',
        msg: '고정 볼륨이 대회 테이퍼를 무력화 — 시작주기준(ramp) 모드 권장',
        tier: 'heuristic',
      })
    }

    // Pull slotCounts + frequency from the shared auto helper
    const { slotCounts, frequency } = resolveAutoSetsPerSession(profile)

    // Peak ramp multiplier for overMrv heuristic (§6 note)
    const rampMode = volumeRampMode(blend, peaking)
    const maxRamp  = rampMode === 'taper' ? 1.15 : rampMode === 'maintain' ? 1.20 : 1.35

    for (const lift of MAIN_LIFTS) {
      const o = mainOv.setsPerSession?.[lift]
      if (o == null) continue

      const eBand  = effectiveBand(band, lift)
      const freq   = frequency[lift] ?? 0
      const absCap = PER_SESSION_CAP[lift] ?? 6
      const sc     = slotCounts[lift] || 1

      // deadInfo: bypass of 0.6 scaling
      if (lift === 'deadlift') {
        warnings.push({
          scope: 'main', lift, level: 'info', code: 'deadInfo',
          msg: '데드리프트 직접 입력: 0.6× 감쇄 미적용 (입력값 literal)',
          tier: 'consensus',
        })
      }

      // freq=0 mismatch
      if (freq === 0) {
        warnings.push({
          scope: 'main', lift, level: 'warn', code: 'freqZero',
          msg: `${lift} 빈도=0이므로 볼륨 override가 적용되지 않음`,
          tier: undefined,
        })
        continue
      }

      // overCap
      if (o > absCap) {
        warnings.push({
          scope: 'main', lift, level: 'caution', code: 'overCap',
          msg: `세션당 ${o}세트가 상한(${absCap})을 초과 — ${mode === 'fixed' ? 'warn-only(해제)' : '상한으로 조정됨'}`,
          tier: 'heuristic',
        })
      }

      // Effective base for volume checks
      const effectiveSets = mode === 'fixed'
        ? Math.max(1, o)
        : Math.max(1, Math.min(o, absCap, Math.floor(band.mrv / sc)))

      const startWeekly = effectiveSets * freq
      const peakWeekly  = Math.round(effectiveSets * maxRamp) * freq

      // underMev: start-week weekly < effective MEV
      if (startWeekly < eBand.mev) {
        warnings.push({
          scope: 'main', lift, level: 'warn', code: 'underMev',
          msg: `시작주 주간 ${startWeekly}세트 < MEV(${eBand.mev})`,
          tier: 'consensus',
        })
      }

      // overMrv: peak-week weekly > effective MRV
      if (peakWeekly > eBand.mrv) {
        warnings.push({
          scope: 'main', lift, level: 'warn', code: 'overMrv',
          msg: `피크주 주간 ${peakWeekly}세트 > MRV(${eBand.mrv})`,
          tier: 'heuristic',
        })
      }
    }

    // regionTrim: any region with status ≥ 2 can volumeScale-reduce overridden exercises
    const regionStatus = profile.regionStatus ?? {}
    if (Object.values(regionStatus).some((v) => v >= 2)) {
      warnings.push({
        scope: 'main', level: 'info', code: 'regionTrim',
        msg: 'regionStatus에 의해 일부 운동이 볼륨 감소 가능',
        tier: undefined,
      })
    }
  }

  // Accessory warnings
  if (accOv != null) {
    if (accOv === 0) {
      warnings.push({
        scope: 'accessory', level: 'info', code: 'accZero',
        msg: '보조 운동 없음 (accessory=0)', tier: undefined,
      })
    } else if (accOv > 5) {
      warnings.push({
        scope: 'accessory', level: 'warn', code: 'accHigh',
        msg: `세션당 보조 ${accOv}개 > 권장 상한(5)`, tier: 'heuristic',
      })
    }
  }

  return warnings
}
