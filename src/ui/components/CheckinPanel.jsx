import React, { useState } from 'react'
import { applyReadiness } from '../../engine/applyReadiness.js'
import { regionLabel, statusLabel } from '../i18n.js'

const hint = { fontSize: '0.8em', color: '#888', margin: '1px 0 6px' }

const REGIONS = [
  'lowerBack', 'knee', 'shoulder', 'elbow', 'wrist',
  'hip', 'hamstring', 'pec', 'bicepsTendon', 'ankle',
]

export default function CheckinPanel({ session, weekIndex, onApply, profile = {}, overreaching = false }) {
  const [sleepHours, setSleepHours] = useState(7)
  const [stress, setStress] = useState(2)
  const [systemicFatigue, setSystemicFatigue] = useState(2)
  const [regionStatus, setRegionStatus] = useState({})

  function handleApply() {
    const checkin = { sleepHours, stress, systemicFatigue, regionStatus }
    const result = applyReadiness(session, checkin, profile, overreaching)
    onApply({
      adjusted: result.session,
      readiness: result.readiness,
      weekIndex,
      day: session.day,
    })
  }

  return (
    <div className="checkin-panel">
      <div>
        <label>
          수면시간
          <input
            type="number"
            value={sleepHours}
            min={0}
            max={24}
            step={0.5}
            onChange={(e) => setSleepHours(Number(e.target.value))}
          />
        </label>
      </div>

      <div>
        <label>
          스트레스 (정신·생활)
          <select value={stress} onChange={(e) => setStress(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <p style={hint}>일·수면·정신적 부담 등 <strong>머릿속·생활</strong> 스트레스. 1 매우 낮음 ~ 5 매우 높음.</p>
      </div>

      <div>
        <label>
          전신 피로 (몸 전체)
          <select value={systemicFatigue} onChange={(e) => setSystemicFatigue(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <p style={hint}>오늘 <strong>몸 전체</strong>가 얼마나 무겁고 피곤한지(근육통과 별개의 전반적 컨디션). 1 매우 개운 ~ 5 매우 피곤.</p>
      </div>

      <div className="checkin-regions">
        <p style={{ ...hint, marginTop: '4px' }}>
          <strong>부위별 근육통·통증</strong> — 0 {statusLabel(0)} · 1 {statusLabel(1)} · 2 {statusLabel(2)} · 3 {statusLabel(3)}
        </p>
        {REGIONS.map((region) => (
          <label key={region}>
            {regionLabel(region)}
            <select
              value={regionStatus[region] ?? 0}
              onChange={(e) =>
                setRegionStatus({ ...regionStatus, [region]: Number(e.target.value) })
              }
            >
              {[0, 1, 2, 3].map((v) => (
                <option key={v} value={v}>{v} {statusLabel(v)}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button className="btn checkin-apply" onClick={handleApply}>컨디션 반영</button>
    </div>
  )
}
