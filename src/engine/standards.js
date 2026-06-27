export const ELITE_REL = {
  male:   { squat: 2.83, bench: 1.95, deadlift: 3.25 },
  female: { squat: 2.26, bench: 1.35, deadlift: 2.66 },
}
export const GL_COEF = {
  male:   { A: 1199.72839, B: 1025.18162, C: 0.00921 },
  female: { A: 610.32796,  B: 1045.59282, C: 0.03048 },
}
const MAIN = ['squat', 'bench', 'deadlift']
const sexKey = (sex) => (sex === 'F' || sex === 'female' ? 'female' : 'male')

export function relStandard(lift, oneRM, bodyweight, sex) {
  if (!(oneRM > 0) || !(bodyweight > 0)) return null
  return (oneRM / bodyweight) / ELITE_REL[sexKey(sex)][lift]
}

export function weakLift(oneRMs, bodyweight, sex) {
  if (!bodyweight) return null
  const rs = {}
  for (const l of MAIN) {
    const v = relStandard(l, oneRMs[l], bodyweight, sex)
    if (v == null) return null
    rs[l] = v
  }
  const order = ['bench', 'squat', 'deadlift'] // tie-break preference
  let best = order[0]
  for (const l of order) if (rs[l] < rs[best]) best = l
  return best
}

// Below this bodyweight the Goodlift denominator can go negative for female coefficients.
const GL_BW_FLOOR = 20 // kg

export function glPoints(total, bodyweight, sex) {
  if (!(total > 0) || !(bodyweight > 0) || bodyweight < GL_BW_FLOOR) return null
  const { A, B, C } = GL_COEF[sexKey(sex)]
  const gl = total * 100 / (A - B * Math.exp(-C * bodyweight))
  return Number.isFinite(gl) ? Math.round(gl * 100) / 100 : null
}

// GL-point cutoffs for levelBand.  GL points already normalise for bodyweight
// (via the IPF Goodlift formula), so two lifters with the same GL always receive
// the same band regardless of body-mass — fixing the old relStandard-avg bias.
// Approximate real-world anchors (100 kg male): 50 GL ≈ 40 % of elite total,
// 70 ≈ 56 %, 90 ≈ 72 %, 110 ≈ 88 %.
export function levelBand(gl) {
  if (gl == null || gl < 50)  return '입문'
  if (gl < 70)  return '초중급'
  if (gl < 90)  return '중상급'
  if (gl < 110) return '고급'
  return '엘리트급'
}

export function assess(oneRMs, bodyweight, sex) {
  if (!bodyweight) return null
  const perLift = {}
  for (const l of MAIN) {
    const v = relStandard(l, oneRMs[l], bodyweight, sex)
    if (v == null) return null
    perLift[l] = v
  }
  const total = MAIN.reduce((a, l) => a + oneRMs[l], 0)
  const gl = glPoints(total, bodyweight, sex)
  return { perLift, weakLift: weakLift(oneRMs, bodyweight, sex), glPoints: gl, level: levelBand(gl) }
}

export function recommendBlend(years) {
  if (years < 1) return { power: 0.1, strength: 0.6, hypertrophy: 0.3, endurance: 0 }
  if (years <= 3) return { power: 0.1, strength: 0.45, hypertrophy: 0.45, endurance: 0 }
  return { power: 0.15, strength: 0.3, hypertrophy: 0.4, endurance: 0.15 }
}
