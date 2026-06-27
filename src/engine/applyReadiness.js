import { byName, allEquipment } from './exercises.js'
import { roundToIncrement } from './e1rm.js'
import { regionMaxStatus } from './regionStatus.js'
import { pick } from './variations.js'
import { readinessScore, loadFactor, setsToDrop } from './readiness.js'

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

export function applyReadiness(session, checkin) {
  const readiness = readinessScore(checkin)
  const rs = checkin.regionStatus ?? {}
  const drop = setsToDrop(readiness)
  const notes = [...(session.notes ?? [])]

  const exercises = []
  for (const ex of session.exercises) {
    const row = byName(ex.lift)
    const status = row ? regionMaxStatus(row, rs) : 0
    if (status === 3) {
      const region = (row?.stress ?? []).find((r) => (rs[r] ?? 0) === 3)
      notes.push(`${ex.baseLift} 오늘${region ? ` ${region}` : ''} 통증으로 제외`)
      continue
    }
    let lift = ex.lift, rescale = 1
    if (status === 2) {
      const cand = pick(ex.baseLift, 'none', {}, allEquipment(), true, [])
      if (cand && regionMaxStatus(cand, rs) < 2 && cand.name !== ex.lift) {
        const oldMod = byName(ex.lift)?.e1rmModifier ?? 1
        const newMod = cand.e1rmModifier ?? 1
        rescale = newMod / oldMod; lift = cand.name
        notes.push(`통증 보호: ${ex.baseLift} → ${cand.name}`)
      }
    }
    const lf = loadFactor(readiness, ex.quality)
    const sets = trimSets(ex.scheme.sets, drop).map((s) =>
      typeof s.weight === 'number' ? { ...s, weight: roundToIncrement(s.weight * rescale * lf) } : s)
    exercises.push({ ...ex, lift, scheme: { ...ex.scheme, sets }, sets: sets.length })
  }

  const accessories = []
  for (const a of session.accessories ?? []) {
    const row = byName(a.name)
    if (row && regionMaxStatus(row, rs) === 3) { notes.push(`${a.name} 오늘 통증으로 제외`); continue }
    accessories.push(a.scheme ? { ...a, scheme: { ...a.scheme, sets: trimSets(a.scheme.sets, drop) } } : a)
  }

  return { session: { ...session, exercises, accessories, notes }, readiness, notes }
}
