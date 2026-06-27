import { byName, allEquipment } from './exercises.js'
import { roundToIncrement } from './e1rm.js'
import { regionMaxStatus, STATUS_SCALE } from './regionStatus.js'
import { pick } from './variations.js'
import { readinessScore, loadFactor, setsToDrop, QUALITY_SENSITIVITY } from './readiness.js'

const RPE_FLOOR = 6
const RPE_K = 2  // max RPE reduction per unit quality-sensitivity at readiness=0

// Fix 1: lower rpe proportionally on low-readiness days.
// Only touches sets with a numeric rpe (leaves null / undefined unchanged).
function adjustRpe(rpe, readiness, quality) {
  if (typeof rpe !== 'number') return rpe
  const sensitivity = QUALITY_SENSITIVITY[quality] ?? 1
  const reduction = Math.round((1 - readiness) * sensitivity * RPE_K)
  return Math.max(RPE_FLOOR, rpe - reduction)
}

function trimSets(sets, drop) {
  if (drop <= 0 || sets.length <= 1) return sets
  const keep = Math.max(1, sets.length - drop)
  // If any set carries a numeric weight (working sets), drop the heaviest ones first
  // so protective lighter backoffs are preserved on low-readiness days.
  // Tie-break: keep the earlier set (lower index) → drop the later one.
  // Accessories (no weight) fall through to the end-trim path.
  if (sets.some((s) => typeof s.weight === 'number')) {
    const dropIndices = new Set(
      sets
        .map((s, i) => i)
        .sort((a, b) => (sets[b].weight ?? -Infinity) - (sets[a].weight ?? -Infinity) || b - a)
        .slice(0, sets.length - keep)
    )
    return sets.filter((_, i) => !dropIndices.has(i))
  }
  return sets.slice(0, keep)
}

export function applyReadiness(session, checkin, profile = {}, overreaching = false) {
  const readiness = readinessScore(checkin)
  const rs = checkin.regionStatus ?? {}
  const drop = setsToDrop(readiness)
  const notes = [...(session.notes ?? [])]
  // Fix 3: use profile equipment/advanced instead of hardcoded allEquipment()/true
  const advanced = profile.years !== undefined ? profile.years >= 3 : (profile.advanced ?? true)
  const equipment = profile.equipment ?? allEquipment()

  const exercises = []
  for (const ex of session.exercises) {
    const row = byName(ex.lift)
    const status = row ? regionMaxStatus(row, rs) : 0
    if (status === 3) {
      const region = (row?.stress ?? []).find((r) => (rs[r] ?? 0) === 3)
      notes.push(`${ex.baseLift} 오늘${region ? ` ${region}` : ''} 통증으로 제외`)
      continue
    }
    let lift = ex.lift, rescale = 1, swapped = false
    if (status === 2) {
      // Fix 3: thread profile equipment/advanced into pick() instead of hardcoded values
      const cand = pick(ex.baseLift, 'none', {}, equipment, advanced, [])
      if (cand && regionMaxStatus(cand, rs) < 2 && cand.name !== ex.lift) {
        const oldMod = byName(ex.lift)?.e1rmModifier ?? 1
        const newMod = cand.e1rmModifier ?? 1
        rescale = newMod / oldMod; lift = cand.name
        notes.push(`통증 보호: ${ex.baseLift} → ${cand.name}`)
        swapped = true
      }
    }
    let lf = loadFactor(readiness, ex.quality)
    // Fix 4: overreaching → extra 5% load cut
    if (overreaching) lf = Math.round(lf * 0.95 * 100) / 100
    // Fix 2: status 1 or unmitigated status 2 → cap load at pain-region volume scale
    let effectiveLf = lf
    let extraDrop = 0
    if (row && (status === 1 || (status === 2 && !swapped))) {
      effectiveLf = Math.min(effectiveLf, STATUS_SCALE[status] ?? 1)
      // Extra set trim for unmitigated severe pain (failed swap)
      if (status === 2 && !swapped) extraDrop = 1
    }
    const totalDrop = drop + extraDrop + (overreaching ? 1 : 0)
    const sets = trimSets(ex.scheme.sets, totalDrop).map((s) => {
      const newS = typeof s.weight === 'number'
        ? { ...s, weight: roundToIncrement(s.weight * rescale * effectiveLf) }
        : { ...s }
      // Fix 1: lower rpe proportionally when readiness is low
      if (typeof newS.rpe === 'number') newS.rpe = adjustRpe(newS.rpe, readiness, ex.quality)
      return newS
    })
    exercises.push({ ...ex, lift, scheme: { ...ex.scheme, sets }, sets: sets.length })
  }

  const accessories = []
  for (const a of session.accessories ?? []) {
    const row = byName(a.name)
    if (row && regionMaxStatus(row, rs) === 3) { notes.push(`${a.name} 오늘 통증으로 제외`); continue }
    const accDrop = drop + (overreaching ? 1 : 0)
    accessories.push(a.scheme ? { ...a, scheme: { ...a.scheme, sets: trimSets(a.scheme.sets, accDrop) } } : a)
  }

  return { session: { ...session, exercises, accessories, notes }, readiness, notes }
}
