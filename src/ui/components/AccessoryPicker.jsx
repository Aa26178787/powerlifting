import React from 'react'
import db from '../../data/exercises.json' with { type: 'json' }
import { useProfileStore } from '../store/profileStore.js'
import { exerciseName } from '../i18n.js'
import { canonicalToken } from '../../engine/muscleVolume.js'

// Body-part group labels (canonical muscle → Korean). Arms (biceps/triceps) are
// first-class groups so the user can explicitly add arm work.
const GROUP_LABEL = {
  chest: '가슴', lats: '광배(등)', upperBack: '상부 등', frontDelts: '어깨(앞)',
  sideDelts: '어깨(측면)', rearDelts: '어깨(후면)', biceps: '팔 — 이두', triceps: '팔 — 삼두',
  forearms: '전완', quads: '대퇴(앞)', hamstrings: '햄스트링', glutes: '둔근',
  adductors: '내전근', erectors: '기립근(하부등)', core: '코어', other: '기타',
}
const GROUP_ORDER = [
  'chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'adductors', 'erectors', 'core', 'other',
]

// Group accessory exercises by canonical prime-mover muscle (computed once).
const GROUPS = (() => {
  const out = {}
  for (const e of db.exercises) {
    if (e.category !== 'accessory' || e.advanced) continue
    const g = canonicalToken((e.primaryMuscle || '').split('/')[0]) ?? 'other'
    ;(out[g] ||= []).push(e)
  }
  return out
})()
const RENDER_ORDER = [
  ...GROUP_ORDER.filter((g) => GROUPS[g]?.length),
  ...Object.keys(GROUPS).filter((g) => !GROUP_ORDER.includes(g)),
]

export default function AccessoryPicker({ onChange }) {
  const picks = useProfileStore((s) => s.profile.accessoryPicks ?? [])
  const setField = useProfileStore((s) => s.setField)
  const toggle = (name) => {
    setField('accessoryPicks', picks.includes(name) ? picks.filter((n) => n !== name) : [...picks, name])
    onChange?.()   // re-generate the routine so the change applies immediately
  }

  return (
    <details className="accessory-picker">
      <summary>보조운동 직접 선택 (카테고리별)</summary>
      <p style={{ fontSize: '0.85em', color: '#888', margin: '4px 0' }}>
        선택한 보조운동은 루틴에 <strong>우선 포함</strong>되고, 남는 자리는 엔진이 자동으로 채웁니다.
        아무것도 선택하지 않으면 전부 자동입니다.
        {picks.length > 0 && ` (현재 ${picks.length}개 선택)`}
      </p>
      {RENDER_ORDER.map((g) => (
        <details key={g} className="accessory-group">
          <summary>{GROUP_LABEL[g] ?? g} ({GROUPS[g].length})</summary>
          {GROUPS[g].map((e) => (
            <label key={e.name} style={{ display: 'block', fontSize: '0.9em' }}>
              <input type="checkbox" checked={picks.includes(e.name)} onChange={() => toggle(e.name)} />
              {' '}{exerciseName(e.name)}
            </label>
          ))}
        </details>
      ))}
    </details>
  )
}
