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
