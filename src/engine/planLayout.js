// Mesocycle shape. <=8 weeks → a single block (bit-identical to the legacy
// "n work weeks + one trailing deload" shape). >8 weeks → block periodization:
// work weeks split into blocks of <= BLOCK_LEN, a deload after each block when
// enabled, so a long plan recovers every ~6 weeks. Pure/deterministic.
// Cadence is a consensus heuristic (근거 약함).
export const BLOCK_LEN = 6

export function planLayout(mesoWeeks, deloadEnabled) {
  const out = []
  if (mesoWeeks <= 8) {
    for (let w = 0; w < mesoWeeks; w++) out.push({ kind: 'work', block: 0, blockWeek: w, blockLen: mesoWeeks })
    if (deloadEnabled) out.push({ kind: 'deload', block: 0, blockWeek: mesoWeeks, blockLen: mesoWeeks })
    return out
  }
  let remaining = mesoWeeks
  let block = 0
  while (remaining > 0) {
    const blockLen = Math.min(BLOCK_LEN, remaining)
    for (let w = 0; w < blockLen; w++) out.push({ kind: 'work', block, blockWeek: w, blockLen })
    if (deloadEnabled) out.push({ kind: 'deload', block, blockWeek: blockLen, blockLen })
    remaining -= blockLen
    block += 1
  }
  return out
}
