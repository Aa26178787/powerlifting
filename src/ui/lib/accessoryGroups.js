import db from '../../data/exercises.json' with { type: 'json' }
import { canonicalToken } from '../../engine/muscleVolume.js'
import { equipmentSatisfies } from '../../engine/exercises.js'

// Body-part (canonical muscle) labels for displaying accessory slots by region.
export const BODY_PART_LABEL = {
  chest: '가슴', lats: '광배(등)', upperBack: '상부 등', frontDelts: '어깨(앞)',
  sideDelts: '어깨(측면)', rearDelts: '어깨(후면)', biceps: '이두(팔)', triceps: '삼두(팔)',
  forearms: '전완', quads: '대퇴(앞)', hamstrings: '햄스트링', glutes: '둔근',
  adductors: '내전근', erectors: '기립근', core: '코어', other: '기타',
}

// Canonical body part of an accessory (prime-mover muscle).
export const bodyPartOf = (primaryMuscle) => canonicalToken((primaryMuscle || '').split('/')[0]) ?? 'other'
export const bodyPartLabel = (canonical) => BODY_PART_LABEL[canonical] ?? canonical

const ACC = db.exercises.filter((e) => e.category === 'accessory' && !e.advanced)

// Accessory exercise names for a body part that the available equipment supports.
export function exercisesForBodyPart(canonical, equipment = []) {
  return ACC
    .filter((e) => bodyPartOf(e.primaryMuscle) === canonical && equipmentSatisfies(e.equipment, equipment))
    .map((e) => e.name)
}
