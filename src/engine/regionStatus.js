export const STATUS_SCALE = { 0: 1.0, 1: 0.85, 2: 0.6, 3: 0.0 }

export function regionMaxStatus(ex, regionStatus = {}) {
  let max = 0
  for (const region of ex.stress) {
    const s = regionStatus[region] ?? 0
    if (s > max) max = s
  }
  return max
}

export function volumeScale(ex, regionStatus) {
  return STATUS_SCALE[regionMaxStatus(ex, regionStatus)]
}

export function shouldAvoid(ex, regionStatus) {
  return regionMaxStatus(ex, regionStatus) === 3
}

export function shouldSwap(ex, regionStatus) {
  return regionMaxStatus(ex, regionStatus) === 2
}
