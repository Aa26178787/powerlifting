export function detectOverreaching(log) {
  if (!Array.isArray(log) || log.length < 3) return { flag: false }
  const r = log.slice(-3).map((e) => e.readiness)
  if (r[0] > r[1] && r[1] > r[2] && r.every((x) => x < 0.5)) {
    return { flag: true, reason: 'readiness 3회 연속 하락 (과피로 의심)' }
  }
  if (r.every((x) => x < 0.35)) {
    return { flag: true, reason: 'readiness 지속 매우 낮음 — 디로드 권장' }
  }
  return { flag: false }
}
