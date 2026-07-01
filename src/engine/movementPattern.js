import db from '../data/exercises.json' with { type: 'json' }
import { canonicalToken } from './muscleVolume.js'
import { equipmentSatisfies } from './exercises.js'

// Accessory MOVEMENT PATTERNS — the user changes an accessory by pattern (hinge,
// pull, push…), not by individual exercise. Coarser + more intuitive than muscle.
export const PATTERNS = [
  { key: 'hinge',    label: '힌지 / 후면사슬' },
  { key: 'knee',     label: '스쿼트 / 무릎' },
  { key: 'pushH',    label: '밀기 (가슴)' },
  { key: 'pushV',    label: '밀기 (어깨)' },
  { key: 'pull',     label: '당기기 (등)' },
  { key: 'biceps',   label: '팔 (이두)' },
  { key: 'triceps',  label: '팔 (삼두)' },
  { key: 'core',     label: '코어' },
  { key: 'forearms', label: '전완 / 그립' },
]
const MUSCLE_TO_PATTERN = {
  quads: 'knee', adductors: 'knee',
  hamstrings: 'hinge', glutes: 'hinge', erectors: 'hinge',
  chest: 'pushH', frontDelts: 'pushV', sideDelts: 'pushV',
  rearDelts: 'pull', lats: 'pull', upperBack: 'pull',
  biceps: 'biceps', triceps: 'triceps', forearms: 'forearms', core: 'core',
}

export const patternOf = (primaryMuscle) =>
  MUSCLE_TO_PATTERN[canonicalToken((primaryMuscle || '').split('/')[0])] ?? 'other'
export const patternLabel = (key) => PATTERNS.find((p) => p.key === key)?.label ?? key

// Finer DISPLAY label for a routine accessory row (the routine shows the movement
// pattern, not the specific exercise). The engine keeps the coarse patternOf() for
// swap/override/fit; this only refines the on-screen label — notably splitting
// 당기기(pull) into VERTICAL vs HORIZONTAL by the movement name, since the muscle
// alone can't tell a pulldown from a row.
const PULL_VERTICAL_RX = /pulldown|pull-?up|chin|pullover|straight-arm|scapular|풀다운|풀업|친업|풀오버/i
const PULL_HORIZONTAL_RX = /row|face pull|pull-?apart|rear[ -]?delt|reverse pec|y-raise|shrug|inverted|meadows|로우|페이스|풀어파트|리어|슈러그/i
const DISPLAY_LABEL = {
  hinge: '힌지 / 후면사슬', knee: '스쿼트 / 무릎', pushH: '밀기 (가슴)', pushV: '밀기 (어깨)',
  biceps: '팔 (이두)', triceps: '팔 (삼두)', core: '코어', forearms: '전완 / 그립',
  pullV: '수직 당기기', pullH: '수평 당기기', other: '기타',
}
export function displayPatternLabel(ex) {
  const base = patternOf(ex?.primaryMuscle)
  if (base !== 'pull') return DISPLAY_LABEL[base] ?? DISPLAY_LABEL.other
  const name = ex?.name ?? ''
  if (PULL_VERTICAL_RX.test(name)) return DISPLAY_LABEL.pullV
  if (PULL_HORIZONTAL_RX.test(name)) return DISPLAY_LABEL.pullH
  // no name signal: lats-first token → vertical (pulldown/pull-up family), else horizontal
  return /^lats/.test(ex?.primaryMuscle || '') ? DISPLAY_LABEL.pullV : DISPLAY_LABEL.pullH
}

const ACC = db.exercises.filter((e) => e.category === 'accessory' && !e.advanced)

// Equipment-feasible accessory exercises for a movement pattern (deterministic order).
export function exercisesForPattern(pattern, equipment = []) {
  return ACC
    .filter((e) => patternOf(e.primaryMuscle) === pattern && equipmentSatisfies(e.equipment, equipment))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Deterministically pick one exercise for a pattern (engine fills the slot after a
// user picks a pattern). Returns null if none feasible.
export function pickForPattern(pattern, equipment = []) {
  return exercisesForPattern(pattern, equipment)[0] ?? null
}
