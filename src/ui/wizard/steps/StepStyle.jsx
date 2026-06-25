import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { liftLabel, styleLabel, stickingLabel } from '../../i18n.js'
import { query, allEquipment } from '../../../engine/exercises.js'

export default function StepStyle() {
  const p = useProfileStore((s) => s.profile)
  const setStyle = useProfileStore((s) => s.setStyle)
  const setStickingPoint = useProfileStore((s) => s.setStickingPoint)
  const toggleExcludedExercise = useProfileStore((s) => s.toggleExcludedExercise)
  const setVariationOverride = useProfileStore((s) => s.setVariationOverride)

  return (
    <div>
      <fieldset>
        <legend>스타일</legend>
        <label>스쿼트 바
          <select value={p.style.squat.bar} onChange={(e) => setStyle('squat', { bar: e.target.value })}>
            <option value="low">{styleLabel('bar', 'low')}</option>
            <option value="high">{styleLabel('bar', 'high')}</option>
          </select>
        </label>
        <label>스쿼트 스탠스
          <select value={p.style.squat.stance} onChange={(e) => setStyle('squat', { stance: e.target.value })}>
            {['narrow', 'medium', 'wide'].map((v) => (
              <option key={v} value={v}>{styleLabel('stance', v)}</option>
            ))}
          </select>
        </label>
        <label>벤치 그립
          <select value={p.style.bench.grip} onChange={(e) => setStyle('bench', { grip: e.target.value })}>
            {['close', 'medium', 'wide'].map((v) => (
              <option key={v} value={v}>{styleLabel('grip', v)}</option>
            ))}
          </select>
        </label>
        <label>데드리프트 스탠스
          <select value={p.style.deadlift.stance} onChange={(e) => setStyle('deadlift', { stance: e.target.value })}>
            {['conventional', 'sumo'].map((v) => (
              <option key={v} value={v}>{styleLabel('stance', v)}</option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>스티킹포인트 (가장 안 올라가는 구간)</legend>
        {['squat', 'bench', 'deadlift'].map((lift) => (
          <label key={lift}>{liftLabel(lift)}
            <select value={p.stickingPoint[lift]} onChange={(e) => setStickingPoint(lift, e.target.value)}>
              {['none', 'bottom', 'midrange', 'lockout'].map((v) => (
                <option key={v} value={v}>{stickingLabel(v)}</option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>변형 운동 (자동 / 직접 지정 / 제외)</legend>
        {['squat', 'bench', 'deadlift'].map((lift) => {
          const candidates = query({ category: 'variation', targetLift: lift, equipmentAvailable: allEquipment() })
          const selectable = candidates.filter((ex) => !p.excludedExercises.includes(ex.name))
          return (
            <div key={lift} className="variation-control">
              <label>{liftLabel(lift)} 변형
                <select
                  value={p.variationOverride[lift] ?? ''}
                  onChange={(e) => setVariationOverride(lift, e.target.value || null)}
                >
                  <option value="">자동</option>
                  {selectable.map((ex) => (
                    <option key={ex.name} value={ex.name}>{ex.name}</option>
                  ))}
                </select>
              </label>
              <details className="exclude-variations">
                <summary>제외할 변형</summary>
                {candidates.map((ex) => (
                  <label key={ex.name}>
                    <input
                      type="checkbox"
                      checked={p.excludedExercises.includes(ex.name)}
                      onChange={() => toggleExcludedExercise(ex.name)}
                    />
                    {' '}{ex.name}
                  </label>
                ))}
              </details>
            </div>
          )
        })}
      </fieldset>
    </div>
  )
}
