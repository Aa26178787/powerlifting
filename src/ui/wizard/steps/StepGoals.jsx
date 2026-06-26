import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { recommendBlend } from '../../../engine/standards.js'
import { qualityLabel, presetLabel } from '../../i18n.js'
export default function StepGoals() {
  const p = useProfileStore((s) => s.profile)
  const setQuality = useProfileStore((s) => s.setQuality)
  const applyPreset = useProfileStore((s) => s.applyPreset)
  const applyRec = () => { const b = recommendBlend(p.years); for (const q of Object.keys(b)) setQuality(q, b[q]) }
  return (
    <div>
      <div className="preset-row">
        {['powerlifting','powerbuilding','bodybuilding','athletic','general'].map((k) => (
          <button type="button" className="chip" key={k} onClick={() => applyPreset(k)}>{presetLabel(k)}</button>
        ))}
        <button type="button" className="chip" onClick={applyRec}>추천 적용</button>
      </div>
      {['power','strength','hypertrophy','endurance'].map((q) => (
        <label key={q} className="blend-row">
          <span className="blend-name">{qualityLabel(q)}</span>
          <input type="range" min="0" max="1" step="0.05" value={p.qualities[q]} onChange={(e) => setQuality(q, Number(e.target.value))} />
          <span className="blend-pct">{Math.round(p.qualities[q] * 100)}%</span>
        </label>
      ))}
    </div>
  )
}
