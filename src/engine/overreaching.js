export function detectOverreaching(log) {
  if (!Array.isArray(log) || log.length < 3) return { flag: false }
  // Sort by training-week order (week asc, day asc) so trend detection is
  // independent of the order in which check-ins were logged.
  const sorted = [...log].sort((a, b) => {
    const wDiff = (a.week ?? 0) - (b.week ?? 0)
    return wDiff !== 0 ? wDiff : (a.day ?? 0) - (b.day ?? 0)
  })
  const r = sorted.slice(-3).map((e) => e.readiness)
  // Rule 1: strict monotonic decline + all <0.5
  if (r[0] > r[1] && r[1] > r[2] && r.every((x) => x < 0.5)) {
    return { flag: true, reason: 'readiness 3회 연속 하락 (과피로 의심)' }
  }
  // Rule 2: all persistently very low
  if (r.every((x) => x < 0.35)) {
    return { flag: true, reason: 'readiness 지속 매우 낮음 — 디로드 권장' }
  }
  // Rule 3: cumulative drop ≥ 0.2 catches steep crashes (e.g. 0.7→0.45→0.3)
  if (r[0] - r[2] >= 0.2) {
    return { flag: true, reason: 'readiness 급격히 저하 (과피로 의심)' }
  }
  // Rule 4: sustained plateau at low level with any further decline (e.g. 0.4,0.4,0.3)
  if (r.every((x) => x <= 0.4) && r[2] < r[0]) {
    return { flag: true, reason: 'readiness 지속 낮음 — 피로 누적 의심' }
  }
  return { flag: false }
}
